import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const separator = process.argv.indexOf("--");
const invocation = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2);
if (!invocation.length) {
  throw new Error("Usage: node scripts/smoke-mcp.mjs -- <command> [args...]");
}

const [command, ...args] = invocation;
const useProcessGroup = process.platform !== "win32";
const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
  detached: useProcessGroup,
});

let stderr = "";
let settled = false;
const expectedTools = [
  "legend_saju_analyze_compatibility",
  "legend_saju_analyze_name",
  "legend_saju_capabilities",
  "legend_saju_cast_divination",
  "legend_saju_interpret_dream",
  "legend_saju_manifest",
  "legend_saju_read_fortune",
  "legend_saju_run_methods",
  "legend_saju_select_dates",
];

function finish(error) {
  if (settled) return;
  settled = true;
  clearTimeout(timeout);
  if (!child.killed) {
    try {
      if (useProcessGroup && child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch (killError) {
      if (killError?.code !== "ESRCH") throw killError;
    }
  }
  if (error) {
    process.stderr.write(`${error.message}\n${stderr.slice(-8000)}`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`MCP smoke passed: ${expectedTools.join(", ")}\n`);
}

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

const lines = createInterface({ input: child.stdout });
lines.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    finish(new Error(`MCP server emitted non-JSON stdout: ${line.slice(0, 500)}`));
    return;
  }
  if (message.id === 1) {
    if (message.error || message.result?.serverInfo?.name !== "legend-saju") {
      finish(new Error(`MCP initialize failed: ${line}`));
      return;
    }
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    return;
  }
  if (message.id === 2) {
    const tools = message.result?.tools ?? [];
    const actual = tools.map((tool) => tool.name).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expectedTools)) {
      finish(new Error(`Unexpected MCP tools: ${JSON.stringify(actual)}`));
      return;
    }
    const readingTool = tools.find((tool) => tool.name === "legend_saju_read_fortune");
    if (!readingTool?.inputSchema?.properties?.detailLevel || !readingTool?.outputSchema?.properties?.methodAnalysis) {
      finish(new Error("MCP reading tool is missing detailLevel or its structured output schema."));
      return;
    }
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "legend_saju_manifest", arguments: {} } });
    return;
  }
  if (message.id === 3) {
    if (message.error || message.result?.isError || message.result?.structuredContent?.naming?.dataset?.counts?.officialEntries !== 9495) {
      finish(new Error(`MCP manifest did not load the naming data chunk: ${line}`));
      return;
    }
    send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "legend_saju_analyze_name",
        arguments: {
          question: "합성 이름 한자 출처를 확인해줘",
          outputMode: "evidence",
          name: {
            surname: [{ character: "洪", expectedReading: "홍" }],
            givenName: [{ character: "哲", expectedReading: "철" }, { character: "榮", expectedReading: "영" }],
          },
        },
      },
    });
    return;
  }
  if (message.id === 4) {
    if (message.error || message.result?.isError || message.result?.structuredContent?.nameAnalysis?.legalIdentityStatus !== "all_official_eligible") {
      finish(new Error(`MCP resolver did not execute the full naming path: ${line}`));
      return;
    }
    send({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "legend_saju_interpret_dream",
        arguments: {
          question: "이 불꿈을 해몽해줘",
          dream: "집에 불이 크게 났고 불빛은 밝았으며 연기는 거의 없었다",
          outputMode: "evidence",
        },
      },
    });
    return;
  }
  if (message.id === 5) {
    if (message.error || message.result?.isError || message.result?.structuredContent?.dreamAnalysis?.matches?.[0]?.concept !== "불") {
      finish(new Error(`MCP dream tool did not execute the audited interpretation path: ${line}`));
      return;
    }
    finish();
  }
});

child.on("error", (error) => finish(error));
child.on("exit", (code, signal) => {
  if (!settled) finish(new Error(`MCP server exited before handshake (code=${code}, signal=${signal})`));
});

const timeout = setTimeout(() => {
  finish(new Error("MCP handshake timed out after 120 seconds"));
}, 120_000);

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "legend-saju-smoke", version: "0.1.0" },
  },
});
