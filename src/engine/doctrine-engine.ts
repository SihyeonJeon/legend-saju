/** Source-located doctrine rules.  No rule without a reproducible condition. */
import type { LifeDomain } from "./engine-v2";
import { findQiongtongMonthRule } from "./qiongtong-month-rules";
import { findQiongtongSeasonalRule } from "./qiongtong-seasonal-rules";
import {
  evaluateQiongtongSubclauses,
  type QiongtongSubclauseMatch
} from "./qiongtong-subclauses";
import type { SajuChart } from "./saju-engine";
import type { ZiweiChart, ZiweiPalace } from "./ziwei-engine";
import { ZIWEI_PALACE_DOCTRINE_RULES } from "./ziwei-palace-doctrine-rules";

export interface DoctrineLocator {
  sourceId: string;
  uri: string;
  section: string;
  sourceNote: string;
}

export type PresenceState = "exposed" | "rooted_only" | "absent";
export interface StemPresence {
  stem: string;
  role: "primary" | "support" | "conditional";
  state: PresenceState;
  visibleAt: string[];
  hiddenAt: string[];
}

const PILLAR_KEYS = ["year", "month", "day", "time"] as const;
const PILLAR_NAMES = { year: "년", month: "월", day: "일", time: "시" } as const;

function stemPresence(chart: SajuChart, stem: string, role: StemPresence["role"]): StemPresence {
  const visibleAt = PILLAR_KEYS.filter((key) => chart.pillars[key].gan === stem).map((key) => `${PILLAR_NAMES[key]}간`);
  const hiddenAt = PILLAR_KEYS.filter((key) => chart.pillars[key].hideGan.includes(stem)).map((key) => `${PILLAR_NAMES[key]}지`);
  return {
    stem,
    role,
    state: visibleAt.length ? "exposed" : hiddenAt.length ? "rooted_only" : "absent",
    visibleAt,
    hiddenAt
  };
}

export interface EarthToken {
  glyph: string;
  position: string;
  layer: "visible_stem" | "earth_branch" | "hidden_stem";
  subtype: string;
  seasonalImage: string;
  hiddenComposition?: string[];
}

const EARTH_STEM_IMAGE: Record<string, { subtype: string; image: string }> = {
  戊: { subtype: "양토", image: "큰 토·제방·산의 물상" },
  己: { subtype: "음토", image: "전답·재배지의 물상" }
};
const EARTH_BRANCH_IMAGE: Record<string, { subtype: string; image: string }> = {
  辰: { subtype: "봄의 습토", image: "수기와 목기를 함께 품은 저장지" },
  戌: { subtype: "가을의 조토", image: "화기와 금기를 함께 품은 저장지" },
  丑: { subtype: "겨울의 한습토", image: "수기와 금기를 함께 품은 저장지" },
  未: { subtype: "여름의 온조토", image: "화기와 목기를 함께 품은 저장지" }
};

/** "토가 여섯" 같은 평면 계수를 천간·지지·지장간 층으로 분해한다. */
export function analyzeEarthAnatomy(chart: SajuChart): {
  tokens: EarthToken[];
  visibleEarthCount: number;
  earthBranchCount: number;
  hiddenEarthCount: number;
  sourceLocator: DoctrineLocator;
  boundary: string;
} {
  const tokens: EarthToken[] = [];
  for (const key of PILLAR_KEYS) {
    const pillar = chart.pillars[key];
    const stemImage = EARTH_STEM_IMAGE[pillar.gan];
    if (stemImage) tokens.push({ glyph: pillar.gan, position: `${PILLAR_NAMES[key]}간`, layer: "visible_stem", subtype: stemImage.subtype, seasonalImage: stemImage.image });
    const branchImage = EARTH_BRANCH_IMAGE[pillar.zhi];
    if (branchImage) tokens.push({
      glyph: pillar.zhi,
      position: `${PILLAR_NAMES[key]}지`,
      layer: "earth_branch",
      subtype: branchImage.subtype,
      seasonalImage: branchImage.image,
      hiddenComposition: pillar.hideGan
    });
    pillar.hideGan.forEach((hidden, index) => {
      const hiddenImage = EARTH_STEM_IMAGE[hidden];
      if (hiddenImage) tokens.push({
        glyph: hidden,
        position: `${PILLAR_NAMES[key]}지 지장간${index + 1}`,
        layer: "hidden_stem",
        subtype: hiddenImage.subtype,
        seasonalImage: hiddenImage.image
      });
    });
  }
  return {
    tokens,
    visibleEarthCount: tokens.filter((token) => token.layer === "visible_stem").length,
    earthBranchCount: tokens.filter((token) => token.layer === "earth_branch").length,
    hiddenEarthCount: tokens.filter((token) => token.layer === "hidden_stem").length,
    sourceLocator: {
      sourceId: "qiongtong-baojian",
      uri: "https://zh.wikisource.org/zh-hant/%E7%A9%B7%E9%80%9A%E5%AF%B6%E9%91%91",
      section: "오행총론·논토·논무토·논기토",
      sourceNote: "토의 성질은 계절과 천간·지지 층에 따라 나뉜다. 개수만으로 쓰임을 확정하지 않는다."
    },
    boundary: "물상 명칭은 고전 관법의 분류다. 직업·인격·부를 직접 산출하는 수치가 아니다."
  };
}

export interface MyeongriDoctrineResult {
  ruleId: string;
  status: "matched" | "not_compiled";
  granularity: "exact_month" | "seasonal_group" | "uncompiled";
  school: "궁통보감 조후";
  dayStem: string;
  monthBranch: string;
  presences: StemPresence[];
  fulfilledPrimary: string[];
  missingPrimary: string[];
  conditionalFindings: string[];
  subclauseMatches: QiongtongSubclauseMatch[];
  classicalPattern?: string;
  normalizedReading: string;
  sourceLocator: DoctrineLocator;
  sourceGranularity?: "individual_month_clause" | "grouped_month_clause" | "intra_month_phase_clause" | "seasonal_group";
  boundary: string;
}

const STEM_COMBINATIONS: [string, string, string, string][] = [
  ["甲", "己", "토", "갑기합"], ["乙", "庚", "금", "을경합"], ["丙", "辛", "수", "병신합"], ["丁", "壬", "목", "정임합"], ["戊", "癸", "화", "무계합"]
];

/** V2 doctrine pack: 120 exact month cells, with seasonal fallback only. */
export function evaluateMyeongriDoctrine(chart: SajuChart): MyeongriDoctrineResult {
  const dayStem = chart.pillars.day.gan;
  const monthBranch = chart.pillars.month.zhi;
  const baseLocator: DoctrineLocator = {
    sourceId: "qiongtong-baojian",
    uri: "https://zh.wikisource.org/zh-hant/%E7%A9%B7%E9%80%9A%E5%AF%B6%E9%91%91",
    section: `논${dayStem}`,
    sourceNote: `${dayStem}의 월령별 조후 조건`
  };
  const subclauseMatches = evaluateQiongtongSubclauses(chart);
  const rule = findQiongtongMonthRule(dayStem, monthBranch);
  if (!rule) {
    const seasonal = findQiongtongSeasonalRule(dayStem, monthBranch);
    if (!seasonal) return {
      ruleId: "QTB-MONTH-UNCOMPILED",
      status: "not_compiled",
      granularity: "uncompiled",
      school: "궁통보감 조후",
      dayStem,
      monthBranch,
      presences: [],
      fulfilledPrimary: [],
      missingPrimary: [],
      conditionalFindings: [],
      subclauseMatches,
      normalizedReading: "이 일간·월지 조합은 원문 대조 규칙이 없어 실행하지 않는다.",
      sourceLocator: baseLocator,
      boundary: "미컴파일 규칙을 다른 일간이나 인접 월에 유추 적용하지 않는다."
    };
    const presences = [
      ...seasonal.primary.map((stem) => stemPresence(chart, stem, "primary")),
      ...seasonal.support.map((stem) => stemPresence(chart, stem, "support")),
      ...seasonal.conditional.map((stem) => stemPresence(chart, stem, "conditional"))
    ];
    return {
      ruleId: seasonal.id,
      status: "matched",
      granularity: "seasonal_group",
      school: "궁통보감 조후",
      dayStem,
      monthBranch,
      presences,
      fulfilledPrimary: presences.filter((presence) => presence.role === "primary" && presence.state !== "absent").map((presence) => presence.stem),
      missingPrimary: presences.filter((presence) => presence.role === "primary" && presence.state === "absent").map((presence) => presence.stem),
      conditionalFindings: ["정확 월 규칙 누락으로 계절 공통 규칙만 사용했다."],
      subclauseMatches,
      normalizedReading: seasonal.normalizedPrinciple,
      sourceLocator: { ...baseLocator, section: seasonal.section, sourceNote: `${dayStem} 계절 fallback` },
      sourceGranularity: "seasonal_group",
      boundary: "계절 fallback은 정확 월 규칙보다 낮은 해상도며 최종 용신을 확정하지 않는다."
    };
  }
  const presences = [
    ...rule.primary.map((stem) => stemPresence(chart, stem, "primary")),
    ...rule.support.map((stem) => stemPresence(chart, stem, "support")),
    ...rule.conditional.map((stem) => stemPresence(chart, stem, "conditional"))
  ];
  const fulfilledPrimary = presences.filter((presence) => presence.role === "primary" && presence.state !== "absent").map((presence) => presence.stem);
  const missingPrimary = presences.filter((presence) => presence.role === "primary" && presence.state === "absent").map((presence) => presence.stem);
  const conditionalFindings: string[] = [];
  let classicalPattern: string | undefined;
  const exposed = new Set(PILLAR_KEYS.map((key) => chart.pillars[key].gan));
  if (rule.phaseNote) conditionalFindings.push(rule.phaseNote);
  if (rule.sourceGranularity === "grouped_month_clause") conditionalFindings.push("원문이 인접 월과 묶어 제시한 규칙이라 묶음 절의 공통 조건을 사용했다.");
  for (const [left, right, target, name] of STEM_COMBINATIONS) {
    if (!exposed.has(left) || !exposed.has(right)) continue;
    const priorityStem = rule.primary.includes(left) ? left : rule.primary.includes(right) ? right : undefined;
    if (priorityStem) conditionalFindings.push(`${left}${right}(${name})이 있어 우선 확인 글자 ${priorityStem}의 역할이 묶이는지 본다. ${target} 합화는 자동 확정하지 않는다.`);
  }
  if (subclauseMatches.length) {
    classicalPattern = subclauseMatches.map((match) => match.classicalPattern).join("·");
    conditionalFindings.push(...subclauseMatches.flatMap((match) => [
      `${match.classicalPattern}: ${match.normalizedReading}`,
      ...match.predicateFindings
    ]));
  }
  const primarySummary = missingPrimary.length
    ? `핵심 글자 ${missingPrimary.join("·")}가 원국에 보이지 않는다.`
    : `핵심 글자 ${fulfilledPrimary.join("·")}가 원국에 있다.`;
  return {
    ruleId: rule.id,
    status: "matched",
    granularity: "exact_month",
    school: "궁통보감 조후",
    dayStem,
    monthBranch,
    presences,
    fulfilledPrimary,
    missingPrimary,
    conditionalFindings,
    subclauseMatches,
    classicalPattern,
    normalizedReading: `${rule.normalizedPrinciple} ${primarySummary}`,
    sourceLocator: { ...baseLocator, section: rule.section, sourceNote: `${monthBranch}월 ${dayStem} 조후 검토 순서` },
    sourceGranularity: rule.sourceGranularity,
    boundary: "월지는 절입으로 계산한 건월이며 민간 음력 월 숫자를 직접 대입하지 않는다. 월별 조회값은 조후 검토 순서다. 원문의 신분·부귀·질병 단언을 현대 사건 예측으로 옮기지 않으며, 투출·통근·합충·전체 한난조습을 거치기 전 최종 용신으로 확정하지 않는다."
  };
}

interface ZiweiDoctrineRule {
  id: string;
  domain: LifeDomain;
  palaceNames: string[];
  allStars?: string[];
  anyStars?: string[];
  normalizedReading: string;
  section: string;
  sourceNote: string;
}

const ZIWEI_DOCTRINE_RULES: ZiweiDoctrineRule[] = [
  { id: "ZW-CAREER-SUN-CHANG", domain: "career", palaceNames: ["관록", "官祿", "官禄"], allStars: ["태양", "문창"], normalizedReading: "관록궁의 태양·문창 동궁은 공개성·문서·표현 역량이 직업 영역에 함께 놓인 조합이다.", section: "권1·태미부/중보두수구율", sourceNote: "태양과 문창이 관록궁에서 만나는 조합" },
  { id: "ZW-RELATIONSHIP-MOON-QU", domain: "relationship", palaceNames: ["부처", "夫妻"], allStars: ["태음", "문곡"], normalizedReading: "부처궁의 태음·문곡 동궁은 정서·미감·언어 표현이 관계 영역에 함께 놓인 조합이다.", section: "권1·태미부/중보두수구율", sourceNote: "태음과 문곡이 부처궁에서 만나는 조합" },
  { id: "ZW-WEALTH-LUCUN", domain: "wealth", palaceNames: ["전택", "田宅", "재백", "財帛", "财帛"], allStars: ["록존"], normalizedReading: "록존이 재백 또는 전택에 놓여 축적·보유 기능이 해당 재산 영역에 배치된다.", section: "권1·태미부/중보두수구율", sourceNote: "록존이 전택·재백을 지키는 조합" },
  { id: "ZW-CAREER-ZIWEI-TIANFU", domain: "career", palaceNames: ["관록", "官祿", "官禄"], anyStars: ["자미", "천부"], normalizedReading: "자미 또는 천부가 관록궁에 놓여 통솔·관리 기능이 직업 영역에 배치된다.", section: "권1·두수발미론", sourceNote: "관록궁의 자미·천부" },
  { id: "ZW-PROPERTY-POJUN", domain: "wealth", palaceNames: ["전택", "田宅"], allStars: ["파군"], normalizedReading: "전택궁의 파군은 거주·부동산·기반 자산에서 해체 뒤 재구성하는 변동성을 살핀다.", section: "권1·두수발미론", sourceNote: "전택궁 파군의 선파후성" },
  { id: "ZW-MING-ZIWEI-FUBI", domain: "identity", palaceNames: ["명궁", "命宮", "命宫"], allStars: ["자미", "좌보", "우필"], normalizedReading: "명궁의 자미·좌보·우필 동궁은 중심성과 보좌 체계가 한 궁에 모인 조합이다.", section: "권1·중보두수구율", sourceNote: "명궁 자미와 좌우보필의 동궁" },
  { id: "ZW-FORTUNE-VOID", domain: "identity", palaceNames: ["복덕", "福德"], anyStars: ["지공", "지겁"], normalizedReading: "복덕궁의 공·겁은 내적 만족과 회복 자원이 쉽게 소모되는지를 다른 길성·운한과 함께 확인하게 한다.", section: "권1·두수발미론", sourceNote: "복덕궁의 공겁" }
];

export interface ZiweiDoctrineMatch {
  ruleId: string;
  domain: LifeDomain;
  palace: string;
  matchedStars: string[];
  contextFindings: string[];
  normalizedReading: string;
  sourceLocator: DoctrineLocator;
  confidence: "medium";
  boundary: string;
}

function palaceHasName(palace: ZiweiPalace, names: string[]): boolean {
  return names.some((name) => palace.name.includes(name));
}

function palaceStarNames(palace: ZiweiPalace): string[] {
  return [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars.map((name) => ({ name }))].map((star) => star.name);
}

const ZIWEI_SUPPORT_STARS = ["좌보", "우필", "문창", "문곡", "천괴", "천월", "록존"];
const ZIWEI_DISRUPTIVE_STARS = ["경양", "타라", "화성", "령성", "지공", "지겁"];

function brightnessValue(brightness: string): number | null {
  const match = brightness.match(/^\[([+-]?\d+)\]$/);
  return match ? Number(match[1]) : null;
}

function palaceRuleContext(palace: ZiweiPalace, mainStar: string, brightnessSensitive: boolean, disruptiveSensitive: boolean): string[] {
  const stars = [...palace.majorStars, ...palace.minorStars];
  const names = stars.map((star) => star.name);
  const main = palace.majorStars.find((star) => star.name === mainStar);
  const findings: string[] = [];
  if (brightnessSensitive && main) {
    const value = brightnessValue(main.brightness);
    findings.push(`${mainStar} 묘왕도 ${main.brightness || "미표기"}${value === null ? "" : value >= 1 ? "(양수)" : value <= -1 ? "(음수)" : "(중립)"}`);
  }
  const support = ZIWEI_SUPPORT_STARS.filter((star) => names.includes(star));
  const disruptive = ZIWEI_DISRUPTIVE_STARS.filter((star) => names.includes(star));
  if (support.length) findings.push(`동궁 보좌성 ${support.join("·")}`);
  if (disruptiveSensitive && disruptive.length) findings.push(`동궁 육살성 ${disruptive.join("·")}`);
  const transformations = stars.filter((star) => star.mutagen).map((star) => `${star.name}:화${star.mutagen}`);
  if (transformations.length) findings.push(`동궁 생년사화 ${transformations.join("·")}`);
  return findings;
}

/** 고전의 궁·동궁 조건이 정확히 성립한 조합만 반환한다. */
export function evaluateZiweiDoctrine(chart: ZiweiChart): {
  matches: ZiweiDoctrineMatch[];
  evaluatedRuleCount: number;
  contextAudit: { palace: string; hasBrightness: boolean; hasSanfang: boolean; mutagens: string[] }[];
  sourceLocator: DoctrineLocator;
  boundary: string;
} {
  const matches: ZiweiDoctrineMatch[] = [];
  for (const rule of ZIWEI_DOCTRINE_RULES) {
    for (const palace of chart.palaces.filter((candidate) => palaceHasName(candidate, rule.palaceNames))) {
      const stars = palaceStarNames(palace);
      const allMatch = !rule.allStars || rule.allStars.every((star) => stars.includes(star));
      const anyMatch = !rule.anyStars || rule.anyStars.some((star) => stars.includes(star));
      if (!allMatch || !anyMatch) continue;
      const matchedStars = [...(rule.allStars ?? []), ...(rule.anyStars?.filter((star) => stars.includes(star)) ?? [])];
      matches.push({
        ruleId: rule.id,
        domain: rule.domain,
        palace: palace.name,
        matchedStars,
        contextFindings: palaceRuleContext(palace, matchedStars[0] ?? "", true, true),
        normalizedReading: rule.normalizedReading,
        sourceLocator: {
          sourceId: "ziwei-doushu-quanshu",
          uri: "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80",
          section: rule.section,
          sourceNote: rule.sourceNote
        },
        confidence: "medium",
        boundary: "궁과 동궁 성요가 맞았다는 뜻이다. 묘왕·사화·삼방사정·운한이 반대 조건이면 최종 해석은 달라질 수 있다."
      });
    }
  }
  for (const rule of ZIWEI_PALACE_DOCTRINE_RULES) {
    for (const palace of chart.palaces.filter((candidate) => palaceHasName(candidate, rule.palaceNames))) {
      if (!palace.majorStars.some((star) => star.name === rule.mainStar)) continue;
      const starNames = palaceStarNames(palace);
      const activeModifiers = rule.companionModifiers.filter((modifier) => modifier.allStars.every((star) => starNames.includes(star)));
      const matchedStars = [rule.mainStar, ...new Set(activeModifiers.flatMap((modifier) => modifier.allStars))];
      matches.push({
        ruleId: rule.id,
        domain: rule.domain,
        palace: palace.name,
        matchedStars,
        contextFindings: [
          ...activeModifiers.map((modifier) => modifier.normalizedReading),
          ...palaceRuleContext(palace, rule.mainStar, rule.brightnessSensitive, rule.disruptiveSensitive)
        ],
        normalizedReading: rule.normalizedReading,
        sourceLocator: {
          sourceId: "ziwei-doushu-quanshu",
          uri: "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C",
          section: rule.section,
          sourceNote: `${palace.name}의 ${rule.mainStar} 주성 항목`
        },
        confidence: "medium",
        boundary: rule.boundary ?? "권2의 궁별 주성 항목을 현대 생애 영역의 관찰로 정규화했다. 동궁성·묘왕도·생년사화·육살성과 삼방사정 및 운한을 대조하기 전 사건이나 성패를 확정하지 않는다."
      });
    }
  }
  return {
    matches,
    evaluatedRuleCount: ZIWEI_DOCTRINE_RULES.length + ZIWEI_PALACE_DOCTRINE_RULES.length,
    contextAudit: chart.palaces.map((palace) => ({
      palace: palace.name,
      hasBrightness: palace.majorStars.length === 0 || palace.majorStars.every((star) => Boolean(star.brightness)),
      hasSanfang: Object.values(palace.sanfangSizheng).every(Boolean),
      mutagens: [...palace.majorStars, ...palace.minorStars].filter((star) => star.mutagen).map((star) => `${star.name}:${star.mutagen}`)
    })),
    sourceLocator: {
      sourceId: "ziwei-doushu-quanshu",
      uri: "https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80",
      section: "권1 태미부·두수발미론; 권2 십이궁 주성 항목",
      sourceNote: "동일 성요라도 궁·묘왕·생극·삼방사정과 운한을 함께 살피라는 총칙 및 궁별 주성 항목"
    },
    boundary: "단성 단정은 내지 않는다. 이 팩은 출처가 특정된 조건만 실행하며 미등록 궁·성요 조합을 유추 생성하지 않는다."
  };
}
