/**
 * 철판신수 계열 중 공개 명례로 중간 계산까지 닫힌 황극 원회운세 수법.
 *
 * 이 모듈은 철판신수 전체를 자칭하지 않는다. 네 기둥에서 원·회·운·세 수와
 * 공개 명례의 부모/자녀 초기 수를 재현하는 범위만 실행한다. 고각으로 후보를
 * 고르는 단계와 12,000 조문 전체의 생애 주제 선택은 별도 미해결 문제다.
 */
import { Lunar, Solar } from "lunar-typescript";
import standardTablesJson from "./data/cheolpan-standard-numeric-tables.json";
import type { Gender, SajuChart } from "./saju-engine";

const HUANGJI_STEM_NUMBER: Record<string, number> = {
  甲: 9, 乙: 8, 丙: 7, 丁: 6, 戊: 5,
  己: 9, 庚: 8, 辛: 7, 壬: 6, 癸: 5
};

const HUANGJI_BRANCH_NUMBER: Record<string, number> = {
  子: 9, 丑: 8, 寅: 7, 卯: 6, 辰: 5, 巳: 4,
  午: 9, 未: 8, 申: 7, 酉: 6, 戌: 5, 亥: 4
};

const KUNJI_DIGIT: Record<string, string> = {
  甲: "1", 丙: "2", 戊: "3", 庚: "4", 壬: "5",
  乙: "6", 丁: "7", 己: "8", 辛: "9", 癸: "0",
  月: "0", 支: "0"
};

type CheolpanChineseElement = "水" | "火" | "木" | "金" | "土";
type CheolpanStandardMoment = "初刻" | "正刻";

const STEMS = [..."甲乙丙丁戊己庚辛壬癸"];
const BRANCHES = [..."子丑寅卯辰巳午未申酉戌亥"];
const YANG_STEMS = new Set(["甲", "丙", "戊", "庚", "壬"]);
const NAYIN_ELEMENT_BY_PILLAR: Record<string, CheolpanChineseElement> = {
  甲子: "金", 乙丑: "金", 丙寅: "火", 丁卯: "火", 戊辰: "木", 己巳: "木",
  庚午: "土", 辛未: "土", 壬申: "金", 癸酉: "金", 甲戌: "火", 乙亥: "火",
  丙子: "水", 丁丑: "水", 戊寅: "土", 己卯: "土", 庚辰: "金", 辛巳: "金",
  壬午: "木", 癸未: "木", 甲申: "水", 乙酉: "水", 丙戌: "土", 丁亥: "土",
  戊子: "火", 己丑: "火", 庚寅: "木", 辛卯: "木", 壬辰: "水", 癸巳: "水",
  甲午: "金", 乙未: "金", 丙申: "火", 丁酉: "火", 戊戌: "木", 己亥: "木",
  庚子: "土", 辛丑: "土", 壬寅: "金", 癸卯: "金", 甲辰: "火", 乙巳: "火",
  丙午: "水", 丁未: "水", 戊申: "土", 己酉: "土", 庚戌: "金", 辛亥: "金",
  壬子: "木", 癸丑: "木", 甲寅: "水", 乙卯: "水", 丙辰: "土", 丁巳: "土",
  戊午: "火", 己未: "火", 庚申: "木", 辛酉: "木", 壬戌: "水", 癸亥: "水"
};

const TONE_TABLE: Record<number, readonly [string, string, string, string, string]> = {
  1: ["羽", "徵", "宫", "角", "商"], 2: ["羽", "徵", "宫", "角", "商"],
  3: ["徵", "宫", "角", "商", "羽"], 4: ["徵", "宫", "角", "商", "羽"],
  5: ["角", "商", "羽", "徵", "宫"], 6: ["角", "商", "羽", "徵", "宫"],
  7: ["宫", "角", "商", "羽", "徵"], 8: ["宫", "角", "商", "羽", "徵"],
  9: ["商", "羽", "徵", "宫", "角"], 10: ["商", "羽", "徵", "宫", "角"],
  11: ["徵", "宫", "角", "商", "羽"], 12: ["徵", "宫", "角", "商", "羽"]
};

const TONE_NUMBER: Record<string, number> = { 宫: 5, 商: 4, 角: 3, 徵: 2, 羽: 1 };
const TIME_LUCK_NUMBER: Record<CheolpanChineseElement, number> = { 水: 1, 火: 2, 木: 3, 金: 4, 土: 5 };

interface CheolpanStandardTables {
  schemaVersion: number;
  provenance: { sourceId: string; sourceUrl: string; compiledAt: string; scope: string; corrections: string[] };
  hexagramRows: Record<CheolpanStandardMoment, [number, string][]>;
  destinyRows: {
    hexagram: string;
    base: number;
    initialPreheaven: number[];
    mainPreheaven: number[];
    sequence: number;
    personality: number[];
    career: number[];
    wealth: number[];
    siblings: number[];
  }[];
  yearStarts: [string, "男" | "女", number][];
  yearSoundSequences: Record<string, string[]>;
  markers: [string, number, string][];
  letters: [CheolpanStandardMoment, "奇数" | "偶数", string, string, string][];
  lifetimeRows: [number, string, number, number, number][];
}

const STANDARD_TABLES = standardTablesJson as unknown as CheolpanStandardTables;

export const CHEOLPAN_STANDARD_TABLE_AUDIT = {
  initialHexagramCells: STANDARD_TABLES.hexagramRows.初刻.length,
  mainHexagramCells: STANDARD_TABLES.hexagramRows.正刻.length,
  destinyRows: STANDARD_TABLES.destinyRows.length,
  yearSoundRows: Object.keys(STANDARD_TABLES.yearSoundSequences).length,
  markerRows: STANDARD_TABLES.markers.length,
  letterRows: STANDARD_TABLES.letters.length,
  lifetimeRows: STANDARD_TABLES.lifetimeRows.length,
  corrections: STANDARD_TABLES.provenance.corrections,
  sourceId: STANDARD_TABLES.provenance.sourceId
} as const;

export interface CheolpanPillarNumber {
  pillar: string;
  stemNumber: number;
  branchNumber: number;
  sum: number;
}

export interface CheolpanHuangjiResult {
  status: "computed" | "blocked_ambiguous_digit";
  lineage: "huangji_yuan_hui_yun_shi_three-edition-example";
  pillars: {
    year: CheolpanPillarNumber;
    month: CheolpanPillarNumber;
    day: CheolpanPillarNumber;
    time: CheolpanPillarNumber;
  };
  yuan?: number;
  hui?: number;
  yun?: number;
  shi?: number;
  yuanHuiCode?: number;
  yunShiCode?: number;
  parentInitialCode?: number;
  parentMonthFollowupCode?: number;
  childTimingInitialCode?: number;
  blockedReasons: string[];
  sourceIds: readonly ["tieban-research-corpus", "xu-yunong-tieban-publication"];
  boundary: string;
}

function pillarNumber(gan: string, zhi: string): CheolpanPillarNumber {
  const stemNumber = HUANGJI_STEM_NUMBER[gan];
  const branchNumber = HUANGJI_BRANCH_NUMBER[zhi];
  if (stemNumber === undefined || branchNumber === undefined) throw new Error(`CHEOLPAN_INVALID_PILLAR:${gan}${zhi}`);
  return { pillar: `${gan}${zhi}`, stemNumber, branchNumber, sum: stemNumber + branchNumber };
}

function wrapClauseNumber(value: number): number {
  let wrapped = value;
  while (wrapped > 13000) wrapped -= 12000;
  return wrapped;
}

function reverseTwoDigits(value: number): number {
  return Number(String(value).split("").reverse().join(""));
}

/** 명시적으로 선택된 황극 고각 단계를 30씩 전진한다. 사실에 맞춰 단계를 역산하지 않는다. */
export function advanceCheolpanHuangjiCandidate(baseCode: number, steps: number): number {
  if (!Number.isInteger(steps) || steps < 0) throw new Error("CHEOLPAN_INVALID_CALIBRATION_STEPS");
  return wrapClauseNumber(baseCode + steps * 30);
}

/** 坤集 네 글자 암호를 숫자로 바꾸는 조회 전 단계. 출생 정보에서 암호를 선택하지는 않는다. */
export function encodeCheolpanKunjiCode(code: string): { code: string; digits: string; clauseId: number } {
  const chars = [...code.trim()];
  if (chars.length !== 4 || chars.some((char) => KUNJI_DIGIT[char] === undefined)) {
    throw new Error(`CHEOLPAN_INVALID_KUNJI_CODE:${code}`);
  }
  const digits = chars.map((char) => KUNJI_DIGIT[char]).join("");
  return { code: chars.join(""), digits, clauseId: Number(digits) };
}

export function computeCheolpanHuangjiNumbers(chart: SajuChart): CheolpanHuangjiResult {
  const pillars = {
    year: pillarNumber(chart.pillars.year.gan, chart.pillars.year.zhi),
    month: pillarNumber(chart.pillars.month.gan, chart.pillars.month.zhi),
    day: pillarNumber(chart.pillars.day.gan, chart.pillars.day.zhi),
    time: pillarNumber(chart.pillars.time.gan, chart.pillars.time.zhi)
  };
  const blockedReasons: string[] = [];
  if (pillars.year.sum < 10 || pillars.month.sum < 10) {
    blockedReasons.push("원·회 합이 한 자리일 때 0을 앞에 채우는지 세 교차 명례가 규정하지 않는다.");
  }
  if (pillars.day.sum < 10 || pillars.time.sum < 10) {
    blockedReasons.push("운·세 합이 한 자리일 때 역순 자리 보존법을 세 교차 명례가 규정하지 않는다.");
  }
  if (pillars.day.sum === 10 || pillars.time.sum === 10) {
    blockedReasons.push("운·세 합 10을 뒤집은 01의 앞자리 0 보존법을 세 교차 명례가 규정하지 않는다.");
  }
  const common = {
    lineage: "huangji_yuan_hui_yun_shi_three-edition-example" as const,
    pillars,
    blockedReasons,
    sourceIds: ["tieban-research-corpus", "xu-yunong-tieban-publication"] as const,
    boundary: "세 판본의 동일 명례에서 네 기둥→원회운세 수→부모·자녀 초기 수까지 재현한 범위다. 고각 후보의 정답 선택, 형제·배우자·자녀 수, 전체 유년 조문 선택은 계산하지 않는다."
  };
  if (blockedReasons.length) return { status: "blocked_ambiguous_digit", ...common };

  const yuanHuiCode = Number(`${pillars.year.sum}${pillars.month.sum}`);
  const yunShiCode = Number(`${reverseTwoDigits(pillars.day.sum)}${reverseTwoDigits(pillars.time.sum)}`);
  const parentInitialCode = wrapClauseNumber(yuanHuiCode + pillars.year.stemNumber * 1000);
  return {
    status: "computed",
    ...common,
    yuan: pillars.year.sum,
    hui: pillars.month.sum,
    yun: pillars.day.sum,
    shi: pillars.time.sum,
    yuanHuiCode,
    yunShiCode,
    parentInitialCode,
    parentMonthFollowupCode: wrapClauseNumber(parentInitialCode + pillars.month.stemNumber * 100),
    childTimingInitialCode: yunShiCode
  };
}

export const CHEOLPAN_HUANGJI_GOLDEN_FIXTURES = [
  {
    pillars: ["乙丑", "己卯", "辛未", "甲午"],
    expected: { yuan: 16, hui: 15, yun: 15, shi: 18, yuanHuiCode: 1615, yunShiCode: 5181, parentInitialCode: 9615, parentMonthFollowupCode: 10515 }
  },
  {
    pillars: ["癸卯", "丁巳", "甲子", "乙亥"],
    expected: { yuan: 11, hui: 10, yun: 18, shi: 12, yuanHuiCode: 1110, yunShiCode: 8121, parentInitialCode: 6110 }
  }
] as const;

export interface CheolpanStandardNormalizedInput {
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  gender: Gender;
  yearPillar: string;
  dayPillar: string;
  timePillar: string;
  queryTimePillar: string;
}

export interface CheolpanStandardNatalClauses {
  base: number;
  sequence: number;
  personality: number[];
  career: number[];
  wealth: number[];
  siblings: number[];
}

export interface CheolpanStandardLifetimeYear {
  age: number;
  yearPillar: string;
  sound: string | null;
  marker: string | null;
  letter: string | null;
  status: "computed" | "blocked_missing_table_cell";
  originalClauseId?: number;
  originalCorrection?: number;
  correctedCorrection?: number;
  correctedClauseId?: number;
}

export interface CheolpanStandardResult {
  lineage: "standard_table_query_time_14";
  effectiveLunarMonth: number;
  preheavenNumber: number;
  fiveTone: string;
  fiveToneNumber: number;
  dayFateNumber: number;
  timeLuckNumber: number;
  dayTimeSum: number;
  moment: CheolpanStandardMoment;
  natalNumber: number;
  hexagram: string;
  natalClauses: CheolpanStandardNatalClauses | null;
  afterheavenNumber: number;
  lifetime: CheolpanStandardLifetimeYear[];
  sourceIds: readonly ["tieban-standard-published-tables"];
  boundary: string;
}

function requirePillar(pillar: string, field: string): { stem: string; branch: string } {
  const chars = [...pillar.trim()];
  if (chars.length !== 2 || !STEMS.includes(chars[0]) || !BRANCHES.includes(chars[1])) {
    throw new Error(`CHEOLPAN_STANDARD_INVALID_${field}:${pillar}`);
  }
  return { stem: chars[0], branch: chars[1] };
}

function requireNaYinElement(pillar: string): CheolpanChineseElement {
  const element = NAYIN_ELEMENT_BY_PILLAR[pillar];
  if (!element) throw new Error(`CHEOLPAN_STANDARD_NAYIN_MISSING:${pillar}`);
  return element;
}

function wrapCycle(value: number, cycle: number): number {
  return ((value - 1) % cycle + cycle) % cycle + 1;
}

function lunarParts(chart: SajuChart): { month: number; day: number; isLeapMonth: boolean } {
  const input = chart.input;
  const hour = input.hour;
  if (hour === undefined) throw new Error("CHEOLPAN_STANDARD_BIRTH_TIME_REQUIRED");
  const minute = input.minute ?? 0;
  const lunar = input.calendar === "lunar"
    ? Lunar.fromYmdHms(input.year, input.isLeapMonth ? -Math.abs(input.month) : input.month, input.day, hour, minute, 0)
    : Solar.fromYmdHms(input.year, input.month, input.day, hour, minute, 0).getLunar();
  return { month: Math.abs(lunar.getMonth()), day: lunar.getDay(), isLeapMonth: lunar.getMonth() < 0 };
}

/** 출생 명반과 질문 시점 명반을 표준표 계통의 정규 입력으로 변환한다. */
export function normalizeCheolpanStandardInput(
  birthChart: SajuChart,
  queryChart: SajuChart,
  gender?: Gender
): CheolpanStandardNormalizedInput {
  const lunar = lunarParts(birthChart);
  const resolvedGender = gender ?? birthChart.input.gender;
  if (!resolvedGender) throw new Error("CHEOLPAN_STANDARD_GENDER_REQUIRED");
  return {
    lunarMonth: lunar.month,
    lunarDay: lunar.day,
    isLeapMonth: lunar.isLeapMonth,
    gender: resolvedGender,
    yearPillar: birthChart.pillars.year.gz,
    dayPillar: birthChart.pillars.day.gz,
    timePillar: birthChart.pillars.time.gz,
    queryTimePillar: queryChart.pillars.time.gz
  };
}

function resolveYearBranchGroup(branch: string): string {
  for (const group of ["寅午戌", "申子辰", "巳酉丑", "亥卯未"]) {
    if (group.includes(branch)) return group;
  }
  throw new Error(`CHEOLPAN_STANDARD_YEAR_BRANCH_GROUP_MISSING:${branch}`);
}

function correctedLifetimeNumber(correction: number, age: number): number {
  const cycle = age <= 10 || age >= 81 ? 6 : 20;
  const increment = age <= 10 || age >= 81 ? 2 : 3;
  return wrapCycle(correction + increment, cycle);
}

function buildStandardLifetime(
  input: CheolpanStandardNormalizedInput,
  preheavenNumber: number,
  afterheavenNumber: number,
  moment: CheolpanStandardMoment
): CheolpanStandardLifetimeYear[] {
  const { stem: yearStem, branch: yearBranch } = requirePillar(input.yearPillar, "YEAR_PILLAR");
  const branchGroup = resolveYearBranchGroup(yearBranch);
  const sourceGender = input.gender === "남" ? "男" : "女";
  const start = STANDARD_TABLES.yearStarts.find(([group, gender]) => group === branchGroup && gender === sourceGender)?.[2];
  const rawSounds = STANDARD_TABLES.yearSoundSequences[`${preheavenNumber}:${yearStem}`];
  if (!start || !rawSounds || rawSounds.length !== 12) {
    throw new Error(`CHEOLPAN_STANDARD_LIFETIME_SEQUENCE_MISSING:${preheavenNumber}:${yearStem}:${branchGroup}:${input.gender}`);
  }
  const offset = (13 - start) % 12;
  const sounds = Array.from({ length: 12 }, (_, index) => rawSounds[(index + offset) % 12]);
  const markerMap = new Map(STANDARD_TABLES.markers.map(([branch, number, marker]) => [`${branch}:${number}`, marker]));
  const letterMap = new Map(STANDARD_TABLES.letters.map(([ke, parity, sound, marker, letter]) => [`${ke}:${parity}:${sound}:${marker}`, letter]));
  const lifetimeByLetter = new Map(STANDARD_TABLES.lifetimeRows.map(([age, letter, base, add, correction]) => [
    `${letter}:${age}`,
    { base, add, correction }
  ]));
  const lifetimeByCorrection = new Map<string, { base: number; add: number }>();
  for (const [age, , base, add, correction] of STANDARD_TABLES.lifetimeRows) {
    const key = `${correction}:${age}`;
    const previous = lifetimeByCorrection.get(key);
    if (previous && (previous.base !== base || previous.add !== add)) {
      throw new Error(`CHEOLPAN_STANDARD_CORRECTION_TABLE_CONFLICT:${key}`);
    }
    lifetimeByCorrection.set(key, { base, add });
  }
  const yearStemIndex = STEMS.indexOf(yearStem);
  const yearBranchIndex = BRANCHES.indexOf(yearBranch);
  return Array.from({ length: 108 }, (_, ageIndex): CheolpanStandardLifetimeYear => {
    const age = ageIndex + 1;
    const agePillar = `${STEMS[(yearStemIndex + ageIndex) % 10]}${BRANCHES[(yearBranchIndex + ageIndex) % 12]}`;
    const sound = sounds[ageIndex % 12] ?? null;
    const marker = markerMap.get(`${BRANCHES[(yearBranchIndex + ageIndex) % 12]}:${afterheavenNumber}`) ?? null;
    const parity = age % 2 === 1 ? "奇数" : "偶数";
    const letter = sound && marker ? letterMap.get(`${moment}:${parity}:${sound}:${marker}`) ?? null : null;
    const tableCell = letter ? lifetimeByLetter.get(`${letter}:${age}`) : undefined;
    if (!sound || !marker || !letter || !tableCell) {
      return { age, yearPillar: agePillar, sound, marker, letter, status: "blocked_missing_table_cell" };
    }
    const correctedCorrection = correctedLifetimeNumber(tableCell.correction, age);
    const correctedCell = lifetimeByCorrection.get(`${correctedCorrection}:${age}`);
    return {
      age,
      yearPillar: agePillar,
      sound,
      marker,
      letter,
      status: "computed",
      originalClauseId: tableCell.base + tableCell.add,
      originalCorrection: tableCell.correction,
      correctedCorrection,
      correctedClauseId: correctedCell ? correctedCell.base + correctedCell.add : undefined
    };
  });
}

/**
 * 《정통 철판신수》 14계열 표의 선천수→오음→본명수→본명/유년 조문 번호를 계산한다.
 * 조문 문장 자체는 숫자표와 분리하며, 표에 없는 노년 셀은 누락 상태로 남긴다.
 */
export function computeCheolpanStandardNumbers(input: CheolpanStandardNormalizedInput): CheolpanStandardResult {
  if (!Number.isInteger(input.lunarMonth) || input.lunarMonth < 1 || input.lunarMonth > 12) {
    throw new Error(`CHEOLPAN_STANDARD_INVALID_LUNAR_MONTH:${input.lunarMonth}`);
  }
  if (!Number.isInteger(input.lunarDay) || input.lunarDay < 1 || input.lunarDay > 30) {
    throw new Error(`CHEOLPAN_STANDARD_INVALID_LUNAR_DAY:${input.lunarDay}`);
  }
  const { stem: yearStem } = requirePillar(input.yearPillar, "YEAR_PILLAR");
  const { branch: timeBranch } = requirePillar(input.timePillar, "TIME_PILLAR");
  const { stem: queryStem } = requirePillar(input.queryTimePillar, "QUERY_TIME_PILLAR");
  const effectiveLunarMonth = input.isLeapMonth ? wrapCycle(input.lunarMonth + 1, 12) : input.lunarMonth;
  const preheavenNumber = wrapCycle(effectiveLunarMonth + 3 - (BRANCHES.indexOf(timeBranch) + 1), 12);
  const stemGroupIndex = STEMS.indexOf(yearStem) % 5;
  const fiveTone = TONE_TABLE[preheavenNumber]?.[stemGroupIndex];
  if (!fiveTone) throw new Error(`CHEOLPAN_STANDARD_TONE_MISSING:${preheavenNumber}:${yearStem}`);
  const fiveToneNumber = TONE_NUMBER[fiveTone];
  const dayElement = requireNaYinElement(input.dayPillar);
  const queryTimeElement = requireNaYinElement(input.queryTimePillar);
  const dayFateNumber = wrapCycle(TIME_LUCK_NUMBER[dayElement] + STEMS.indexOf(queryStem) % 5, 5);
  const timeLuckNumber = TIME_LUCK_NUMBER[queryTimeElement];
  const dayTimeSum = dayFateNumber + timeLuckNumber;
  const samePolarityGroup = (input.gender === "남" && YANG_STEMS.has(yearStem)) ||
    (input.gender === "여" && !YANG_STEMS.has(yearStem));
  const moment: CheolpanStandardMoment = samePolarityGroup
    ? (dayTimeSum > 6 ? "初刻" : "正刻")
    : (dayTimeSum > 6 ? "正刻" : "初刻");
  const natalFactor = fiveToneNumber * 5 + dayFateNumber + timeLuckNumber - (dayTimeSum > 6 ? 6 : 1);
  const natalNumber = natalFactor * 30 + input.lunarDay;
  const hexagram = STANDARD_TABLES.hexagramRows[moment].find(([number]) => number === natalNumber)?.[1];
  if (!hexagram) throw new Error(`CHEOLPAN_STANDARD_HEXAGRAM_MISSING:${moment}:${natalNumber}`);
  const destinyRow = STANDARD_TABLES.destinyRows.find((row) =>
    row.hexagram === hexagram &&
    (moment === "初刻" ? row.initialPreheaven : row.mainPreheaven).includes(preheavenNumber)
  );
  const natalClauses = destinyRow ? {
    base: destinyRow.base,
    sequence: destinyRow.sequence,
    personality: destinyRow.personality.map((offset) => destinyRow.base + destinyRow.sequence + offset),
    career: destinyRow.career.map((offset) => destinyRow.base + destinyRow.sequence + offset),
    wealth: destinyRow.wealth.map((offset) => destinyRow.base + destinyRow.sequence + offset),
    siblings: destinyRow.siblings.map((offset) => destinyRow.base + destinyRow.sequence + offset)
  } : null;
  const afterheavenNumber = wrapCycle(preheavenNumber + natalNumber, 8);
  const lifetime = buildStandardLifetime(input, preheavenNumber, afterheavenNumber, moment);
  return {
    lineage: "standard_table_query_time_14",
    effectiveLunarMonth,
    preheavenNumber,
    fiveTone,
    fiveToneNumber,
    dayFateNumber,
    timeLuckNumber,
    dayTimeSum,
    moment,
    natalNumber,
    hexagram,
    natalClauses,
    afterheavenNumber,
    lifetime,
    sourceIds: ["tieban-standard-published-tables"],
    boundary: "질문 시각을 쓰는 14계열 표준표 산법을 황극·곤집 계통과 섞지 않았다. 본명 및 유년 조문 번호는 계산하지만 12,000개 조문 문장 코퍼스는 포함하지 않는다. 공개 숫자표에 셀이 없는 연령은 보간하지 않고 누락으로 반환한다."
  };
}

export type CheolpanCalibrationTopic = "parents" | "siblings" | "partner" | "children" | "career" | "residence" | "past_event";

export interface CheolpanCalibrationFact {
  id: string;
  topic: CheolpanCalibrationTopic;
  statement: string;
  independence: "external_known_fact";
}

export interface CheolpanCalibrationCandidate {
  id: string;
  lineage: "huangji_30" | "sanri_50" | "kunji_explicit" | "standard_table_query_time_14";
  state: Record<string, string | number | boolean>;
  sourceIds: string[];
}

export interface CheolpanCalibrationAssessment {
  candidateId: string;
  factId: string;
  outcome: "match" | "mismatch" | "unknown";
}

export interface CheolpanCalibrationResult {
  status: "insufficient_evidence" | "no_match" | "ambiguous" | "locked";
  lockedCandidate: CheolpanCalibrationCandidate | null;
  survivingCandidateIds: string[];
  rejectedCandidateIds: string[];
  evidenceFactCount: number;
  evidenceTopicCount: number;
  minimumFactCount: number;
  minimumTopicCount: number;
  boundary: string;
}

/** 이미 생성된 유파별 후보를 독립 과거 사실로만 대조해 단일 상태를 잠근다. */
export function calibrateCheolpanCandidates(input: {
  candidates: CheolpanCalibrationCandidate[];
  facts: CheolpanCalibrationFact[];
  assessments: CheolpanCalibrationAssessment[];
  minimumFactCount?: number;
  minimumTopicCount?: number;
}): CheolpanCalibrationResult {
  const minimumFactCount = input.minimumFactCount ?? 3;
  const minimumTopicCount = input.minimumTopicCount ?? 2;
  const candidateIds = new Set(input.candidates.map((candidate) => candidate.id));
  const factIds = new Set(input.facts.map((fact) => fact.id));
  if (candidateIds.size !== input.candidates.length) throw new Error("CHEOLPAN_CALIBRATION_DUPLICATE_CANDIDATE_ID");
  if (factIds.size !== input.facts.length) throw new Error("CHEOLPAN_CALIBRATION_DUPLICATE_FACT_ID");
  for (const assessment of input.assessments) {
    if (!candidateIds.has(assessment.candidateId)) throw new Error(`CHEOLPAN_CALIBRATION_UNKNOWN_CANDIDATE:${assessment.candidateId}`);
    if (!factIds.has(assessment.factId)) throw new Error(`CHEOLPAN_CALIBRATION_UNKNOWN_FACT:${assessment.factId}`);
  }
  const common = {
    evidenceFactCount: input.facts.length,
    evidenceTopicCount: new Set(input.facts.map((fact) => fact.topic)).size,
    minimumFactCount,
    minimumTopicCount,
    boundary: "후보는 사실을 보기 전에 유파별 산법으로 생성해야 한다. 세 사실·두 주제 기본 문턱은 우연 일치를 줄이기 위한 엔지니어링 정책이며 고전의 고정 숫자가 아니다. 서로 다른 유파의 보폭과 상태는 합치지 않는다."
  };
  if (common.evidenceFactCount < minimumFactCount || common.evidenceTopicCount < minimumTopicCount) {
    return {
      status: "insufficient_evidence",
      lockedCandidate: null,
      survivingCandidateIds: input.candidates.map((candidate) => candidate.id),
      rejectedCandidateIds: [],
      ...common
    };
  }
  const assessmentMap = new Map(input.assessments.map((assessment) => [
    `${assessment.candidateId}:${assessment.factId}`,
    assessment.outcome
  ]));
  const survivors = input.candidates.filter((candidate) => input.facts.every((fact) =>
    assessmentMap.get(`${candidate.id}:${fact.id}`) === "match"
  ));
  const rejectedCandidateIds = input.candidates.filter((candidate) => !survivors.includes(candidate)).map((candidate) => candidate.id);
  if (survivors.length === 1) {
    return { status: "locked", lockedCandidate: survivors[0], survivingCandidateIds: [survivors[0].id], rejectedCandidateIds, ...common };
  }
  return {
    status: survivors.length === 0 ? "no_match" : "ambiguous",
    lockedCandidate: null,
    survivingCandidateIds: survivors.map((candidate) => candidate.id),
    rejectedCandidateIds,
    ...common
  };
}

export const CHEOLPAN_STANDARD_GOLDEN_FIXTURES = [
  {
    input: {
      lunarMonth: 9, lunarDay: 14, isLeapMonth: false, gender: "남",
      yearPillar: "辛卯", dayPillar: "丁亥", timePillar: "己酉", queryTimePillar: "丙辰"
    },
    expected: {
      preheavenNumber: 2, fiveToneNumber: 5, dayFateNumber: 2, timeLuckNumber: 5,
      moment: "正刻", natalNumber: 794, hexagram: "大壮", afterheavenNumber: 4,
      personality: [8319, 1796], career: [4699], wealth: [6017], siblings: [7314],
      firstLifetimeClauseIds: [2133, 3274, 3188, 8992, 4009, 5625, 2265, 8254, 4579, 9348]
    }
  }
] as const;
