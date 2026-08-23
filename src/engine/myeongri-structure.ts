/** Auditable Myeongri structure: observations first, interpretation later. */
import {
  analyzeElements,
  computeSajuChart,
  deriveSinsal,
  detectRelations,
  type Element,
  type SajuChart,
  type SajuInput,
  type SajuPillar
} from "./saju-engine";

const STEM_ELEMENT: Record<string, Element> = {
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토",
  己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수"
};
const PILLAR_ORDER = ["year", "month", "day", "time"] as const;
const PILLAR_KO: Record<typeof PILLAR_ORDER[number], string> = { year: "년", month: "월", day: "일", time: "시" };

export interface TimeCandidate {
  key: string;
  label: string;
  representativeHour: number;
  dayPillar: string;
  timePillar: string;
  mingGong: string;
  shenGong: string;
}

export interface SajuChartEnvelope {
  status: "full" | "time_unknown";
  stablePillars: { year: string | null; month: string | null; day: string | null };
  fullChart?: SajuChart;
  candidates: TimeCandidate[];
  elementRanges: Record<Element, { min: number; max: number }>;
  stableRelations: string[];
  varyingRelations: string[];
  stableSinsal: string[];
  varyingSinsal: string[];
  uncertaintyNotes: string[];
}

const UNKNOWN_TIME_SAMPLES = [
  { key: "early_zi", label: "조자시(00:00)", hour: 0 },
  { key: "chou", label: "축시", hour: 2 },
  { key: "yin", label: "인시", hour: 4 },
  { key: "mao", label: "묘시", hour: 6 },
  { key: "chen", label: "진시", hour: 8 },
  { key: "si", label: "사시", hour: 10 },
  { key: "wu", label: "오시", hour: 12 },
  { key: "wei", label: "미시", hour: 14 },
  { key: "shen", label: "신시", hour: 16 },
  { key: "you", label: "유시", hour: 18 },
  { key: "xu", label: "술시", hour: 20 },
  { key: "hai", label: "해시", hour: 22 },
  { key: "late_zi", label: "야자시(23:00)", hour: 23 }
] as const;

function intersection(groups: string[][]): string[] {
  if (!groups.length) return [];
  return [...new Set(groups[0])].filter((value) => groups.every((group) => group.includes(value)));
}

function varying(groups: string[][], stable: string[]): string[] {
  const all = new Set(groups.flat());
  for (const value of stable) all.delete(value);
  return [...all];
}

function singleOrNull(values: string[]): string | null {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}

/**
 * With an unknown time, enumerate every double-hour plus both Rat-hour date
 * policies.  The result exposes invariants and variants instead of choosing noon.
 */
export function computeSajuChartEnvelope(input: SajuInput): SajuChartEnvelope {
  const samples = input.hour === undefined
    ? UNKNOWN_TIME_SAMPLES
    : [{ key: "provided", label: "입력 시각", hour: input.hour }];
  const charts = samples.map((sample) => computeSajuChart({ ...input, hour: sample.hour, minute: input.hour === undefined ? 0 : input.minute }));
  const candidates = charts.map((chart, index) => ({
    key: samples[index].key,
    label: samples[index].label,
    representativeHour: samples[index].hour,
    dayPillar: chart.pillars.day.gz,
    timePillar: chart.pillars.time.gz,
    mingGong: chart.mingGong,
    shenGong: chart.shenGong
  }));
  const elementAnalyses = charts.map(analyzeElements);
  const elements: Element[] = ["목", "화", "토", "금", "수"];
  const elementRanges = Object.fromEntries(elements.map((element) => {
    const values = elementAnalyses.map((analysis) => analysis.weights[element]);
    return [element, { min: Math.min(...values), max: Math.max(...values) }];
  })) as Record<Element, { min: number; max: number }>;
  const relationGroups = charts.map(detectRelations);
  const sinsalGroups = charts.map(deriveSinsal);
  const stableRelations = intersection(relationGroups);
  const stableSinsal = intersection(sinsalGroups);
  const unknown = input.hour === undefined;
  return {
    status: unknown ? "time_unknown" : "full",
    stablePillars: {
      year: singleOrNull(charts.map((chart) => chart.pillars.year.gz)),
      month: singleOrNull(charts.map((chart) => chart.pillars.month.gz)),
      day: singleOrNull(charts.map((chart) => chart.pillars.day.gz))
    },
    fullChart: unknown ? undefined : charts[0],
    candidates,
    elementRanges,
    stableRelations,
    varyingRelations: varying(relationGroups, stableRelations),
    stableSinsal,
    varyingSinsal: varying(sinsalGroups, stableSinsal),
    uncertaintyNotes: unknown ? [
      "시주·명궁·신궁은 후보값이며 하나로 확정하지 않는다.",
      "야자시 일주가 달라지는 경우 조자시와 분리해 표시한다.",
      "시각 의존 신살·합충·오행 강약은 공통값과 변동값을 구분한다."
    ] : []
  };
}

export interface StemRootObservation {
  stem: string;
  position: string;
  exactRootBranches: string[];
  sameElementRootBranches: string[];
}

export interface HiddenStemExposure {
  hiddenStem: string;
  hiddenIn: string[];
  exposedAt: string[];
}

export interface TenGodPosition {
  pillar: string;
  visible: string;
  hidden: string[];
}

export interface StemTransformationCandidate {
  pair: string;
  positions: string[];
  targetElement: Element;
  monthSupportsTarget: boolean;
  targetElementVisibleCount: number;
  targetElementHiddenCount: number;
  status: "candidate_only" | "season_supported_candidate";
  boundary: string;
}

export interface MyeongriStructure {
  dayMaster: SajuChart["dayMaster"];
  monthCommand: { branch: string; mainQi: string; hiddenOrder: string[] };
  stemRoots: StemRootObservation[];
  hiddenStemExposure: HiddenStemExposure[];
  tenGodPositions: TenGodPosition[];
  stemTransformationCandidates: StemTransformationCandidate[];
  relations: string[];
  elementWeights: ReturnType<typeof analyzeElements>;
  provenance: {
    calculation: string;
    doctrineBoundary: string;
    sourceIds: string[];
  };
}

const STEM_TRANSFORMATIONS: { pair: [string, string]; target: Element }[] = [
  { pair: ["甲", "己"], target: "토" },
  { pair: ["乙", "庚"], target: "금" },
  { pair: ["丙", "辛"], target: "수" },
  { pair: ["丁", "壬"], target: "목" },
  { pair: ["戊", "癸"], target: "화" }
];

function transformationCandidates(chart: SajuChart, entries: ReturnType<typeof pillarEntries>): StemTransformationCandidate[] {
  const visible = entries.map(({ key, pillar }) => ({ key, stem: pillar.gan }));
  return STEM_TRANSFORMATIONS.flatMap(({ pair, target }) => {
    const positions = visible.filter(({ stem }) => pair.includes(stem)).map(({ key, stem }) => `${PILLAR_KO[key]}간 ${stem}`);
    if (!pair.every((stem) => visible.some((item) => item.stem === stem))) return [];
    const targetElementVisibleCount = entries.filter(({ pillar }) => pillar.ganEl === target).length;
    const targetElementHiddenCount = entries.flatMap(({ pillar }) => pillar.hideGan).filter((stem) => STEM_ELEMENT[stem] === target).length;
    const monthSupportsTarget = chart.pillars.month.zhiEl === target;
    return [{
      pair: pair.join(""),
      positions,
      targetElement: target,
      monthSupportsTarget,
      targetElementVisibleCount,
      targetElementHiddenCount,
      status: monthSupportsTarget ? "season_supported_candidate" as const : "candidate_only" as const,
      boundary: "두 천간이 보인다는 사실과 합화 완성은 다르다. 월령, 통근, 방해하는 충극과 전체 기세를 더 확인해야 하며 여기서는 합화로 확정하지 않는다."
    }];
  });
}

function pillarEntries(chart: SajuChart): { key: typeof PILLAR_ORDER[number]; pillar: SajuPillar }[] {
  return PILLAR_ORDER.map((key) => ({ key, pillar: chart.pillars[key] }));
}

/**
 * Extracts the structural observations used by several schools.  It intentionally
 * does not collapse them into a single strength score,格局 success, or life claim.
 */
export function analyzeMyeongriStructure(chart: SajuChart): MyeongriStructure {
  const entries = pillarEntries(chart);
  const stemRoots = entries.map(({ key, pillar }) => {
    const exactRootBranches = entries
      .filter(({ pillar: branchPillar }) => branchPillar.hideGan.includes(pillar.gan))
      .map(({ key: branchKey, pillar: branchPillar }) => `${PILLAR_KO[branchKey]}지 ${branchPillar.zhi}`);
    const sameElementRootBranches = entries
      .filter(({ pillar: branchPillar }) => branchPillar.hideGan.some((hidden) => STEM_ELEMENT[hidden] === pillar.ganEl))
      .map(({ key: branchKey, pillar: branchPillar }) => `${PILLAR_KO[branchKey]}지 ${branchPillar.zhi}`);
    return { stem: pillar.gan, position: `${PILLAR_KO[key]}간`, exactRootBranches, sameElementRootBranches };
  });
  const hiddenStems = [...new Set(entries.flatMap(({ pillar }) => pillar.hideGan))];
  const hiddenStemExposure = hiddenStems.map((hiddenStem) => ({
    hiddenStem,
    hiddenIn: entries.filter(({ pillar }) => pillar.hideGan.includes(hiddenStem)).map(({ key, pillar }) => `${PILLAR_KO[key]}지 ${pillar.zhi}`),
    exposedAt: entries.filter(({ pillar }) => pillar.gan === hiddenStem).map(({ key }) => `${PILLAR_KO[key]}간`)
  }));
  const tenGodPositions = entries.map(({ key, pillar }) => ({
    pillar: PILLAR_KO[key],
    visible: pillar.shiShenGan,
    hidden: pillar.shiShenZhi
  }));
  return {
    dayMaster: chart.dayMaster,
    monthCommand: {
      branch: chart.pillars.month.zhi,
      mainQi: chart.pillars.month.hideGan[0] ?? "",
      hiddenOrder: chart.pillars.month.hideGan
    },
    stemRoots,
    hiddenStemExposure,
    tenGodPositions,
    stemTransformationCandidates: transformationCandidates(chart, entries),
    relations: detectRelations(chart),
    elementWeights: analyzeElements(chart),
    provenance: {
      calculation: "lunar-typescript EightChar + local structural extraction",
      doctrineBoundary: "통근·투출·월령·십신 위치는 관찰값이다. 신강신약 임계, 용신, 격국 성패는 이 객체에 포함하지 않는다.",
      sourceIds: ["lunar-typescript", "sanming-tonghui"]
    }
  };
}
