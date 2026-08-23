import {
  ENGINE_CAPABILITIES,
  ENGINE_SOURCE_BY_ID,
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
  inferLifeDomains,
  type LifeDossier,
  type LifeDomain,
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
  entryIntent?: LegendSajuEntryIntent;
  outputMode?: LegendSajuOutputMode;
  maxClaims?: number;
}

export type LegendSajuEntryIntent =
  | "general_reading"
  | "compatibility"
  | "date_selection"
  | "divination"
  | "naming"
  | "expert";

export type LegendSajuOutputMode = "consumer" | "compact" | "evidence" | "debug";

export interface CapabilityExecutionPlan {
  entryIntent: LegendSajuEntryIntent;
  domains: LifeDomain[];
  requiredByInput: EngineCapabilityId[];
  core: EngineCapabilityId[];
  supporting: EngineCapabilityId[];
  requested: string[];
  selected: EngineCapabilityId[];
  unsupported: string[];
  omitted: { capabilityId: EngineCapabilityId; reason: string }[];
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
  executionPlan: CapabilityExecutionPlan;
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
  myeongri: ["사주", "명리", "추명학", "saju", "bazi", "four pillars", "myeongri", "八字", "四柱", "命理"],
  ziwei: ["자미두수", "자미", "비성", "zi wei", "ziwei", "紫微斗數", "紫微斗数"],
  juyeok: ["주역", "육십사괘", "효", "iching", "i ching", "周易", "易経"],
  yukim: ["육임", "대육임", "daliuren", "liuren", "大六壬"],
  gimun: ["기문", "기문둔갑", "qimen", "奇門遁甲", "奇门遁甲"],
  cheolpan: ["철판신수", "철판", "tieban", "鐵板神數", "铁板神数"],
  naming: ["작명", "성명학", "인명용", "naming", "姓名", "命名"],
  musok: ["무속", "무당", "신앙", "shamanic"],
};

const SYSTEM_DEFAULT_CAPABILITIES: Partial<Record<EngineSystem, EngineCapabilityId[]>> = {
  calendar: ["date_yinyang"],
  myeongri: ["chart", "myeongri_structure", "current_luck"],
  ziwei: ["ziwei_topology", "ziwei_horoscope"],
  juyeok: ["juyeok_cast"],
  yukim: ["yukim"],
  gimun: ["gimun"],
  cheolpan: ["cheolpan_shenshu"],
  naming: ["korean_name_analysis", "suri", "naming"],
};

const EXPLICIT_CAPABILITY_TERMS: Partial<Record<EngineCapabilityId, string[]>> = {
  taekil: ["택일", "좋은 날", "날짜 추천", "날을 골", "개업일", "계약일", "이사일", "수술일"],
  gaeun: ["개운", "운을 바꾸", "운을 올리"],
  gaeun_pro: ["개운", "색", "방위", "물건", "오행 처방"],
  ziwei_gaeun: ["자미 개운", "자미두수 개운"],
  compatibility: ["궁합", "두 사람", "남자친구", "여자친구", "배우자와", "연인과"],
  gimun: ["기문", "기문둔갑"],
  yukim: ["육임", "대육임"],
  juyeok_cast: ["주역", "괘", "효"],
  cheolpan_shenshu: ["철판", "철판신수"],
  suri: ["81수", "수리", "획수"],
  korean_name_analysis: ["이름 한자", "인명용 한자", "파자", "성명학"],
  naming: ["작명", "이름 추천"],
  naming_hanja: ["작명 한자", "이름 한자 추천"],
};

const ACTION_TERMS = ["개운", "행동", "무엇을 해야", "뭘 해야", "어떻게 해야", "조심할", "주의할", "구체적 액션", "실천"];
const DEEP_READING_TERMS = ["종합", "전체", "깊게", "상세", "교차", "자미", "원전", "관법", "유파"];
const BROAD_READING_TERMS = ["사주 봐", "운세 봐", "전체 운세", "종합 운세", "전반 운세", "총운"];

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[_/.,:;()[\]{}|]+/g, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(value: string): string[] {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length >= 2))];
}

function includesAny(query: string, terms: readonly string[]): boolean {
  return terms.some((term) => query.includes(normalize(term)));
}

function systemsForFilter(values: readonly string[] | undefined): Set<EngineSystem> {
  const resolved = new Set<EngineSystem>();
  const registeredSystems = new Set(Object.values(ENGINE_CAPABILITIES).map((capability) => capability.system));
  for (const raw of values ?? []) {
    const value = normalize(raw);
    for (const system of registeredSystems) {
      if (normalize(system) === value || (SYSTEM_ALIASES[system] ?? []).some((alias) => normalize(alias) === value)) {
        resolved.add(system);
      }
    }
  }
  return resolved;
}

export function isEngineCapabilityId(value: string): value is EngineCapabilityId {
  return Object.prototype.hasOwnProperty.call(ENGINE_CAPABILITIES, value);
}

/** Search the live registry. Results are derived from metadata, not a closed user-facing enum. */
export function searchCapabilities(input: CapabilitySearchInput): CapabilitySearchHit[] {
  const query = normalize(input.query);
  const tokens = queryTokens(query);
  const systemFilter = systemsForFilter(input.systems);
  const limit = Math.max(1, Math.min(input.limit ?? 12, 50));

  return Object.values(ENGINE_CAPABILITIES)
    .filter((capability) => !systemFilter.size || systemFilter.has(capability.system))
    .map((capability): CapabilitySearchHit => {
      const sourceTitles = capability.sourceIds.map((id) => ENGINE_SOURCE_BY_ID[id]?.title ?? id);
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
          const isSystemDefault = (SYSTEM_DEFAULT_CAPABILITIES[system] ?? []).includes(capability.id);
          score += isSystemDefault ? 8 : score > 0 ? 2 : 0;
          matches.add(system);
        }
      }
      const explicitTerms = EXPLICIT_CAPABILITY_TERMS[capability.id];
      if (explicitTerms?.length && !includesAny(query, explicitTerms)) score = 0;
      if (capability.evidenceRole === "primary") score += score > 0 ? 2 : 0;
      if (capability.evidenceRole === "blocked") score = Math.min(score, 1);

      return {
        id: capability.id,
        score,
        matches: [...matches],
        capability,
        sources: capability.sourceIds.map((id) => ENGINE_SOURCE_BY_ID[id]).filter(Boolean).map((source) => ({
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

function inputDrivenCapabilities(input: LegendSajuResolveInput, entryIntent: LegendSajuEntryIntent): EngineCapabilityId[] {
  const ids: EngineCapabilityId[] = [];
  if (entryIntent === "compatibility" && input.partnerBirth) ids.push("compatibility");
  if (entryIntent === "general_reading" && input.timelineRange) ids.push("life_timeline");
  if (entryIntent === "divination" && input.lineValues?.length) ids.push("juyeok_cast");
  if (entryIntent === "naming" && input.surnameStrokes?.length && input.givenStrokes?.length) ids.push("suri");
  if (entryIntent === "naming" && input.name) ids.push("korean_name_analysis");
  if (entryIntent === "general_reading" && !input.birth && input.targetDate) ids.push("date_yinyang");
  return ids;
}

function uniqueIds(ids: readonly EngineCapabilityId[]): EngineCapabilityId[] {
  return [...new Set(ids)];
}

function inferEntryIntent(input: LegendSajuResolveInput): LegendSajuEntryIntent {
  if (input.entryIntent) return input.entryIntent;
  if (input.requestedCapabilities?.length) return "expert";
  const question = normalize(input.question);
  if (input.name || input.surnameStrokes?.length || input.givenStrokes?.length || includesAny(question, DOMAIN_HINTS.naming.terms)) return "naming";
  if (input.partnerBirth || includesAny(question, EXPLICIT_CAPABILITY_TERMS.compatibility ?? [])) return "compatibility";
  if (input.lineValues?.length || includesAny(question, ["기문", "육임", "주역", "점괘", "점사"])) return "divination";
  if (includesAny(question, EXPLICIT_CAPABILITY_TERMS.taekil ?? [])) return "date_selection";
  return "general_reading";
}

function generalReadingCapabilities(input: LegendSajuResolveInput, domains: LifeDomain[]): { core: EngineCapabilityId[]; supporting: EngineCapabilityId[] } {
  const question = normalize(input.question);
  const core: EngineCapabilityId[] = input.birth ? ["chart", "myeongri_structure"] : [];
  const supporting: EngineCapabilityId[] = [];
  if (domains.some((domain) => ["identity", "career", "wealth", "relationship", "family", "health"].includes(domain))) {
    core.push("myeongri_judgment");
  }
  if (domains.includes("timing") && input.targetDate && input.birth?.gender) core.push("current_luck");
  if (input.timelineRange) core.push("life_timeline");
  if (includesAny(question, ACTION_TERMS)) core.push("recommend");
  if (includesAny(question, ["궁통보감", "고전", "원전", "조후", "격국", "용신"])) supporting.push("myeongri_doctrine");
  if (input.birth?.hour !== undefined && input.birth.gender && (includesAny(question, DEEP_READING_TERMS) || includesAny(question, BROAD_READING_TERMS))) {
    supporting.push("ziwei_topology", "ziwei_doctrine");
    if (domains.includes("timing") && input.targetDate) supporting.push("ziwei_horoscope");
    if (includesAny(question, ["비성", "궁간사화", "흠천", "자화"])) supporting.push("ziwei_palace_flying");
    if (includesAny(question, ["유파", "중주", "배치 비교"])) supporting.push("ziwei_lineage_compare");
  }
  if (input.lifeEvents?.length && input.birth) {
    supporting.push(input.birth.hour === undefined ? "event_rectification_matrix" : "event_validation_matrix");
  }
  if (includesAny(question, ["지식", "근거", "출처", "원문"])) supporting.push("knowledge_asset_router");
  return { core: uniqueIds(core), supporting: uniqueIds(supporting) };
}

function planCapabilities(input: LegendSajuResolveInput): CapabilityExecutionPlan {
  const question = normalize(input.question);
  const entryIntent = inferEntryIntent(input);
  const domains = inferLifeDomains(input.question);
  const requested = [...new Set(input.requestedCapabilities ?? [])];
  const unsupported = requested.filter((id) => !isEngineCapabilityId(id));
  const validRequested = requested.filter(isEngineCapabilityId);
  const requiredByInput = inputDrivenCapabilities(input, entryIntent);
  let core: EngineCapabilityId[] = [];
  let supporting: EngineCapabilityId[] = [];

  if (entryIntent === "general_reading") {
    ({ core, supporting } = generalReadingCapabilities(input, domains));
  } else if (entryIntent === "compatibility") {
    core = ["compatibility"];
  } else if (entryIntent === "date_selection") {
    core = ["taekil"];
    supporting = input.targetDate ? ["date_yinyang"] : [];
  } else if (entryIntent === "divination") {
    if (input.lineValues?.length || includesAny(question, ["주역", "괘", "효"])) core.push("juyeok_cast");
    if (includesAny(question, ["기문", "기문둔갑"])) core.push("gimun");
    if (includesAny(question, ["육임", "대육임"])) core.push("yukim");
    if (!core.length && input.questionDateTime) core.push("gimun", "yukim");
  } else if (entryIntent === "naming") {
    if (input.name) core.push("korean_name_analysis");
    if (input.surnameStrokes?.length && input.givenStrokes?.length) core.push("suri");
    if (input.birth && includesAny(question, ["작명", "이름 추천"])) supporting.push("naming", "naming_hanja");
  } else {
    core = validRequested.length
      ? []
      : searchCapabilities({ query: input.question, limit: input.maxAutoCapabilities ?? 8 }).map((hit) => hit.id);
  }

  const maxAuto = Math.max(0, Math.min(input.maxAutoCapabilities ?? 8, 20));
  const mandatory = uniqueIds(requiredByInput);
  const candidates = uniqueIds([...core, ...supporting]).filter((id) => !mandatory.includes(id));
  const boundedAuto = maxAuto === 0 ? [] : candidates.slice(0, maxAuto);
  const selected = uniqueIds([...validRequested, ...mandatory, ...boundedAuto]);
  const selectedSet = new Set(selected);
  const omitted = uniqueIds(candidates)
    .filter((id) => !selectedSet.has(id))
    .map((capabilityId) => ({ capabilityId, reason: "maxAutoCapabilities limit" }));
  return {
    entryIntent,
    domains,
    requiredByInput: mandatory,
    core: uniqueIds(core),
    supporting: uniqueIds(supporting),
    requested,
    selected,
    unsupported,
    omitted,
  };
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

  const executionPlan = planCapabilities(input);
  const { requested, selected, unsupported } = executionPlan;
  const requestedSet = new Set(requested.filter(isEngineCapabilityId));
  const autoSelected = selected.filter((id) => !requestedSet.has(id));

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
    executionPlan,
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
