import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();

async function readJson(relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

function invariant(condition, message) {
  if (!condition) throw new Error(`DATA_ASSET_CHECK_FAILED:${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const vault = await readJson("data/knowledge/myeongri-vault-trilingual.json");
const glossary = await readJson("data/knowledge/myeongri-trilingual-glossary.json");
const ziweiGlossary = await readJson("data/knowledge/ziwei-trilingual-glossary.json");
const sipsin = await readJson("data/knowledge/sipsin-ilgan-matrix.json");
const suriAudit = await readJson("data/knowledge/suri-81-primary-row-audit.json");
const hanjaSubset = await readJson("data/knowledge/hanja-naming-research-subset.json");
const juyeok = await readJson("data/knowledge/juyeok-64.json");
const zhougong = await readJson("data/dreams/zhougong-primary.json");
const artemidorus = await readJson("data/dreams/artemidorus-1644-primary.json");
const dreamSeeds = await readJson("data/dreams/cross-culture-seed-audit.json");
const dreamManifest = await readJson("data/dreams/source-manifest.json");
const nameRuntime = await readJson("src/naming/data/name-hanja-support.json");

const flattenedFacts = vault.areas.flatMap((area) => area.facts.map((fact) => ({ ...fact, area: area.areaKey })));
invariant(vault.total_facts === 777 && flattenedFacts.length === 777, "myeongri vault must contain 777 facts");
invariant(vault.area_count === 36 && vault.areas.length === 36, "myeongri vault must contain 36 areas");
invariant(glossary.count === 777 && glossary.entries.length === 777, "myeongri glossary must contain 777 entries");
invariant(ziweiGlossary.count === 214 && ziweiGlossary.entries.length === 214, "ziwei glossary must contain 214 entries");
invariant(sipsin.cells.length === 10 && sipsin.cells.every((row) => Object.keys(row.map).length === 10), "ten-god matrix must be 10 by 10");
invariant(suriAudit.rows.length === 81, "81-number primary audit must contain 81 rows");
invariant(hanjaSubset.count === 121 && Object.keys(hanjaSubset.chars).length === 121, "naming research subset must contain 121 entries");
invariant(Object.keys(juyeok.hexagrams).length === 64, "I Ching index must contain 64 hexagrams");

const runtimeSource = await readFile(path.join(root, "src/engine/myeongri-knowledge-trilingual.ts"), "utf8");
const factsMarker = "export const MYEONGRI_TRILINGUAL_FACTS: MyeongriTrilingualFact[] = ";
const factsMarkerIndex = runtimeSource.indexOf(factsMarker);
invariant(factsMarkerIndex >= 0, "embedded vault marker could not be located");
const factsStart = factsMarkerIndex + factsMarker.length;
const factsClosingIndex = runtimeSource.indexOf("\n];", factsStart);
invariant(factsClosingIndex > factsStart, "embedded vault array could not be located");
const factsEnd = factsClosingIndex + 2;
const embeddedFacts = JSON.parse(runtimeSource.slice(factsStart, factsEnd));
invariant(JSON.stringify(embeddedFacts) === JSON.stringify(flattenedFacts), "embedded 777-fact vault differs from canonical JSON");

const compressedOfficial = await readFile(path.join(root, "data/naming/korean-court-name-snapshot.json.gz"));
const officialBytes = gunzipSync(compressedOfficial);
const official = JSON.parse(officialBytes.toString("utf8"));
invariant(sha256(officialBytes) === "43e2361a1c2ec52490546495c13b0770431cb1562d07739ce881c810c17c6ae1", "official name source hash changed");
invariant(official.entries.length === 9495, "official name source must contain 9,495 entries");
invariant(nameRuntime.counts.officialEntries === 9495, "runtime name dataset must contain 9,495 entries");
invariant(nameRuntime.sources.koreanCourt.snapshotSha256 === sha256(officialBytes), "runtime name dataset source hash differs from compressed source observation");

invariant(zhougong.entries.length === 988, "Zhougong corpus must contain 988 entries");
invariant(artemidorus.sections.length === 211, "Artemidorus corpus must contain 211 sections");
invariant(dreamSeeds.concepts.length === 5, "cross-cultural dream seed audit must contain five concepts");
invariant(dreamManifest.activation.engineCapability === true, "the five audited dream concepts must remain available to the bounded engine");
invariant(dreamManifest.activation.activeCorpus.includes("5건"), "dream activation must remain limited to the five audited concepts");

console.log(JSON.stringify({
  status: "pass",
  knowledge: { facts: 777, areas: 36, myeongriTerms: 777, ziweiTerms: 214, sipsinCells: 100 },
  naming: { officialEntries: 9495, runtimeEntries: nameRuntime.counts.officialEntries },
  dreams: { zhougongEntries: 988, artemidorusSections: 211, auditedSeeds: 5, engineCapability: true },
}));
