/** Deterministic life timeline and no-score birth-time rectification matrix. */
import { computeSajuChartEnvelope } from "./myeongri-structure";
import {
  evaluateMyeongriJudgment,
  tenGodFamilyOf,
  tenGodForStem,
  type TenGod,
  type TenGodFamily
} from "./myeongri-judgment";
import { computeSajuChart, type SajuChart, type SajuInput } from "./saju-engine";
import { currentLuck } from "./saju-engine-advanced";
import {
  computeZiweiHoroscope,
  type ZiweiTransformationKind,
  type ZiweiTransformationLayerId
} from "./ziwei-engine";

export type LifeEventDomain = "career" | "wealth" | "relationship" | "family" | "health" | "move" | "education" | "other";

export interface LifeEventEvidence {
  year: number;
  month?: number;
  domain: LifeEventDomain;
  description: string;
}

export interface TransitInteraction {
  transit: "da_yun" | "annual";
  transitPillar: string;
  natalPillar: "year" | "month" | "day" | "time";
  natalPillarValue: string;
  relation: "stem_combine" | "stem_clash" | "branch_combine" | "branch_clash" | "branch_harm" | "branch_break" | "branch_punishment" | "three_harmony_axis";
  tokens: string;
}

export interface TransitPairInteraction {
  left: "da_yun";
  right: "annual";
  leftPillar: string;
  rightPillar: string;
  relation: TransitInteraction["relation"];
  tokens: string;
}

export type LifeTimelineDomain =
  "identity" | "career" | "wealth" | "relationship" | "family" |
  "health" | "move" | "education" | "other";

export interface MyeongriTransitRole {
  layer: "da_yun" | "annual";
  pillar: string;
  stemTenGod: Exclude<TenGod, "일주">;
  family: Exclude<TenGodFamily, "self">;
  candidateDomains: LifeTimelineDomain[];
  patternFunctionContact: boolean;
}

export interface TimelineZiweiTransformation {
  layer: Extract<ZiweiTransformationLayerId, "decadal" | "yearly">;
  transformation: ZiweiTransformationKind;
  star: string;
  natalPalace: string | null;
  layerPalace: string | null;
  candidateDomains: LifeTimelineDomain[];
}

export interface LifeTimelineDomainEvidence {
  system: "myeongri" | "ziwei";
  layer: "da_yun" | "annual" | "decadal" | "yearly";
  code: string;
  observations: string[];
}

export interface LifeTimelineDomainWindow {
  domain: LifeTimelineDomain;
  coverage: "myeongri_only" | "ziwei_only" | "parallel_evidence";
  evidence: LifeTimelineDomainEvidence[];
  boundary: string;
}

export interface LifeTimelineYear {
  year: number;
  daYun: string;
  daYunAge: string;
  seYun: string;
  daYunTransition: boolean;
  myeongriInteractions: TransitInteraction[];
  transitPairInteractions: TransitPairInteraction[];
  myeongriTransitRoles: MyeongriTransitRole[];
  ziwei: {
    profileId: string;
    decadal: { name: string; branch: string; palaceNames: string[] };
    yearly: { name: string; branch: string; palaceNames: string[]; mutagenStars: string[] };
    transformations: TimelineZiweiTransformation[];
  };
  domainWindows: LifeTimelineDomainWindow[];
}

export interface LifeTimeline {
  range: { startYear: number; endYear: number; anchorMonth: number; anchorDay: number };
  years: LifeTimelineYear[];
  transitionYears: number[];
  sourceIds: string[];
  boundary: string;
}

const GAN_COMBINE = new Set(["甲己", "乙庚", "丙辛", "丁壬", "戊癸"]);
const GAN_CLASH = new Set(["甲庚", "乙辛", "丙壬", "丁癸"]);
const BRANCH_COMBINE = new Set(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]);
const BRANCH_CLASH = new Set(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]);
const BRANCH_HARM = new Set(["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"]);
const BRANCH_BREAK = new Set(["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"]);
const THREE_HARMONY = [new Set(["申", "子", "辰"]), new Set(["寅", "午", "戌"]), new Set(["巳", "酉", "丑"]), new Set(["亥", "卯", "未"])];
const PUNISHMENT_GROUPS = [new Set(["寅", "巳", "申"]), new Set(["丑", "戌", "未"]), new Set(["子", "卯"])];
const SELF_PUNISH = new Set(["辰", "午", "酉", "亥"]);
const NATAL_PILLARS = ["year", "month", "day", "time"] as const;

function hasPair(set: Set<string>, a: string, b: string): boolean {
  return set.has(`${a}${b}`) || set.has(`${b}${a}`);
}

function interactionRelations(transitGan: string, transitZhi: string, natalGan: string, natalZhi: string): { relation: TransitInteraction["relation"]; tokens: string }[] {
  const out: { relation: TransitInteraction["relation"]; tokens: string }[] = [];
  if (hasPair(GAN_COMBINE, transitGan, natalGan)) out.push({ relation: "stem_combine", tokens: `${transitGan}${natalGan}` });
  if (hasPair(GAN_CLASH, transitGan, natalGan)) out.push({ relation: "stem_clash", tokens: `${transitGan}${natalGan}` });
  if (hasPair(BRANCH_COMBINE, transitZhi, natalZhi)) out.push({ relation: "branch_combine", tokens: `${transitZhi}${natalZhi}` });
  if (hasPair(BRANCH_CLASH, transitZhi, natalZhi)) out.push({ relation: "branch_clash", tokens: `${transitZhi}${natalZhi}` });
  if (hasPair(BRANCH_HARM, transitZhi, natalZhi)) out.push({ relation: "branch_harm", tokens: `${transitZhi}${natalZhi}` });
  if (hasPair(BRANCH_BREAK, transitZhi, natalZhi)) out.push({ relation: "branch_break", tokens: `${transitZhi}${natalZhi}` });
  if ((transitZhi === natalZhi && SELF_PUNISH.has(transitZhi)) || PUNISHMENT_GROUPS.some((group) => group.has(transitZhi) && group.has(natalZhi) && transitZhi !== natalZhi)) {
    out.push({ relation: "branch_punishment", tokens: `${transitZhi}${natalZhi}` });
  }
  if (THREE_HARMONY.some((group) => group.has(transitZhi) && group.has(natalZhi) && transitZhi !== natalZhi)) {
    out.push({ relation: "three_harmony_axis", tokens: `${transitZhi}${natalZhi}` });
  }
  return out;
}

export function transitPairInteractions(daYun: string, annual: string): TransitPairInteraction[] {
  const [daYunGan, daYunZhi] = daYun;
  const [annualGan, annualZhi] = annual;
  if (!daYunGan || !daYunZhi || !annualGan || !annualZhi) return [];
  return interactionRelations(daYunGan, daYunZhi, annualGan, annualZhi).map(({ relation, tokens }) => ({
    left: "da_yun",
    right: "annual",
    leftPillar: daYun,
    rightPillar: annual,
    relation,
    tokens
  }));
}

export function transitInteractions(chart: SajuChart, transitPillar: string, transit: TransitInteraction["transit"]): TransitInteraction[] {
  const transitGan = transitPillar[0];
  const transitZhi = transitPillar[1];
  if (!transitGan || !transitZhi) return [];
  return NATAL_PILLARS.flatMap((natalPillar) => {
    const natal = chart.pillars[natalPillar];
    return interactionRelations(transitGan, transitZhi, natal.gan, natal.zhi).map(({ relation, tokens }) => ({
      transit,
      transitPillar,
      natalPillar,
      natalPillarValue: natal.gz,
      relation,
      tokens
    }));
  });
}

const DOMAIN_ORDER: LifeTimelineDomain[] = [
  "identity", "career", "wealth", "relationship", "family", "health", "move", "education", "other"
];

function domainsForMyeongriRole(
  family: Exclude<TenGodFamily, "self">,
  interactions: TransitInteraction[]
): LifeTimelineDomain[] {
  const domains = new Set<LifeTimelineDomain>();
  if (family === "wealth") domains.add("wealth");
  if (family === "officer" || family === "output") domains.add("career");
  if (family === "resource") domains.add("education");
  if (interactions.some((interaction) => interaction.natalPillar === "day")) {
    domains.add("identity");
    domains.add("relationship");
  }
  if (interactions.some((interaction) => interaction.natalPillar === "year" || interaction.natalPillar === "time")) {
    domains.add("family");
  }
  if (!domains.size) domains.add("other");
  return DOMAIN_ORDER.filter((domain) => domains.has(domain));
}

const ZIWEI_DOMAIN_ALIASES: Record<LifeTimelineDomain, string[]> = {
  identity: ["명", "命", "복덕", "福德"],
  career: ["관록", "官祿", "官禄", "노복", "奴僕", "奴仆", "교우", "交友"],
  wealth: ["재백", "財帛", "财帛", "전택", "田宅"],
  relationship: ["부처", "夫妻"],
  family: ["부모", "父母", "자녀", "子女", "형제", "兄弟"],
  health: ["질액", "疾厄"],
  move: ["천이", "遷移", "迁移"],
  education: [],
  other: []
};

function domainsForZiweiPalaces(...palaces: (string | null)[]): LifeTimelineDomain[] {
  const domains = new Set<LifeTimelineDomain>();
  for (const palace of palaces.filter((value): value is string => Boolean(value))) {
    for (const domain of DOMAIN_ORDER) {
      if (ZIWEI_DOMAIN_ALIASES[domain].some((alias) => palace.includes(alias))) domains.add(domain);
    }
  }
  return DOMAIN_ORDER.filter((domain) => domains.has(domain));
}

function buildDomainWindows(
  roles: MyeongriTransitRole[],
  interactions: TransitInteraction[],
  transformations: TimelineZiweiTransformation[]
): LifeTimelineDomainWindow[] {
  const evidence = new Map<LifeTimelineDomain, LifeTimelineDomainEvidence[]>();
  const add = (domain: LifeTimelineDomain, item: LifeTimelineDomainEvidence) => {
    const rows = evidence.get(domain) ?? [];
    rows.push(item);
    evidence.set(domain, rows);
  };
  for (const role of roles) {
    const contacts = interactions.filter((interaction) => interaction.transit === role.layer);
    for (const domain of role.candidateDomains) {
      add(domain, {
        system: "myeongri",
        layer: role.layer,
        code: `${role.layer}:${role.pillar}:${role.stemTenGod}`,
        observations: [
          `${role.pillar} 천간=${role.stemTenGod}(${role.family})`,
          role.patternFunctionContact ? "원국 격국 기능 후보와 같은 십신군" : "원국 격국 기능 후보와 다른 십신군",
          ...contacts.map((contact) => `${contact.natalPillar}:${contact.natalPillarValue}:${contact.relation}:${contact.tokens}`)
        ]
      });
    }
  }
  for (const transformation of transformations) {
    for (const domain of transformation.candidateDomains) {
      add(domain, {
        system: "ziwei",
        layer: transformation.layer,
        code: `${transformation.layer}:${transformation.transformation}:${transformation.star}`,
        observations: [
          `화${transformation.transformation}:${transformation.star}`,
          `원궁 ${transformation.natalPalace ?? "미확인"}`,
          `운궁 ${transformation.layerPalace ?? "미확인"}`
        ]
      });
    }
  }
  return DOMAIN_ORDER.flatMap((domain): LifeTimelineDomainWindow[] => {
    const rows = evidence.get(domain) ?? [];
    if (!rows.length) return [];
    const systems = new Set(rows.map((row) => row.system));
    return [{
      domain,
      coverage: systems.size === 2 ? "parallel_evidence" : systems.has("myeongri") ? "myeongri_only" : "ziwei_only",
      evidence: rows,
      boundary: "영역 후보와 구조 접촉을 한 창에 모은 값이다. 두 체계가 함께 나타나도 사건 발생·길흉·인과의 합의가 아니다."
    }];
  });
}

export function buildLifeTimeline(
  input: SajuInput,
  range: { startYear: number; endYear: number },
  anchor: { month: number; day: number } = { month: 6, day: 1 }
): LifeTimeline {
  if (input.hour === undefined) throw new Error("BIRTH_TIME_REQUIRED: 생애 시간축에는 출생시각이 필요하다.");
  if (!input.gender) throw new Error("GENDER_REQUIRED: 대운과 자미 운한에는 성별이 필요하다.");
  if (!Number.isInteger(range.startYear) || !Number.isInteger(range.endYear) || range.endYear < range.startYear) throw new Error("INVALID_TIMELINE_RANGE");
  if (range.endYear - range.startYear > 29) throw new Error("TIMELINE_RANGE_TOO_LARGE: 한 번에 최대 30년이다.");
  const chart = computeSajuChart(input);
  const judgment = evaluateMyeongriJudgment(chart);
  const patternFamilies = new Set(
    judgment.usefulGods.lenses.find((lens) => lens.id === "pattern_function")?.candidateFamilies ?? []
  );
  const years: LifeTimelineYear[] = [];
  let previousDaYun: string | undefined;
  for (let year = range.startYear; year <= range.endYear; year += 1) {
    const luck = currentLuck(input, year);
    const ziwei = computeZiweiHoroscope(input, { year, month: anchor.month, day: anchor.day, hour: 12 });
    const daYunTransition = previousDaYun !== undefined && previousDaYun !== luck.daYun;
    const myeongriInteractions = [
      ...transitInteractions(chart, luck.daYun, "da_yun"),
      ...transitInteractions(chart, luck.seYun, "annual")
    ];
    const myeongriTransitRoles = ([
      { layer: "da_yun" as const, pillar: luck.daYun },
      { layer: "annual" as const, pillar: luck.seYun }
    ]).flatMap(({ layer, pillar }): MyeongriTransitRole[] => {
      const stem = pillar[0];
      if (!stem) return [];
      const stemTenGod = tenGodForStem(chart.dayMaster.gan, stem);
      const family = tenGodFamilyOf(stemTenGod) as Exclude<TenGodFamily, "self">;
      const layerInteractions = myeongriInteractions.filter((interaction) => interaction.transit === layer);
      return [{
        layer,
        pillar,
        stemTenGod,
        family,
        candidateDomains: domainsForMyeongriRole(family, layerInteractions),
        patternFunctionContact: patternFamilies.has(family)
      }];
    });
    const transformations = ziwei.transformationLayers
      .filter((layer): layer is typeof layer & { layer: "decadal" | "yearly" } => layer.layer === "decadal" || layer.layer === "yearly")
      .flatMap((layer) => layer.entries.map((entry): TimelineZiweiTransformation => ({
        layer: layer.layer,
        transformation: entry.transformation,
        star: entry.star,
        natalPalace: entry.natalPalace,
        layerPalace: entry.layerPalace,
        candidateDomains: domainsForZiweiPalaces(entry.natalPalace, entry.layerPalace)
      })));
    years.push({
      year,
      daYun: luck.daYun,
      daYunAge: luck.daYunAge,
      seYun: luck.seYun,
      daYunTransition,
      myeongriInteractions,
      transitPairInteractions: transitPairInteractions(luck.daYun, luck.seYun),
      myeongriTransitRoles,
      ziwei: {
        profileId: ziwei.lineageProfile.id,
        decadal: { name: ziwei.decadal.name, branch: ziwei.decadal.earthlyBranch, palaceNames: ziwei.decadal.palaceNames },
        yearly: { name: ziwei.yearly.name, branch: ziwei.yearly.earthlyBranch, palaceNames: ziwei.yearly.palaceNames, mutagenStars: ziwei.yearly.mutagenStars },
        transformations
      },
      domainWindows: buildDomainWindows(myeongriTransitRoles, myeongriInteractions, transformations)
    });
    previousDaYun = luck.daYun;
  }
  return {
    range: { startYear: range.startYear, endYear: range.endYear, anchorMonth: anchor.month, anchorDay: anchor.day },
    years,
    transitionYears: years.filter((year) => year.daYunTransition).map((year) => year.year),
    sourceIds: ["lunar-typescript", "iztro-config", "iztro-astrolabe", "sanming-tonghui"],
    boundary: "연도별 간지·운한 배치, 대운·세운 상호작용, 십신 역할, 원국 접촉, 자미 대한·유년 사화의 궁 영역을 계산한 시간축이다. 접촉 수가 많거나 두 체계가 함께 나타난다는 이유로 좋고 나쁨이나 사건 발생을 점수화하지 않는다."
  };
}

export interface LifeEventValidationEntry {
  event: LifeEventEvidence;
  coverage: "parallel_evidence" | "single_system" | "not_covered";
  systems: ("myeongri" | "ziwei")[];
  evidence: LifeTimelineDomainEvidence[];
}

export interface LifeEventValidationMatrix {
  status: "not_applicable" | "all_events_routed" | "mixed_coverage" | "no_events_routed";
  entries: LifeEventValidationEntry[];
  sourceIds: string[];
  boundary: string;
}

/** 출생시각이 알려진 경우 과거 사건 영역과 당시 구조 자료의 유무만 대조한다. */
export function buildLifeEventValidationMatrix(input: SajuInput, events: LifeEventEvidence[]): LifeEventValidationMatrix {
  if (!events.length) return { status: "not_applicable", entries: [], sourceIds: [], boundary: "검증할 과거 사건이 없다." };
  if (input.hour === undefined) throw new Error("BIRTH_TIME_REQUIRED: 알려진 시각의 사건 검증에는 출생시각이 필요하다.");
  if (!input.gender) throw new Error("GENDER_REQUIRED: 사건 검증에는 성별이 필요하다.");
  if (events.length > 20) throw new Error("TOO_MANY_LIFE_EVENTS: 한 번에 최대 20건이다.");
  const yearCache = new Map<number, LifeTimelineYear>();
  const entries = events.map((event): LifeEventValidationEntry => {
    let year = yearCache.get(event.year);
    if (!year) {
      year = buildLifeTimeline(input, { startYear: event.year, endYear: event.year }, { month: event.month ?? 6, day: 1 }).years[0];
      yearCache.set(event.year, year);
    }
    const window = year.domainWindows.find((candidate) => candidate.domain === event.domain);
    const systems = [...new Set(window?.evidence.map((item) => item.system) ?? [])];
    return {
      event,
      coverage: systems.length === 2 ? "parallel_evidence" : systems.length === 1 ? "single_system" : "not_covered",
      systems,
      evidence: window?.evidence ?? []
    };
  });
  const coveredCount = entries.filter((entry) => entry.coverage !== "not_covered").length;
  return {
    status: coveredCount === entries.length ? "all_events_routed" : coveredCount === 0 ? "no_events_routed" : "mixed_coverage",
    entries,
    sourceIds: ["lunar-typescript", "iztro-config", "iztro-astrolabe", "sanming-tonghui"],
    boundary: "회고 사건의 영역과 당시 계산 가능한 구조 자료를 대조한다. 자료가 있으면 사건을 맞혔다는 뜻이 아니고, 자료가 없으면 사건을 반증하는 것도 아니다. 설명 문장을 자동 채점하거나 확률·적중률을 만들지 않는다."
  };
}

export interface CandidateEventSignature {
  event: LifeEventEvidence;
  daYun: string;
  seYun: string;
  myeongriInteractions: TransitInteraction[];
  ziwei: { yearlyIndex: number; yearlyName: string; yearlyBranch: string; mutagenStars: string[] };
}

export interface BirthTimeCandidateEvidence {
  key: string;
  label: string;
  representativeHour: number;
  dayPillar: string;
  timePillar: string;
  eventSignatures: CandidateEventSignature[];
}

export interface BirthTimeRectificationMatrix {
  status: "not_applicable" | "underdetermined" | "discriminating";
  candidates: BirthTimeCandidateEvidence[];
  equivalenceGroups: { signatureId: string; candidateKeys: string[] }[];
  eventCount: number;
  sourceIds: string[];
  boundary: string;
}

function comparableSignature(candidate: BirthTimeCandidateEvidence): string {
  return JSON.stringify(candidate.eventSignatures.map((signature) => ({
    year: signature.event.year,
    daYun: signature.daYun,
    seYun: signature.seYun,
    interactions: signature.myeongriInteractions.map((item) => `${item.transit}:${item.natalPillar}:${item.relation}:${item.tokens}`).sort(),
    ziwei: signature.ziwei
  })));
}

export function buildBirthTimeRectificationMatrix(input: SajuInput, events: LifeEventEvidence[]): BirthTimeRectificationMatrix {
  if (!input.gender) throw new Error("GENDER_REQUIRED: 사건 보정 행렬에는 성별이 필요하다.");
  if (!events.length) return { status: "not_applicable", candidates: [], equivalenceGroups: [], eventCount: 0, sourceIds: [], boundary: "검증할 과거 사건이 없다." };
  if (events.length > 20) throw new Error("TOO_MANY_LIFE_EVENTS: 한 번에 최대 20건이다.");
  const envelope = computeSajuChartEnvelope(input);
  const candidates = envelope.candidates.map((candidate): BirthTimeCandidateEvidence => {
    const candidateInput: SajuInput = { ...input, hour: candidate.representativeHour, minute: 0 };
    const chart = computeSajuChart(candidateInput);
    return {
      key: candidate.key,
      label: candidate.label,
      representativeHour: candidate.representativeHour,
      dayPillar: chart.pillars.day.gz,
      timePillar: chart.pillars.time.gz,
      eventSignatures: events.map((event) => {
        const luck = currentLuck(candidateInput, event.year);
        const ziwei = computeZiweiHoroscope(candidateInput, { year: event.year, month: event.month ?? 6, day: 1, hour: 12 });
        return {
          event,
          daYun: luck.daYun,
          seYun: luck.seYun,
          myeongriInteractions: [
            ...transitInteractions(chart, luck.daYun, "da_yun"),
            ...transitInteractions(chart, luck.seYun, "annual")
          ],
          ziwei: {
            yearlyIndex: ziwei.yearly.index,
            yearlyName: ziwei.yearly.name,
            yearlyBranch: ziwei.yearly.earthlyBranch,
            mutagenStars: ziwei.yearly.mutagenStars
          }
        };
      })
    };
  });
  const groups = new Map<string, string[]>();
  for (const candidate of candidates) {
    const signature = comparableSignature(candidate);
    const group = groups.get(signature) ?? [];
    group.push(candidate.key);
    groups.set(signature, group);
  }
  const equivalenceGroups = [...groups.values()].map((candidateKeys, index) => ({ signatureId: `signature-${index + 1}`, candidateKeys }));
  return {
    status: candidates.length <= 1 ? "not_applicable" : equivalenceGroups.length === 1 ? "underdetermined" : "discriminating",
    candidates,
    equivalenceGroups,
    eventCount: events.length,
    sourceIds: ["lunar-typescript", "iztro-config", "iztro-astrolabe", "sanming-tonghui"],
    boundary: "과거 사건마다 후보 시각의 계산 서명을 비교할 뿐 후보 확률이나 정답 순위를 만들지 않는다. 사건 의미와 명반의 대응은 관법 검토가 필요하며, 같은 서명 후보는 현재 자료로 구분 불가능하다."
  };
}
