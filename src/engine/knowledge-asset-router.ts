/**
 * Routes computed chart features into the multilingual knowledge vault.
 *
 * Vault entries are useful research summaries, but most do not identify an
 * edition, page, or stable URL.  They therefore remain support material and
 * never become executable doctrine or primary claims through this router.
 */
import {
  lookupMyeongriTerm,
  type MyeongriArea,
  type MyeongriTrilingualFact
} from "./myeongri-knowledge-trilingual";
import { analyzeMyeongriStructure } from "./myeongri-structure";
import type { SajuChart } from "./saju-engine";
import type { ZiweiChart } from "./ziwei-engine";

export type KnowledgeAssetSystem = "myeongri" | "ziwei" | "cross_system";

export interface KnowledgeSelector {
  value: string;
  derivedFrom: string;
  system: KnowledgeAssetSystem;
}

export interface RoutedKnowledgeAsset {
  id: string;
  system: KnowledgeAssetSystem;
  area: MyeongriArea;
  termKr: string;
  hanja: string;
  matchedBy: KnowledgeSelector[];
  definition: string;
  interpretation: string;
  relations: string;
  safety: string;
  school: string;
  sourceLabel: string;
  evidenceRole: "support";
  provenance: {
    grade: "legacy_summary_unlocated";
    locatable: false;
    executableRule: false;
    note: string;
  };
}

export interface KnowledgeAssetRoutingResult {
  selectors: KnowledgeSelector[];
  assets: RoutedKnowledgeAsset[];
  unmatchedSelectors: KnowledgeSelector[];
  truncated: boolean;
  boundary: string;
}

const STEM_TERM: Record<string, string> = {
  甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토",
  己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수"
};

const RELATION_SELECTORS: { pattern: RegExp; term: string }[] = [
  { pattern: /천간.*합|간합|오합/, term: "천간오합" },
  { pattern: /천간.*충|간충/, term: "천간충" },
  { pattern: /삼합/, term: "지지삼합" },
  { pattern: /육합|지지합/, term: "지지육합" },
  { pattern: /방합/, term: "방합" },
  { pattern: /반합/, term: "반합" },
  { pattern: /충/, term: "지지육충" },
  { pattern: /형/, term: "삼형" },
  { pattern: /파/, term: "육파" },
  { pattern: /해/, term: "육해" }
];

function uniqueSelectors(selectors: KnowledgeSelector[]): KnowledgeSelector[] {
  const seen = new Set<string>();
  return selectors.filter((selector) => {
    const key = `${selector.system}:${selector.value}:${selector.derivedFrom}`;
    if (!selector.value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function myeongriSelectors(chart: SajuChart): KnowledgeSelector[] {
  const structure = analyzeMyeongriStructure(chart);
  const tenGods = new Set(
    structure.tenGodPositions.flatMap((position) => [position.visible, ...position.hidden])
      .filter((value) => value && !value.includes("본인"))
  );
  const relationTerms = structure.relations.flatMap((relation) =>
    RELATION_SELECTORS.filter(({ pattern }) => pattern.test(relation)).map(({ term }) => ({
      value: term,
      derivedFrom: `원국 관계: ${relation}`,
      system: "myeongri" as const
    }))
  );
  const dayStem = STEM_TERM[chart.dayMaster.gan] ?? chart.dayMaster.ko;
  return uniqueSelectors([
    { value: dayStem, derivedFrom: `일간 ${chart.dayMaster.gan}`, system: "myeongri" },
    { value: `${dayStem} 조후요결`, derivedFrom: `일간 ${chart.dayMaster.gan}·월지 ${structure.monthCommand.branch}`, system: "myeongri" },
    { value: "월령 제강", derivedFrom: `월지 ${structure.monthCommand.branch}·본기 ${structure.monthCommand.mainQi}`, system: "myeongri" },
    ...[...tenGods].map((value) => ({ value, derivedFrom: "원국 십신 위치", system: "myeongri" as const })),
    ...relationTerms
  ]);
}

function ziweiSelectors(chart?: ZiweiChart): KnowledgeSelector[] {
  if (!chart) return [];
  const selectors: KnowledgeSelector[] = [{ value: "자미두수", derivedFrom: `명반 ${chart.lineageProfile.id}`, system: "ziwei" }];
  for (const palace of chart.palaces) {
    const palaceTerm = palace.name.endsWith("궁") ? palace.name : `${palace.name}궁`;
    selectors.push({ value: palaceTerm, derivedFrom: `${palace.name} 궁위`, system: "ziwei" });
    for (const star of palace.majorStars) {
      selectors.push({ value: star.name, derivedFrom: `${palace.name} 주성`, system: "ziwei" });
    }
  }
  return uniqueSelectors(selectors);
}

function assetSystem(fact: MyeongriTrilingualFact, selector: KnowledgeSelector): KnowledgeAssetSystem {
  if (fact.area.startsWith("ziwei_")) return "ziwei";
  if (selector.system === "ziwei") return "cross_system";
  return "myeongri";
}

function factKey(fact: MyeongriTrilingualFact): string {
  return `${fact.area}:${fact.termKr}:${fact.hanja}`;
}

function normalizedTerm(value: string): string {
  return value.toLowerCase().replace(/\([^)]*\)/g, "").replace(/\s+/g, "").trim();
}

function lookupSelector(selector: KnowledgeSelector): MyeongriTrilingualFact[] {
  const query = normalizedTerm(selector.value);
  return lookupMyeongriTerm(selector.value, 20).filter((fact) => {
    const sameTerm = [fact.termKr, fact.hanja, fact.cnTerm, fact.jpTerm]
      .some((token) => normalizedTerm(token) === query);
    if (!sameTerm) return false;
    const ziweiArea = fact.area.startsWith("ziwei_");
    return selector.system === "ziwei" ? ziweiArea : !ziweiArea;
  }).slice(0, 3);
}

function takeBalanced(assets: RoutedKnowledgeAsset[], maxAssets: number, hasZiwei: boolean): RoutedKnowledgeAsset[] {
  if (!hasZiwei) return assets.slice(0, maxAssets);
  const myeongri = assets.filter((asset) => asset.system === "myeongri");
  const ziwei = assets.filter((asset) => asset.system === "ziwei");
  const crossSystem = assets.filter((asset) => asset.system === "cross_system");
  const half = Math.floor(maxAssets / 2);
  const chosen = [...myeongri.slice(0, half), ...ziwei.slice(0, half)];
  const chosenIds = new Set(chosen.map((asset) => asset.id));
  for (const asset of [...myeongri.slice(half), ...ziwei.slice(half), ...crossSystem]) {
    if (chosen.length >= maxAssets) break;
    if (!chosenIds.has(asset.id)) {
      chosen.push(asset);
      chosenIds.add(asset.id);
    }
  }
  return chosen;
}

/**
 * Selects a bounded set of relevant vault entries.  Retrieval is deterministic;
 * no prose generation, publication, or hidden scoring happens here.
 */
export function routeKnowledgeAssets(chart: SajuChart, ziwei?: ZiweiChart, maxAssets = 24): KnowledgeAssetRoutingResult {
  const selectors = uniqueSelectors([...myeongriSelectors(chart), ...ziweiSelectors(ziwei)]);
  const matchedByKey = new Map<string, KnowledgeSelector[]>();
  const factByKey = new Map<string, MyeongriTrilingualFact>();
  const matchedSelectorKeys = new Set<string>();

  for (const selector of selectors) {
    const matches = lookupSelector(selector);
    if (matches.length) matchedSelectorKeys.add(`${selector.system}:${selector.value}:${selector.derivedFrom}`);
    for (const fact of matches) {
      const key = factKey(fact);
      factByKey.set(key, fact);
      const existing = matchedByKey.get(key) ?? [];
      existing.push(selector);
      matchedByKey.set(key, uniqueSelectors(existing));
    }
  }

  const allAssets = [...factByKey.entries()].map(([key, fact]): RoutedKnowledgeAsset => {
    const matchedBy = matchedByKey.get(key) ?? [];
    return {
      id: `vault:${key}`,
      system: assetSystem(fact, matchedBy[0] ?? { value: "", derivedFrom: "", system: "cross_system" }),
      area: fact.area,
      termKr: fact.termKr,
      hanja: fact.hanja,
      matchedBy,
      definition: fact.definition,
      interpretation: fact.interpretation,
      relations: fact.relations,
      safety: fact.safety,
      school: fact.school,
      sourceLabel: fact.source,
      evidenceRole: "support",
      provenance: {
        grade: "legacy_summary_unlocated",
        locatable: false,
        executableRule: false,
        note: "기존 지식 자산의 출처 표기는 보존했으나 판본·권차·쪽 또는 안정 URL이 없어 계산 규칙이나 1차 근거로 승격하지 않는다."
      }
    };
  });
  const assets = takeBalanced(allAssets, Math.max(0, maxAssets), Boolean(ziwei));
  const unmatchedSelectors = selectors.filter((selector) =>
    !matchedSelectorKeys.has(`${selector.system}:${selector.value}:${selector.derivedFrom}`)
  );
  return {
    selectors,
    assets,
    unmatchedSelectors,
    truncated: allAssets.length > assets.length,
    boundary: "계산된 특징으로 지식 자산을 찾았을 뿐, 검색 일치를 고전 규칙의 성립이나 생애 결론으로 간주하지 않는다."
  };
}
