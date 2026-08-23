/**
 * 대육임(大六壬) 사과삼전 엔진 — 三式의 하나.
 * 월장→천반→사과(四課) 뒤 60일진×12천반 배치의 닫힌 720국 표로 삼전을 취한다.
 * 구종문을 불완전한 분기로 흉내 내지 않고 요극·묘성·별책·팔전·복음·반음까지 표의
 * 확정 항목을 그대로 반환한다. 해석과 길흉 단정은 이 계산층의 범위가 아니다.
 */
import { Solar } from "lunar-typescript";
import sanChuanTable from "./yukim-sanchuan-table.json";

const BR = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
// 천간 기궁(寄宮)
const GAN_GIGUNG: Record<string, string> = { 甲:"寅",乙:"辰",丙:"巳",丁:"未",戊:"巳",己:"未",庚:"申",辛:"戌",壬:"亥",癸:"丑" };
// 절기명 → 월장(月將) 지지
const WOLJANG: Record<string, string> = {
  "大寒":"子","立春":"子","雨水":"亥","驚蟄":"亥","惊蛰":"亥","春分":"戌","清明":"戌","淸明":"戌","穀雨":"酉","谷雨":"酉",
  "立夏":"酉","小滿":"申","小满":"申","芒種":"申","芒种":"申","夏至":"未","小暑":"未","大暑":"午","立秋":"午",
  "處暑":"巳","处暑":"巳","白露":"巳","秋分":"辰","寒露":"辰","霜降":"卯","立冬":"卯","小雪":"寅","大雪":"寅","冬至":"丑","小寒":"丑"
};
// 12천장(귀인 起 순서)
const GENERALS = ["귀인","등사","주작","육합","구진","청룡","천공","백호","태상","현무","태음","천후"];
// 천을귀인(주귀晝貴 기준 지지) by 일간
const GUIIN_DAY: Record<string, string> = { 甲:"丑",戊:"丑",庚:"丑",乙:"子",己:"子",丙:"亥",丁:"亥",壬:"巳",癸:"巳",辛:"午" };
const GUIIN_NIGHT: Record<string, string> = { 甲:"未",戊:"未",庚:"未",乙:"申",己:"申",丙:"酉",丁:"酉",壬:"卯",癸:"卯",辛:"寅" };

function hourBranch(h: number): string { return BR[h === 23 ? 0 : Math.floor((h + 1) / 2) % 12]; }
function idx(b: string): number { return BR.indexOf(b); }

export type YukimMethodCode =
  | "涉害" | "重审" | "元首" | "比用" | "知一" | "伏吟"
  | "别责" | "遥克" | "反吟" | "昴星" | "八专";

const METHOD_KO: Record<YukimMethodCode, string> = {
  涉害: "섭해(涉害)",
  重审: "중심(重審)",
  元首: "원수(元首)",
  比用: "비용(比用)",
  知一: "지일(知一)",
  伏吟: "복음(伏吟)",
  别责: "별책(別責)",
  遥克: "요극(遙剋)",
  反吟: "반음(返吟)",
  昴星: "묘성(昴星)",
  八专: "팔전(八專)",
};

type SanChuanTableEntry = { "干支组合": string; "格局": YukimMethodCode };
const CLOSED_SAN_CHUAN_TABLE = sanChuanTable as Record<string, SanChuanTableEntry[]>;

export interface YukimResult {
  dayGan: string; dayBranch: string; hourBranch: string; dayNight: string; monthGeneral: string;
  heavenPlate: Record<string, string>;
  fourLessons: { lesson: number; top: string; bottom: string }[];
  threeTransmissions: { name: string; branch: string; general: string }[];
  methodCode: YukimMethodCode;
  method: string;
  sourceTrace: {
    dayKey: string;
    firstLessonTop: string;
    tableIndex: number;
    tableCoverage: "60_day_pillars_x_12_heaven_plate_positions";
  };
  disclaimer: string;
}

/** 점치는 일시로 대육임 국을 세운다. */
export function castYukim(year: number, month: number, day: number, hour: number): YukimResult {
  const lunar = Solar.fromYmdHms(year, month, day, hour, 0, 0).getLunar();
  const gz = lunar.getDayInGanZhi();
  const dayGan = gz[0], dayBranch = gz[1];
  const hb = hourBranch(hour);
  const jie = lunar.getPrevJieQi(true).getName();
  const woljang = WOLJANG[jie] ?? "子";
  const dayNight = (hour >= 5 && hour < 17) ? "주(晝)" : "야(夜)";

  // 천반: 점시 지반 위에 월장을 놓고 순포 → heaven[지반지지] = 월장 + (지반idx - 점시idx)
  const shift = (idx(woljang) - idx(hb) + 12) % 12;
  const heaven: Record<string, string> = {};
  for (let d = 0; d < 12; d++) heaven[BR[d]] = BR[(d + shift) % 12];

  // 사과
  const gigung = GAN_GIGUNG[dayGan];
  const l1b = gigung, l1t = heaven[gigung];
  const l2b = l1t, l2t = heaven[l1t];
  const l3b = dayBranch, l3t = heaven[dayBranch];
  const l4b = l3t, l4t = heaven[l3t];
  const lessons = [{ lesson: 1, top: l1t, bottom: l1b }, { lesson: 2, top: l2t, bottom: l2b }, { lesson: 3, top: l3t, bottom: l3b }, { lesson: 4, top: l4t, bottom: l4b }];

  // 삼전: 일진과 제1과 상신이 지정하는 720국의 닫힌 표를 취한다.
  const dayKey = `${dayGan}${dayBranch}`;
  const tableIndex = idx(l1t);
  const entry = CLOSED_SAN_CHUAN_TABLE[dayKey]?.[tableIndex];
  if (!entry || entry["干支组合"].length !== 3) {
    throw new Error(`YUKIM_SAN_CHUAN_TABLE_MISSING: ${dayKey}/${l1t}/${tableIndex}`);
  }
  const [chojeon, jung, mal] = [...entry["干支组合"]];
  const methodCode = entry["格局"];

  // 12천장: 귀인 위치(천반지지)에서 시작, 亥~辰=순행, 巳~戌=역행
  const guiin = (dayNight === "주(晝)") ? GUIIN_DAY[dayGan] : GUIIN_NIGHT[dayGan];
  // 귀인이 놓인 지반궁을 찾는다(천반=귀인인 지반)
  let guiinBranch = "子"; for (const d of BR) if (heaven[d] === guiin) { guiinBranch = d; break; }
  const forward = ["亥","子","丑","寅","卯","辰"].includes(guiinBranch); // 귀인이 놓인 지반궁 亥~辰=순행
  // 천장은 천반 위를 돈다: 삼전 천반지지 T의 천장 = 귀인(천반지지)에서 T까지 천반 순서 거리.
  const genOf = (tianpanBranch: string): string => {
    const dist = ((idx(tianpanBranch) - idx(guiin)) * (forward ? 1 : -1) + 12) % 12;
    return GENERALS[dist];
  };
  const trans = [{ name: "초전(初傳)", branch: chojeon }, { name: "중전(中傳)", branch: jung }, { name: "말전(末傳)", branch: mal }]
    .map((t) => ({ ...t, general: genOf(t.branch) }));

  return {
    dayGan, dayBranch, hourBranch: hb, dayNight, monthGeneral: woljang,
    heavenPlate: heaven, fourLessons: lessons, threeTransmissions: trans,
    methodCode,
    method: METHOD_KO[methodCode],
    sourceTrace: {
      dayKey,
      firstLessonTop: l1t,
      tableIndex,
      tableCoverage: "60_day_pillars_x_12_heaven_plate_positions",
    },
    disclaimer: "[대육임 — 월장·천반·사과와 720국 삼전표의 계산 결과다. 질문별 길흉과 응기는 별도의 해석 근거가 필요하다.]"
  };
}
