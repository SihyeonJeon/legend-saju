import {
  ENGINE_CAPABILITIES,
  ENGINE_SOURCES,
  LEGACY_SAJU_INTENTS,
  preflightCapability,
  type CapabilityDescriptor,
  type CapabilityPreflight,
  type EngineCapabilityId,
  type EngineQueryShape,
  type EngineSystem,
} from "./engine-capabilities";
import {
  buildLifeDossier,
  type LifeDossier,
} from "./engine-v2";
import type { LifeEventEvidence } from "./life-timeline";
import type { SajuInput } from "./saju-engine";
import { getBirthDateValidationError } from "./saju-engine";
import {
  querySajuEngine,
  type SajuEvidence,
  type SajuQuery,
} from "./saju-engine-router";
import type { KoreanNameAnalysis, KoreanNameInput } from "../naming/index";

export interface LegendSajuDateInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

/**
 * The primary open-ended input contract. Capability IDs deliberately remain
 * strings: callers discover them from the live manifest instead of compiling
 * a finite intent enum into every client.
 */
export interface LegendSajuResolveInput {
  question: string;
  birth?: SajuInput;
  partnerBirth?: SajuInput;
  targetDate?: LegendSajuDateInput;
  questionDateTime?: LegendSajuDateInput;
  timelineRange?: { startYear: number; endYear: number };
  lifeEvents?: LifeEventEvidence[];
  requestedCapabilities?: readonly string[];
  lineValues?: number[];
  surnameStrokes?: number[];
  givenStrokes?: number[];
  name?: KoreanNameInput;
  rangeDays?: number;
  purpose?: string;
  asOfYear?: number;
  maxAutoCapabilities?: number;
}

export interface CapabilitySearchInput {
  query: string;
  limit?: number;
  systems?: readonly string[];
}

export interface CapabilitySearchHit {
  id: EngineCapabilityId;
  score: number;
  matches: string[];
  capability: CapabilityDescriptor;
  sources: { id: string; title: string; uri: string }[];
}

export interface LegendSajuResolution {
  question: string;
  selection: {
    requested: string[];
    autoSelected: EngineCapabilityId[];
    selected: EngineCapabilityId[];
    unsupported: string[];
  };
  routes: CapabilityPreflight[];
  dossier?: LifeDossier;
  evidence: SajuEvidence[];
  nameAnalysis?: KoreanNameAnalysis;
  noModelCalls: true;
  publicationSideEffects: false;
  interpretationBoundary: string;
}

const DOMAIN_HINTS: Record<string, { terms: string[]; domains: string[] }> = {
  identity: {
    terms: ["전체", "인생", "성격", "성향", "원국", "타고난", "나 자신", "identity", "personality", "life reading", "性格", "人生"],
    domains: ["identity", "life_domains"],
  },
  career: {
    terms: ["직업", "직장", "취업", "이직", "사업", "창업", "승진", "적성", "career", "job", "work", "employment", "promotion", "business", "startup", "工作", "職業", "転職"],
    domains: ["career", "action"],
  },
  wealth: {
    terms: ["돈", "재물", "수입", "자산", "부자", "재테크", "wealth", "money", "income", "assets", "finance", "investment", "財運", "金運", "収入"],
    domains: ["wealth", "action"],
  },
  relationship: {
    terms: ["연애", "결혼", "궁합", "배우자", "남자친구", "여자친구", "이혼", "재혼", "relationship", "love", "dating", "marriage", "spouse", "compatibility", "divorce", "remarriage", "恋愛", "婚姻", "結婚", "配偶"],
    domains: ["relationship"],
  },
  family: {
    terms: ["가족", "부모", "자녀", "아이", "형제", "집안", "family", "parent", "child", "children", "家庭", "家族", "子女"],
    domains: ["family"],
  },
  health: {
    terms: ["건강", "질병", "수술", "몸", "health", "illness", "surgery", "健康", "疾病"],
    domains: ["health"],
  },
  timing: {
    terms: ["올해", "내년", "언제", "시기", "운세", "대운", "세운", "몇 년", "timing", "this year", "next year", "years", "luck", "fortune", "forecast", "今年", "明年", "来年", "運勢"],
    domains: ["timing", "yearly_timing", "life_stages"],
  },
  decision: {
    terms: ["선택", "결정", "택일", "계약", "이사", "개업", "질문 시각", "decision", "choose", "choice", "contract", "move", "relocate", "opening date", "選択", "契約", "移転"],
    domains: ["decision", "direction", "home", "action"],
  },
  naming: {
    terms: ["이름", "작명", "성명학", "인명용", "한자", "naming", "name", "hanja", "name character", "姓名", "命名"],
    domains: ["naming"],
  },
};

const SYSTEM_ALIASES: Partial<Record<EngineSystem, string[]>> = {
  calendar: ["만세력", "일진", "절기", "calendar", "萬年曆", "万年历"],
  myeongri: ["사주", "명리", "추명학", "bazi", "four pillars", "myeongri", "八字", "四柱", "命理"],
  ziwei: ["자미두수", "자미", "비성", "zi wei", "ziwei", "紫微斗數", "紫微斗数"],
  juyeok: ["주역", "육십사괘", "효", "iching", "i ching", "周易", "易経"],
  yukim: ["육임", "대육임", "daliuren", "liuren", "大六壬"],
  gimun: ["기문", "기문둔갑", "qimen", "奇門遁甲", "奇门遁甲"],
  cheolpan: ["철판신수", "철판", "tieban", "鐵板神數", "铁板神数"],
  naming: ["작명", "성명학", "인명용", "naming", "姓名", "命名"],
  musok: ["무속", "무당", "신앙", "shamanic"],
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[_/.,:;()[\]{}|]+/g, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(value: string): string[] {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length >= 2))];
}

export function isEngineCapabilityId(value: string): value is EngineCapabilityId {
  return Object.prototype.hasOwnProperty.call(ENGINE_CAPABILITIES, value);
}

/** Search the live registry. Results are derived from metadata, not a closed user-facing enum. */
export function searchCapabilities(input: CapabilitySearchInput): CapabilitySearchHit[] {
  const query = normalize(input.query);
  const tokens = queryTokens(query);
  const systemFilter = new Set((input.systems ?? []).map(normalize));
  const limit = Math.max(1, Math.min(input.limit ?? 12, 50));

  return Object.values(ENGINE_CAPABILITIES)
    .filter((capability) => !systemFilter.size || systemFilter.has(normalize(capability.system)))
    .map((capability): CapabilitySearchHit => {
      const sourceTitles = capability.sourceIds.map((id) => ENGINE_SOURCES[id]?.title ?? id);
      const haystack = normalize([
        capability.id,
        capability.system,
        capability.lineage,
        capability.note,
        ...capability.domains,
        ...sourceTitles,
      ].join(" "));
      let score = 0;
      const matches = new Set<string>();

      if (query === normalize(capability.id)) {
        score += 100;
        matches.add("exact capability ID");
      }
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += token.length >= 4 ? 6 : 3;
          matches.add(token);
        }
      }
      for (const [theme, hint] of Object.entries(DOMAIN_HINTS)) {
        if (hint.terms.some((term) => query.includes(normalize(term))) && hint.domains.some((domain) => capability.domains.includes(domain))) {
          score += 8;
          matches.add(theme);
        }
      }
      for (const [system, aliases] of Object.entries(SYSTEM_ALIASES) as [EngineSystem, string[]][]) {
        if (capability.system === system && aliases.some((alias) => query.includes(normalize(alias)))) {
          score += 20;
          matches.add(system);
        }
      }
      if (capability.evidenceRole === "primary") score += score > 0 ? 2 : 0;
      if (capability.evidenceRole === "blocked") score = Math.min(score, 1);

      return {
        id: capability.id,
        score,
        matches: [...matches],
        capability,
        sources: capability.sourceIds.map((id) => ENGINE_SOURCES[id]).filter(Boolean).map((source) => ({
          id: source.id,
          title: source.title,
          uri: source.uri,
        })),
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function queryContext(input: LegendSajuResolveInput, id?: EngineCapabilityId): EngineQueryShape {
  const questionDateCapability = id === "gimun" || id === "yukim";
  const declaredSurnameStrokes = input.name?.surname.every((item) => item.declaredStrokeCount !== undefined)
    ? input.name.surname.map((item) => item.declaredStrokeCount as number)
    : undefined;
  const declaredGivenStrokes = input.name?.givenName.every((item) => item.declaredStrokeCount !== undefined)
    ? input.name.givenName.map((item) => item.declaredStrokeCount as number)
    : undefined;
  return {
    birth: input.birth,
    birthA: input.birth,
    birthB: input.partnerBirth,
    date: questionDateCapability
      ? input.questionDateTime ?? input.targetDate
      : input.targetDate ?? input.questionDateTime,
    lineValues: input.lineValues,
    surnameStrokes: input.surnameStrokes ?? declaredSurnameStrokes,
    givenStrokes: input.givenStrokes ?? declaredGivenStrokes,
    name: input.name,
    pastEvents: input.lifeEvents,
  };
}

function isLegacyIntent(id: EngineCapabilityId): id is SajuQuery["intent"] {
  return (LEGACY_SAJU_INTENTS as readonly string[]).includes(id);
}

function toLegacyQuery(input: LegendSajuResolveInput, intent: SajuQuery["intent"]): SajuQuery {
  const context = queryContext(input, intent);
  return {
    intent,
    birth: context.birth,
    birthA: context.birthA,
    birthB: context.birthB,
    date: context.date,
    lineValues: input.lineValues,
    surnameStrokes: input.surnameStrokes,
    givenStrokes: input.givenStrokes,
    rangeDays: input.rangeDays,
    purpose: input.purpose,
    asOfYear: input.asOfYear ?? input.targetDate?.year,
  };
}

function inputDrivenCapabilities(input: LegendSajuResolveInput): EngineCapabilityId[] {
  const ids: EngineCapabilityId[] = [];
  if (input.birth) ids.push("cross_system_life_dossier");
  if (input.partnerBirth) ids.push("compatibility");
  if (input.timelineRange) ids.push("life_timeline");
  if (input.lineValues?.length) ids.push("juyeok_cast");
  if (input.surnameStrokes?.length && input.givenStrokes?.length) ids.push("suri");
  if (input.name) ids.push("korean_name_analysis");
  if (!input.birth && input.targetDate) ids.push("date_yinyang");
  return ids;
}

function uniqueIds(ids: readonly EngineCapabilityId[]): EngineCapabilityId[] {
  return [...new Set(ids)];
}

/**
 * Resolve an open-ended request into deterministic calculations and evidence.
 * This function performs no network request, model call, credential lookup, or publication.
 */
function resolveBase(input: LegendSajuResolveInput): LegendSajuResolution {
  const question = input.question?.trim();
  if (!question) throw new Error("QUESTION_REQUIRED: question must be a non-empty string.");
  for (const [field, date] of [["targetDate", input.targetDate], ["questionDateTime", input.questionDateTime]] as const) {
    if (!date) continue;
    const dateError = getBirthDateValidationError({ ...date, calendar: "solar" });
    if (dateError) throw new Error(`INVALID_${field === "targetDate" ? "TARGET_DATE" : "QUESTION_DATETIME"}: ${dateError}`);
  }

  const requested = [...new Set(input.requestedCapabilities ?? [])];
  const unsupported = requested.filter((id) => !isEngineCapabilityId(id));
  const validRequested = requested.filter(isEngineCapabilityId);
  const maxAuto = Math.max(0, Math.min(input.maxAutoCapabilities ?? 8, 20));
  const searched = maxAuto > 0
    ? searchCapabilities({ query: question, limit: maxAuto }).map((hit) => hit.id)
    : [];
  const autoSelected = uniqueIds([...inputDrivenCapabilities(input), ...searched])
    .filter((id) => !validRequested.includes(id));
  if (input.birth && !autoSelected.some(isLegacyIntent) && !validRequested.some(isLegacyIntent)) {
    autoSelected.push("chart");
  }
  const selected = uniqueIds([...validRequested, ...autoSelected]);

  const evidence = selected
    .filter(isLegacyIntent)
    .map((intent) => querySajuEngine(toLegacyQuery(input, intent)));

  const dossier = input.birth
    ? buildLifeDossier({
        birth: input.birth,
        question,
        targetDate: input.targetDate,
        questionDateTime: input.questionDateTime,
        partnerBirth: input.partnerBirth,
        timelineRange: input.timelineRange,
        lifeEvents: input.lifeEvents,
        requestedCapabilities: selected,
      })
    : undefined;
  const routeById = new Map<EngineCapabilityId, CapabilityPreflight>();
  for (const id of selected) routeById.set(id, preflightCapability(id, queryContext(input, id)));
  for (const route of dossier?.routes ?? []) routeById.set(route.capability.id, route);

  return {
    question,
    selection: { requested, autoSelected, selected, unsupported },
    routes: [...routeById.values()],
    dossier,
    evidence,
    noModelCalls: true,
    publicationSideEffects: false,
    interpretationBoundary: "The engine returns reproducible calculations, source metadata, school boundaries, and bounded interpretations. A client may explain them, but must not silently upgrade them into guaranteed events.",
  };
}

/** Synchronous compatibility path for calculations that do not load the large naming dataset. */
export function resolve(input: LegendSajuResolveInput): LegendSajuResolution {
  if (input.name) {
    throw new Error("NAME_ANALYSIS_REQUIRES_ASYNC_RESOLVER: use resolveAsync when actual Korean name characters are supplied.");
  }
  return resolveBase(input);
}

/** Open-ended path used by MCP. The 9,495-entry naming dataset is loaded only when requested. */
export async function resolveAsync(input: LegendSajuResolveInput): Promise<LegendSajuResolution> {
  const result = resolveBase(input);
  if (!input.name) return result;
  const { analyzeKoreanName } = await import("../naming/index");
  return { ...result, nameAnalysis: analyzeKoreanName(input.name) };
}
