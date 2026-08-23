/**
 * 자미두수(紫微斗數) 계산 경계.
 *
 * iztro의 명반·삼방사정·운한을 사용하되, 유파와 경계 정책을 모든 결과에
 * 명시한다. 별 배치와 고전 해석은 같은 성숙도로 취급하지 않는다.
 */
import { astro } from "iztro";
import type { SajuInput } from "./saju-engine";

type IztroLang = "ko-KR" | "zh-CN" | "zh-TW" | "ja-JP" | "en-US" | "vi-VN";
type ZiweiAlgorithm = "default" | "zhongzhou";
type ZiweiAstroType = "heaven" | "earth" | "human";

export interface ZiweiLineageProfile {
  id: "common" | "zhongzhou";
  label: string;
  algorithm: ZiweiAlgorithm;
  astroType: ZiweiAstroType;
  yearDivide: "normal" | "exact";
  horoscopeDivide: "normal" | "exact";
  ageDivide: "normal" | "birthday";
  dayDivide: "current" | "forward";
  sourceId: "iztro-config";
}

export interface ZiweiMutagenProfile {
  id: "iztro_documented" | "quanshu_wikisource" | "zhongzhou_wanli";
  label: string;
  sourceIds: readonly string[];
  note: string;
  table: Record<string, readonly [string, string, string, string]>;
}

export const ZIWEI_MUTAGEN_PROFILES: Record<ZiweiMutagenProfile["id"], ZiweiMutagenProfile> = {
  iztro_documented: {
    id: "iztro_documented",
    label: "iztro 문서 기본 십간 사화표",
    sourceIds: ["iztro-mutagen"],
    note: "라이브러리 문서와 구현에 실린 표다. 전서 원문표와 다른 경·임간을 별도 프로필로 보존한다.",
    table: {
      甲: ["廉貞", "破軍", "武曲", "太陽"],
      乙: ["天機", "天梁", "紫微", "太陰"],
      丙: ["天同", "天機", "文昌", "廉貞"],
      丁: ["太陰", "天同", "天機", "巨門"],
      戊: ["貪狼", "太陰", "右弼", "天機"],
      己: ["武曲", "貪狼", "天梁", "文曲"],
      庚: ["太陽", "武曲", "太陰", "天同"],
      辛: ["巨門", "太陽", "文曲", "文昌"],
      壬: ["天梁", "紫微", "左輔", "武曲"],
      癸: ["破軍", "巨門", "太陰", "貪狼"]
    }
  },
  quanshu_wikisource: {
    id: "quanshu_wikisource",
    label: "자미두수전서 원문 십간 사화표",
    sourceIds: ["ziwei-doushu-quanshu"],
    note: "위키문헌 전서 권2의 안록권과기 사성 변화결을 그대로 전사했다.",
    table: {
      甲: ["廉貞", "破軍", "武曲", "太陽"],
      乙: ["天機", "天梁", "紫微", "太陰"],
      丙: ["天同", "天機", "文昌", "廉貞"],
      丁: ["太陰", "天同", "天機", "巨門"],
      戊: ["貪狼", "太陰", "右弼", "天機"],
      己: ["武曲", "貪狼", "天梁", "文曲"],
      庚: ["太陽", "武曲", "天同", "太陰"],
      辛: ["巨門", "太陽", "文曲", "文昌"],
      壬: ["天梁", "紫微", "天府", "武曲"],
      癸: ["破軍", "巨門", "太陰", "貪狼"]
    }
  },
  zhongzhou_wanli: {
    id: "zhongzhou_wanli",
    label: "중주계 십간 사화표",
    sourceIds: ["wanli-doushu-volume-five"],
    note: "만리기관 《두수권 권5 성상본기》 공개 미리보기의 완전표를 전사했다.",
    table: {
      甲: ["廉貞", "破軍", "武曲", "太陽"],
      乙: ["天機", "天梁", "紫微", "太陰"],
      丙: ["天同", "天機", "文昌", "廉貞"],
      丁: ["太陰", "天同", "天機", "巨門"],
      戊: ["貪狼", "太陰", "太陽", "天機"],
      己: ["武曲", "貪狼", "天梁", "文曲"],
      庚: ["太陽", "武曲", "天府", "天同"],
      辛: ["巨門", "太陽", "文曲", "文昌"],
      壬: ["天梁", "紫微", "天府", "武曲"],
      癸: ["破軍", "巨門", "太陰", "貪狼"]
    }
  }
};

/**
 * Boundary choices are explicit even where the library has defaults.  The two
 * profiles isolate the star-placement algorithm; callers may compare them.
 */
export const ZIWEI_LINEAGE_PROFILES: Record<ZiweiLineageProfile["id"], ZiweiLineageProfile> = {
  common: {
    id: "common",
    label: "통행 배치",
    algorithm: "default",
    astroType: "heaven",
    yearDivide: "normal",
    horoscopeDivide: "normal",
    ageDivide: "normal",
    dayDivide: "forward",
    sourceId: "iztro-config"
  },
  zhongzhou: {
    id: "zhongzhou",
    label: "중주파 천반 배치",
    algorithm: "zhongzhou",
    astroType: "heaven",
    yearDivide: "normal",
    horoscopeDivide: "normal",
    ageDivide: "normal",
    dayDivide: "forward",
    sourceId: "iztro-config"
  }
};

/** 시각(0~23) → 자미두수 시진 인덱스(0=子 23~01, 6=午 11~13 …). */
export function hourToTimeIndex(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error("INVALID_BIRTH_HOUR: 자미두수 시각은 0~23 정수여야 한다.");
  if (hour === 23) return 0;
  return Math.floor((hour + 1) / 2);
}

interface RawStar { name: string; type?: string; brightness?: string; mutagen?: string }
interface RawPalace {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars?: RawStar[];
  minorStars?: RawStar[];
  adjectiveStars?: { name: string }[];
  decadal?: { range?: number[] };
  mutagedPlaces?(): (RawPalace | undefined)[];
}
interface RawSurroundedPalaces { target: RawPalace; opposite: RawPalace; wealth: RawPalace; career: RawPalace }
interface RawHoroscopeItem {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  palaceNames: string[];
  mutagen: string[];
  stars?: RawStar[][];
  nominalAge?: number;
}
interface RawHoroscope {
  lunarDate: string;
  solarDate: string;
  decadal: RawHoroscopeItem;
  age: RawHoroscopeItem;
  yearly: RawHoroscopeItem;
  monthly: RawHoroscopeItem;
  daily: RawHoroscopeItem;
  hourly: RawHoroscopeItem;
}
interface RawAstrolabe {
  solarDate: string;
  lunarDate: string;
  gender: string;
  time: string;
  timeRange: string;
  fiveElementsClass: string;
  soul: string;
  body: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  zodiac: string;
  sign: string;
  rawDates?: { chineseDate?: { yearly?: string[] } };
  palaces: RawPalace[];
  palace(indexOrName: number | string): RawPalace | undefined;
  surroundedPalaces(indexOrName: number | string): RawSurroundedPalaces;
  horoscope(date?: string | Date, timeIndex?: number): RawHoroscope;
}

export interface ZiweiStar { name: string; type: string; brightness: string; mutagen: string }
export interface ZiweiSanfangSizheng {
  target: string;
  opposite: string;
  wealth: string;
  career: string;
}
export interface ZiweiPalace {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: string[];
  decadalRange: number[];
  sanfangSizheng: ZiweiSanfangSizheng;
}
export interface ZiweiChart {
  solarDate: string;
  lunarDate: string;
  gender: string;
  lang: string;
  time: string;
  timeRange: string;
  fiveElementsClass: string;
  soul: string;
  body: string;
  soulPalaceBranch: string;
  bodyPalaceBranch: string;
  zodiac: string;
  sign: string;
  lineageProfile: ZiweiLineageProfile;
  mutagenProfile: Omit<ZiweiMutagenProfile, "table">;
  sourceIds: string[];
  palaces: ZiweiPalace[];
}

export interface ZiweiTopologyPalaceSnapshot {
  role: keyof ZiweiSanfangSizheng;
  name: string;
  stemBranch: string;
  isBodyPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: string[];
}

export interface ZiweiPalaceTopologyMatrix {
  requestedPalace: string;
  roles: Record<keyof ZiweiSanfangSizheng, ZiweiTopologyPalaceSnapshot>;
  uniqueMajorStars: string[];
  mutagenLedger: { role: keyof ZiweiSanfangSizheng; palace: string; star: string; mutagen: string }[];
  brightnessLedger: { role: keyof ZiweiSanfangSizheng; palace: string; star: string; brightness: string }[];
  bodyPalaceRoles: (keyof ZiweiSanfangSizheng)[];
  sourceIds: string[];
  boundary: string;
}

function toStar(star: RawStar): ZiweiStar {
  return { name: star.name, type: star.type ?? "", brightness: star.brightness ?? "", mutagen: star.mutagen ?? "" };
}

function requireZiweiInput(input: SajuInput): { hour: number; gender: "男" | "女" } {
  if (input.hour === undefined) throw new Error("BIRTH_TIME_REQUIRED: 자미두수 명반에는 출생시각이 필요하다.");
  if (!input.gender) throw new Error("GENDER_REQUIRED: 자미두수 명반에는 성별이 필요하다.");
  return { hour: input.hour, gender: input.gender === "남" ? "男" : "女" };
}

function createAstrolabe(
  input: SajuInput,
  lang: IztroLang,
  profileId: ZiweiLineageProfile["id"],
  mutagenProfileId: ZiweiMutagenProfile["id"] = "iztro_documented"
): RawAstrolabe {
  const { hour, gender } = requireZiweiInput(input);
  const profile = ZIWEI_LINEAGE_PROFILES[profileId];
  const mutagenProfile = ZIWEI_MUTAGEN_PROFILES[mutagenProfileId];
  return astro.withOptions({
    type: input.calendar === "lunar" ? "lunar" : "solar",
    dateStr: `${input.year}-${input.month}-${input.day}`,
    timeIndex: hourToTimeIndex(hour),
    gender,
    isLeapMonth: input.calendar === "lunar" ? input.isLeapMonth === true : undefined,
    fixLeap: true,
    language: lang,
    astroType: profile.astroType,
    config: {
      mutagens: mutagenProfile.table as never,
      algorithm: profile.algorithm,
      yearDivide: profile.yearDivide,
      horoscopeDivide: profile.horoscopeDivide,
      ageDivide: profile.ageDivide,
      dayDivide: profile.dayDivide
    }
  }) as unknown as RawAstrolabe;
}

/** 생년월일시로 명반과 각 궁의 삼방사정을 계산한다. */
export function computeZiweiChart(
  input: SajuInput,
  lang: IztroLang = "ko-KR",
  profileId: ZiweiLineageProfile["id"] = "common",
  mutagenProfileId: ZiweiMutagenProfile["id"] = "iztro_documented"
): ZiweiChart {
  const astrolabe = createAstrolabe(input, lang, profileId, mutagenProfileId);
  const profile = ZIWEI_LINEAGE_PROFILES[profileId];
  const mutagenProfile = ZIWEI_MUTAGEN_PROFILES[mutagenProfileId];
  return {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    gender: astrolabe.gender,
    lang,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soul: astrolabe.soul,
    body: astrolabe.body,
    soulPalaceBranch: astrolabe.earthlyBranchOfSoulPalace,
    bodyPalaceBranch: astrolabe.earthlyBranchOfBodyPalace,
    zodiac: astrolabe.zodiac,
    sign: astrolabe.sign,
    lineageProfile: profile,
    mutagenProfile: {
      id: mutagenProfile.id,
      label: mutagenProfile.label,
      sourceIds: mutagenProfile.sourceIds,
      note: mutagenProfile.note
    },
    sourceIds: ["iztro-config", "iztro-astrolabe", ...mutagenProfile.sourceIds],
    palaces: astrolabe.palaces.map((palace) => {
      const surrounded = astrolabe.surroundedPalaces(palace.name);
      return {
        name: palace.name,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        isBodyPalace: palace.isBodyPalace,
        majorStars: (palace.majorStars ?? []).map(toStar),
        minorStars: (palace.minorStars ?? []).map(toStar),
        adjectiveStars: (palace.adjectiveStars ?? []).map((star) => star.name),
        decadalRange: palace.decadal?.range ?? [],
        sanfangSizheng: {
          target: surrounded.target.name,
          opposite: surrounded.opposite.name,
          wealth: surrounded.wealth.name,
          career: surrounded.career.name
        }
      };
    })
  };
}

/** Resolves a palace into its full target/opposite/wealth/career star matrix. */
export function buildZiweiPalaceTopology(chart: ZiweiChart, palaceName: string): ZiweiPalaceTopologyMatrix {
  const target = chart.palaces.find((palace) => palace.name === palaceName || palace.name.includes(palaceName));
  if (!target) throw new Error(`ZIWEI_PALACE_NOT_FOUND: ${palaceName}`);
  const roleNames = target.sanfangSizheng;
  const roleKeys: (keyof ZiweiSanfangSizheng)[] = ["target", "opposite", "wealth", "career"];
  const roles = Object.fromEntries(roleKeys.map((role) => {
    const palace = chart.palaces.find((candidate) => candidate.name === roleNames[role]);
    if (!palace) throw new Error(`ZIWEI_TOPOLOGY_PALACE_NOT_FOUND: ${roleNames[role]}`);
    const snapshot: ZiweiTopologyPalaceSnapshot = {
      role,
      name: palace.name,
      stemBranch: `${palace.heavenlyStem}${palace.earthlyBranch}`,
      isBodyPalace: palace.isBodyPalace,
      majorStars: palace.majorStars,
      minorStars: palace.minorStars,
      adjectiveStars: palace.adjectiveStars
    };
    return [role, snapshot];
  })) as Record<keyof ZiweiSanfangSizheng, ZiweiTopologyPalaceSnapshot>;
  const snapshots = roleKeys.map((role) => roles[role]);
  return {
    requestedPalace: target.name,
    roles,
    uniqueMajorStars: [...new Set(snapshots.flatMap((snapshot) => snapshot.majorStars.map((star) => star.name)))],
    mutagenLedger: snapshots.flatMap((snapshot) => [...snapshot.majorStars, ...snapshot.minorStars]
      .filter((star) => star.mutagen)
      .map((star) => ({ role: snapshot.role, palace: snapshot.name, star: star.name, mutagen: star.mutagen }))),
    brightnessLedger: snapshots.flatMap((snapshot) => snapshot.majorStars
      .map((star) => ({ role: snapshot.role, palace: snapshot.name, star: star.name, brightness: star.brightness }))),
    bodyPalaceRoles: snapshots.filter((snapshot) => snapshot.isBodyPalace).map((snapshot) => snapshot.role),
    sourceIds: ["iztro-astrolabe", "iztro-config"],
    boundary: "삼방사정 네 궁의 실제 성요·묘왕·사화를 모은 계산 행렬이다. 별 이름의 의미나 길흉은 이 함수가 만들지 않는다."
  };
}

export interface ZiweiHoroscopeItem {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  palaceNames: string[];
  mutagenStars: string[];
  movingStars: string[][];
  nominalAge?: number;
}
export type ZiweiTransformationLayerId = "natal" | "decadal" | "age" | "yearly" | "monthly" | "daily" | "hourly";
export type ZiweiTransformationKind = "록" | "권" | "과" | "기";
export interface ZiweiTransformationEntry {
  transformation: ZiweiTransformationKind;
  star: string;
  natalPalace: string | null;
  layerPalace: string | null;
  natalPalaceIndex: number | null;
}
export interface ZiweiTransformationLayer {
  layer: ZiweiTransformationLayerId;
  label: string;
  sourceStem: string;
  sourceBranch: string;
  entries: ZiweiTransformationEntry[];
}
export interface ZiweiHoroscope {
  solarDate: string;
  lunarDate: string;
  lineageProfile: ZiweiLineageProfile;
  mutagenProfile: Omit<ZiweiMutagenProfile, "table">;
  decadal: ZiweiHoroscopeItem;
  age: ZiweiHoroscopeItem;
  yearly: ZiweiHoroscopeItem;
  monthly: ZiweiHoroscopeItem;
  daily: ZiweiHoroscopeItem;
  hourly: ZiweiHoroscopeItem;
  transformationLayers: ZiweiTransformationLayer[];
  sourceIds: string[];
  boundary: string;
}

const TRANSFORMATION_ORDER: ZiweiTransformationKind[] = ["록", "권", "과", "기"];
const TRANSFORMATION_LAYER_LABELS: Record<ZiweiTransformationLayerId, string> = {
  natal: "생년",
  decadal: "대한",
  age: "소한",
  yearly: "유년",
  monthly: "유월",
  daily: "유일",
  hourly: "유시"
};

function toHoroscopeItem(item: RawHoroscopeItem): ZiweiHoroscopeItem {
  return {
    index: item.index,
    name: item.name,
    heavenlyStem: item.heavenlyStem,
    earthlyBranch: item.earthlyBranch,
    palaceNames: item.palaceNames,
    mutagenStars: item.mutagen,
    movingStars: (item.stars ?? []).map((stars) => stars.map((star) => star.name)),
    nominalAge: item.nominalAge
  };
}

function findNatalStarPalace(astrolabe: RawAstrolabe, starName: string): { index: number; name: string } | null {
  const index = astrolabe.palaces.findIndex((palace) => [...(palace.majorStars ?? []), ...(palace.minorStars ?? [])]
    .some((star) => star.name === starName));
  if (index < 0) return null;
  return { index, name: astrolabe.palaces[index].name };
}

function buildNatalTransformationLayer(astrolabe: RawAstrolabe): ZiweiTransformationLayer {
  const entries = TRANSFORMATION_ORDER.flatMap((transformation) => {
    for (let index = 0; index < astrolabe.palaces.length; index += 1) {
      const palace = astrolabe.palaces[index];
      const star = [...(palace.majorStars ?? []), ...(palace.minorStars ?? [])]
        .find((candidate) => candidate.mutagen === transformation);
      if (star) {
        return [{ transformation, star: star.name, natalPalace: palace.name, layerPalace: palace.name, natalPalaceIndex: index }];
      }
    }
    return [];
  });
  const [sourceStem = "", sourceBranch = ""] = astrolabe.rawDates?.chineseDate?.yearly ?? [];
  return {
    layer: "natal",
    label: TRANSFORMATION_LAYER_LABELS.natal,
    sourceStem,
    sourceBranch,
    entries
  };
}

function buildTransitTransformationLayer(
  astrolabe: RawAstrolabe,
  layer: Exclude<ZiweiTransformationLayerId, "natal">,
  item: RawHoroscopeItem
): ZiweiTransformationLayer {
  return {
    layer,
    label: TRANSFORMATION_LAYER_LABELS[layer],
    sourceStem: item.heavenlyStem,
    sourceBranch: item.earthlyBranch,
    entries: item.mutagen.slice(0, TRANSFORMATION_ORDER.length).map((star, index) => {
      const natal = findNatalStarPalace(astrolabe, star);
      return {
        transformation: TRANSFORMATION_ORDER[index],
        star,
        natalPalace: natal?.name ?? null,
        layerPalace: natal ? item.palaceNames[natal.index] ?? null : null,
        natalPalaceIndex: natal?.index ?? null
      };
    })
  };
}

/** 대운·소한·유년·유월·유일·유시를 한 번에 계산한다. */
export function computeZiweiHoroscope(
  input: SajuInput,
  target: { year: number; month: number; day: number; hour?: number },
  lang: IztroLang = "ko-KR",
  profileId: ZiweiLineageProfile["id"] = "common",
  mutagenProfileId: ZiweiMutagenProfile["id"] = "iztro_documented"
): ZiweiHoroscope {
  const astrolabe = createAstrolabe(input, lang, profileId, mutagenProfileId);
  const targetDate = `${target.year}-${target.month}-${target.day}`;
  const raw = astrolabe.horoscope(targetDate, target.hour === undefined ? undefined : hourToTimeIndex(target.hour));
  const transformationLayers: ZiweiTransformationLayer[] = [
    buildNatalTransformationLayer(astrolabe),
    buildTransitTransformationLayer(astrolabe, "decadal", raw.decadal),
    buildTransitTransformationLayer(astrolabe, "age", raw.age),
    buildTransitTransformationLayer(astrolabe, "yearly", raw.yearly),
    buildTransitTransformationLayer(astrolabe, "monthly", raw.monthly),
    buildTransitTransformationLayer(astrolabe, "daily", raw.daily),
    buildTransitTransformationLayer(astrolabe, "hourly", raw.hourly)
  ];
  return {
    solarDate: raw.solarDate,
    lunarDate: raw.lunarDate,
    lineageProfile: ZIWEI_LINEAGE_PROFILES[profileId],
    mutagenProfile: {
      id: ZIWEI_MUTAGEN_PROFILES[mutagenProfileId].id,
      label: ZIWEI_MUTAGEN_PROFILES[mutagenProfileId].label,
      sourceIds: ZIWEI_MUTAGEN_PROFILES[mutagenProfileId].sourceIds,
      note: ZIWEI_MUTAGEN_PROFILES[mutagenProfileId].note
    },
    decadal: toHoroscopeItem(raw.decadal),
    age: toHoroscopeItem(raw.age),
    yearly: toHoroscopeItem(raw.yearly),
    monthly: toHoroscopeItem(raw.monthly),
    daily: toHoroscopeItem(raw.daily),
    hourly: toHoroscopeItem(raw.hourly),
    transformationLayers,
    sourceIds: ["iztro-config", "iztro-astrolabe", ...ZIWEI_MUTAGEN_PROFILES[mutagenProfileId].sourceIds],
    boundary: "각 천간의 록·권·과·기 배속과 원명반·운한 궁 위치를 보존한다. 궁간비화와 유파별 비성 해석은 계산하지 않는다."
  };
}

export interface ZiweiPalaceFlyingEdge {
  sourcePalace: string;
  sourcePalaceIndex: number;
  sourceStem: string;
  transformation: ZiweiTransformationKind;
  transformedStar: string;
  targetPalace: string;
  targetPalaceIndex: number;
  targetBranch: string;
  selfTransformation: boolean;
}

export interface ZiweiJiClash {
  sourcePalace: string;
  jiStar: string;
  jiTargetPalace: string;
  oppositePalace: string;
}

export interface ZiweiPalaceFlyingGraph {
  lineageProfile: ZiweiLineageProfile;
  mutagenProfile: Omit<ZiweiMutagenProfile, "table">;
  edges: ZiweiPalaceFlyingEdge[];
  selfTransformations: ZiweiPalaceFlyingEdge[];
  jiClashes: ZiweiJiClash[];
  sourceIds: string[];
  boundary: string;
}

export interface ZiweiPalaceFlyingProfileDifference {
  sourcePalace: string;
  sourceStem: string;
  transformation: ZiweiTransformationKind;
  values: Record<ZiweiMutagenProfile["id"], { star: string; targetPalace: string }>;
}

export interface ZiweiPalaceFlyingProfileComparison {
  graphs: Record<ZiweiMutagenProfile["id"], ZiweiPalaceFlyingGraph>;
  differences: ZiweiPalaceFlyingProfileDifference[];
  sourceIds: string[];
  boundary: string;
}

export interface ZiweiQintianStructuralLayer {
  mutagenProfile: Omit<ZiweiMutagenProfile, "table">;
  natalYearStem: string;
  laiyinPalace: { name: string; heavenlyStem: string; earthlyBranch: string };
  bodyTransformations: ZiweiTransformationEntry[];
  outwardSelfTransformations: ZiweiPalaceFlyingEdge[];
  inwardSelfTransformations: ZiweiPalaceFlyingEdge[];
  faxiangLinks: ZiweiQintianFaxiangLink[];
  seriesChains: ZiweiQintianSeriesChain[];
  sourceIds: string[];
  boundary: string;
}

export type ZiweiQintianSelfDirection = "outward" | "inward";

export interface ZiweiQintianFaxiangLink {
  id: string;
  direction: ZiweiQintianSelfDirection;
  transformation: ZiweiTransformationKind;
  body: {
    star: string;
    palace: string;
    palaceIndex: number;
  };
  use: {
    star: string;
    sourcePalace: string;
    sourcePalaceIndex: number;
    targetPalace: string;
    targetPalaceIndex: number;
  };
  starRelation: "same_star_qualitative" | "different_star_quantitative";
}

export interface ZiweiQintianSeriesChain {
  direction: ZiweiQintianSelfDirection;
  transformation: ZiweiTransformationKind;
  faxiangLinkIds: string[];
}

export interface ZiweiQintianTransitActivation {
  layer: Exclude<ZiweiTransformationLayerId, "natal">;
  label: string;
  sourceStem: string;
  sourceBranch: string;
  transformation: ZiweiTransformationKind;
  transitStar: string;
  natalPalace: string | null;
  exactBodyStar: boolean;
  exactUseStarLinkIds: string[];
  sameKindFaxiangLinkIds: string[];
}

export interface ZiweiQintianActivationLayer {
  solarDate: string;
  lunarDate: string;
  activations: ZiweiQintianTransitActivation[];
  sourceIds: string[];
  boundary: string;
}

const QINTIAN_LAIYIN_BRANCH_BY_YEAR_STEM: Record<string, string> = {
  甲: "戌", 乙: "酉", 丙: "申", 丁: "未", 戊: "午",
  己: "巳", 庚: "辰", 辛: "卯", 壬: "寅", 癸: "亥"
};

/** 궁간이 발생시키는 12궁×록·권·과·기 비화와 자화·화기충 대궁을 계산한다. */
export function computeZiweiPalaceFlyingGraph(
  input: SajuInput,
  lang: IztroLang = "ko-KR",
  profileId: ZiweiLineageProfile["id"] = "common",
  mutagenProfileId: ZiweiMutagenProfile["id"] = "iztro_documented"
): ZiweiPalaceFlyingGraph {
  // Palace placement does not change with the selected mutagen table. Resolve
  // all profile-specific flying edges against one canonical chart instead of
  // asking iztro to walk the whole chart once for every source palace/profile.
  const astrolabe = createAstrolabe(input, lang, profileId, "iztro_documented");
  const canonical = lang === "zh-TW"
    ? astrolabe
    : createAstrolabe(input, "zh-TW", profileId, "iztro_documented");
  const mutagenProfile = ZIWEI_MUTAGEN_PROFILES[mutagenProfileId];
  const localizedStarNames = new Map<string, string>();
  for (const canonicalPalace of canonical.palaces) {
    const localizedPalace = astrolabe.palaces.find((palace) => palace.index === canonicalPalace.index);
    if (!localizedPalace) continue;
    const canonicalStars = [...(canonicalPalace.majorStars ?? []), ...(canonicalPalace.minorStars ?? [])];
    const localizedStars = [...(localizedPalace.majorStars ?? []), ...(localizedPalace.minorStars ?? [])];
    canonicalStars.forEach((star, index) => {
      localizedStarNames.set(star.name, localizedStars[index]?.name ?? star.name);
    });
  }
  const edges = astrolabe.palaces.flatMap((sourcePalace) => {
    const canonicalSource = canonical.palaces.find((palace) => palace.index === sourcePalace.index);
    if (!canonicalSource) throw new Error(`ZIWEI_CANONICAL_SOURCE_PALACE_MISSING:${sourcePalace.index}`);
    const transformedStars = mutagenProfile.table[canonicalSource.heavenlyStem];
    if (!transformedStars) throw new Error(`ZIWEI_MUTAGEN_STEM_MISSING:${canonicalSource.heavenlyStem}`);
    return TRANSFORMATION_ORDER.map((transformation, index): ZiweiPalaceFlyingEdge => {
      const canonicalStar = transformedStars[index];
      const canonicalTarget = canonical.palaces.find((palace) =>
        [...(palace.majorStars ?? []), ...(palace.minorStars ?? [])].some((star) => star.name === canonicalStar)
      );
      const targetPalace = canonicalTarget === undefined
        ? undefined
        : astrolabe.palaces.find((palace) => palace.index === canonicalTarget.index);
      const transformedStar = localizedStarNames.get(canonicalStar) ?? canonicalStar;
      if (!targetPalace) {
        throw new Error(`ZIWEI_PALACE_FLYING_TARGET_MISSING: ${sourcePalace.name}:${transformation}`);
      }
      return {
        sourcePalace: sourcePalace.name,
        sourcePalaceIndex: sourcePalace.index,
        sourceStem: sourcePalace.heavenlyStem,
        transformation,
        transformedStar,
        targetPalace: targetPalace.name,
        targetPalaceIndex: targetPalace.index,
        targetBranch: targetPalace.earthlyBranch,
        selfTransformation: sourcePalace.index === targetPalace.index
      };
    });
  });
  const jiClashes = edges.filter((edge) => edge.transformation === "기").map((edge): ZiweiJiClash => {
    const opposite = astrolabe.palace((edge.targetPalaceIndex + 6) % 12);
    if (!opposite) throw new Error(`ZIWEI_PALACE_FLYING_OPPOSITE_MISSING: ${edge.targetPalace}`);
    return {
      sourcePalace: edge.sourcePalace,
      jiStar: edge.transformedStar,
      jiTargetPalace: edge.targetPalace,
      oppositePalace: opposite.name
    };
  });
  return {
    lineageProfile: ZIWEI_LINEAGE_PROFILES[profileId],
    mutagenProfile: {
      id: mutagenProfile.id,
      label: mutagenProfile.label,
      sourceIds: mutagenProfile.sourceIds,
      note: mutagenProfile.note
    },
    edges,
    selfTransformations: edges.filter((edge) => edge.selfTransformation),
    jiClashes,
    sourceIds: ["iztro-config", "iztro-astrolabe", "iztro-palace-flying", ...mutagenProfile.sourceIds],
    boundary: "궁간과 선택한 십간 사화표로 비화 도착궁·자화·화기충 대궁을 계산했다. 비화의 심리·사건 의미와 다른 유파의 사화표는 자동 혼합하지 않는다."
  };
}

/** 대만 비성 계열의 방향 자화와 내인궁을 의미 해석 없이 구조값으로 분리한다. */
export function computeZiweiQintianStructuralLayer(
  input: SajuInput,
  lang: IztroLang = "ko-KR",
  profileId: ZiweiLineageProfile["id"] = "common",
  mutagenProfileId: ZiweiMutagenProfile["id"] = "iztro_documented"
): ZiweiQintianStructuralLayer {
  const astrolabe = createAstrolabe(input, lang, profileId, mutagenProfileId);
  const graph = computeZiweiPalaceFlyingGraph(input, lang, profileId, mutagenProfileId);
  const bodyTransformations = buildNatalTransformationLayer(astrolabe).entries;
  // 궁간은 출력 언어에 따라 `경`/`庚`처럼 번역되므로, 산법 판정은 한문
  // 명반에서 수행하고 같은 궁 인덱스로 호출 언어의 궁명을 되찾는다.
  const canonicalAstrolabe = createAstrolabe(input, "zh-TW", profileId, mutagenProfileId);
  const [natalYearStem = ""] = canonicalAstrolabe.rawDates?.chineseDate?.yearly ?? [];
  const laiyinBranch = QINTIAN_LAIYIN_BRANCH_BY_YEAR_STEM[natalYearStem];
  const laiyinCandidates = canonicalAstrolabe.palaces.filter((palace) =>
    palace.heavenlyStem === natalYearStem && palace.earthlyBranch === laiyinBranch
  );
  if (laiyinCandidates.length !== 1) {
    throw new Error(`ZIWEI_LAIYIN_PALACE_AMBIGUOUS:${natalYearStem}${laiyinBranch ?? ""}:${laiyinCandidates.length}`);
  }
  const canonicalLaiyin = laiyinCandidates[0];
  const localizedLaiyin = astrolabe.palace(canonicalLaiyin.index);
  if (!localizedLaiyin) throw new Error(`ZIWEI_LAIYIN_PALACE_MISSING:${canonicalLaiyin.index}`);
  const outwardSelfTransformations = graph.edges.filter((edge) => edge.sourcePalaceIndex === edge.targetPalaceIndex);
  const inwardSelfTransformations = graph.edges.filter((edge) => (edge.sourcePalaceIndex + 6) % 12 === edge.targetPalaceIndex);
  const directedSelfTransformations: { direction: ZiweiQintianSelfDirection; edge: ZiweiPalaceFlyingEdge }[] = [
    ...outwardSelfTransformations.map((edge) => ({ direction: "outward" as const, edge })),
    ...inwardSelfTransformations.map((edge) => ({ direction: "inward" as const, edge }))
  ];
  const faxiangLinks = directedSelfTransformations.map(({ direction, edge }): ZiweiQintianFaxiangLink => {
    const body = bodyTransformations.find((entry) => entry.transformation === edge.transformation);
    if (!body || body.natalPalace === null || body.natalPalaceIndex === null) {
      throw new Error(`ZIWEI_QINTIAN_BODY_TRANSFORMATION_MISSING:${edge.transformation}`);
    }
    return {
      id: `${direction}:${edge.sourcePalaceIndex}:${edge.transformation}`,
      direction,
      transformation: edge.transformation,
      body: {
        star: body.star,
        palace: body.natalPalace,
        palaceIndex: body.natalPalaceIndex
      },
      use: {
        star: edge.transformedStar,
        sourcePalace: edge.sourcePalace,
        sourcePalaceIndex: edge.sourcePalaceIndex,
        targetPalace: edge.targetPalace,
        targetPalaceIndex: edge.targetPalaceIndex
      },
      starRelation: body.star === edge.transformedStar
        ? "same_star_qualitative"
        : "different_star_quantitative"
    };
  });
  const seriesChains = (["outward", "inward"] as const).flatMap((direction) =>
    TRANSFORMATION_ORDER.flatMap((transformation): ZiweiQintianSeriesChain[] => {
      const links = faxiangLinks.filter((link) => link.direction === direction && link.transformation === transformation);
      return links.length ? [{ direction, transformation, faxiangLinkIds: links.map((link) => link.id) }] : [];
    })
  );
  return {
    mutagenProfile: graph.mutagenProfile,
    natalYearStem,
    laiyinPalace: {
      name: localizedLaiyin.name,
      heavenlyStem: canonicalLaiyin.heavenlyStem,
      earthlyBranch: canonicalLaiyin.earthlyBranch
    },
    bodyTransformations,
    outwardSelfTransformations,
    inwardSelfTransformations,
    faxiangLinks,
    seriesChains,
    sourceIds: [...new Set([...graph.sourceIds, "baipai-flying-manual", "qintian-laiyin-intro", "qintian-tiyong-faxiang", "iztro-laiyin-palace"])],
    boundary: "생년 사화를 체, 이심·향심 자화를 용으로 두고 같은 사화 종류끼리 법상 연결했다. 같은 별의 법상은 질적 변화, 다른 별의 법상은 양적 형태로 분류하며 같은 종류의 이심·향심 연결은 방향별로 따로 묶는다. 내인궁은 오호둔의 갑술·을유·병신·정미·무오·기사·경진·신묘·임인·계해 자리로 정하며, 천지불작내인 규칙에 따라 자·축의 중복 궁간은 쓰지 않는다. 법상은 구조 연결이며 그 자체로 길흉·사건의 발생을 확정하지 않는다."
  };
}

/** 운한 사화가 원명반 체와 자화 용의 어느 구조를 접촉하는지 계산한다. */
export function computeZiweiQintianActivationLayer(
  input: SajuInput,
  target: { year: number; month: number; day: number; hour?: number },
  lang: IztroLang = "ko-KR",
  profileId: ZiweiLineageProfile["id"] = "common",
  mutagenProfileId: ZiweiMutagenProfile["id"] = "iztro_documented"
): ZiweiQintianActivationLayer {
  const structural = computeZiweiQintianStructuralLayer(input, lang, profileId, mutagenProfileId);
  const horoscope = computeZiweiHoroscope(input, target, lang, profileId, mutagenProfileId);
  const bodyByKind = new Map(structural.bodyTransformations.map((entry) => [entry.transformation, entry]));
  const activations = horoscope.transformationLayers
    .filter((layer): layer is ZiweiTransformationLayer & { layer: Exclude<ZiweiTransformationLayerId, "natal"> } => layer.layer !== "natal")
    .flatMap((layer) => layer.entries.map((entry): ZiweiQintianTransitActivation => {
      const body = bodyByKind.get(entry.transformation);
      const sameKindLinks = structural.faxiangLinks.filter((link) => link.transformation === entry.transformation);
      return {
        layer: layer.layer,
        label: layer.label,
        sourceStem: layer.sourceStem,
        sourceBranch: layer.sourceBranch,
        transformation: entry.transformation,
        transitStar: entry.star,
        natalPalace: entry.natalPalace,
        exactBodyStar: body?.star === entry.star,
        exactUseStarLinkIds: sameKindLinks.filter((link) => link.use.star === entry.star).map((link) => link.id),
        sameKindFaxiangLinkIds: sameKindLinks.map((link) => link.id)
      };
    }));
  return {
    solarDate: horoscope.solarDate,
    lunarDate: horoscope.lunarDate,
    activations,
    sourceIds: [...new Set([...structural.sourceIds, ...horoscope.sourceIds])],
    boundary: "운한 사화와 생년 체·자화 용의 같은 종류 및 동일 성요 접촉만 산출한다. 접촉값은 사건 해석의 입력이며 길흉이나 실제 사건을 자동 판정하지 않는다."
  };
}

/** 같은 명반을 출처가 고정된 사화표별로 계산해 유파 의존 간선만 드러낸다. */
export function compareZiweiPalaceFlyingProfiles(
  input: SajuInput,
  lang: IztroLang = "ko-KR",
  profileId: ZiweiLineageProfile["id"] = "common"
): ZiweiPalaceFlyingProfileComparison {
  const profileIds = Object.keys(ZIWEI_MUTAGEN_PROFILES) as ZiweiMutagenProfile["id"][];
  const graphs = Object.fromEntries(
    profileIds.map((mutagenProfileId) => [
      mutagenProfileId,
      computeZiweiPalaceFlyingGraph(input, lang, profileId, mutagenProfileId)
    ])
  ) as Record<ZiweiMutagenProfile["id"], ZiweiPalaceFlyingGraph>;
  const baseline = graphs.iztro_documented;
  const differences = baseline.edges.flatMap((baselineEdge): ZiweiPalaceFlyingProfileDifference[] => {
    const values = Object.fromEntries(profileIds.map((mutagenProfileId) => {
      const edge = graphs[mutagenProfileId].edges.find((candidate) =>
        candidate.sourcePalaceIndex === baselineEdge.sourcePalaceIndex &&
        candidate.transformation === baselineEdge.transformation
      );
      if (!edge) throw new Error(`ZIWEI_PALACE_FLYING_PROFILE_EDGE_MISSING: ${mutagenProfileId}:${baselineEdge.sourcePalace}:${baselineEdge.transformation}`);
      return [mutagenProfileId, { star: edge.transformedStar, targetPalace: edge.targetPalace }];
    })) as ZiweiPalaceFlyingProfileDifference["values"];
    const signatures = profileIds.map((mutagenProfileId) => {
      const value = values[mutagenProfileId];
      return `${value.star}:${value.targetPalace}`;
    });
    if (new Set(signatures).size === 1) return [];
    return [{
      sourcePalace: baselineEdge.sourcePalace,
      sourceStem: baselineEdge.sourceStem,
      transformation: baselineEdge.transformation,
      values
    }];
  });
  return {
    graphs,
    differences,
    sourceIds: [...new Set(profileIds.flatMap((id) => graphs[id].sourceIds))],
    boundary: "서로 다른 사화표의 계산 결과를 합산하거나 다수결하지 않고, 어느 출처표에서 달라지는지 그대로 보존한다."
  };
}

export interface ZiweiLineageDifference {
  palace: string;
  field: "branch" | "major_stars" | "minor_stars" | "mutagens";
  common: string[];
  zhongzhou: string[];
}

function sorted(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sameValues(a: string[], b: string[]): boolean {
  const aa = sorted(a);
  const bb = sorted(b);
  return aa.length === bb.length && aa.every((value, index) => value === bb[index]);
}

/** 같은 입력을 두 배치법으로 계산해 유파 민감 지점을 보존한다. */
export function compareZiweiLineages(input: SajuInput, lang: IztroLang = "ko-KR"): {
  common: ZiweiChart;
  zhongzhou: ZiweiChart;
  differences: ZiweiLineageDifference[];
} {
  const common = computeZiweiChart(input, lang, "common");
  const zhongzhou = computeZiweiChart(input, lang, "zhongzhou");
  const differences: ZiweiLineageDifference[] = [];
  for (const commonPalace of common.palaces) {
    const other = zhongzhou.palaces.find((palace) => palace.name === commonPalace.name);
    if (!other) continue;
    const checks: { field: ZiweiLineageDifference["field"]; a: string[]; b: string[] }[] = [
      { field: "branch", a: [commonPalace.earthlyBranch], b: [other.earthlyBranch] },
      { field: "major_stars", a: commonPalace.majorStars.map((star) => star.name), b: other.majorStars.map((star) => star.name) },
      { field: "minor_stars", a: commonPalace.minorStars.map((star) => star.name), b: other.minorStars.map((star) => star.name) },
      {
        field: "mutagens",
        a: [...commonPalace.majorStars, ...commonPalace.minorStars].filter((star) => star.mutagen).map((star) => `${star.name}:${star.mutagen}`),
        b: [...other.majorStars, ...other.minorStars].filter((star) => star.mutagen).map((star) => `${star.name}:${star.mutagen}`)
      }
    ];
    for (const check of checks) {
      if (!sameValues(check.a, check.b)) differences.push({ palace: commonPalace.name, field: check.field, common: sorted(check.a), zhongzhou: sorted(check.b) });
    }
  }
  return { common, zhongzhou, differences };
}

function palaceLine(palace: ZiweiPalace): string {
  const major = palace.majorStars.map((star) => star.name + (star.brightness ? `(${star.brightness})` : "") + (star.mutagen ? `화${star.mutagen}` : "")).join("·") || "무주성";
  const support = [...palace.minorStars.map((star) => star.name), ...palace.adjectiveStars].join(",");
  const topology = palace.sanfangSizheng;
  return `${palace.name}[${palace.heavenlyStem}${palace.earthlyBranch}]${palace.isBodyPalace ? "(신궁)" : ""} 주:${major}${support ? ` 보좌살:${support}` : ""} | 삼방사정 ${topology.target}·${topology.opposite}·${topology.wealth}·${topology.career}`;
}

/** 명반을 근거 텍스트로 직렬화한다. 해석 규칙이 아니라 계산 결과다. */
export function serializeZiwei(chart: ZiweiChart): string {
  const ming = chart.palaces.find((palace) => palace.name.includes("명") || palace.name.includes("命")) ?? chart.palaces[0];
  return (
    `[자미두수 명반 계산 — ${chart.lineageProfile.label}, 연경계 ${chart.lineageProfile.yearDivide}, 야자시 ${chart.lineageProfile.dayDivide}] ` +
    `${chart.solarDate}(음 ${chart.lunarDate}) ${chart.gender} ${chart.timeRange} | 오행국 ${chart.fiveElementsClass} | 명주 ${chart.soul}·신주 ${chart.body} | ` +
    `명궁 ${ming.earthlyBranch}(${ming.majorStars.map((star) => star.name).join("·") || "무주성"}) | 띠 ${chart.zodiac}\n` +
    chart.palaces.map(palaceLine).join("\n")
  );
}
