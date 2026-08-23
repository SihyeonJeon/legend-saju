/**
 * Source-bounded Myeongri judgment layer.
 *
 * This module does not replace the legacy numeric strength/yongsin helpers.
 * It evaluates the classical observations those helpers flatten: month command,
 * roots, exposure, pattern-supporting mechanisms, pattern-damaging mechanisms,
 * and the separate climate/pattern/support-control useful-god lenses.
 */
import { evaluateMyeongriDoctrine, type DoctrineLocator } from "./doctrine-engine";
import type { Element, SajuChart } from "./saju-engine";

const PILLAR_KEYS = ["year", "month", "day", "time"] as const;
type PillarKey = typeof PILLAR_KEYS[number];
const PILLAR_NAMES: Record<PillarKey, string> = { year: "년", month: "월", day: "일", time: "시" };

const STEM_ELEMENT: Record<string, Element> = {
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토",
  己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수"
};
const ELEMENT_GENERATES: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const ELEMENT_CONTROLS: Record<Element, Element> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
const YANG_STEMS = new Set(["甲", "丙", "戊", "庚", "壬"]);

export type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인" | "일주";
export type TenGodFamily = "peer" | "output" | "wealth" | "officer" | "resource" | "self";

const TEN_GOD_FAMILY: Record<TenGod, TenGodFamily> = {
  비견: "peer", 겁재: "peer",
  식신: "output", 상관: "output",
  편재: "wealth", 정재: "wealth",
  편관: "officer", 정관: "officer",
  편인: "resource", 정인: "resource",
  일주: "self"
};

export function tenGodFamilyOf(tenGod: TenGod): TenGodFamily {
  return TEN_GOD_FAMILY[tenGod];
}

/** 두 천간의 오행 생극과 음양으로 일간 기준 십신을 계산한다. */
export function tenGodForStem(dayStem: string, otherStem: string): Exclude<TenGod, "일주"> {
  const dayElement = STEM_ELEMENT[dayStem];
  const otherElement = STEM_ELEMENT[otherStem];
  if (!dayElement || !otherElement) throw new Error(`INVALID_STEM_PAIR:${dayStem}:${otherStem}`);
  const samePolarity = YANG_STEMS.has(dayStem) === YANG_STEMS.has(otherStem);
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (ELEMENT_GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (ELEMENT_CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (ELEMENT_CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  return samePolarity ? "편인" : "정인";
}
const FAMILY_LABEL: Record<TenGodFamily, string> = {
  peer: "비겁", output: "식상", wealth: "재성", officer: "관살", resource: "인성", self: "일간"
};

function normalizeTenGod(value: string): TenGod {
  if (value.includes("칠살") || value.includes("편관")) return "편관";
  if (value.includes("비견")) return "비견";
  if (value.includes("겁재")) return "겁재";
  if (value.includes("식신")) return "식신";
  if (value.includes("상관")) return "상관";
  if (value.includes("편재")) return "편재";
  if (value.includes("정재")) return "정재";
  if (value.includes("정관")) return "정관";
  if (value.includes("편인")) return "편인";
  if (value.includes("정인")) return "정인";
  return "일주";
}

export interface TenGodPresence {
  tenGod: TenGod;
  family: TenGodFamily;
  visibleAt: string[];
  rootedAt: string[];
}

function tenGodPresence(chart: SajuChart): TenGodPresence[] {
  const roles = new Set<TenGod>();
  for (const key of PILLAR_KEYS) {
    roles.add(normalizeTenGod(chart.pillars[key].shiShenGan));
    chart.pillars[key].shiShenZhi.forEach((role) => roles.add(normalizeTenGod(role)));
  }
  roles.delete("일주");
  return [...roles].map((tenGod) => ({
    tenGod,
    family: TEN_GOD_FAMILY[tenGod],
    visibleAt: PILLAR_KEYS
      .filter((key) => key !== "day" && normalizeTenGod(chart.pillars[key].shiShenGan) === tenGod)
      .map((key) => `${PILLAR_NAMES[key]}간`),
    rootedAt: PILLAR_KEYS.flatMap((key) => chart.pillars[key].shiShenZhi
      .map((role, index) => ({ role: normalizeTenGod(role), index }))
      .filter((item) => item.role === tenGod)
      .map((item) => `${PILLAR_NAMES[key]}지 지장간${item.index + 1}`))
  }));
}

function hasFamily(presences: TenGodPresence[], family: TenGodFamily): boolean {
  return presences.some((presence) => presence.family === family && (presence.visibleAt.length > 0 || presence.rootedAt.length > 0));
}

function familyEvidence(presences: TenGodPresence[], family: TenGodFamily): string[] {
  return presences
    .filter((presence) => presence.family === family)
    .flatMap((presence) => [
      ...presence.visibleAt.map((position) => `${position} ${presence.tenGod}`),
      ...presence.rootedAt.map((position) => `${position} ${presence.tenGod}`)
    ]);
}

const STRENGTH_LOCATOR: DoctrineLocator = {
  sourceId: "di-tian-sui-chan-wei",
  uri: "https://zh.wikisource.org/wiki/%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE",
  section: "십칠·쇠왕",
  sourceNote: "득령만으로 왕쇠를 고정하지 않고 통근과 연·일·시의 생조·극설을 함께 살핀다."
};

export interface StrengthAxis {
  id: "month_command" | "root" | "visible_support" | "visible_drain_control";
  direction: "supports_day_master" | "drains_or_controls_day_master" | "mixed" | "neutral";
  observations: string[];
}

export interface MyeongriStrengthJudgment {
  status: "support_leaning" | "weak_leaning" | "contested" | "extreme_structure_candidate";
  monthCommandTenGod: TenGod;
  exactRoots: { position: string; branch: string; stage: string; grade: "substantial" | "residual" }[];
  sameElementRoots: { position: string; branch: string; stage: string }[];
  axes: StrengthAxis[];
  followingCandidate: null | "follow_output" | "follow_wealth" | "follow_officer";
  sourceLocator: DoctrineLocator;
  policy: string;
  boundary: string;
}

const SUBSTANTIAL_ROOT_STAGES = new Set(["장생", "관대", "건록", "제왕"]);

function strengthJudgment(chart: SajuChart, presences: TenGodPresence[]): MyeongriStrengthJudgment {
  const monthCommandTenGod = normalizeTenGod(chart.pillars.month.shiShenZhi[0] ?? "일주");
  const monthFamily = TEN_GOD_FAMILY[monthCommandTenGod];
  const roots = PILLAR_KEYS.flatMap((key) => {
    const pillar = chart.pillars[key];
    if (!pillar.hideGan.includes(chart.dayMaster.gan)) return [];
    return [{
      position: `${PILLAR_NAMES[key]}지`,
      branch: pillar.zhi,
      stage: pillar.diShi,
      grade: SUBSTANTIAL_ROOT_STAGES.has(pillar.diShi) ? "substantial" as const : "residual" as const
    }];
  });
  const sameElementRoots = PILLAR_KEYS.flatMap((key) => {
    const pillar = chart.pillars[key];
    if (!pillar.hideGan.some((stem) => STEM_ELEMENT[stem] === chart.dayMaster.el)) return [];
    return [{ position: `${PILLAR_NAMES[key]}지`, branch: pillar.zhi, stage: pillar.diShi }];
  });
  const visibleSupport = presences
    .filter((presence) => presence.visibleAt.length > 0 && (presence.family === "peer" || presence.family === "resource"))
    .flatMap((presence) => presence.visibleAt.map((position) => `${position} ${presence.tenGod}`));
  const visiblePressure = presences
    .filter((presence) => presence.visibleAt.length > 0 && ["output", "wealth", "officer"].includes(presence.family))
    .flatMap((presence) => presence.visibleAt.map((position) => `${position} ${presence.tenGod}`));
  const monthDirection = monthFamily === "peer" || monthFamily === "resource"
    ? "supports_day_master" as const
    : monthFamily === "self"
      ? "neutral" as const
      : "drains_or_controls_day_master" as const;
  const axes: StrengthAxis[] = [
    {
      id: "month_command",
      direction: monthDirection,
      observations: [`월지 ${chart.pillars.month.zhi} 본기 ${chart.pillars.month.hideGan[0] ?? "없음"}=${monthCommandTenGod}`]
    },
    {
      id: "root",
      direction: sameElementRoots.length ? "supports_day_master" : "neutral",
      observations: sameElementRoots.length
        ? sameElementRoots.map((root) => `${root.position} ${root.branch} ${root.stage}`)
        : ["일간과 같은 오행의 지지 뿌리 없음"]
    },
    {
      id: "visible_support",
      direction: visibleSupport.length ? "supports_day_master" : "neutral",
      observations: visibleSupport.length ? visibleSupport : ["일간 밖의 투출 비겁·인성 없음"]
    },
    {
      id: "visible_drain_control",
      direction: visiblePressure.length ? "drains_or_controls_day_master" : "neutral",
      observations: visiblePressure.length ? visiblePressure : ["투출 식상·재성·관살 없음"]
    }
  ];

  const allSupportEvidence = presences.filter((presence) => presence.family === "peer" || presence.family === "resource");
  const hasAnySupport = allSupportEvidence.some((presence) => presence.visibleAt.length > 0 || presence.rootedAt.length > 0);
  let followingCandidate: MyeongriStrengthJudgment["followingCandidate"] = null;
  if (!sameElementRoots.length && !hasAnySupport) {
    if (monthFamily === "output") followingCandidate = "follow_output";
    if (monthFamily === "wealth") followingCandidate = "follow_wealth";
    if (monthFamily === "officer") followingCandidate = "follow_officer";
  }

  let status: MyeongriStrengthJudgment["status"] = "contested";
  if (followingCandidate) status = "extreme_structure_candidate";
  else if (monthDirection === "supports_day_master" && sameElementRoots.length) status = "support_leaning";
  else if (monthDirection === "drains_or_controls_day_master" && !sameElementRoots.length && !visibleSupport.length) status = "weak_leaning";

  return {
    status,
    monthCommandTenGod,
    exactRoots: roots,
    sameElementRoots,
    axes,
    followingCandidate,
    sourceLocator: STRENGTH_LOCATOR,
    policy: "강한 기울기는 월령과 뿌리가 함께 생조할 때, 약한 기울기는 실령·무근·무투출 생조가 함께 성립할 때만 표시한다. 나머지는 경합으로 남긴다.",
    boundary: "고전이 고정 임계값을 주지 않은 곳에 숫자 점수를 만들지 않는다. 종격 후보는 뿌리와 생조가 없다는 필요조건만 충족한 상태이며 종격 확정이 아니다."
  };
}

export type PatternName =
  "정관격 후보" | "편관격 후보" | "정재격 후보" | "편재격 후보" |
  "정인격 후보" | "편인격 후보" | "식신격 후보" | "상관격 후보" |
  "건록격 후보" | "양인격 후보" | "월겁 후보" | "월령 비견 후보";

const TEN_GOD_PATTERN: Partial<Record<TenGod, PatternName>> = {
  정관: "정관격 후보", 편관: "편관격 후보", 정재: "정재격 후보", 편재: "편재격 후보",
  정인: "정인격 후보", 편인: "편인격 후보", 식신: "식신격 후보", 상관: "상관격 후보"
};
const LU_BRANCH: Record<string, string> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
const YANG_BLADE_BRANCH: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };

type MechanismFamily = Exclude<TenGodFamily, "self">;
interface MechanismRule {
  id: string;
  label: string;
  polarity: "supporting" | "damaging";
  patterns: PatternName[];
  requires: MechanismFamily[];
  requiresExact?: TenGod[];
  requiresVisible?: MechanismFamily[];
}

const MECHANISM_RULES: MechanismRule[] = [
  { id: "officer-wealth-generates", label: "재생관", polarity: "supporting", patterns: ["정관격 후보"], requires: ["wealth", "officer"] },
  { id: "officer-resource-cycle", label: "관인상생", polarity: "supporting", patterns: ["정관격 후보", "정인격 후보"], requires: ["officer", "resource"] },
  { id: "officer-hurt", label: "상관견관", polarity: "damaging", patterns: ["정관격 후보"], requires: ["output", "officer"], requiresExact: ["상관", "정관"] },
  { id: "officer-killer-mixed", label: "관살혼잡", polarity: "damaging", patterns: ["정관격 후보", "편관격 후보"], requires: ["officer"], requiresExact: ["정관", "편관"] },
  { id: "killer-food-controls", label: "식신제살", polarity: "supporting", patterns: ["편관격 후보", "식신격 후보"], requires: ["output", "officer"], requiresExact: ["식신", "편관"] },
  { id: "killer-resource-cycle", label: "살인상생", polarity: "supporting", patterns: ["편관격 후보", "편인격 후보", "정인격 후보"], requires: ["officer", "resource"], requiresExact: ["편관"] },
  { id: "wealth-output-cycle", label: "식상생재", polarity: "supporting", patterns: ["정재격 후보", "편재격 후보", "식신격 후보", "상관격 후보"], requires: ["output", "wealth"] },
  { id: "wealth-peer-contest", label: "비겁쟁재", polarity: "damaging", patterns: ["정재격 후보", "편재격 후보"], requires: ["peer", "wealth"] },
  { id: "resource-wealth-break", label: "재파인", polarity: "damaging", patterns: ["정인격 후보", "편인격 후보"], requires: ["wealth", "resource"] },
  { id: "food-owl-conflict", label: "편인탈식", polarity: "damaging", patterns: ["식신격 후보", "편인격 후보"], requires: ["output", "resource"], requiresExact: ["편인", "식신"] },
  { id: "hurt-resource-balance", label: "상관패인", polarity: "supporting", patterns: ["상관격 후보"], requires: ["output", "resource"], requiresExact: ["상관"] },
  { id: "hurt-officer-conflict", label: "상관견관", polarity: "damaging", patterns: ["상관격 후보"], requires: ["output", "officer"], requiresExact: ["상관", "정관"] },
  { id: "lu-wealth-officer", label: "건록의 재관 투출", polarity: "supporting", patterns: ["건록격 후보", "월겁 후보", "월령 비견 후보"], requires: ["wealth", "officer"], requiresVisible: ["wealth", "officer"] },
  { id: "blade-controlled", label: "관살제인", polarity: "supporting", patterns: ["양인격 후보"], requires: ["officer"], requiresVisible: ["officer"] },
  { id: "blade-uncontrolled-peer", label: "양인·비겁 중첩", polarity: "damaging", patterns: ["양인격 후보"], requires: ["peer"] }
];

const PATTERN_LOCATOR: DoctrineLocator = {
  sourceId: "sanming-tonghui",
  uri: "https://ctext.org/wiki.pl?chapter=721793&if=en",
  section: "권10·간명구결",
  sourceNote: "월령을 먼저 보고 월지 소장의 투출과 재·관·인·식·살의 제화 및 훼손을 함께 살핀다."
};

export interface PatternMechanism {
  id: string;
  label: string;
  polarity: "supporting" | "damaging";
  grade: "exposed" | "rooted" | "structural";
  evidence: string[];
}

export interface MyeongriPatternJudgment {
  pattern: PatternName;
  monthMainStem: string;
  monthMainTenGod: TenGod;
  exposedMonthHiddenStems: { stem: string; tenGod: TenGod; exposedAt: string[] }[];
  mechanisms: PatternMechanism[];
  monthBranchClashes: string[];
  status: "supported" | "contested" | "damaged" | "unresolved";
  sourceLocator: DoctrineLocator;
  boundary: string;
}

function patternName(chart: SajuChart, monthMainTenGod: TenGod): PatternName {
  if (LU_BRANCH[chart.dayMaster.gan] === chart.pillars.month.zhi) return "건록격 후보";
  if (YANG_BLADE_BRANCH[chart.dayMaster.gan] === chart.pillars.month.zhi) return "양인격 후보";
  const regular = TEN_GOD_PATTERN[monthMainTenGod];
  if (regular) return regular;
  if (monthMainTenGod === "겁재") return "월겁 후보";
  return "월령 비견 후보";
}

const BRANCH_CLASH: Record<string, string> = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };

function patternJudgment(chart: SajuChart, presences: TenGodPresence[]): MyeongriPatternJudgment {
  const monthMainStem = chart.pillars.month.hideGan[0] ?? "";
  const monthMainTenGod = normalizeTenGod(chart.pillars.month.shiShenZhi[0] ?? "일주");
  const pattern = patternName(chart, monthMainTenGod);
  const exposedMonthHiddenStems = chart.pillars.month.hideGan.map((stem, index) => ({
    stem,
    tenGod: normalizeTenGod(chart.pillars.month.shiShenZhi[index] ?? "일주"),
    exposedAt: PILLAR_KEYS
      .filter((key) => key !== "day" && chart.pillars[key].gan === stem)
      .map((key) => `${PILLAR_NAMES[key]}간`)
  })).filter((item) => item.exposedAt.length > 0);

  const mechanisms: PatternMechanism[] = MECHANISM_RULES
    .filter((rule) => rule.patterns.includes(pattern))
    .filter((rule) => rule.requires.every((family) => hasFamily(presences, family)))
    .filter((rule) => (rule.requiresVisible ?? []).every((family) => presences.some((presence) =>
      presence.family === family && presence.visibleAt.length > 0
    )))
    .filter((rule) => (rule.requiresExact ?? []).every((tenGod) => presences.some((presence) =>
      presence.tenGod === tenGod && (presence.visibleAt.length > 0 || presence.rootedAt.length > 0)
    )))
    .map((rule) => {
      const requiredFamiliesVisible = rule.requires.every((family) => presences.some((presence) =>
        presence.family === family && presence.visibleAt.length > 0
      ));
      const requiredExactVisible = (rule.requiresExact ?? []).every((tenGod) => presences.some((presence) =>
        presence.tenGod === tenGod && presence.visibleAt.length > 0
      ));
      return {
        id: rule.id,
        label: rule.label,
        polarity: rule.polarity,
        grade: requiredFamiliesVisible && requiredExactVisible ? "exposed" as const : "rooted" as const,
        evidence: rule.requires.flatMap((family) => familyEvidence(presences, family))
      };
    });
  const monthBranchClashes = PILLAR_KEYS
    .filter((key) => key !== "month" && chart.pillars[key].zhi === BRANCH_CLASH[chart.pillars.month.zhi])
    .map((key) => `월지 ${chart.pillars.month.zhi}와 ${PILLAR_NAMES[key]}지 ${chart.pillars[key].zhi} 충`);
  if (monthBranchClashes.length) mechanisms.push({
    id: "month-command-clash",
    label: "월령 충",
    polarity: "damaging",
    grade: "structural",
    evidence: monthBranchClashes
  });
  const supporting = mechanisms.some((mechanism) => mechanism.polarity === "supporting" && mechanism.grade !== "rooted");
  const damaging = mechanisms.some((mechanism) => mechanism.polarity === "damaging" && mechanism.grade !== "rooted");
  const status = supporting && damaging ? "contested" : supporting ? "supported" : damaging ? "damaged" : "unresolved";
  return {
    pattern,
    monthMainStem,
    monthMainTenGod,
    exposedMonthHiddenStems,
    mechanisms,
    monthBranchClashes,
    status,
    sourceLocator: PATTERN_LOCATOR,
    boundary: "월지 본기와 투출로 격 후보를 세우고 성립·훼손 장치를 검출한 결과다. 격의 부귀, 직업, 사건을 자동 판정하지 않으며 겸격과 변격을 하나로 강제하지 않는다."
  };
}

function generatingElement(element: Element): Element {
  return (Object.keys(ELEMENT_GENERATES) as Element[]).find((candidate) => ELEMENT_GENERATES[candidate] === element)!;
}

function controllingElement(element: Element): Element {
  return (Object.keys(ELEMENT_CONTROLS) as Element[]).find((candidate) => ELEMENT_CONTROLS[candidate] === element)!;
}

function elementsForFamily(dayElement: Element, family: MechanismFamily): Element[] {
  if (family === "peer") return [dayElement];
  if (family === "resource") return [generatingElement(dayElement)];
  if (family === "output") return [ELEMENT_GENERATES[dayElement]];
  if (family === "wealth") return [ELEMENT_CONTROLS[dayElement]];
  return [controllingElement(dayElement)];
}

const PATTERN_FUNCTIONS: Record<PatternName, MechanismFamily[]> = {
  "정관격 후보": ["wealth", "resource"],
  "편관격 후보": ["output", "resource"],
  "정재격 후보": ["output", "officer"],
  "편재격 후보": ["output", "officer"],
  "정인격 후보": ["officer"],
  "편인격 후보": ["officer"],
  "식신격 후보": ["wealth", "officer"],
  "상관격 후보": ["wealth", "resource"],
  "건록격 후보": ["wealth", "officer"],
  "양인격 후보": ["officer"],
  "월겁 후보": ["wealth", "officer"],
  "월령 비견 후보": ["wealth", "officer"]
};

export interface UsefulGodLens {
  id: "climate" | "pattern_function" | "support_control";
  school: string;
  candidateStems: string[];
  candidateFamilies: TenGodFamily[];
  candidateElements: Element[];
  observations: string[];
  sourceIds: string[];
  status: "active" | "conflicted" | "withheld";
}

export interface MyeongriUsefulGodJudgment {
  lenses: UsefulGodLens[];
  conflicts: string[];
  boundary: string;
}

function usefulGodJudgment(
  chart: SajuChart,
  strength: MyeongriStrengthJudgment,
  pattern: MyeongriPatternJudgment
): MyeongriUsefulGodJudgment {
  const climate = evaluateMyeongriDoctrine(chart);
  const climateStems = climate.status === "matched" ? climate.presences.filter((presence) => presence.role === "primary").map((presence) => presence.stem) : [];
  const climateElements = [...new Set(climateStems.map((stem) => STEM_ELEMENT[stem]).filter((element): element is Element => Boolean(element)))];
  const patternFamilies = PATTERN_FUNCTIONS[pattern.pattern];
  const patternElements = [...new Set(patternFamilies.flatMap((family) => elementsForFamily(chart.dayMaster.el, family)))];
  let supportFamilies: MechanismFamily[] = [];
  if (strength.status === "support_leaning") supportFamilies = ["output", "wealth", "officer"];
  if (strength.status === "weak_leaning") supportFamilies = ["resource", "peer"];
  const supportElements = [...new Set(supportFamilies.flatMap((family) => elementsForFamily(chart.dayMaster.el, family)))];
  const conflicts: string[] = [];
  if (climateElements.length && patternElements.length && !climateElements.some((element) => patternElements.includes(element))) {
    conflicts.push(`조후 후보 ${climateElements.join("·")}와 격국 기능 후보 ${patternElements.join("·")}가 겹치지 않는다.`);
  }
  if (climateElements.length && supportElements.length && !climateElements.some((element) => supportElements.includes(element))) {
    conflicts.push(`조후 후보 ${climateElements.join("·")}와 부억 후보 ${supportElements.join("·")}가 겹치지 않는다.`);
  }
  return {
    lenses: [
      {
        id: "climate",
        school: "궁통보감 월령 조후",
        candidateStems: climateStems,
        candidateFamilies: [],
        candidateElements: climateElements,
        observations: climate.status === "matched"
          ? [climate.normalizedReading, ...climate.presences.filter((presence) => presence.role === "primary").map((presence) => `${presence.stem}=${presence.state}`)]
          : [climate.normalizedReading],
        sourceIds: ["qiongtong-baojian"],
        status: climateStems.length ? "active" : "withheld"
      },
      {
        id: "pattern_function",
        school: "월령 격국 기능",
        candidateStems: [],
        candidateFamilies: patternFamilies,
        candidateElements: patternElements,
        observations: [`${pattern.pattern}의 보강 기능 ${patternFamilies.map((family) => FAMILY_LABEL[family]).join("·")}`, ...pattern.mechanisms.map((mechanism) => `${mechanism.label}:${mechanism.polarity}:${mechanism.grade}`)],
        sourceIds: ["sanming-tonghui", "yuanhai-ziping"],
        status: pattern.status === "contested" || pattern.status === "damaged" ? "conflicted" : "active"
      },
      {
        id: "support_control",
        school: "적천수 쇠왕 생극",
        candidateStems: [],
        candidateFamilies: supportFamilies,
        candidateElements: supportElements,
        observations: supportFamilies.length
          ? [`${strength.status}에서 ${supportFamilies.map((family) => FAMILY_LABEL[family]).join("·")} 기능을 검토한다.`]
          : ["월령·통근·투출이 한 방향으로 모이지 않아 부억 후보를 보류했다."],
        sourceIds: ["di-tian-sui-chan-wei"],
        status: supportFamilies.length ? "active" : "withheld"
      }
    ],
    conflicts,
    boundary: "조후·격국·부억은 서로 다른 질문을 푸는 관법이다. 후보가 겹쳐도 최종 용신으로 자동 승격하지 않고, 어긋나면 충돌을 그대로 반환한다."
  };
}

export interface MyeongriJudgment {
  strength: MyeongriStrengthJudgment;
  pattern: MyeongriPatternJudgment;
  usefulGods: MyeongriUsefulGodJudgment;
  tenGodPresences: TenGodPresence[];
  sourceIds: string[];
  boundary: string;
}

export function evaluateMyeongriJudgment(chart: SajuChart): MyeongriJudgment {
  const presences = tenGodPresence(chart);
  const strength = strengthJudgment(chart, presences);
  const pattern = patternJudgment(chart, presences);
  const usefulGods = usefulGodJudgment(chart, strength, pattern);
  return {
    strength,
    pattern,
    usefulGods,
    tenGodPresences: presences,
    sourceIds: ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei", "yuanhai-ziping", "qiongtong-baojian"],
    boundary: "이 객체는 월령·통근·투출·성패 장치를 계산한 관법 기록이다. 숫자 운명 점수, 사건 발생 확률, 부귀 등급을 만들지 않는다."
  };
}

type BranchContactKind = "same" | "six_harmony" | "clash" | "harm" | "break" | "trine_family";
type StemContactKind = "same" | "five_combination" | "clash" | "generates" | "controls";

const BRANCH_HARMONY: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const BRANCH_HARM: Record<string, string> = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
const BRANCH_BREAK: Record<string, string> = { 子: "酉", 酉: "子", 午: "卯", 卯: "午", 辰: "丑", 丑: "辰", 戌: "未", 未: "戌", 寅: "亥", 亥: "寅", 巳: "申", 申: "巳" };
const TRINES = [["申", "子", "辰"], ["寅", "午", "戌"], ["巳", "酉", "丑"], ["亥", "卯", "未"]];
const STEM_COMBINATION: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" };
const STEM_CLASH: Record<string, string> = { 甲: "庚", 庚: "甲", 乙: "辛", 辛: "乙", 丙: "壬", 壬: "丙", 丁: "癸", 癸: "丁" };

export interface CrossChartContact {
  layer: "stem" | "branch";
  aPosition: string;
  bPosition: string;
  aToken: string;
  bToken: string;
  kind: BranchContactKind | StemContactKind;
  direction?: "a_to_b" | "b_to_a" | "mutual";
  salience: "spouse_palace" | "day_master" | "cross_pillar";
}

function classifyBranchContacts(a: string, b: string): BranchContactKind[] {
  if (a === b) return ["same"];
  const contacts: BranchContactKind[] = [];
  if (BRANCH_HARMONY[a] === b) contacts.push("six_harmony");
  if (BRANCH_CLASH[a] === b) contacts.push("clash");
  if (BRANCH_HARM[a] === b) contacts.push("harm");
  if (BRANCH_BREAK[a] === b) contacts.push("break");
  if (TRINES.some((trine) => trine.includes(a) && trine.includes(b))) contacts.push("trine_family");
  return contacts;
}

function classifyStemContacts(a: string, b: string): { kind: StemContactKind; direction?: CrossChartContact["direction"] }[] {
  if (a === b) return [{ kind: "same", direction: "mutual" }];
  const contacts: { kind: StemContactKind; direction?: CrossChartContact["direction"] }[] = [];
  if (STEM_COMBINATION[a] === b) contacts.push({ kind: "five_combination", direction: "mutual" });
  if (STEM_CLASH[a] === b) contacts.push({ kind: "clash", direction: "mutual" });
  const aElement = STEM_ELEMENT[a];
  const bElement = STEM_ELEMENT[b];
  if (ELEMENT_GENERATES[aElement] === bElement) contacts.push({ kind: "generates", direction: "a_to_b" });
  if (ELEMENT_GENERATES[bElement] === aElement) contacts.push({ kind: "generates", direction: "b_to_a" });
  if (ELEMENT_CONTROLS[aElement] === bElement) contacts.push({ kind: "controls", direction: "a_to_b" });
  if (ELEMENT_CONTROLS[bElement] === aElement) contacts.push({ kind: "controls", direction: "b_to_a" });
  return contacts;
}

export interface MyeongriCompatibilityJudgment {
  dayPillars: { a: string; b: string };
  spousePalaceContacts: CrossChartContact[];
  dayMasterContacts: CrossChartContact[];
  crossPillarContacts: CrossChartContact[];
  primaryStatus: "supportive_only" | "tension_only" | "mixed" | "undetermined";
  status: "supportive_only" | "tension_only" | "mixed" | "undetermined";
  sourceIds: string[];
  boundary: string;
}

export function evaluateMyeongriCompatibility(a: SajuChart, b: SajuChart): MyeongriCompatibilityJudgment {
  const branchContactRows: CrossChartContact[] = [];
  const stemContactRows: CrossChartContact[] = [];
  for (const aKey of PILLAR_KEYS) {
    for (const bKey of PILLAR_KEYS) {
      const aPillar = a.pillars[aKey];
      const bPillar = b.pillars[bKey];
      for (const branchKind of classifyBranchContacts(aPillar.zhi, bPillar.zhi)) {
        branchContactRows.push({
          layer: "branch",
          aPosition: PILLAR_NAMES[aKey],
          bPosition: PILLAR_NAMES[bKey],
          aToken: aPillar.zhi,
          bToken: bPillar.zhi,
          kind: branchKind,
          direction: "mutual",
          salience: aKey === "day" && bKey === "day" ? "spouse_palace" : "cross_pillar"
        });
      }
      for (const stem of classifyStemContacts(aPillar.gan, bPillar.gan)) {
        stemContactRows.push({
          layer: "stem",
          aPosition: PILLAR_NAMES[aKey],
          bPosition: PILLAR_NAMES[bKey],
          aToken: aPillar.gan,
          bToken: bPillar.gan,
          kind: stem.kind,
          direction: stem.direction,
          salience: aKey === "day" && bKey === "day" ? "day_master" : "cross_pillar"
        });
      }
    }
  }
  const spousePalaceContacts = branchContactRows.filter((contact) => contact.salience === "spouse_palace");
  const dayMasterContacts = stemContactRows.filter((contact) => contact.salience === "day_master");
  const primary = [...spousePalaceContacts, ...dayMasterContacts];
  const supportiveKinds = new Set(["six_harmony", "trine_family", "five_combination", "generates"]);
  const tensionKinds = new Set(["clash", "harm", "break", "controls"]);
  const classify = (contacts: CrossChartContact[]) => {
    const supportive = contacts.some((contact) => supportiveKinds.has(contact.kind));
    const tension = contacts.some((contact) => tensionKinds.has(contact.kind));
    return supportive && tension ? "mixed" as const : supportive ? "supportive_only" as const : tension ? "tension_only" as const : "undetermined" as const;
  };
  const allContacts = [...branchContactRows, ...stemContactRows];
  return {
    dayPillars: { a: a.pillars.day.gz, b: b.pillars.day.gz },
    spousePalaceContacts,
    dayMasterContacts,
    crossPillarContacts: allContacts.filter((contact) => contact.salience === "cross_pillar"),
    primaryStatus: classify(primary),
    status: classify(allContacts),
    sourceIds: ["lunar-typescript", "sanming-tonghui", "di-tian-sui-chan-wei"],
    boundary: "두 원국의 4×4 간지 관계와 일간·배우자궁의 우선 접촉을 계산한다. 합은 관계 성공, 충은 이별을 뜻하지 않으며 대운 동조·자미 부처궁·실제 관계사는 별도 검토다."
  };
}
