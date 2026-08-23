import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(target));
    else output.push(target);
  }
  return output;
}

const scope = ["src", "tests", "data"];
const paths = (await Promise.all(scope.map((directory) => walk(path.join(root, directory)))))
  .flat()
  .map((file) => path.relative(root, file))
  .sort((a, b) => a.localeCompare(b));

const files = [];
for (const relative of paths) {
  const data = await readFile(path.join(root, relative));
  files.push({
    path: relative,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}

const snapshot = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  scope,
  fileCount: files.length,
  totalBytes: files.reduce((total, file) => total + file.bytes, 0),
  files,
};

await writeFile(path.join(root, "SOURCE_SNAPSHOT.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify({ status: "updated", fileCount: snapshot.fileCount, totalBytes: snapshot.totalBytes }));
