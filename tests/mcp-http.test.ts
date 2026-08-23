import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import {
  createLegendSajuHttpServer,
  legendSajuHttpOptionsFromEnvironment,
} from "../src/http";

function ssePayload(text: string): Record<string, unknown> {
  const data = text.split("\n").find((line) => line.startsWith("data: "));
  if (!data) throw new Error(`Missing SSE data frame: ${text}`);
  return JSON.parse(data.slice(6)) as Record<string, unknown>;
}

describe("Legend Saju Streamable HTTP MCP", () => {
  const runtime = createLegendSajuHttpServer({
    allowedHosts: ["127.0.0.1"],
    allowedOrigins: ["127.0.0.1"],
    rateLimitPerMinute: 20,
  });
  let baseUrl = "";

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      runtime.server.once("error", reject);
      runtime.server.listen(0, "127.0.0.1", resolve);
    });
    const address = runtime.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      runtime.server.close((error) => error ? reject(error) : resolve());
      runtime.server.closeIdleConnections();
    });
    await runtime.handler.close();
  });

  it("reports deployment health without exposing engine input", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "legend-saju",
      version: "0.3.0",
    });
  });

  it("initializes over Streamable HTTP and advertises focused user-goal tools", async () => {
    const initialize = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "legend-saju-http-test", version: "0.1.0" },
        },
      }),
    });

    expect(initialize.status).toBe(200);
    const initialization = ssePayload(await initialize.text());
    expect(initialization).toMatchObject({
      result: { serverInfo: { name: "legend-saju", version: "0.3.0" } },
      id: 1,
    });

    const toolsResponse = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    });
    const toolsPayload = ssePayload(await toolsResponse.text()) as {
      result?: { tools?: { name?: string }[] };
    };
    expect(toolsPayload.result?.tools?.map((tool) => tool.name).sort()).toEqual([
      "legend_saju_analyze_compatibility",
      "legend_saju_analyze_name",
      "legend_saju_capabilities",
      "legend_saju_cast_divination",
      "legend_saju_manifest",
      "legend_saju_read_fortune",
      "legend_saju_resolve",
      "legend_saju_select_dates",
    ]);
  });

  it("rejects oversized JSON before MCP dispatch", async () => {
    const limited = createLegendSajuHttpServer({
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: ["127.0.0.1"],
      maxBodyBytes: 32,
    });
    await new Promise<void>((resolve, reject) => {
      limited.server.once("error", reject);
      limited.server.listen(0, "127.0.0.1", resolve);
    });
    const address = limited.server.address() as AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "x".repeat(40) }),
      });
      expect(response.status).toBe(413);
    } finally {
      await new Promise<void>((resolve) => limited.server.close(() => resolve()));
      await limited.handler.close();
    }
  });

  it("derives Railway and explicit host allowlists without duplicates", () => {
    expect(legendSajuHttpOptionsFromEnvironment({
      RAILWAY_PUBLIC_DOMAIN: "legend-saju.example.up.railway.app",
      MCP_ALLOWED_HOSTS: "saju.example.com,legend-saju.example.up.railway.app",
      MCP_ALLOWED_ORIGINS: "chat.example.com",
    })).toMatchObject({
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "[::1]",
        "legend-saju.example.up.railway.app",
        "saju.example.com",
      ],
      allowedOrigins: [
        "localhost",
        "127.0.0.1",
        "[::1]",
        "legend-saju.example.up.railway.app",
        "saju.example.com",
        "chat.example.com",
      ],
    });
  });
});
