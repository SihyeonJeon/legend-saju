/**
 * Question-first, cross-system life dossier.
 *
 * It joins claims by life domain and time window, never by erasing the system,
 * lineage, maturity, or input uncertainty that produced them.
 */
import {
  ENGINE_CAPABILITIES,
  auditBirthInput,
  preflightCapability,
  type CapabilityPreflight,
  type CapabilityMaturity,
  type EngineCapabilityId,
  type EngineSystem,
  type EvidenceRole
} from "./engine-capabilities";
import { analyzeEarthAnatomy, evaluateMyeongriDoctrine, evaluateZiweiDoctrine } from "./doctrine-engine";
import {
  computeCheolpanHuangjiNumbers,
  computeCheolpanStandardNumbers,
  normalizeCheolpanStandardInput
} from "./cheolpan-engine";
import { routeKnowledgeAssets, type KnowledgeAssetRoutingResult } from "./knowledge-asset-router";
import {
  buildBirthTimeRectificationMatrix,
  buildLifeEventValidationMatrix,
  buildLifeTimeline,
  type BirthTimeRectificationMatrix,
  type LifeEventEvidence,
  type LifeEventValidationMatrix,
  type LifeTimeline
} from "./life-timeline";
import { analyzeMyeongriStructure, computeSajuChartEnvelope } from "./myeongri-structure";
import {
  evaluateMyeongriCompatibility,
  evaluateMyeongriJudgment,
  tenGodFamilyOf,
  tenGodForStem,
  type CrossChartContact
} from "./myeongri-judgment";
import { computeSajuChart, type SajuInput } from "./saju-engine";
import { currentLuck } from "./saju-engine-advanced";
import { castGimun } from "./gimun-engine";
import { castYukim } from "./yukim-engine";
import {
  buildZiweiPalaceTopology,
  compareZiweiLineages,
  compareZiweiPalaceFlyingProfiles,
  computeZiweiHoroscope,
  computeZiweiQintianActivationLayer,
  computeZiweiQintianStructuralLayer,
  type ZiweiChart,
  type ZiweiPalace
} from "./ziwei-engine";

export type LifeDomain =
  "identity" | "career" | "wealth" | "relationship" | "family" |
  "health" | "timing" | "decision" | "methodology";

const STRENGTH_STATUS_LABEL: Record<ReturnType<typeof evaluateMyeongriJudgment>["strength"]["status"], string> = {
  support_leaning: "생조 근거가 우세",
  weak_leaning: "설기·극제 근거가 우세",
  contested: "생조와 극설 근거가 맞섬",
  extreme_structure_candidate: "특수격 후보 검토가 필요",
};

const PATTERN_STATUS_READING: Record<ReturnType<typeof evaluateMyeongriJudgment>["pattern"]["status"], string> = {
  supported: "이 기능을 살리는 조건이 비교적 갖춰져 있다",
  contested: "살리는 조건과 방해하는 조건이 함께 있어 환경에 따른 편차를 남긴다",
  damaged: "방해 조건도 확인돼 이 기능을 곧바로 강점으로 단정하지 않는다",
  unresolved: "한 방향으로 결정할 조건이 부족하다",
};

const PATTERN_FAMILY_READING = {
  peer: {
    identity: "자기결정·협업·경쟁을 다루는 기능이 중심 후보다",
    career: "역할·소유권·결정권이 분명한 협업에서 강점을 확인할 수 있다",
    wealth: "공동 자금과 성과 배분을 분명히 할 때 재물 기능을 다루기 쉽다",
  },
  output: {
    identity: "표현·생산·교육처럼 결과물을 밖으로 내는 기능이 중심 후보다",
    career: "설명·제작·교육처럼 결과가 확인되는 일에서 직업 기능을 확인할 수 있다",
    wealth: "만든 결과물을 고객 반응과 수입으로 연결하는 방식이 재물 해석의 중심이다",
  },
  wealth: {
    identity: "거래·재무·고객·운영을 현실적으로 관리하는 기능이 중심 후보다",
    career: "고객·가격·납기·운영을 직접 다루는 일이 직업 해석의 중심이다",
    wealth: "현금·거래·보유 자원을 관리하는 방식이 재물 해석의 중심이다",
  },
  officer: {
    identity: "책임·규정·평가를 감당하는 기능이 중심 후보다",
    career: "책임 범위와 평가 조건이 분명한 조직·전문 역할에서 직업 기능을 확인할 수 있다",
    wealth: "자격·책임·제도 안에서 보상을 쌓는 방식이 재물 해석의 중심이다",
  },
  resource: {
    identity: "학습·문서·보호·전문성을 축적하는 기능이 중심 후보다",
    career: "지식·문서·검토·돌봄을 재사용 가능한 전문성으로 만드는 일이 직업 해석의 중심이다",
    wealth: "축적한 지식과 문서를 전문 서비스로 바꾸는 방식이 재물 해석의 중심이다",
  },
} as const;

const TIMING_FAMILY_READING = {
  peer: "협업·경쟁·자기결정",
  output: "표현·생산·결과물",
  wealth: "거래·재무·운영",
  officer: "책임·규정·평가",
  resource: "학습·문서·회복",
} as const;

export interface EngineClaim {
  id: string;
  domain: LifeDomain;
  system: EngineSystem;
  capabilityId: EngineCapabilityId;
  kind: "calculated_fact" | "structural_observation" | "heuristic_interpretation" | "limitation";
  statement: string;
  observations: string[];
  timeframe: { kind: "natal" | "range" | "date" | "method"; value: string };
  maturity: CapabilityMaturity;
  evidenceRole: EvidenceRole;
  lineage: string;
  sourceIds: string[];
  confidence: "high" | "medium" | "low";
  limitations: string[];
}

export interface ClaimConflict {
  id: string;
  domain: LifeDomain;
  claimIds: string[];
  systems: EngineSystem[];
  reason: "input_uncertainty" | "lineage_difference" | "semantic_disagreement";
  detail: string;
}

export interface DomainSynthesis {
  domain: LifeDomain;
  claimIds: string[];
  systems: EngineSystem[];
  status: "not_covered" | "single_system" | "parallel_evidence" | "conflict";
  note: string;
}

export interface LifeDossierInput {
  birth: SajuInput;
  question?: string;
  targetDate?: { year: number; month: number; day: number; hour?: number; minute?: number };
  questionDateTime?: { year: number; month: number; day: number; hour?: number; minute?: number };
  partnerBirth?: SajuInput;
  timelineRange?: { startYear: number; endYear: number };
  lifeEvents?: LifeEventEvidence[];
  /** When provided, this execution plan is authoritative. Runtime IDs keep the schema open. */
  requestedCapabilities?: readonly string[];
}

export interface LifeDossier {
  version: "engine-v2-foundation";
  requestedDomains: LifeDomain[];
  routes: CapabilityPreflight[];
  claims: EngineClaim[];
  conflicts: ClaimConflict[];
  synthesis: DomainSynthesis[];
  knowledgeAssets?: KnowledgeAssetRoutingResult;
  timeline?: LifeTimeline;
  eventValidation?: LifeEventValidationMatrix;
  rectification?: BirthTimeRectificationMatrix;
  blockedSystems: { capabilityId: EngineCapabilityId; reason: string }[];
  interpretationBoundary: string;
}

const DOMAIN_KEYWORDS: Record<LifeDomain, string[]> = {
  identity: ["성격", "성향", "인생", "원국", "사주", "자미", "나 자신", "타고난"],
  career: ["직업", "직장", "취업", "이직", "사업", "승진", "적성", "커리어"],
  wealth: ["돈", "재물", "수입", "자산", "부자", "재테크", "사업운"],
  relationship: ["연애", "결혼", "궁합", "배우자", "남자친구", "여자친구", "이혼", "재혼"],
  family: ["가족", "부모", "자녀", "아이", "형제", "집안"],
  health: ["건강", "질병", "수술", "몸"],
  timing: ["올해", "내년", "대운", "세운", "언제", "3년", "시기", "운세"],
  decision: ["선택", "결정", "해야", "택일", "계약", "이사", "개업"],
  methodology: ["관법", "유파", "철판신수", "무속", "자미두수", "명리", "엔진"]
};

const DEFAULT_DOMAINS: LifeDomain[] = ["identity", "career", "wealth", "relationship", "family", "timing"];
const BROAD_READING_PHRASES = ["사주 봐", "운세 봐", "전체 운세", "종합 운세", "전반 운세", "총운"];

export function inferLifeDomains(question?: string): LifeDomain[] {
  if (!question?.trim()) return DEFAULT_DOMAINS;
  const found = (Object.keys(DOMAIN_KEYWORDS) as LifeDomain[]).filter((domain) => DOMAIN_KEYWORDS[domain].some((keyword) => question.includes(keyword)));
  if (BROAD_READING_PHRASES.some((phrase) => question.includes(phrase)) && found.every((domain) => domain === "identity" || domain === "timing")) {
    return DEFAULT_DOMAINS;
  }
  return found.length ? found : DEFAULT_DOMAINS;
}

function routeIds(input: LifeDossierInput, domains: LifeDomain[]): EngineCapabilityId[] {
  if (input.requestedCapabilities !== undefined) {
    return [...new Set(input.requestedCapabilities.filter((id): id is EngineCapabilityId => id in ENGINE_CAPABILITIES))];
  }
  const ids = new Set<EngineCapabilityId>([
    "myeongri_time_envelope",
    "myeongri_structure",
    "myeongri_doctrine",
    "myeongri_judgment",
    "ziwei_topology",
    "ziwei_palace_flying",
    "ziwei_lineage_compare",
    "ziwei_doctrine",
    "knowledge_asset_router",
    "cross_system_life_dossier"
  ]);
  if (domains.includes("timing") && input.targetDate) {
    ids.add("current_luck");
    ids.add("ziwei_horoscope");
  }
  if (domains.includes("relationship") && input.partnerBirth) ids.add("compatibility");
  if (input.timelineRange || (input.targetDate && input.question?.includes("3년"))) ids.add("life_timeline");
  if (input.lifeEvents?.length && input.birth.hour === undefined) ids.add("event_rectification_matrix");
  if (input.lifeEvents?.length && input.birth.hour !== undefined) ids.add("event_validation_matrix");
  if (input.question?.includes("철판신수")) ids.add("cheolpan_shenshu");
  if (input.question?.includes("기문")) ids.add("gimun");
  if (input.question?.includes("육임")) ids.add("yukim");
  if (input.question?.includes("무속") || input.question?.includes("무당")) ids.add("shamanic_oral_tradition");
  for (const id of input.requestedCapabilities ?? []) {
    if (id in ENGINE_CAPABILITIES) ids.add(id as EngineCapabilityId);
  }
  return [...ids];
}

function routeContext(input: LifeDossierInput) {
  return {
    birth: input.birth,
    birthA: input.birth,
    birthB: input.partnerBirth,
    date: input.questionDateTime ?? input.targetDate ?? (input.timelineRange ? { year: input.timelineRange.startYear, month: 1, day: 1 } : undefined),
    pastEvents: input.lifeEvents
  };
}

function claimFactory(claims: EngineClaim[]) {
  return (claim: Omit<EngineClaim, "id" | "maturity" | "evidenceRole" | "lineage" | "sourceIds" | "limitations"> & { capabilityId: EngineCapabilityId; limitations?: string[] }) => {
    const capability = ENGINE_CAPABILITIES[claim.capabilityId];
    const id = `${claim.system}-${claim.capabilityId}-${claim.domain}-${claims.length + 1}`;
    claims.push({
      ...claim,
      id,
      maturity: capability.maturity,
      evidenceRole: capability.evidenceRole,
      lineage: capability.lineage,
      sourceIds: capability.sourceIds,
      limitations: claim.limitations ?? capability.omittedDimensions
    });
    return id;
  };
}

function positionsMatching(chart: ReturnType<typeof analyzeMyeongriStructure>, pattern: RegExp): string[] {
  return chart.tenGodPositions.flatMap((position) => {
    const values = [position.visible, ...position.hidden].filter((value) => pattern.test(value));
    return values.map((value) => `${position.pillar}:${value}`);
  });
}

function addMyeongriClaims(
  input: LifeDossierInput,
  domains: LifeDomain[],
  selected: ReadonlySet<EngineCapabilityId>,
  add: ReturnType<typeof claimFactory>,
  conflicts: ClaimConflict[]
) {
  const requested = (...ids: EngineCapabilityId[]) => ids.some((id) => selected.has(id));
  if (!requested("myeongri_time_envelope", "myeongri_structure", "myeongri_doctrine", "myeongri_judgment", "current_luck")) return;
  const envelope = computeSajuChartEnvelope(input.birth);
  if (selected.has("myeongri_time_envelope")) {
    add({
      domain: "identity",
      system: "myeongri",
      capabilityId: "myeongri_time_envelope",
      kind: "calculated_fact",
      statement: envelope.status === "full"
        ? `년·월·일·시 네 기둥이 단일값으로 계산됐다.`
        : `시간 미상이라 년·월·일의 공통값과 ${envelope.candidates.length}개 시각 후보를 분리했다.`,
      observations: [
        `년주 ${envelope.stablePillars.year ?? "후보별 상이"}`,
        `월주 ${envelope.stablePillars.month ?? "후보별 상이"}`,
        `일주 ${envelope.stablePillars.day ?? "후보별 상이"}`,
        `시주 후보 ${[...new Set(envelope.candidates.map((candidate) => candidate.timePillar))].join("·")}`
      ],
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: envelope.status === "full" ? "high" : "medium"
    });
  }
  if (envelope.status === "time_unknown") {
    if (selected.has("myeongri_time_envelope")) {
      conflicts.push({
        id: `input-time-uncertainty-${conflicts.length + 1}`,
        domain: "methodology",
        claimIds: [],
        systems: ["myeongri", "ziwei"],
        reason: "input_uncertainty",
        detail: `시주·명궁·신궁을 확정하지 않았다. 변동 합충 ${envelope.varyingRelations.length}건, 변동 신살 ${envelope.varyingSinsal.length}건이다.`
      });
    }
    return;
  }
  const chart = analyzeMyeongriStructure(envelope.fullChart!);
  const dayRoot = chart.stemRoots.find((root) => root.position === "일간");
  if (selected.has("myeongri_structure")) {
    add({
      domain: "identity",
      system: "myeongri",
      capabilityId: "myeongri_structure",
      kind: "structural_observation",
      statement: `일간 ${chart.dayMaster.gan}(${chart.dayMaster.ko}·${chart.dayMaster.el})과 월지 ${chart.monthCommand.branch}의 본기 ${chart.monthCommand.mainQi}를 구조값으로 잡았다.`,
      observations: [
        `일간 정확 통근 ${dayRoot?.exactRootBranches.join("·") || "없음"}`,
        `일간 동오행 통근 ${dayRoot?.sameElementRootBranches.join("·") || "없음"}`,
        `월지 지장간 ${chart.monthCommand.hiddenOrder.join("·")}`,
        ...chart.relations,
        ...chart.stemTransformationCandidates.map((candidate) => `${candidate.pair} 합화후보=${candidate.targetElement}·월령지원 ${candidate.monthSupportsTarget ? "있음" : "없음"}·확정안함`)
      ],
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: "high"
    });
  }
  if (selected.has("myeongri_doctrine")) {
    const earth = analyzeEarthAnatomy(envelope.fullChart!);
    if (earth.tokens.length) {
      add({
        domain: "identity",
        system: "myeongri",
        capabilityId: "myeongri_doctrine",
        kind: "structural_observation",
        statement: `토를 천간 ${earth.visibleEarthCount}개, 토지지 ${earth.earthBranchCount}개, 지장간 토 ${earth.hiddenEarthCount}개로 나눴다.`,
        observations: earth.tokens.map((token) => `${token.position} ${token.glyph}=${token.subtype}·${token.seasonalImage}${token.hiddenComposition ? `(${token.hiddenComposition.join("·")})` : ""}`),
        timeframe: { kind: "natal", value: "출생 원국" },
        confidence: "high",
        limitations: [earth.boundary, earth.sourceLocator.section]
      });
    }
    const doctrine = evaluateMyeongriDoctrine(envelope.fullChart!);
    if (doctrine.status === "matched") {
      add({
        domain: "identity",
        system: "myeongri",
        capabilityId: "myeongri_doctrine",
        kind: "heuristic_interpretation",
        statement: doctrine.normalizedReading,
        observations: [
          ...doctrine.presences.map((presence) => `${presence.stem}(${presence.role})=${presence.state}${presence.visibleAt.length ? `:${presence.visibleAt.join("·")}` : presence.hiddenAt.length ? `:${presence.hiddenAt.join("·")}` : ""}`),
          ...doctrine.conditionalFindings,
          ...doctrine.subclauseMatches.map((match) => `${match.ruleId}·${match.section}·${match.sourceNote}`),
          doctrine.classicalPattern ?? "고전 특수 조합 미성립"
        ],
        timeframe: { kind: "natal", value: "출생 원국" },
        confidence: "medium",
        limitations: [doctrine.boundary, doctrine.sourceLocator.section]
      });
    }
  }
  if (selected.has("myeongri_judgment")) {
    const judgment = evaluateMyeongriJudgment(envelope.fullChart!);
    const patternFamily = tenGodFamilyOf(judgment.pattern.monthMainTenGod);
    const strengthClaimId = add({
      domain: "identity",
      system: "myeongri",
      capabilityId: "myeongri_judgment",
      kind: "structural_observation",
      statement: `월령·통근·투출을 따로 대조한 왕쇠 판단은 ${STRENGTH_STATUS_LABEL[judgment.strength.status]} 상태다.`,
      observations: [
        `월령 십신 ${judgment.strength.monthCommandTenGod}`,
        ...judgment.strength.axes.flatMap((axis) => axis.observations.map((observation) => `${axis.id}:${axis.direction}:${observation}`)),
        `종격 검토 ${judgment.strength.followingCandidate ?? "해당 없음"}`
      ],
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: "medium",
      limitations: [judgment.strength.boundary, judgment.strength.policy]
    });
    const patternClaimIds = [...new Set<"identity" | "career" | "wealth">([
      "identity",
      ...domains.filter((domain): domain is "career" | "wealth" => domain === "career" || domain === "wealth")
    ])].map((domain) => {
      const meaning = patternFamily === "self"
        ? "한 가지 사회적 기능으로 고정하지 않는다"
        : PATTERN_FAMILY_READING[patternFamily][domain];
      return add({
        domain,
        system: "myeongri",
        capabilityId: "myeongri_judgment",
        kind: "heuristic_interpretation",
        statement: `${meaning}. ${PATTERN_STATUS_READING[judgment.pattern.status]}.`,
        observations: [
          `격국 후보 ${judgment.pattern.pattern}`,
          `월지 본기 ${judgment.pattern.monthMainStem}=${judgment.pattern.monthMainTenGod}`,
          ...judgment.pattern.exposedMonthHiddenStems.map((item) => `${item.stem}(${item.tenGod}) 투출 ${item.exposedAt.join("·")}`),
          ...judgment.pattern.mechanisms.map((mechanism) => `${mechanism.label}:${mechanism.polarity}:${mechanism.grade}:${mechanism.evidence.join("·")}`),
          ...(judgment.pattern.mechanisms.length ? [] : ["성립·훼손 장치가 한 방향으로 모이지 않음"])
        ],
        timeframe: { kind: "natal", value: "월령 격국" },
        confidence: "medium",
        limitations: [judgment.pattern.boundary, judgment.pattern.sourceLocator.section]
      });
    });
    const usefulGodClaimId = add({
      domain: "methodology",
      system: "myeongri",
      capabilityId: "myeongri_judgment",
      kind: "heuristic_interpretation",
      statement: "조후·격국 기능·부억의 용신 후보를 합치지 않고 세 관법으로 나눴다.",
      observations: judgment.usefulGods.lenses.map((lens) =>
        `${lens.school}:${lens.status}:천간 ${lens.candidateStems.join("·") || "보류"}:십신 ${lens.candidateFamilies.join("·") || "보류"}:오행 ${lens.candidateElements.join("·") || "보류"}`
      ),
      timeframe: { kind: "method", value: "용신 관법 비교" },
      confidence: judgment.usefulGods.conflicts.length ? "low" : "medium",
      limitations: [judgment.usefulGods.boundary, ...judgment.usefulGods.conflicts]
    });
    if (judgment.usefulGods.conflicts.length) {
      conflicts.push({
        id: `myeongri-useful-god-${conflicts.length + 1}`,
        domain: "methodology",
        claimIds: [strengthClaimId, ...patternClaimIds, usefulGodClaimId],
        systems: ["myeongri"],
        reason: "semantic_disagreement",
        detail: judgment.usefulGods.conflicts.join(" ")
      });
    }
  }
  if (selected.has("myeongri_structure") && domains.includes("career")) {
    const output = positionsMatching(chart, /식신|상관/);
    const officer = positionsMatching(chart, /정관|편관|칠살/);
    const resource = positionsMatching(chart, /정인|편인/);
    add({
      domain: "career",
      system: "myeongri",
      capabilityId: "myeongri_structure",
      kind: "structural_observation",
      statement: "직업 해석에 쓰이는 식상·관성·인성의 위치를 분리했다.",
      observations: [`식상 ${output.join("·") || "없음"}`, `관성 ${officer.join("·") || "없음"}`, `인성 ${resource.join("·") || "없음"}`],
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: "high"
    });
  }
  if (selected.has("myeongri_structure") && domains.includes("wealth")) {
    const wealth = positionsMatching(chart, /정재|편재/);
    add({
      domain: "wealth",
      system: "myeongri",
      capabilityId: "myeongri_structure",
      kind: "structural_observation",
      statement: "재성의 천간 노출과 지장간 위치를 따로 기록했다.",
      observations: wealth.length ? wealth : ["재성 표기 없음"],
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: "high"
    });
  }
  if (selected.has("myeongri_structure") && domains.includes("relationship")) {
    add({
      domain: "relationship",
      system: "myeongri",
      capabilityId: "myeongri_structure",
      kind: "structural_observation",
      statement: `배우자궁으로 쓰는 일지 ${envelope.fullChart!.pillars.day.zhi}와 원국 관계를 보존했다.`,
      observations: chart.relations.filter((relation) => relation.includes("일") || relation.includes(envelope.fullChart!.pillars.day.zhi)),
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: "high"
    });
  }
  if (selected.has("myeongri_structure") && domains.includes("family")) {
    add({
      domain: "family",
      system: "myeongri",
      capabilityId: "myeongri_structure",
      kind: "structural_observation",
      statement: "년주와 월주의 십신·통근·합충 자료를 가족 영역의 원자료로 분리했다.",
      observations: chart.tenGodPositions.filter((position) => position.pillar === "년" || position.pillar === "월").map((position) => `${position.pillar}주 ${position.visible}/${position.hidden.join("·")}`),
      timeframe: { kind: "natal", value: "출생 원국" },
      confidence: "high"
    });
  }
  if (selected.has("current_luck") && domains.includes("timing") && input.targetDate && input.birth.gender) {
    const luck = currentLuck(input.birth, input.targetDate.year);
    add({
      domain: "timing",
      system: "myeongri",
      capabilityId: "current_luck",
      kind: "calculated_fact",
      statement: `${input.targetDate.year}년 대운 ${luck.daYun}, 세운 ${luck.seYun}이다.`,
      observations: [luck.daYunAge, luck.note],
      timeframe: { kind: "range", value: `${luck.daYunAge}; ${input.targetDate.year}` },
      confidence: "high"
    });
    const annualStem = luck.seYun[0];
    if (annualStem) {
      const annualTenGod = tenGodForStem(chart.dayMaster.gan, annualStem);
      const annualFamily = tenGodFamilyOf(annualTenGod);
      if (annualFamily !== "self") {
        add({
          domain: "timing",
          system: "myeongri",
          capabilityId: "current_luck",
          kind: "heuristic_interpretation",
          statement: `${input.targetDate.year}년에는 ${TIMING_FAMILY_READING[annualFamily]} 관련 과제가 주요 생활 주제로 올라온다.`,
          observations: [`세운 ${luck.seYun}의 천간 ${annualStem}=${annualTenGod}`, luck.daYunAge, luck.note],
          timeframe: { kind: "date", value: String(input.targetDate.year) },
          confidence: "medium",
          limitations: ["세운 천간의 십신 역할을 현대 생활 주제로 옮긴 해석이다. 길흉·성과·사건 발생을 보장하지 않는다."]
        });
      }
    }
  }
}

const ZIWEI_PALACE_KEYS: Record<LifeDomain, string[]> = {
  identity: ["명", "命", "복덕"],
  career: ["관록", "官祿", "官禄", "천이", "遷移", "迁移", "노복", "奴僕", "奴仆", "교우", "交友"],
  wealth: ["재백", "財帛", "财帛", "전택", "田宅"],
  relationship: ["부처", "夫妻"],
  family: ["부모", "父母", "자녀", "子女", "형제", "兄弟"],
  health: ["질액", "疾厄"],
  timing: [], decision: [], methodology: []
};

function relevantPalaces(chart: ZiweiChart, domain: LifeDomain): ZiweiPalace[] {
  const keys = ZIWEI_PALACE_KEYS[domain];
  return chart.palaces.filter((palace) => keys.some((key) => palace.name.includes(key)));
}

function palaceObservations(chart: ZiweiChart, palace: ZiweiPalace): string[] {
  const stars = [...palace.majorStars, ...palace.minorStars];
  const mutagens = stars.filter((star) => star.mutagen).map((star) => `${star.name}:화${star.mutagen}`);
  const topology = buildZiweiPalaceTopology(chart, palace.name);
  const roleLine = (role: "opposite" | "wealth" | "career") => {
    const snapshot = topology.roles[role];
    return `${role} ${snapshot.name}:${snapshot.majorStars.map((star) => star.name).join("·") || "무주성"}`;
  };
  return [
    `${palace.name} ${palace.heavenlyStem}${palace.earthlyBranch}`,
    `주성 ${palace.majorStars.map((star) => `${star.name}${star.brightness ? `(${star.brightness})` : ""}`).join("·") || "무주성"}`,
    `사화 ${mutagens.join("·") || "없음"}`,
    `삼방사정 ${Object.values(palace.sanfangSizheng).join("·")}`,
    roleLine("opposite"),
    roleLine("wealth"),
    roleLine("career"),
    `삼방 사화 ${topology.mutagenLedger.map((item) => `${item.palace}.${item.star}:화${item.mutagen}`).join("·") || "없음"}`,
    `신궁 역할 ${topology.bodyPalaceRoles.join("·") || "해당 없음"}`
  ];
}

function addZiweiClaims(
  input: LifeDossierInput,
  domains: LifeDomain[],
  selected: ReadonlySet<EngineCapabilityId>,
  add: ReturnType<typeof claimFactory>,
  conflicts: ClaimConflict[]
) {
  if (input.birth.hour === undefined || !input.birth.gender) return;
  const requested = (...ids: EngineCapabilityId[]) => ids.some((id) => selected.has(id));
  if (!requested("ziwei_topology", "ziwei_palace_flying", "ziwei_horoscope", "ziwei_lineage_compare", "ziwei_doctrine")) return;
  const lineage = compareZiweiLineages(input.birth);
  const chart = lineage.common;
  const palaceFlyingComparison = selected.has("ziwei_palace_flying")
    ? compareZiweiPalaceFlyingProfiles(input.birth)
    : undefined;
  const palaceFlying = palaceFlyingComparison?.graphs.iztro_documented;
  const qintianStructure = selected.has("ziwei_palace_flying")
    ? computeZiweiQintianStructuralLayer(input.birth)
    : undefined;
  for (const domain of domains.filter((value) => ZIWEI_PALACE_KEYS[value].length)) {
    for (const palace of relevantPalaces(chart, domain)) {
      if (selected.has("ziwei_topology")) {
        add({
          domain,
          system: "ziwei",
          capabilityId: "ziwei_topology",
          kind: "calculated_fact",
          statement: `${palace.name}의 본궁·대궁·재백·관록 연결과 성요 배치를 계산했다.`,
          observations: palaceObservations(chart, palace),
          timeframe: { kind: "natal", value: "출생 명반" },
          confidence: "high"
        });
      }
      if (palaceFlying && palaceFlyingComparison && qintianStructure) {
        const outgoing = palaceFlying.edges.filter((edge) => edge.sourcePalace === palace.name);
        const jiClash = palaceFlying.jiClashes.find((item) => item.sourcePalace === palace.name);
        const profileDifferences = palaceFlyingComparison.differences.filter((difference) => difference.sourcePalace === palace.name);
        const outward = qintianStructure.outwardSelfTransformations.filter((edge) => edge.sourcePalace === palace.name);
        const inward = qintianStructure.inwardSelfTransformations.filter((edge) => edge.targetPalace === palace.name);
        add({
          domain,
          system: "ziwei",
          capabilityId: "ziwei_palace_flying",
          kind: "calculated_fact",
          statement: `${palace.name} ${palace.heavenlyStem}간이 발생시키는 네 사화의 도착궁을 계산했다.`,
          observations: [
            ...outgoing.map((edge) => `${edge.transformation}:${edge.transformedStar}→${edge.targetPalace}${edge.selfTransformation ? "(자화)" : ""}`),
            ...(jiClash ? [`화기충 대궁 ${jiClash.jiTargetPalace}→${jiClash.oppositePalace}`] : []),
            ...outward.map((edge) => `이심 자화 ${edge.transformation}:${edge.transformedStar}`),
            ...inward.map((edge) => `향심 자화 ${edge.sourcePalace}→${edge.targetPalace} ${edge.transformation}:${edge.transformedStar}`),
            ...(qintianStructure.laiyinPalace.name === palace.name ? [`내인궁 ${palace.name}(${qintianStructure.natalYearStem})`] : []),
            ...profileDifferences.map((difference) =>
              `사화표 차이 ${difference.transformation}: ` +
              Object.entries(difference.values).map(([profile, value]) => `${profile}=${value.star}→${value.targetPalace}`).join(" / ")
            )
          ],
          timeframe: { kind: "natal", value: "궁간비화" },
          confidence: "high",
          limitations: [palaceFlying.boundary, palaceFlyingComparison.boundary, qintianStructure.boundary]
        });
      }
    }
  }
  if (palaceFlyingComparison?.differences.length) {
    const conflictClaimIds = palaceFlyingComparison.differences.map((difference) => add({
      domain: "methodology",
      system: "ziwei",
      capabilityId: "ziwei_palace_flying",
      kind: "limitation",
      statement: `${difference.sourcePalace} ${difference.transformation} 도착궁은 선택한 십간 사화표에 따라 달라진다.`,
      observations: Object.entries(difference.values).map(([profile, value]) => `${profile}: ${value.star}→${value.targetPalace}`),
      timeframe: { kind: "method", value: "십간 사화표 비교" },
      confidence: "high",
      limitations: [palaceFlyingComparison.boundary]
    }));
    conflicts.push({
      id: `ziwei-mutagen-profile-${conflicts.length + 1}`,
      domain: "methodology",
      claimIds: conflictClaimIds,
      systems: ["ziwei"],
      reason: "lineage_difference",
      detail: `사화 비성 간선 ${palaceFlyingComparison.differences.length}건이 전서 원문·iztro 문서·중주계 표에 따라 달라 한 유파의 값을 자동 선택하지 않는다.`
    });
  }
  if (selected.has("ziwei_lineage_compare") && lineage.differences.length) {
    const conflictClaimIds: string[] = [];
    for (const difference of lineage.differences.slice(0, 12)) {
      conflictClaimIds.push(add({
        domain: "methodology",
        system: "ziwei",
        capabilityId: "ziwei_lineage_compare",
        kind: "limitation",
        statement: `${difference.palace}의 ${difference.field} 값이 두 배치법에서 다르다.`,
        observations: [`통행 ${difference.common.join("·") || "없음"}`, `중주 ${difference.zhongzhou.join("·") || "없음"}`],
        timeframe: { kind: "method", value: "통행 대 중주파" },
        confidence: "high"
      }));
    }
    conflicts.push({
      id: `ziwei-lineage-${conflicts.length + 1}`,
      domain: "methodology",
      claimIds: conflictClaimIds,
      systems: ["ziwei"],
      reason: "lineage_difference",
      detail: `명반 필드 ${lineage.differences.length}건이 배치법에 따라 달라 통행판 결과를 다른 유파의 확정값으로 일반화하지 않는다.`
    });
  }
  if (selected.has("ziwei_doctrine")) {
    const doctrine = evaluateZiweiDoctrine(chart);
    for (const match of doctrine.matches) {
      add({
        domain: match.domain,
        system: "ziwei",
        capabilityId: "ziwei_doctrine",
        kind: "heuristic_interpretation",
        statement: match.normalizedReading,
        observations: [
          `${match.palace}: ${match.matchedStars.join("·")}`,
          ...match.contextFindings,
          `${match.sourceLocator.section}: ${match.sourceLocator.sourceNote}`
        ],
        timeframe: { kind: "natal", value: "출생 명반" },
        confidence: match.confidence,
        limitations: [match.boundary]
      });
    }
  }
  if (selected.has("ziwei_horoscope") && domains.includes("timing") && input.targetDate) {
    const horoscope = computeZiweiHoroscope(input.birth, input.targetDate);
    const transformationObservations = horoscope.transformationLayers.map((layer) => {
      const entries = layer.entries.map((entry) =>
        `${entry.transformation}:${entry.star}@${entry.natalPalace ?? "원궁미확인"}/${entry.layerPalace ?? "운궁미확인"}`
      );
      return `${layer.label} ${layer.sourceStem}${layer.sourceBranch} ${entries.join("·")}`;
    });
    add({
      domain: "timing",
      system: "ziwei",
      capabilityId: "ziwei_horoscope",
      kind: "calculated_fact",
      statement: `${horoscope.solarDate}의 대운·소한·유년·유월·유일 배치를 계산했다.`,
      observations: [
        `대운 ${horoscope.decadal.name} ${horoscope.decadal.heavenlyStem}${horoscope.decadal.earthlyBranch}`,
        `소한 ${horoscope.age.name} ${horoscope.age.nominalAge ?? ""}`,
        `유년 ${horoscope.yearly.name} ${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}`,
        `유월 ${horoscope.monthly.name}`,
        `유일 ${horoscope.daily.name}`,
        ...transformationObservations
      ],
      timeframe: { kind: "date", value: horoscope.solarDate },
      confidence: "high",
      limitations: [horoscope.boundary]
    });
    if (selected.has("ziwei_palace_flying")) {
      const qintianActivation = computeZiweiQintianActivationLayer(input.birth, input.targetDate);
      const exactActivations = qintianActivation.activations.filter((activation) =>
        activation.exactBodyStar || activation.exactUseStarLinkIds.length > 0
      );
      add({
        domain: "timing",
        system: "ziwei",
        capabilityId: "ziwei_palace_flying",
        kind: "calculated_fact",
        statement: `${horoscope.solarDate} 운한 사화와 원명반 체·자화 용의 동일 성요 접촉을 계산했다.`,
        observations: [
          `전체 운한 사화 접촉 ${qintianActivation.activations.length}건`,
          ...exactActivations.map((activation) =>
            `${activation.label}:${activation.transformation}:${activation.transitStar}@${activation.natalPalace ?? "원궁미확인"}` +
            `${activation.exactBodyStar ? ":생년체동일성요" : ""}` +
            `${activation.exactUseStarLinkIds.length ? `:자화용동일성요=${activation.exactUseStarLinkIds.join("·")}` : ""}`
          )
        ],
        timeframe: { kind: "date", value: horoscope.solarDate },
        confidence: "high",
        limitations: [qintianActivation.boundary]
      });
    }
  }
}

function contactObservation(contact: CrossChartContact): string {
  const direction = contact.direction ? `:${contact.direction}` : "";
  return `${contact.salience}:${contact.layer}:${contact.aPosition}${contact.aToken}-${contact.bPosition}${contact.bToken}:${contact.kind}${direction}`;
}

function addCompatibilityClaim(input: LifeDossierInput, selected: ReadonlySet<EngineCapabilityId>, add: ReturnType<typeof claimFactory>) {
  if (!selected.has("compatibility")) return;
  if (!input.partnerBirth || input.birth.hour === undefined || input.partnerBirth.hour === undefined) return;
  const result = evaluateMyeongriCompatibility(computeSajuChart(input.birth), computeSajuChart(input.partnerBirth));
  add({
    domain: "relationship",
    system: "myeongri",
    capabilityId: "compatibility",
    kind: "structural_observation",
    statement: `두 일주 ${result.dayPillars.a}와 ${result.dayPillars.b}를 포함한 양 원국 4×4 간지 접촉을 계산했다.`,
    observations: [
      `일간·배우자궁 우선 접촉 ${result.primaryStatus}`,
      `양 원국 전체 교차 ${result.status}`,
      ...result.spousePalaceContacts.map(contactObservation),
      ...result.dayMasterContacts.map(contactObservation),
      ...result.crossPillarContacts.map(contactObservation)
    ],
    timeframe: { kind: "natal", value: "두 출생 원국" },
    confidence: "medium",
    limitations: [result.boundary]
  });
  const primaryReading = {
    supportive_only: "일간과 배우자궁의 우선 접촉에는 생조·합의 근거가 확인됐다",
    tension_only: "일간과 배우자궁의 우선 접촉에는 충·극의 긴장 근거가 확인됐다",
    mixed: "일간과 배우자궁의 우선 접촉에는 생조·합과 충·극이 함께 있다",
    undetermined: "일간과 배우자궁만으로는 지지와 긴장 중 한 방향을 고르기 어렵다",
  }[result.primaryStatus];
  const wholeReading = {
    supportive_only: "원국 전체 접촉도 지지 근거만 확인됐다",
    tension_only: "원국 전체 접촉도 긴장 근거만 확인됐다",
    mixed: "원국 전체에는 지지와 긴장이 함께 있다",
    undetermined: "원국 전체 접촉에서도 한 방향을 고르기 어렵다",
  }[result.status];
  add({
    domain: "relationship",
    system: "myeongri",
    capabilityId: "compatibility",
    kind: "heuristic_interpretation",
    statement: `${primaryReading}. ${wholeReading}.`,
    observations: [
      `일간·배우자궁 우선 접촉 ${result.primaryStatus}`,
      `양 원국 전체 교차 ${result.status}`,
      ...result.spousePalaceContacts.map(contactObservation),
      ...result.dayMasterContacts.map(contactObservation)
    ],
    timeframe: { kind: "natal", value: "두 출생 원국" },
    confidence: "medium",
    limitations: [result.boundary]
  });
}

function addCheolpanClaim(input: LifeDossierInput, selected: ReadonlySet<EngineCapabilityId>, add: ReturnType<typeof claimFactory>) {
  if (!selected.has("cheolpan_shenshu") || input.birth.hour === undefined) return;
  const envelope = computeSajuChartEnvelope(input.birth);
  if (!envelope.fullChart) return;
  const result = computeCheolpanHuangjiNumbers(envelope.fullChart);
  if (result.status !== "computed") {
    add({
      domain: "methodology",
      system: "cheolpan",
      capabilityId: "cheolpan_shenshu",
      kind: "limitation",
      statement: "황극 원회운세 공개 명례가 정의하지 않은 자리수 조건이라 계산을 멈췄다.",
      observations: result.blockedReasons,
      timeframe: { kind: "method", value: "황극 원회운세 취수" },
      confidence: "high",
      limitations: [result.boundary]
    });
  } else {
    add({
      domain: "methodology",
      system: "cheolpan",
      capabilityId: "cheolpan_shenshu",
      kind: "calculated_fact",
      statement: "철판신수 계열 중 세 판본 명례로 닫힌 황극 원회운세 숫자 사슬을 계산했다.",
      observations: [
        `원 ${result.pillars.year.pillar}=${result.yuan}`,
        `회 ${result.pillars.month.pillar}=${result.hui}`,
        `운 ${result.pillars.day.pillar}=${result.yun}`,
        `세 ${result.pillars.time.pillar}=${result.shi}`,
        `원회 ${result.yuanHuiCode}·운세역접 ${result.yunShiCode}`,
        `부모 초기 수 ${result.parentInitialCode}·생월 후속 수 ${result.parentMonthFollowupCode}`,
        `자녀 시기 초기 수 ${result.childTimingInitialCode}`
      ],
      timeframe: { kind: "natal", value: "출생 사주 네 기둥" },
      confidence: "medium",
      limitations: [result.boundary]
    });
  }
  const questionDateTime = input.questionDateTime ?? input.targetDate;
  if (questionDateTime?.hour === undefined || !input.birth.gender) return;
  const queryChart = computeSajuChart({
    year: questionDateTime.year,
    month: questionDateTime.month,
    day: questionDateTime.day,
    hour: questionDateTime.hour,
    minute: questionDateTime.minute ?? 0,
    calendar: "solar",
    gender: input.birth.gender
  });
  const standard = computeCheolpanStandardNumbers(normalizeCheolpanStandardInput(
    envelope.fullChart,
    queryChart,
    input.birth.gender
  ));
  const computedLifetime = standard.lifetime.filter((year) => year.status === "computed").length;
  const natalClauseCount = standard.natalClauses
    ? standard.natalClauses.personality.length + standard.natalClauses.career.length +
      standard.natalClauses.wealth.length + standard.natalClauses.siblings.length
    : 0;
  add({
    domain: "methodology",
    system: "cheolpan",
    capabilityId: "cheolpan_shenshu",
    kind: "calculated_fact",
    statement: "질문 시각을 쓰는 정통 표준표 계통을 황극 계통과 분리해 계산했다.",
    observations: [
      `선천수 ${standard.preheavenNumber}·오음 ${standard.fiveTone}(${standard.fiveToneNumber})`,
      `일명수 ${standard.dayFateNumber}·시운수 ${standard.timeLuckNumber}·${standard.moment}`,
      `본명수 ${standard.natalNumber}·십이벽괘 ${standard.hexagram}·후천수 ${standard.afterheavenNumber}`,
      `본명 조문 번호 ${natalClauseCount}개`,
      `유년 숫자표 계산 ${computedLifetime}/${standard.lifetime.length}세`
    ],
    timeframe: { kind: "date", value: `${questionDateTime.year}-${questionDateTime.month}-${questionDateTime.day} ${questionDateTime.hour}시 질문 시각` },
    confidence: "medium",
    limitations: [standard.boundary]
  });
}

function addQuestionTimeDivinationClaims(input: LifeDossierInput, selected: ReadonlySet<EngineCapabilityId>, add: ReturnType<typeof claimFactory>) {
  const questionDateTime = input.questionDateTime ?? input.targetDate;
  if (!questionDateTime || questionDateTime.hour === undefined) return;
  const { year, month, day, hour } = questionDateTime;
  if (selected.has("gimun")) {
    const chart = castGimun(year, month, day, hour, questionDateTime.minute ?? 0);
    add({
      domain: "decision",
      system: "gimun",
      capabilityId: "gimun",
      kind: "calculated_fact",
      statement: `${chart.jeolgi} ${chart.dun} ${chart.won} ${chart.gukSu}국의 시가 회전판을 계산했다.`,
      observations: [
        `직부 ${chart.zhiFu.star} ${chart.zhiFu.originalPalace}→${chart.zhiFu.palace}궁`,
        `직사 ${chart.zhiShi.door}→${chart.zhiShi.palace}궁`,
        `순수 ${chart.xunHead}·둔간 ${chart.xunHiddenStem}·순공 ${chart.kongWang.join("·")}`,
        ...chart.palaces.map((palace) =>
          `${palace.palace}궁:${palace.heavenStem}/${palace.earthStem}:${palace.star ?? "-"}:${palace.door ?? "-"}:${palace.god ?? "-"}`
        )
      ],
      timeframe: { kind: "date", value: `${year}-${month}-${day} ${hour}:${questionDateTime.minute ?? 0}` },
      confidence: "high",
      limitations: [chart.boundary]
    });
  }
  if (selected.has("yukim")) {
    const chart = castYukim(year, month, day, hour);
    add({
      domain: "decision",
      system: "yukim",
      capabilityId: "yukim",
      kind: "calculated_fact",
      statement: `대육임 월장·천반·사과와 ${chart.method} 삼전을 계산했다.`,
      observations: [
        `일진 ${chart.dayGan}${chart.dayBranch}·점시 ${chart.hourBranch}·월장 ${chart.monthGeneral}`,
        `사과 ${chart.fourLessons.map((lesson) => `${lesson.top}/${lesson.bottom}`).join("·")}`,
        `삼전 ${chart.threeTransmissions.map((transmission) => `${transmission.branch}(${transmission.general})`).join("→")}`,
        `표 좌표 ${chart.sourceTrace.dayKey}/${chart.sourceTrace.firstLessonTop}/${chart.sourceTrace.tableIndex}`
      ],
      timeframe: { kind: "date", value: `${year}-${month}-${day} ${hour}시` },
      confidence: "high",
      limitations: [chart.disclaimer]
    });
  }
}

function synthesize(domains: LifeDomain[], claims: EngineClaim[], conflicts: ClaimConflict[]): DomainSynthesis[] {
  const allDomains = [...new Set([...domains, "methodology" as LifeDomain])];
  return allDomains.map((domain) => {
    const domainClaims = claims.filter((claim) => claim.domain === domain);
    const systems = [...new Set(domainClaims.map((claim) => claim.system))];
    const hasConflict = conflicts.some((conflict) => conflict.domain === domain || (domain === "methodology" && conflict.reason !== "semantic_disagreement"));
    if (!domainClaims.length) return { domain, claimIds: [], systems: [], status: "not_covered", note: "현재 입력과 검증 수준으로 낼 수 있는 근거가 없다." };
    if (hasConflict) return { domain, claimIds: domainClaims.map((claim) => claim.id), systems, status: "conflict", note: "입력 또는 유파 차이를 지우지 않고 병기한다." };
    if (systems.length === 1) return { domain, claimIds: domainClaims.map((claim) => claim.id), systems, status: "single_system", note: "한 체계의 근거만 있다." };
    return { domain, claimIds: domainClaims.map((claim) => claim.id), systems, status: "parallel_evidence", note: "같은 생애 영역을 다룬 독립 근거다. 의미가 같다고 자동 합의 처리하지 않는다." };
  });
}

/** Main V2 entry point. It performs no LLM call and no publication side effect. */
export function buildLifeDossier(input: LifeDossierInput): LifeDossier {
  const requestedDomains = inferLifeDomains(input.question);
  const ids = routeIds(input, requestedDomains);
  const selected = new Set(ids);
  const context = routeContext(input);
  const routes = ids.map((id) => preflightCapability(id, context));
  const claims: EngineClaim[] = [];
  const conflicts: ClaimConflict[] = [];
  const birthAudit = auditBirthInput(input.birth);
  if (birthAudit.issues.some((issue) => issue.severity === "blocking")) {
    return {
      version: "engine-v2-foundation",
      requestedDomains,
      routes,
      claims,
      conflicts,
      synthesis: synthesize(requestedDomains, claims, conflicts),
      blockedSystems: routes.map((route) => ({
        capabilityId: route.capability.id,
        reason: route.reasons.join(" ") || birthAudit.issues.filter((issue) => issue.severity === "blocking").map((issue) => issue.message).join(" ")
      })),
      interpretationBoundary: "입력 감사에서 차단 사유가 발견되어 하위 계산을 시작하지 않았다."
    };
  }
  const add = claimFactory(claims);
  addMyeongriClaims(input, requestedDomains, selected, add, conflicts);
  addZiweiClaims(input, requestedDomains, selected, add, conflicts);
  addCompatibilityClaim(input, selected, add);
  addCheolpanClaim(input, selected, add);
  addQuestionTimeDivinationClaims(input, selected, add);
  const requestedTimeline = input.timelineRange ?? (input.targetDate && input.question?.includes("3년")
    ? { startYear: input.targetDate.year, endYear: input.targetDate.year + 2 }
    : undefined);
  let timeline: LifeTimeline | undefined;
  if (selected.has("life_timeline") && requestedTimeline && input.birth.hour !== undefined && input.birth.gender) {
    timeline = buildLifeTimeline(input.birth, requestedTimeline);
    add({
      domain: "timing",
      system: "cross_system",
      capabilityId: "life_timeline",
      kind: "calculated_fact",
      statement: `${requestedTimeline.startYear}~${requestedTimeline.endYear}년 대운·세운과 자미 운한을 연도별 병렬 시간축으로 계산했다.`,
      observations: timeline.years.map((year) => `${year.year}:${year.daYun}/${year.seYun}·${year.ziwei.yearly.name}${year.daYunTransition ? "·대운교체" : ""}`),
      timeframe: { kind: "range", value: `${requestedTimeline.startYear}-${requestedTimeline.endYear}` },
      confidence: "high",
      limitations: [timeline.boundary]
    });
  }
  let rectification: BirthTimeRectificationMatrix | undefined;
  if (selected.has("event_rectification_matrix") && input.lifeEvents?.length && input.birth.gender && input.birth.hour === undefined) {
    rectification = buildBirthTimeRectificationMatrix(input.birth, input.lifeEvents);
    add({
      domain: "methodology",
      system: "cross_system",
      capabilityId: "event_rectification_matrix",
      kind: "calculated_fact",
      statement: `${input.lifeEvents.length}개 과거 사건으로 출생시 후보 ${rectification.candidates.length}개의 계산 서명을 비교했다.`,
      observations: rectification.equivalenceGroups.map((group) => `${group.signatureId}:${group.candidateKeys.join("·")}`),
      timeframe: { kind: "method", value: "과거 사건 기반 출생시각 보정" },
      confidence: rectification.status === "discriminating" ? "medium" : "low",
      limitations: [rectification.boundary]
    });
  }
  let eventValidation: LifeEventValidationMatrix | undefined;
  if (selected.has("event_validation_matrix") && input.lifeEvents?.length && input.birth.gender && input.birth.hour !== undefined) {
    eventValidation = buildLifeEventValidationMatrix(input.birth, input.lifeEvents);
    add({
      domain: "methodology",
      system: "cross_system",
      capabilityId: "event_validation_matrix",
      kind: "structural_observation",
      statement: `${input.lifeEvents.length}개 과거 사건의 영역과 당시 대운·세운·자미 운한 구조 자료를 대조했다.`,
      observations: eventValidation.entries.map((entry) =>
        `${entry.event.year}:${entry.event.domain}:${entry.coverage}:${entry.systems.join("·") || "자료 없음"}`
      ),
      timeframe: { kind: "method", value: "과거 사건 구조 대조" },
      confidence: "medium",
      limitations: [eventValidation.boundary]
    });
  }
  let knowledgeAssets: KnowledgeAssetRoutingResult | undefined;
  if (selected.has("knowledge_asset_router") && input.birth.hour !== undefined) {
    const envelope = computeSajuChartEnvelope(input.birth);
    if (envelope.fullChart) {
      let ziwei: ZiweiChart | undefined;
      if (input.birth.gender) ziwei = compareZiweiLineages(input.birth).common;
      knowledgeAssets = routeKnowledgeAssets(envelope.fullChart, ziwei);
    }
  }
  const blockedSystems = routes.filter((route) => route.status === "blocked").map((route) => ({
    capabilityId: route.capability.id,
    reason: route.reasons.join(" ") || route.capability.note
  }));
  return {
    version: "engine-v2-foundation",
    requestedDomains,
    routes,
    claims,
    conflicts,
    synthesis: synthesize(requestedDomains, claims, conflicts),
    knowledgeAssets,
    timeline,
    eventValidation,
    rectification,
    blockedSystems,
    interpretationBoundary: "계산값·구조 관찰·해석 규칙을 분리했다. 여러 체계가 같은 영역을 다뤄도 자동으로 하나의 예언으로 합치지 않는다."
  };
}
