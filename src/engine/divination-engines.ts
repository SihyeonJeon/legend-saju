/**
 * 동양 점술 계산 엔진 — 주역 괘 뽑기(64괘 본괘/변괘) + 풍수 동서사택(본명괘 8방위 길흉).
 * JUYEOK_64를 embed. 점술은 보조 정보이며 길흉을 확정·보장하지 않는다(disclaimer).
 */
import { Solar } from "lunar-typescript";

interface Hex { num: number; hanja: string; kr: string }
const JUYEOK_64: Record<string, Hex> = {"건|건": {"num": 1, "hanja": "乾爲天", "kr": "건위천"}, "곤|곤": {"num": 2, "hanja": "坤爲地", "kr": "곤위지"}, "감|진": {"num": 3, "hanja": "水雷屯", "kr": "수뢰둔"}, "간|감": {"num": 4, "hanja": "山水蒙", "kr": "산수몽"}, "감|건": {"num": 5, "hanja": "水天需", "kr": "수천수"}, "건|감": {"num": 6, "hanja": "天水訟", "kr": "천수송"}, "곤|감": {"num": 7, "hanja": "地水師", "kr": "지수사"}, "감|곤": {"num": 8, "hanja": "水地比", "kr": "수지비"}, "손|건": {"num": 9, "hanja": "風天小畜", "kr": "풍천소축"}, "건|태": {"num": 10, "hanja": "天澤履", "kr": "천택리"}, "곤|건": {"num": 11, "hanja": "地天泰", "kr": "지천태"}, "건|곤": {"num": 12, "hanja": "天地否", "kr": "천지비"}, "건|리": {"num": 13, "hanja": "天火同人", "kr": "천화동인"}, "리|건": {"num": 14, "hanja": "火天大有", "kr": "화천대유"}, "곤|간": {"num": 15, "hanja": "地山謙", "kr": "지산겸"}, "진|곤": {"num": 16, "hanja": "雷地豫", "kr": "뢰지예"}, "태|진": {"num": 17, "hanja": "澤雷隨", "kr": "택뢰수"}, "간|손": {"num": 18, "hanja": "山風蠱", "kr": "산풍고"}, "곤|태": {"num": 19, "hanja": "地澤臨", "kr": "지택림"}, "손|곤": {"num": 20, "hanja": "風地觀", "kr": "풍지관"}, "리|진": {"num": 21, "hanja": "火雷噬嗑", "kr": "화뢰서합"}, "간|리": {"num": 22, "hanja": "山火賁", "kr": "산화비"}, "간|곤": {"num": 23, "hanja": "山地剝", "kr": "산지박"}, "곤|진": {"num": 24, "hanja": "地雷復", "kr": "지뢰복"}, "건|진": {"num": 25, "hanja": "天雷無妄", "kr": "천뢰무망"}, "간|건": {"num": 26, "hanja": "山天大畜", "kr": "산천대축"}, "간|진": {"num": 27, "hanja": "山雷頤", "kr": "산뢰이"}, "태|손": {"num": 28, "hanja": "澤風大過", "kr": "택풍대과"}, "감|감": {"num": 29, "hanja": "坎爲水", "kr": "감위수"}, "리|리": {"num": 30, "hanja": "離爲火", "kr": "리위화"}, "태|간": {"num": 31, "hanja": "澤山咸", "kr": "택산함"}, "진|손": {"num": 32, "hanja": "雷風恒", "kr": "뢰풍항"}, "건|간": {"num": 33, "hanja": "天山遯", "kr": "천산돈"}, "진|건": {"num": 34, "hanja": "雷天大壯", "kr": "뢰천대장"}, "리|곤": {"num": 35, "hanja": "火地晉", "kr": "화지진"}, "곤|리": {"num": 36, "hanja": "地火明夷", "kr": "지화명이"}, "손|리": {"num": 37, "hanja": "風火家人", "kr": "풍화가인"}, "리|태": {"num": 38, "hanja": "火澤睽", "kr": "화택규"}, "감|간": {"num": 39, "hanja": "水山蹇", "kr": "수산건"}, "진|감": {"num": 40, "hanja": "雷水解", "kr": "뢰수해"}, "간|태": {"num": 41, "hanja": "山澤損", "kr": "산택손"}, "손|진": {"num": 42, "hanja": "風雷益", "kr": "풍뢰익"}, "태|건": {"num": 43, "hanja": "澤天夬", "kr": "택천쾌"}, "건|손": {"num": 44, "hanja": "天風姤", "kr": "천풍구"}, "태|곤": {"num": 45, "hanja": "澤地萃", "kr": "택지췌"}, "곤|손": {"num": 46, "hanja": "地風升", "kr": "지풍승"}, "태|감": {"num": 47, "hanja": "澤水困", "kr": "택수곤"}, "감|손": {"num": 48, "hanja": "水風井", "kr": "수풍정"}, "태|리": {"num": 49, "hanja": "澤火革", "kr": "택화혁"}, "리|손": {"num": 50, "hanja": "火風鼎", "kr": "화풍정"}, "진|진": {"num": 51, "hanja": "震爲雷", "kr": "진위뢰"}, "간|간": {"num": 52, "hanja": "艮爲山", "kr": "간위산"}, "손|간": {"num": 53, "hanja": "風山漸", "kr": "풍산점"}, "진|태": {"num": 54, "hanja": "雷澤歸妹", "kr": "뢰택귀매"}, "진|리": {"num": 55, "hanja": "雷火豐", "kr": "뢰화풍"}, "리|간": {"num": 56, "hanja": "火山旅", "kr": "화산려"}, "손|손": {"num": 57, "hanja": "巽爲風", "kr": "손위풍"}, "태|태": {"num": 58, "hanja": "兌爲澤", "kr": "태위택"}, "손|감": {"num": 59, "hanja": "風水渙", "kr": "풍수환"}, "감|태": {"num": 60, "hanja": "水澤節", "kr": "수택절"}, "손|태": {"num": 61, "hanja": "風澤中孚", "kr": "풍택중부"}, "진|간": {"num": 62, "hanja": "雷山小過", "kr": "뢰산소과"}, "감|리": {"num": 63, "hanja": "水火既濟", "kr": "수화기제"}, "리|감": {"num": 64, "hanja": "火水未濟", "kr": "화수미제"}};
const TRIGRAM: Record<string, string> = { "111":"건","110":"태","101":"리","100":"진","011":"손","010":"감","001":"간","000":"곤" };
function trigram(lines: number[]): string { return TRIGRAM[lines.map((l)=>(l?1:0)).join("")]; }

export interface HexagramCast { lines: { pos: number; yinYang: string; moving: boolean }[]; lowerTrigram: string; upperTrigram: string; primary: Hex; changed: Hex | null; movingLines: number[]; reading: string; disclaimer: string }

/** 주역 괘를 뽑는다(동전점). lineValues 미지정 시 무작위. 각 값 6=노음(동)/7=소양/8=소음/9=노양(동). lines[0]=초효(하). */
export function castHexagram(lineValues?: number[]): HexagramCast {
  const vals = lineValues && lineValues.length === 6 ? lineValues
    : Array.from({ length: 6 }, () => { let s = 0; for (let i = 0; i < 3; i++) s += (Math.floor(Math.random() * 2) ? 3 : 2); return s; });
  const yang = vals.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const moving = vals.map((v) => v === 6 || v === 9);
  const lower = trigram(yang.slice(0, 3)), upper = trigram(yang.slice(3, 6));
  const primary = JUYEOK_64[`${upper}|${lower}`];
  const movingLines = moving.map((m, i) => (m ? i + 1 : 0)).filter(Boolean);
  let changed: Hex | null = null;
  if (movingLines.length) {
    const cy = yang.map((y, i) => (moving[i] ? (y ? 0 : 1) : y));
    changed = JUYEOK_64[`${trigram(cy.slice(3, 6))}|${trigram(cy.slice(0, 3))}`];
  }
  const lines = vals.map((v, i) => ({ pos: i + 1, yinYang: (v === 7 || v === 9 ? "양(―)" : "음(--)"), moving: moving[i] }));
  const reading = movingLines.length
    ? `본괘 ${primary.hanja}(${primary.kr}) → 동효 ${movingLines.join("·")}효 → 지괘 ${changed!.hanja}(${changed!.kr}). 현재 상황은 본괘, 변화 방향은 지괘로 본다.`
    : `${primary.hanja}(${primary.kr}) — 동효 없음(정괘). 괘사 전체 기조로 본다.`;
  return { lines, lowerTrigram: lower, upperTrigram: upper, primary, changed, movingLines, reading, disclaimer: "[주역 점 — 64괘 결정적 산출. 괘사·효사 해석은 VAULT 주역 facts 참조. 보조 정보이며 확정 예언이 아니다.]" };
}

const NUM_GWAE: Record<number, string> = { 1:"坎",2:"坤",3:"震",4:"巽",6:"乾",7:"兌",8:"艮",9:"離" };
const DONGSA = new Set(["坎","離","震","巽"]);
const BANGWI: Record<string, Record<string, string>> = {"坎": {"생기": "동남", "천의": "동", "연년": "남", "복위": "북", "화해": "서", "육살": "서북", "오귀": "동북", "절명": "서남"}, "離": {"생기": "동", "천의": "동남", "연년": "북", "복위": "남", "화해": "동북", "육살": "서남", "오귀": "서", "절명": "서북"}, "震": {"생기": "남", "천의": "북", "연년": "동남", "복위": "동", "화해": "서남", "육살": "동북", "오귀": "서북", "절명": "서"}, "巽": {"생기": "북", "천의": "남", "연년": "동", "복위": "동남", "화해": "서북", "육살": "서", "오귀": "서남", "절명": "동북"}, "乾": {"생기": "서", "천의": "동북", "연년": "서남", "복위": "서북", "화해": "동남", "육살": "북", "오귀": "동", "절명": "남"}, "坤": {"생기": "동북", "천의": "서", "연년": "서북", "복위": "서남", "화해": "동", "육살": "남", "오귀": "동남", "절명": "북"}, "艮": {"생기": "서남", "천의": "서북", "연년": "서", "복위": "동북", "화해": "남", "육살": "동", "오귀": "북", "절명": "동남"}, "兌": {"생기": "서북", "천의": "서남", "연년": "동북", "복위": "서", "화해": "북", "육살": "동남", "오귀": "남", "절명": "동"}};

/** 생년·성별로 본명괘(本命卦)와 동서사택, 8방위 길흉을 산출. */
export function dongseoSataek(year: number, month: number, day: number, gender: "남" | "여"): { bonMyeongGwae: string; sataek: string; auspicious: Record<string, string>; inauspicious: Record<string, string>; disclaimer: string } {
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const prev = lunar.getPrevJieQi(true).getName();
  let y = year;
  if (month <= 2 && !["立春","雨水","驚蟄","惊蛰"].includes(prev)) y = year - 1;
  let R = String(y).split("").reduce((a, c) => a + Number(c), 0);
  while (R > 9) R = String(R).split("").reduce((a, c) => a + Number(c), 0);
  let n: number;
  if (gender === "남") { n = 11 - R; if (n > 9) n -= 9; if (n === 0) n = 9; if (n === 5) n = 2; }
  else { n = R + 4; if (n > 9) n -= 9; if (n === 0) n = 9; if (n === 5) n = 8; }
  const gwae = NUM_GWAE[n];
  const b = BANGWI[gwae];
  return {
    bonMyeongGwae: gwae,
    sataek: DONGSA.has(gwae) ? "동사택(東四宅)" : "서사택(西四宅)",
    auspicious: { "생기(大吉)": b.생기, "천의(吉·건강)": b.천의, "연년(吉·인연)": b.연년, "복위(小吉·안정)": b.복위 },
    inauspicious: { "화해(凶)": b.화해, "육살(凶)": b.육살, "오귀(大凶)": b.오귀, "절명(大凶)": b.절명 },
    disclaimer: "[풍수 동서사택 — 본명괘 결정적 산출. 침실·현관·책상을 길방위에, 화장실·주방을 흉방위에 두는 양택 배치 지침. 보조 정보이며 확정·보장 아님.]"
  };
}

// ===== 당사주(唐四柱) 12성 =====
const DANG_STAR: Record<string, string> = { 子:"천귀(天貴)",丑:"천액(天厄)",寅:"천권(天權)",卯:"천파(天破)",辰:"천간(天奸)",巳:"천문(天文)",午:"천복(天福)",未:"천역(天驛)",申:"천고(天孤)",酉:"천인(天刃)",戌:"천예(天藝)",亥:"천수(天壽)" };
const DBR = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ANIMAL: Record<string, string> = { 子:"쥐",丑:"소",寅:"호랑이",卯:"토끼",辰:"용",巳:"뱀",午:"말",未:"양",申:"원숭이",酉:"닭",戌:"개",亥:"돼지" };

/** 당사주 12성 — 생년지(초년)에서 생월·생일·시지로 순행해 4주 성을 뽑는다(유파 의존 통설법). */
export function dangSaju(year: number, month: number, day: number, hour: number): { zodiac: string; cho: string; jung: string; jang: string; mal: string; disclaimer: string } {
  const lunar = Solar.fromYmdHms(year, month, day, hour, 0, 0).getLunar();
  const yearBranch = lunar.getYearZhi();
  const lmonth = Math.abs(lunar.getMonth()); // 음력 월(윤달 음수 보정)
  const lday = lunar.getDay();
  const hb = (hour === 23) ? 0 : Math.floor((hour + 1) / 2) % 12;
  const p0 = DBR.indexOf(yearBranch);
  const pJung = (p0 + lmonth) % 12;
  const pJang = (pJung + lday) % 12;
  const pMal = (pJang + hb) % 12;
  return {
    zodiac: `${yearBranch}(${ANIMAL[yearBranch]})띠`,
    cho: `초년 ${DANG_STAR[DBR[p0]]}`, jung: `중년 ${DANG_STAR[DBR[pJung]]}`,
    jang: `장년 ${DANG_STAR[DBR[pJang]]}`, mal: `말년 ${DANG_STAR[DBR[pMal]]}`,
    disclaimer: "[당사주 12성 — 생년지 기준 순행 통설법(유파별 산법 차이 있음). 보조 정보이며 확정 예언이 아니다.]"
  };
}

// ===== 토정비결(土亭祕訣) 괘 산출 =====
// 선천수(先天數): 천간·지지
const SEONCHEON_GAN: Record<string, number> = { 甲:9,己:9,乙:8,庚:8,丙:7,辛:7,丁:6,壬:6,戊:5,癸:5 };
const SEONCHEON_JI: Record<string, number> = { 子:9,午:9,丑:8,未:8,寅:7,申:7,卯:6,酉:6,辰:5,戌:5,巳:4,亥:4 };

/** 토정비결 괘(상8·중6·하3 → 144) 산출. 선천수법 통용 구현(유파·서적별 산법 차이 있음). targetYear 기준 세는나이. */
export function tojeongGwae(birthYear: number, birthMonth: number, birthDay: number, targetYear = 2026): { age: number; sangGwae: number; jungGwae: number; haGwae: number; gwaeNo: string; disclaimer: string } {
  const bl = Solar.fromYmd(birthYear, birthMonth, birthDay).getLunar();
  const lyear = bl.getYear(), lmonth = Math.abs(bl.getMonth()), lday = bl.getDay();
  const age = targetYear - lyear + 1;
  // 당년(targetYear) 태세 간지 → 태세수
  const ty = Solar.fromYmd(targetYear, 6, 1).getLunar();
  const tyGz = ty.getYearInGanZhi();
  const taese = (SEONCHEON_GAN[tyGz[0]] ?? 0) + (SEONCHEON_JI[tyGz[1]] ?? 0);
  // 생월 음력 일수, 생일 간지 선천수
  const monthGz = bl.getMonthInGanZhi();
  const wolsu = (SEONCHEON_GAN[monthGz[0]] ?? 0) + (SEONCHEON_JI[monthGz[1]] ?? 0);
  const dayGz = bl.getDayInGanZhi();
  const ilsu = (SEONCHEON_GAN[dayGz[0]] ?? 0) + (SEONCHEON_JI[dayGz[1]] ?? 0);
  const mod = (n: number, m: number) => { const r = n % m; return r === 0 ? m : r; };
  const sang = mod(age + taese, 8);
  const jung = mod(sang + lmonth + wolsu, 6);
  const ha = mod(jung + lday + ilsu, 3);
  return {
    age, sangGwae: sang, jungGwae: jung, haGwae: ha,
    gwaeNo: `${sang}·${jung}·${ha} (${sang*100+jung*10+ha}괘)`,
    disclaimer: "[토정비결 — 선천수법 통용 구현. 토정 산법은 서적·유파마다 상수 차이가 크므로 본 결과는 한 가지 구현이다. 144괘 풀이는 VAULT 토정 facts 참조. 보조 정보이며 확정 예언 아님.]"
  };
}
