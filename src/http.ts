import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { LEGEND_SAJU_ENGINE_VERSION } from "./engine/public-entry";
import { createLegendSajuMcpServer } from "./mcp";

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_BODY_BYTES = 1_048_576;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 120;
const DEFAULT_MAX_CONCURRENT_POSTS = 4;

type HttpServerEnvironment = Record<string, string | undefined>;

export type LegendSajuHttpOptions = {
  allowedHosts?: string[];
  allowedOrigins?: string[];
  maxBodyBytes?: number;
  rateLimitPerMinute?: number;
  maxConcurrentPosts?: number;
  onError?: (error: Error) => void;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

class RequestBodyTooLargeError extends Error {}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function commaSeparated(value: string | undefined): string[] {
  return value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
}

export function legendSajuHttpOptionsFromEnvironment(
  environment: HttpServerEnvironment = process.env,
): LegendSajuHttpOptions {
  const railwayDomain = environment.RAILWAY_PUBLIC_DOMAIN?.trim();
  const allowedHosts = [
    "localhost",
    "127.0.0.1",
    "[::1]",
    ...(railwayDomain ? [railwayDomain] : []),
    ...commaSeparated(environment.MCP_ALLOWED_HOSTS),
  ];

  return {
    allowedHosts: [...new Set(allowedHosts)],
    allowedOrigins: [...new Set([...allowedHosts, ...commaSeparated(environment.MCP_ALLOWED_ORIGINS)])],
    maxBodyBytes: positiveInteger(environment.MCP_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES),
    rateLimitPerMinute: positiveInteger(
      environment.MCP_RATE_LIMIT_PER_MINUTE,
      DEFAULT_RATE_LIMIT_PER_MINUTE,
    ),
    maxConcurrentPosts: positiveInteger(
      environment.MCP_MAX_CONCURRENT_POSTS,
      DEFAULT_MAX_CONCURRENT_POSTS,
    ),
  };
}

function requestIp(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return first?.trim() || request.socket.remoteAddress || "unknown";
}

function sendJson(response: ServerResponse, status: number, body: unknown, headers = {}): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function sendMcpError(
  response: ServerResponse,
  status: number,
  message: string,
  headers?: Record<string, string>,
): void {
  sendJson(response, status, {
    jsonrpc: "2.0",
    id: null,
    error: { code: -32000, message },
  }, headers);
}

function createRateLimiter(limit: number): (request: IncomingMessage, response: ServerResponse) => boolean {
  const buckets = new Map<string, RateBucket>();
  let requestsUntilCleanup = 256;

  return (request, response) => {
    const now = Date.now();
    const key = requestIp(request);
    const previous = buckets.get(key);
    const bucket = !previous || previous.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : previous;

    if (bucket.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));
      sendMcpError(response, 429, "Too many MCP requests.", {
        "retry-after": String(retryAfterSeconds),
      });
      return false;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    requestsUntilCleanup -= 1;
    if (requestsUntilCleanup === 0) {
      requestsUntilCleanup = 256;
      for (const [bucketKey, candidate] of buckets) {
        if (candidate.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    return true;
  };
}

function isJsonRequest(request: IncomingMessage): boolean {
  const contentType = request.headers["content-type"];
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

async function readJsonBody(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new RequestBodyTooLargeError();
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += bytes.byteLength;
    if (total > maxBodyBytes) throw new RequestBodyTooLargeError();
    chunks.push(bytes);
  }

  if (total === 0) throw new SyntaxError("Empty JSON body.");
  return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
}

export function createLegendSajuHttpServer(options: LegendSajuHttpOptions = {}) {
  const environmentOptions = legendSajuHttpOptionsFromEnvironment();
  const config = { ...environmentOptions, ...options };
  const reportError = config.onError ?? ((error: Error) => {
    process.stderr.write(`[legend-saju-http] ${error.message}\n`);
  });
  const handler = createMcpHandler(() => createLegendSajuMcpServer(), {
    legacy: "stateless",
    maxSubscriptions: 64,
    onerror: reportError,
  });
  const nodeHandler = toNodeHandler(handler, { onerror: reportError });
  const validateHost = hostHeaderValidation(config.allowedHosts!);
  const validateOrigin = originValidation(config.allowedOrigins!);
  const withinRateLimit = createRateLimiter(config.rateLimitPerMinute!);
  let concurrentPosts = 0;

  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    if (request.method === "GET" && pathname === "/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "legend-saju",
        version: LEGEND_SAJU_ENGINE_VERSION,
      });
      return;
    }

    if (pathname !== "/mcp") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (!validateHost(request, response) || !validateOrigin(request, response)) return;
    if (!withinRateLimit(request, response)) return;

    if (request.method === "POST") {
      if (concurrentPosts >= config.maxConcurrentPosts!) {
        sendMcpError(response, 503, "The MCP server is busy. Retry shortly.", { "retry-after": "1" });
        return;
      }

      concurrentPosts += 1;
      try {
        if (!isJsonRequest(request)) {
          await nodeHandler(request, response);
          return;
        }
        const body = await readJsonBody(request, config.maxBodyBytes!);
        await nodeHandler(request, response, body);
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          sendMcpError(response, 413, "MCP request body is too large.");
        } else if (error instanceof SyntaxError) {
          sendMcpError(response, 400, "MCP request body must be valid JSON.");
        } else {
          reportError(error instanceof Error ? error : new Error(String(error)));
          if (!response.headersSent) sendMcpError(response, 500, "MCP request failed.");
          else response.end();
        }
      } finally {
        concurrentPosts -= 1;
      }
      return;
    }

    try {
      await nodeHandler(request, response);
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)));
      if (!response.headersSent) sendMcpError(response, 500, "MCP request failed.");
      else response.end();
    }
  });

  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;

  return { server, handler };
}

const executedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (executedDirectly) {
  const port = positiveInteger(process.env.PORT, DEFAULT_PORT);
  const { server, handler } = createLegendSajuHttpServer();

  server.listen(port, "0.0.0.0", () => {
    process.stderr.write(`[legend-saju-http] listening on 0.0.0.0:${port}\n`);
  });

  const shutdown = () => {
    server.close(() => {
      void handler.close().finally(() => process.exit(0));
    });
    server.closeIdleConnections();
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
