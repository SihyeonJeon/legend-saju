import { getEngineManifest, resolve } from "../dist/index.js";

const manifest = getEngineManifest();
const result = resolve({
  question: "직업과 재물, 연애 결혼, 앞으로 3년을 종합해줘",
  birth: {
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    calendar: "solar",
    gender: "여",
    birthTimeAccuracy: "recorded",
    birthplace: "Synthetic example",
  },
  targetDate: { year: 2026, month: 8, day: 23, hour: 12 },
  timelineRange: { startYear: 2026, endYear: 2028 },
});

const available = result.routes.filter((route) => route.status !== "blocked");
const systems = [...new Set(result.dossier?.claims.map((claim) => claim.system) ?? [])];

process.stdout.write([
  "Legend Saju deterministic demo",
  `  ${manifest.capabilityCount} capabilities | ${manifest.sourceCount} source records | ${manifest.knowledge.factCount} embedded facts`,
  `  routed: ${result.selection.selected.join(", ")}`,
  `  available/partial: ${available.length} | claims: ${result.dossier?.claims.length ?? 0} | systems: ${systems.join(", ")}`,
  `  timeline: ${result.dossier?.timeline?.range.startYear ?? "-"}-${result.dossier?.timeline?.range.endYear ?? "-"}`,
  `  no model calls: ${result.noModelCalls} | publication side effects: ${result.publicationSideEffects}`,
  "",
  "First three evidence claims:",
  ...(result.dossier?.claims.slice(0, 3).map((claim) => `  - [${claim.system}/${claim.kind}] ${claim.statement}`) ?? []),
  "",
].join("\n"));
