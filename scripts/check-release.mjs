import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const snapshot = JSON.parse(await readFile(path.join(root, "SOURCE_SNAPSHOT.json"), "utf8"));

const forbiddenPatterns = [
  /(?:^|[\s"'=])\/Users\/[^/\s"']+\//mu,
  /(?:^|[\s"'=])\/home\/[^/\s"']+\//mu,
  /(?:^|[\s"'=])[A-Za-z]:\\Users\\[^\\\s"']+\\/mu,
  /\.aside\/u\/\d+\/sessions?\//u,
  /(?:offhands)-products/iu,
  /lib\/threads\/saju/iu,
  /harness\/tasks/iu,
  /sourceRoot(?:Label)/u,
  /npmPublication(?:Supported)/u,
  /아직\s+npm.{0,40}(?:배포|게시)/iu,
  /does not (?:publish) to the npm registry/iu,
  /auth_token\s*=/iu,
  /ct0\s*=/iu,
  /(?:OPENAI|ANTHROPIC|AWS|GITHUB|SLACK)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET)\s*=/u,
  /(?:ghp|github_pat|xox[baprs])-[_A-Za-z0-9-]{16,}/u,
  /AKIA[0-9A-Z]{16}/u,
  /-----BEGIN (?:ENCRYPTED |RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

// These fragments are known private case fingerprints from pre-publication
// fixtures. Keep them out of documentation, examples, tests, and generated
// artifacts. Fragments are joined so this guard does not contain the forbidden
// value as a searchable literal itself.
const forbiddenCaseLiterals = [
  ["김상", "수"],
  ["金相", "洙"],
  ["전시", "현"],
  ["全施", "炫"],
  ["홍민", "기"],
].map((parts) => parts.join(""));

const forbiddenCaseBirthDates = [
  [1982, 4, 22],
  [1983, 7, 20],
  [1999, 7, 14],
  [2000, 7, 30],
  [2002, 5, 13],
  [2002, 7, 23],
  [2004, 8, 3],
];

const forbiddenCaseDatePatterns = forbiddenCaseBirthDates.flatMap(([year, month, day]) => [
  new RegExp(`year\\s*['\"]?\\s*:\\s*${year}[\\s\\S]{0,80}month\\s*['\"]?\\s*:\\s*${month}[\\s\\S]{0,80}day\\s*['\"]?\\s*:\\s*${day}(?!\\d)`, "u"),
  new RegExp(`${year}\\s*년\\s*0?${month}\\s*월\\s*0?${day}\\s*일`, "u"),
  new RegExp(`${year}\\s*[-./]\\s*0?${month}\\s*[-./]\\s*0?${day}(?!\\d)`, "u"),
]);

const ignoredDirectories = new Set([".git", ".yaksha", "node_modules", "dist", "coverage"]);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(target));
    else output.push(target);
  }
  return output;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

const findings = [];
const snapshotPaths = new Set(snapshot.files.map((item) => item.path));
for (const item of snapshot.files) {
  const target = path.join(root, item.path);
  try {
    const data = await readFile(target);
    if (data.length !== item.bytes) findings.push(`${item.path}: snapshot byte count mismatch`);
    if (sha256(data) !== item.sha256) findings.push(`${item.path}: snapshot hash mismatch`);
  } catch (error) {
    if (error?.code === "ENOENT") findings.push(`${item.path}: missing snapshot file`);
    else throw error;
  }
}

for (const directory of snapshot.scope) {
  for (const file of await walk(path.join(root, directory))) {
    const relative = path.relative(root, file);
    if (!snapshotPaths.has(relative)) findings.push(`${relative}: not declared in source snapshot`);
  }
}

for (const file of await walk(root)) {
  const relative = path.relative(root, file);
  const basename = path.basename(file);
  if (basename === ".env" || (basename.startsWith(".env.") && basename !== ".env.example")) {
    findings.push(`${relative}: environment secret file must not be public`);
    continue;
  }
  const data = await readFile(file);
  if (data.includes(0)) continue;
  const text = data.toString("utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) findings.push(`${relative}:${pattern}`);
  }
  for (const literal of forbiddenCaseLiterals) {
    if (text.includes(literal)) findings.push(`${relative}:private case name fingerprint`);
  }
  for (const pattern of forbiddenCaseDatePatterns) {
    if (pattern.test(text)) findings.push(`${relative}:private case birth-date fingerprint`);
  }
}

if (snapshot.fileCount !== snapshot.files.length) findings.push("SOURCE_SNAPSHOT.json: fileCount mismatch");
if (snapshot.fileCount < 30) findings.push(`source snapshot unexpectedly small: ${snapshot.fileCount}`);

if (findings.length) {
  console.error(JSON.stringify({ status: "blocked", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  snapshotFiles: snapshot.fileCount,
}));
