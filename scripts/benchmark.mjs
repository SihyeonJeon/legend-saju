import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const entryUrl = new URL("../dist/index.js", import.meta.url).href;

async function staticModuleGraph(entry) {
  const pending = [new URL(entry)];
  const seen = new Map();
  while (pending.length) {
    const url = pending.pop();
    if (seen.has(url.href)) continue;
    const source = await readFile(url, "utf8");
    seen.set(url.href, Buffer.byteLength(source));
    const imports = source.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/gu);
    for (const match of imports) pending.push(new URL(match[1], url));
  }
  return {
    files: [...seen.keys()].map((url) => fileURLToPath(url).split("/dist/").at(-1)).sort(),
    bytes: [...seen.values()].reduce((sum, bytes) => sum + bytes, 0),
  };
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    iterations: sorted.length,
    minMs: Number(sorted[0].toFixed(3)),
    medianMs: Number(percentile(sorted, 0.5).toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    maxMs: Number(sorted.at(-1).toFixed(3)),
  };
}

function measure(operation, iterations) {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    operation();
    samples.push(performance.now() - startedAt);
  }
  return summarize(samples);
}

function measureFreshProcessImports(iterations) {
  const samples = [];
  const program = `
    import { performance } from "node:perf_hooks";
    const startedAt = performance.now();
    await import(${JSON.stringify(entryUrl)});
    process.stdout.write(String(performance.now() - startedAt));
  `;
  for (let index = 0; index < iterations; index += 1) {
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", program], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
    if (child.status !== 0) throw new Error(`BENCHMARK_CHILD_FAILED:${child.stderr}`);
    samples.push(Number(child.stdout));
  }
  return summarize(samples);
}

function memorySnapshot() {
  globalThis.gc?.();
  const memory = process.memoryUsage();
  return {
    rssMiB: Number((memory.rss / 1024 / 1024).toFixed(2)),
    heapUsedMiB: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
  };
}

const importedAt = performance.now();
const { analyze, getEngineManifest, query } = await import(entryUrl);
const inProcessImportMs = performance.now() - importedAt;

const knownBirthInput = {
  birth: {
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    calendar: "solar",
    gender: "여",
    birthTimeAccuracy: "recorded",
  },
  question: "직업과 재물, 연애 결혼, 앞으로 3년",
  targetDate: { year: 2026, month: 8, day: 23, hour: 12 },
  timelineRange: { startYear: 2026, endYear: 2028 },
};

const unknownBirthInput = {
  birth: {
    year: 1991,
    month: 2,
    day: 2,
    calendar: "solar",
    gender: "남",
    birthTimeAccuracy: "unknown",
  },
  question: "전체 인생",
  timelineRange: { startYear: 2026, endYear: 2028 },
};

for (let index = 0; index < 3; index += 1) {
  query({ intent: "chart", birth: knownBirthInput.birth });
  analyze(knownBirthInput);
  analyze(unknownBirthInput);
}

const memoryBefore = memorySnapshot();
const results = {
  generatedAt: new Date().toISOString(),
  runtime: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  },
  bundle: {
    initialIndexGraph: await staticModuleGraph(entryUrl),
    namingBytes: (await stat(new URL("../dist/naming.js", import.meta.url))).size,
  },
  import: {
    currentProcessMs: Number(inProcessImportMs.toFixed(3)),
    freshProcess: measureFreshProcessImports(5),
  },
  operations: {
    manifest: measure(() => getEngineManifest(), 1_000),
    chartQuery: measure(() => query({ intent: "chart", birth: knownBirthInput.birth }), 50),
    knownTimeAnalysis: measure(() => analyze(knownBirthInput), 10),
    unknownTimeAnalysis: measure(() => analyze(unknownBirthInput), 5),
  },
  memory: {
    beforeMeasuredOperations: memoryBefore,
  },
};

results.memory.afterMeasuredOperations = memorySnapshot();
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
