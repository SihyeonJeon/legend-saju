/**
 * 시가 전반 기문둔갑 拆補轉盤 계산기.
 *
 * 절기·삼원·국수와 지반에 그치지 않고 시주 旬首를 사용해 천반,
 * 九星, 八門, 八神, 值符, 值使, 暗干, 旬空을 같은 판에 배치한다.
 * 해석 점수와 질문별 길흉은 이 모듈의 범위가 아니다.
 */
import { Solar } from "lunar-typescript";

const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const SANQI_LIUYI = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];
const XUN_HIDDEN_STEM = ["戊", "己", "庚", "辛", "壬", "癸"];

const GUKSU: Record<string, { dun: "양둔" | "음둔"; san: [number, number, number] }> = {
  冬至: { dun: "양둔", san: [1, 7, 4] }, 小寒: { dun: "양둔", san: [2, 8, 5] }, 大寒: { dun: "양둔", san: [3, 9, 6] },
  立春: { dun: "양둔", san: [8, 5, 2] }, 雨水: { dun: "양둔", san: [9, 6, 3] }, 驚蟄: { dun: "양둔", san: [1, 7, 4] }, 惊蛰: { dun: "양둔", san: [1, 7, 4] },
  春分: { dun: "양둔", san: [3, 9, 6] }, 清明: { dun: "양둔", san: [4, 1, 7] }, 淸明: { dun: "양둔", san: [4, 1, 7] }, 穀雨: { dun: "양둔", san: [5, 2, 8] }, 谷雨: { dun: "양둔", san: [5, 2, 8] },
  立夏: { dun: "양둔", san: [4, 1, 7] }, 小滿: { dun: "양둔", san: [5, 2, 8] }, 小满: { dun: "양둔", san: [5, 2, 8] }, 芒種: { dun: "양둔", san: [6, 3, 9] }, 芒种: { dun: "양둔", san: [6, 3, 9] },
  夏至: { dun: "음둔", san: [9, 3, 6] }, 小暑: { dun: "음둔", san: [8, 2, 5] }, 大暑: { dun: "음둔", san: [7, 1, 4] },
  立秋: { dun: "음둔", san: [2, 5, 8] }, 處暑: { dun: "음둔", san: [1, 4, 7] }, 处暑: { dun: "음둔", san: [1, 4, 7] }, 白露: { dun: "음둔", san: [9, 3, 6] },
  秋分: { dun: "음둔", san: [7, 1, 4] }, 寒露: { dun: "음둔", san: [6, 9, 3] }, 霜降: { dun: "음둔", san: [5, 8, 2] },
  立冬: { dun: "음둔", san: [6, 9, 3] }, 小雪: { dun: "음둔", san: [5, 8, 2] }, 大雪: { dun: "음둔", san: [4, 7, 1] }
};

const PALACE_DIRECTION: Record<number, string> = {
  1: "북(감)", 2: "서남(곤)", 3: "동(진)", 4: "동남(손)", 5: "중앙",
  6: "서북(건)", 7: "서(태)", 8: "동북(간)", 9: "남(리)"
};
const LUOSHU_RING = [1, 8, 3, 4, 9, 2, 7, 6];
const STAR_HOME: Record<number, string> = {
  1: "천봉", 2: "천예", 3: "천충", 4: "천보", 5: "천금", 6: "천심", 7: "천주", 8: "천임", 9: "천영"
};
const DOOR_HOME: Record<number, string> = {
  1: "휴문", 2: "사문", 3: "상문", 4: "두문", 6: "개문", 7: "경문", 8: "생문", 9: "경문(景門)"
};
const GODS = ["직부", "등사", "태음", "육합", "백호", "현무", "구지", "구천"];

export interface GimunPalace {
  palace: number;
  direction: string;
  heavenStem: string;
  earthStem: string;
  hiddenStem: string;
  star: string | null;
  door: string | null;
  god: string | null;
}

export interface GimunResult {
  jeolgi: string;
  dun: "양둔" | "음둔";
  won: "상원(上元)" | "중원(中元)" | "하원(下元)";
  gukSu: number;
  dayPillar: string;
  timePillar: string;
  bidu: string;
  xunHead: string;
  xunHiddenStem: string;
  kongWang: string[];
  zhiFu: { star: string; originalPalace: number; palace: number; inCenter: boolean };
  zhiShi: { door: string; palace: number; inCenter: boolean };
  jiban: { gung: number; direction: string; stem: string }[];
  palaces: GimunPalace[];
  timeBasis: string;
  sourceIds: string[];
  boundary: string;
  disclaimer: string;
}

function sexagenaryIndex(pillar: string): number {
  const stemIndex = STEMS.indexOf(pillar[0]);
  const branchIndex = BRANCHES.indexOf(pillar[1]);
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index;
  }
  throw new Error(`INVALID_SEXAGENARY_PILLAR:${pillar}`);
}

function projectCenter(palace: number): number {
  return palace === 5 ? 2 : palace;
}

function moveBy(palace: number, steps: number, dun: GimunResult["dun"]): number {
  return dun === "양둔"
    ? ((palace - 1 + steps) % 9) + 1
    : ((palace - 1 - steps + 9 * 9) % 9) + 1;
}

function rotateRing<T>(values: Map<number, T>, from: number, to: number): Map<number, T> {
  const fromIndex = LUOSHU_RING.indexOf(from);
  const toIndex = LUOSHU_RING.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) throw new Error(`INVALID_LUOSHU_ROTATION:${from}:${to}`);
  const shift = (toIndex - fromIndex + 8) % 8;
  const result = new Map<number, T>();
  LUOSHU_RING.forEach((palace, index) => {
    const value = values.get(palace);
    if (value !== undefined) result.set(LUOSHU_RING[(index + shift) % 8], value);
  });
  const center = values.get(5);
  if (center !== undefined) result.set(5, center);
  return result;
}

function earthPlate(dun: GimunResult["dun"], gukSu: number): Map<number, string> {
  const result = new Map<number, string>();
  SANQI_LIUYI.forEach((stem, index) => result.set(moveBy(gukSu, index, dun), stem));
  return result;
}

function dutyAndVoid(timePillar: string) {
  const timeIndex = sexagenaryIndex(timePillar);
  const xunOrdinal = Math.floor(timeIndex / 10);
  const xunStart = xunOrdinal * 10;
  const xunBranch = BRANCHES[xunStart % 12];
  return {
    timeIndex,
    xunHead: `甲${xunBranch}`,
    xunHiddenStem: XUN_HIDDEN_STEM[xunOrdinal],
    kongWang: [BRANCHES[(xunStart + 10) % 12], BRANCHES[(xunStart + 11) % 12]]
  };
}

/** 점시의 拆補轉盤 기문 9궁 전층을 계산한다. */
export function castGimun(year: number, month: number, day: number, hour: number, minute = 0): GimunResult {
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const jeolgi = lunar.getPrevJieQi(true).getName();
  const setup = GUKSU[jeolgi];
  if (!setup) throw new Error(`GIMUN_JIEQI_TABLE_MISSING:${jeolgi}`);
  const dayPillar = lunar.getDayInGanZhi();
  const dayIndex = sexagenaryIndex(dayPillar);
  const biduIndex = dayIndex - (dayIndex % 5);
  const biduBranch = BRANCHES[biduIndex % 12];
  const wonIndex = ["子", "午", "卯", "酉"].includes(biduBranch)
    ? 0
    : ["寅", "申", "巳", "亥"].includes(biduBranch) ? 1 : 2;
  const won = (["상원(上元)", "중원(中元)", "하원(下元)"] as const)[wonIndex];
  const gukSu = setup.san[wonIndex];
  const earth = earthPlate(setup.dun, gukSu);

  const timePillar = lunar.getTimeInGanZhi();
  const duty = dutyAndVoid(timePillar);
  const originalPalace = [...earth.entries()].find(([, stem]) => stem === duty.xunHiddenStem)?.[0];
  if (!originalPalace) throw new Error(`GIMUN_XUN_HIDDEN_STEM_MISSING:${duty.xunHiddenStem}`);
  const timeStem = timePillar[0] === "甲" ? duty.xunHiddenStem : timePillar[0];
  const hourStemPalace = [...earth.entries()].find(([, stem]) => stem === timeStem)?.[0];
  if (!hourStemPalace) throw new Error(`GIMUN_HOUR_STEM_MISSING:${timeStem}`);
  const originalEffective = projectCenter(originalPalace);
  const hourEffective = projectCenter(hourStemPalace);

  const heaven = rotateRing(earth, originalEffective, hourEffective);
  const hiddenStemHome = new Map(earth);

  const starsAtHome = new Map<number, string>();
  LUOSHU_RING.forEach((palace) => starsAtHome.set(palace, palace === 2 ? "금예" : STAR_HOME[palace]));
  const stars = rotateRing(starsAtHome, originalEffective, hourEffective);

  const marchSteps = duty.timeIndex % 10;
  const zhiShiPalace = moveBy(originalPalace, marchSteps, setup.dun);
  const zhiShiEffective = projectCenter(zhiShiPalace);
  const doorsAtHome = new Map<number, string>();
  LUOSHU_RING.forEach((palace) => doorsAtHome.set(palace, DOOR_HOME[palace]));
  const doors = rotateRing(doorsAtHome, originalEffective, zhiShiEffective);
  const hidden = rotateRing(hiddenStemHome, originalEffective, zhiShiEffective);

  const gods = new Map<number, string>();
  const godStart = LUOSHU_RING.indexOf(hourEffective);
  GODS.forEach((god, index) => {
    const target = setup.dun === "양둔"
      ? LUOSHU_RING[(godStart + index) % 8]
      : LUOSHU_RING[(godStart - index + 8) % 8];
    gods.set(target, god);
  });

  const palaces = Array.from({ length: 9 }, (_, index): GimunPalace => {
    const palace = index + 1;
    return {
      palace,
      direction: PALACE_DIRECTION[palace],
      heavenStem: heaven.get(palace) ?? earth.get(palace)!,
      earthStem: earth.get(palace)!,
      hiddenStem: hidden.get(palace) ?? earth.get(palace)!,
      star: stars.get(palace) ?? null,
      door: doors.get(palace) ?? null,
      god: gods.get(palace) ?? null
    };
  });

  return {
    jeolgi,
    dun: setup.dun,
    won,
    gukSu,
    dayPillar,
    timePillar,
    bidu: `${STEMS[biduIndex % 10]}${BRANCHES[biduIndex % 12]}(부두)`,
    xunHead: duty.xunHead,
    xunHiddenStem: duty.xunHiddenStem,
    kongWang: duty.kongWang,
    zhiFu: {
      star: STAR_HOME[originalPalace],
      originalPalace,
      palace: hourStemPalace,
      inCenter: hourStemPalace === 5
    },
    zhiShi: {
      door: DOOR_HOME[originalEffective],
      palace: zhiShiPalace,
      inCenter: zhiShiPalace === 5
    },
    jiban: palaces.map((palace) => ({ gung: palace.palace, direction: palace.direction, stem: palace.earthStem })),
    palaces,
    timeBasis: "입력 지역의 민용 벽시계를 그대로 사용한다. 진태양시·역사적 서머타임은 자동 보정하지 않는다.",
    sourceIds: ["lunar-typescript", "qimen-rotating-golden"],
    boundary: "拆補法 시가 전반 轉盤의 지반·천반·암간·구성·팔문·팔신·직부·직사·순공을 계산했다. 置閏法, 飛盤, 일가·월가·연가, 질문별 용신과 길흉 해석은 다른 계약이다.",
    disclaimer: "[기문둔갑 拆補轉盤 전층 계산. 배치는 계산값이며 확정 예언이나 길흉 점수가 아니다.]"
  };
}
