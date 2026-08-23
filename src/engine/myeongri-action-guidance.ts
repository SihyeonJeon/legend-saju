/**
 * 명리 관법을 실제 행동 후보로 번역하는 해석 경계층.
 *
 * 조후·격국·부억을 하나의 용신으로 합치지 않는다. 각 관법이 제시한
 * 십신 기능을 별도 행동 후보로 옮기고, 원전 관찰과 현대 행동 번역을
 * 명시적으로 구분한다. 이 모듈의 행동은 운을 보장하는 처방이 아니다.
 */
import {
  evaluateMyeongriJudgment,
  tenGodFamilyOf,
  tenGodForStem,
  type MyeongriJudgment,
  type TenGodFamily,
  type UsefulGodLens
} from "./myeongri-judgment";
import { currentLuck } from "./saju-engine-advanced";
import { computeSajuChart, type Element, type SajuChart, type SajuInput } from "./saju-engine";

type ActionFamily = Exclude<TenGodFamily, "self">;

const STEM_ELEMENT: Record<string, Element> = {
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토",
  己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수"
};

interface FamilyPracticeDefinition {
  label: string;
  domains: string[];
  actions: string[];
  guardrail: string;
}

const FAMILY_PRACTICES: Record<ActionFamily, FamilyPracticeDefinition> = {
  peer: {
    label: "비겁 기능",
    domains: ["협업", "관계", "자기결정"],
    actions: ["함께 하는 일의 역할·소유권·결정권을 문서로 나눈다.", "정기적으로 동료 피드백을 받되 최종 결정자를 정한다."],
    guardrail: "공동 자금과 공동 책임을 말로만 합의하지 않는다."
  },
  output: {
    label: "식상 기능",
    domains: ["표현", "생산", "교육"],
    actions: ["완성 가능한 작은 결과물을 정해 공개하거나 전달한다.", "설명·교육·콘텐츠를 실제 반응이 남는 형태로 시험한다."],
    guardrail: "표현량을 늘리는 것과 검증되지 않은 말을 단정하는 것을 구분한다."
  },
  wealth: {
    label: "재성 기능",
    domains: ["재무", "고객", "운영"],
    actions: ["주간 단위로 현금·예산·고객 진행 상태를 한 표에서 확인한다.", "가격·납기·교환 조건을 거래 전에 문서화한다."],
    guardrail: "매출 기대와 실제 입금, 관계 호의와 계약 의무를 섞지 않는다."
  },
  officer: {
    label: "관살 기능",
    domains: ["책임", "규정", "자격"],
    actions: ["마감·책임자·완료 조건이 있는 일을 우선 배치한다.", "자격·규정·검수처럼 외부 확인이 남는 절차를 만든다."],
    guardrail: "책임을 늘리기 전에 권한과 평가 조건을 확인한다."
  },
  resource: {
    label: "인성 기능",
    domains: ["학습", "문서", "회복"],
    actions: ["배운 내용을 재사용할 수 있는 문서·체크리스트로 남긴다.", "혼자 추측하기보다 검증 가능한 자료나 숙련자의 검토를 구한다."],
    guardrail: "준비와 회복이 실행을 무기한 미루는 이유가 되지 않게 종료 조건을 둔다."
  }
};

const MECHANISM_GUARDRAILS: Record<string, string> = {
  "officer-hurt": "공개 반론이나 비판 전에 책임 범위와 규정을 확인한다.",
  "hurt-officer-conflict": "표현의 자유와 조직 책임이 충돌하는 사안은 기록과 승인 경로를 남긴다.",
  "officer-killer-mixed": "여러 지시권자가 얽힌 일은 최종 승인자를 한 명으로 정한다.",
  "wealth-peer-contest": "공동 돈·고객·성과 배분은 시작 전에 비율과 철회 조건을 정한다.",
  "resource-wealth-break": "당장 수익을 위해 학습·문서·품질 검증을 생략할 때 생길 비용을 사전에 적는다.",
  "food-owl-conflict": "자료 수집과 결과물 제작의 시간을 분리하고 결과물 마감을 고정한다.",
  "blade-uncontrolled-peer": "경쟁과 속도가 올라갈수록 단독 결정보다 검토자 한 명을 둔다.",
  "month-command-clash": "월령 구조가 흔들리는 조건은 한 가지 성향으로 고정하지 않고 상황별 반응을 기록한다."
};

export interface ActionPractice {
  family: ActionFamily;
  label: string;
  domains: string[];
  actions: string[];
  guardrail: string;
  evidenceRole: "modern_interpretive_translation";
}

export interface ActionLensGuidance {
  id: UsefulGodLens["id"];
  school: string;
  status: UsefulGodLens["status"];
  candidateStems: string[];
  candidateElements: Element[];
  candidateFamilies: TenGodFamily[];
  observations: string[];
  sourceIds: string[];
  practices: ActionPractice[];
  application: "candidate" | "conditional" | "withheld";
}

export interface TimingRoleContact {
  layer: "da_yun" | "se_yun";
  pillar: string;
  stem: string;
  element: Element;
  tenGod: string;
  family: TenGodFamily;
  contactedLensIds: UsefulGodLens["id"][];
  interpretation: string;
}

export interface MyeongriActionGuidance {
  judgment: MyeongriJudgment;
  lenses: ActionLensGuidance[];
  mechanismGuardrails: { mechanismId: string; label: string; evidence: string[]; action: string }[];
  timing: null | {
    asOfYear: number;
    daYunAge: string;
    contacts: TimingRoleContact[];
    boundary: string;
  };
  sourceIds: string[];
  boundary: string;
}

function practiceForFamily(family: TenGodFamily): ActionPractice | null {
  if (family === "self") return null;
  const definition = FAMILY_PRACTICES[family];
  return { family, ...definition, evidenceRole: "modern_interpretive_translation" };
}

function guidanceForLens(lens: UsefulGodLens): ActionLensGuidance {
  return {
    id: lens.id,
    school: lens.school,
    status: lens.status,
    candidateStems: lens.candidateStems,
    candidateElements: lens.candidateElements,
    candidateFamilies: lens.candidateFamilies,
    observations: lens.observations,
    sourceIds: lens.sourceIds,
    practices: lens.candidateFamilies.map(practiceForFamily).filter((practice): practice is ActionPractice => Boolean(practice)),
    application: lens.status === "active" ? "candidate" : lens.status === "conflicted" ? "conditional" : "withheld"
  };
}

function timingContact(
  chart: SajuChart,
  layer: TimingRoleContact["layer"],
  pillar: string,
  lenses: ActionLensGuidance[]
): TimingRoleContact {
  const stem = pillar[0];
  const element = STEM_ELEMENT[stem];
  const tenGod = tenGodForStem(chart.dayMaster.gan, stem);
  const family = tenGodFamilyOf(tenGod);
  const contactedLensIds = lenses
    .filter((lens) => lens.candidateFamilies.includes(family) || lens.candidateElements.includes(element))
    .map((lens) => lens.id);
  return {
    layer,
    pillar,
    stem,
    element,
    tenGod,
    family,
    contactedLensIds,
    interpretation: contactedLensIds.length
      ? `${layer === "da_yun" ? "대운" : "세운"} 천간의 ${tenGod}·${element} 요소가 ${contactedLensIds.join("·")} 관법 후보와 접촉한다.`
      : `${layer === "da_yun" ? "대운" : "세운"} 천간의 ${tenGod}·${element}는 세 관법 후보와 직접 겹치지 않는다.`
  };
}

export function buildMyeongriActionGuidance(
  chart: SajuChart,
  timingInput?: { input: SajuInput; asOfYear: number }
): MyeongriActionGuidance {
  const judgment = evaluateMyeongriJudgment(chart);
  const lenses = judgment.usefulGods.lenses.map(guidanceForLens);
  const mechanismGuardrails = judgment.pattern.mechanisms
    .filter((mechanism) => mechanism.polarity === "damaging" && MECHANISM_GUARDRAILS[mechanism.id])
    .map((mechanism) => ({
      mechanismId: mechanism.id,
      label: mechanism.label,
      evidence: mechanism.evidence,
      action: MECHANISM_GUARDRAILS[mechanism.id]
    }));

  let timing: MyeongriActionGuidance["timing"] = null;
  if (timingInput?.input.gender && timingInput.input.hour !== undefined) {
    const luck = currentLuck(timingInput.input, timingInput.asOfYear);
    timing = {
      asOfYear: timingInput.asOfYear,
      daYunAge: luck.daYunAge,
      contacts: [
        timingContact(chart, "da_yun", luck.daYun, lenses),
        timingContact(chart, "se_yun", luck.seYun, lenses)
      ],
      boundary: "운의 천간이 원국 관법 후보와 닿는지만 표시한다. 접촉을 길흉·성과·사건 발생으로 바꾸지 않는다."
    };
  }

  return {
    judgment,
    lenses,
    mechanismGuardrails,
    timing,
    sourceIds: judgment.sourceIds,
    boundary: "고전 관법은 후보 기능과 충돌을 제공하고, 행동 문장은 그 기능을 현대 생활에 옮긴 해석이다. 색·방위·숫자 같은 상징 대응과 운이 좋아진다는 인과 주장은 행동 근거에 포함하지 않는다."
  };
}

export function buildMyeongriActionGuidanceForInput(input: SajuInput, asOfYear = 2026): MyeongriActionGuidance {
  return buildMyeongriActionGuidance(computeSajuChart(input), { input, asOfYear });
}

export function serializeMyeongriActionGuidance(guidance: MyeongriActionGuidance): string {
  const lensLines = guidance.lenses.map((lens) => {
    const practices = lens.practices.map((practice) =>
      `${practice.label}: ${practice.actions.join(" ")} 주의: ${practice.guardrail}`
    ).join(" / ");
    return `${lens.school}[${lens.status}] 후보 천간 ${lens.candidateStems.join("·") || "보류"}, 오행 ${lens.candidateElements.join("·") || "보류"}, 기능 ${lens.candidateFamilies.join("·") || "보류"}` +
      `${practices ? ` | 행동 번역 ${practices}` : " | 행동 후보 보류"}`;
  });
  const conflict = guidance.judgment.usefulGods.conflicts.length
    ? `관법 충돌: ${guidance.judgment.usefulGods.conflicts.join(" ")}`
    : "관법 간 명시 충돌 없음";
  const mechanism = guidance.mechanismGuardrails.length
    ? `구조상 안전장치: ${guidance.mechanismGuardrails.map((item) => `${item.label}→${item.action}`).join(" / ")}`
    : "구조상 추가 안전장치 없음";
  const timing = guidance.timing
    ? `운 접촉: ${guidance.timing.contacts.map((contact) => contact.interpretation).join(" / ")} ${guidance.timing.boundary}`
    : "운 접촉: 성별·시각 입력이 갖춰지지 않아 계산하지 않음";
  return `${guidance.boundary}\n${lensLines.join("\n")}\n${conflict}\n${mechanism}\n${timing}`;
}
