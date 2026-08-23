/**
 * 사주(四柱) 결정적 계산·해석 엔진.
 *
 * 천문 정밀부(절기 실시각·만세력·일주·대운·납음·공망·십이운성·십신)는 검증된
 * lunar-typescript(6tail 포트)를 사용하고, 그 위에 분석부(오행 분포·신강신약·용신
 * heuristic·신살·합충형파해·개운 색방위·날짜 음양·궁합)를 얹는다. 용신·신강신약은
 * 학파 의존도가 높아 heuristic임을 명시한다(isHeuristic). 명리 용어 근거는
 * myeongri-knowledge-trilingual 지식 저장소와 연결한다.
 */
import { Solar, Lunar, LunarYear, SolarUtil } from "lunar-typescript";
import { lookupMyeongriTerm } from "./myeongri-knowledge-trilingual";

export type Element = "목" | "화" | "토" | "금" | "수";
export type Gender = "남" | "여";
export type BirthTimeAccuracy = "recorded" | "family_memory" | "estimated" | "unknown";
export interface SajuInput {
  year: number; month: number; day: number;
  hour?: number; minute?: number;
  calendar?: "solar" | "lunar";
  /** 음력 입력이 윤달인지 여부. 양력 입력에서는 무시한다. */
  isLeapMonth?: boolean;
  gender?: Gender;
  /** 시각의 출처. 시각이 있어도 출처가 없으면 정확도를 추정하지 않는다. */
  birthTimeAccuracy?: BirthTimeAccuracy;
  /** Birthplace time-zone metadata. The supplied clock time remains local civil time. */
  timezone?: string;
  /** Birthplace longitude metadata. It is not silently converted to true solar time. */
  longitudeE?: number;
  latitudeN?: number;
  birthplace?: string;
}

/**
 * Validate the civil date before passing it to lunar-typescript.  The library
 * intentionally models supplied calendar fields and does not reject every
 * impossible Gregorian date (for example, 2000-02-30), so callers must not use
 * successful construction as proof that a birth date existed.
 */
export function getBirthDateValidationError(input: Pick<SajuInput, "year" | "month" | "day" | "calendar" | "isLeapMonth">): string | null {
  const { year, month, day, calendar = "solar" } = input;
  if (![year, month, day].every(Number.isInteger)) return "연·월·일은 정수여야 한다.";
  if (year < 1 || year > 9999) return "연도는 1~9999 범위여야 한다.";
  if (month < 1 || month > 12) return "월은 1~12 범위여야 한다.";
  if (day < 1) return "일은 1 이상이어야 한다.";
  if (calendar === "solar") {
    const dayCount = SolarUtil.getDaysOfMonth(year, month);
    return day <= dayCount ? null : `${year}년 ${month}월에는 ${day}일이 없다.`;
  }
  if (calendar !== "lunar") return "calendar는 solar 또는 lunar여야 한다.";

  try {
    const signedMonth = input.isLeapMonth ? -month : month;
    const lunarMonth = LunarYear.fromYear(year).getMonths()
      .find((candidate) => candidate.getYear() === year && candidate.getMonth() === signedMonth);
    if (!lunarMonth) {
      return input.isLeapMonth
        ? `${year}년에는 윤${month}월이 없다.`
        : `${year}년 음력 ${month}월을 찾을 수 없다.`;
    }
    return day <= lunarMonth.getDayCount()
      ? null
      : `${year}년 ${input.isLeapMonth ? "윤" : ""}${month}월에는 ${day}일이 없다.`;
  } catch {
    return "지원되는 음력 날짜가 아니다.";
  }
}

const STEM_EL: Record<string, Element> = { 甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",己:"토",庚:"금",辛:"금",壬:"수",癸:"수" };
const STEM_KO: Record<string, string> = { 甲:"갑",乙:"을",丙:"병",丁:"정",戊:"무",己:"기",庚:"경",辛:"신",壬:"임",癸:"계" };
const BR_EL: Record<string, Element> = { 寅:"목",卯:"목",巳:"화",午:"화",辰:"토",戌:"토",丑:"토",未:"토",申:"금",酉:"금",亥:"수",子:"수" };
const BR_KO: Record<string, string> = { 子:"자",丑:"축",寅:"인",卯:"묘",辰:"진",巳:"사",午:"오",未:"미",申:"신",酉:"유",戌:"술",亥:"해" };
const STEM_YANG = new Set(["甲","丙","戊","庚","壬"]);
const BR_YANG = new Set(["子","寅","辰","午","申","戌"]);
const GEN: Record<Element, Element> = { 목:"화",화:"토",토:"금",금:"수",수:"목" }; // 生
const CTRL: Record<Element, Element> = { 목:"토",토:"수",수:"화",화:"금",금:"목" }; // 剋

const SHISHEN_KO: Record<string, string> = { 比肩:"비견",劫财:"겁재",食神:"식신",伤官:"상관",偏财:"편재",正财:"정재",七杀:"편관(칠살)",正官:"정관",偏印:"편인",正印:"정인",日主:"일주(본인)" };
const DISHI_KO: Record<string, string> = { 长生:"장생",沐浴:"목욕",冠带:"관대",临官:"건록",帝旺:"제왕",衰:"쇠",病:"병",死:"사",墓:"묘",绝:"절",胎:"태",养:"양" };

const EL_COLOR: Record<Element, string> = { 목:"청록(靑·綠)",화:"적(赤·자주)",토:"황(黃·베이지)",금:"백(白·금색)",수:"흑(黑·남색)" };
const EL_DIR: Record<Element, string> = { 목:"동",화:"남",토:"중앙",금:"서",수:"북" };
const EL_JOB: Record<Element, string> = { 목:"교육·기획·출판·디자인·섬유·임업", 화:"IT·방송·요식·전기·예술·마케팅", 토:"부동산·중개·농업·건축·관리·종교", 금:"금융·법조·의료·기계·군경·금속", 수:"유통·무역·수산·물류·연구·유흥" };

function shKo(s: string): string { return SHISHEN_KO[s] ?? s; }
function pillarKo(ganzhi: string): string {
  const g = ganzhi[0], z = ganzhi[1];
  return `${ganzhi}(${STEM_KO[g] ?? g}${BR_KO[z] ?? z})`;
}

export interface SajuPillar { gz: string; gan: string; zhi: string; ganEl: Element; zhiEl: Element; hideGan: string[]; shiShenGan: string; shiShenZhi: string[]; diShi: string; naYin: string; }
export interface SajuChart {
  input: SajuInput;
  solar: string; lunar: string;
  pillars: { year: SajuPillar; month: SajuPillar; day: SajuPillar; time: SajuPillar };
  dayMaster: { gan: string; ko: string; el: Element; yinYang: "양" | "음" };
  xunKong: string[];
  taiYuan: string; mingGong: string; shenGong: string;
  calculationPolicy: {
    calendar: "solar" | "lunar";
    isLeapMonth: boolean;
    birthTimeAccuracy: BirthTimeAccuracy | "unspecified";
  };
}

function mkPillar(gz: string, hide: string[], ssg: string, ssz: string[], dishi: string, nayin: string): SajuPillar {
  const gan = gz[0], zhi = gz[1];
  return { gz, gan, zhi, ganEl: STEM_EL[gan], zhiEl: BR_EL[zhi], hideGan: hide, shiShenGan: shKo(ssg), shiShenZhi: ssz.map(shKo), diShi: DISHI_KO[dishi] ?? dishi, naYin: nayin };
}

/** 생년월일시(+양/음력·성별)로 사주 원국을 결정적 산출한다. */
export function computeSajuChart(input: SajuInput): SajuChart {
  const { year, month, day, hour, minute = 0, calendar = "solar" } = input;
  const dateError = getBirthDateValidationError(input);
  if (dateError) throw new Error(`INVALID_BIRTH_DATE: ${dateError}`);
  if (hour === undefined) {
    throw new Error("BIRTH_TIME_REQUIRED: 단일 사주 원국의 시주를 계산하려면 출생시각이 필요하다. 시간 미상은 computeSajuChartEnvelope를 사용해야 한다.");
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("INVALID_BIRTH_TIME: hour는 0~23, minute은 0~59의 정수여야 한다.");
  }
  const lunarMonth = calendar === "lunar" && input.isLeapMonth ? -Math.abs(month) : month;
  const lunar = calendar === "lunar"
    ? Lunar.fromYmdHms(year, lunarMonth, day, hour, minute, 0)
    : Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const ec = lunar.getEightChar();
  const pillars = {
    year: mkPillar(ec.getYear(), ec.getYearHideGan(), ec.getYearShiShenGan(), ec.getYearShiShenZhi(), ec.getYearDiShi(), ec.getYearNaYin()),
    month: mkPillar(ec.getMonth(), ec.getMonthHideGan(), ec.getMonthShiShenGan(), ec.getMonthShiShenZhi(), ec.getMonthDiShi(), ec.getMonthNaYin()),
    day: mkPillar(ec.getDay(), ec.getDayHideGan(), "日主", ec.getDayShiShenZhi(), ec.getDayDiShi(), ec.getDayNaYin()),
    time: mkPillar(ec.getTime(), ec.getTimeHideGan(), ec.getTimeShiShenGan(), ec.getTimeShiShenZhi(), ec.getTimeDiShi(), ec.getTimeNaYin())
  };
  const dg = ec.getDayGan();
  return {
    input,
    solar: lunar.getSolar().toYmdHms(),
    lunar: lunar.toString(),
    pillars,
    dayMaster: { gan: dg, ko: STEM_KO[dg], el: STEM_EL[dg], yinYang: STEM_YANG.has(dg) ? "양" : "음" },
    xunKong: ec.getDayXunKong().split(""),
    taiYuan: ec.getTaiYuan(), mingGong: ec.getMingGong(), shenGong: ec.getShenGong(),
    calculationPolicy: {
      calendar,
      isLeapMonth: calendar === "lunar" && input.isLeapMonth === true,
      birthTimeAccuracy: input.birthTimeAccuracy ?? "unspecified"
    }
  };
}

/** 오행 분포(가중): 천간 1, 지지본기 월지×3·일지×2·년시지×1.5, 지장간 보조. */
export function analyzeElements(c: SajuChart): { weights: Record<Element, number>; counts: Record<Element, number>; strongest: Element; weakest: Element; missing: Element[] } {
  const w: Record<Element, number> = { 목:0,화:0,토:0,금:0,수:0 };
  const cnt: Record<Element, number> = { 목:0,화:0,토:0,금:0,수:0 };
  const ps = c.pillars;
  const add = (el: Element, x: number) => { w[el] += x; cnt[el] += 1; };
  for (const p of [ps.year, ps.month, ps.day, ps.time]) { add(p.ganEl, 1); }
  add(ps.month.zhiEl, 3); add(ps.day.zhiEl, 2); add(ps.year.zhiEl, 1.5); add(ps.time.zhiEl, 1.5);
  for (const p of [ps.year, ps.month, ps.day, ps.time]) {
    p.hideGan.forEach((h, i) => { if (i > 0 && STEM_EL[h]) w[STEM_EL[h]] += 0.5; });
  }
  const els = Object.keys(w) as Element[];
  const strongest = els.reduce((a, b) => (w[a] >= w[b] ? a : b));
  const weakest = els.reduce((a, b) => (w[a] <= w[b] ? a : b));
  const missing = els.filter((e) => cnt[e] === 0);
  return { weights: w, counts: cnt, strongest, weakest, missing };
}

/** 신강·신약 heuristic(억부 기초). 학파 의존 — isHeuristic. */
export function analyzeStrength(c: SajuChart): { verdict: "신강" | "중화" | "신약"; supportRatio: number; deukRyeong: boolean; isHeuristic: true; note: string } {
  const dm = c.dayMaster.el;
  const printer = (Object.keys(GEN) as Element[]).find((e) => GEN[e] === dm)!; // 인성: dm을 생
  const { weights } = analyzeElements(c);
  const total = (Object.values(weights) as number[]).reduce((a, b) => a + b, 0) || 1;
  const support = weights[dm] + weights[printer];
  const ratio = support / total;
  const monthEl = c.pillars.month.zhiEl;
  const deukRyeong = monthEl === dm || monthEl === printer;
  let verdict: "신강" | "중화" | "신약";
  const adj = ratio + (deukRyeong ? 0.08 : -0.04);
  if (adj >= 0.46) verdict = "신강"; else if (adj <= 0.32) verdict = "신약"; else verdict = "중화";
  return { verdict, supportRatio: Math.round(ratio * 100) / 100, deukRyeong, isHeuristic: true, note: `일간 ${c.dayMaster.ko}(${dm}) 생조세력(비겁+인성) 비중 ${(ratio*100).toFixed(0)}%, 월령 ${deukRyeong ? "득령" : "실령"}` };
}

/** 용신 heuristic(억부+조후). 단일 단정 금지 — 후보 다수 + 근거 + isHeuristic. */
export function pickYongsin(c: SajuChart): { primary: Element[]; avoid: Element[]; method: string; reasoning: string; isHeuristic: true } {
  const dm = c.dayMaster.el;
  const printer = (Object.keys(GEN) as Element[]).find((e) => GEN[e] === dm)!; // 인성
  const child = GEN[dm];        // 식상(설기)
  const wealth = CTRL[dm];       // 재(일간이 극)
  const officer = (Object.keys(CTRL) as Element[]).find((e) => CTRL[e] === dm)!; // 관(일간을 극)
  const st = analyzeStrength(c);
  let primary: Element[]; let avoid: Element[]; let method: string;
  if (st.verdict === "신약") { primary = [printer, dm]; avoid = [officer, wealth]; method = "억부(신약→생조)"; }
  else if (st.verdict === "신강") { primary = [child, wealth, officer]; avoid = [printer, dm]; method = "억부(신강→설·극)"; }
  else { primary = [child, wealth]; avoid = []; method = "억부(중화→흐름 순환)"; }
  // 조후 overlay
  const m = c.pillars.month.zhi;
  let climate = "";
  if (["巳","午","未"].includes(m) && dm !== "수") { if (!primary.includes("수")) primary = ["수", ...primary]; climate = "조후: 여름 출생·조열 → 水로 냉각 우선. "; }
  if (["亥","子","丑"].includes(m) && dm !== "화") { if (!primary.includes("화")) primary = ["화", ...primary]; climate = "조후: 겨울 출생·한랭 → 火로 온난 우선. "; }
  primary = [...new Set(primary)].slice(0, 3);
  return { primary, avoid: [...new Set(avoid)], method, reasoning: `${st.note}. ${climate}${method}으로 용신 후보 도출(${primary.join("·")}). 단일 변수 단정 아님 — 격국·합충 종합 필요.`, isHeuristic: true };
}

const HAP6: Record<string, string> = { 子:"丑",丑:"子",寅:"亥",亥:"寅",卯:"戌",戌:"卯",辰:"酉",酉:"辰",巳:"申",申:"巳",午:"未",未:"午" };
const CHUNG: Record<string, string> = { 子:"午",午:"子",丑:"未",未:"丑",寅:"申",申:"寅",卯:"酉",酉:"卯",辰:"戌",戌:"辰",巳:"亥",亥:"巳" };
const HAE: Record<string, string> = { 子:"未",未:"子",丑:"午",午:"丑",寅:"巳",巳:"寅",卯:"辰",辰:"卯",申:"亥",亥:"申",酉:"戌",戌:"酉" };
const PA: Record<string, string> = { 子:"酉",酉:"子",午:"卯",卯:"午",辰:"丑",丑:"辰",戌:"未",未:"戌",寅:"亥",亥:"寅",巳:"申",申:"巳" };
const SANHAP: [string,string,string,string][] = [["申","子","辰","수국"],["寅","午","戌","화국"],["巳","酉","丑","금국"],["亥","卯","未","목국"]];
const GAN_HAP: Record<string,string> = { 甲:"己",己:"甲",乙:"庚",庚:"乙",丙:"辛",辛:"丙",丁:"壬",壬:"丁",戊:"癸",癸:"戊" };
const GAN_CHUNG: Record<string,string> = { 甲:"庚",庚:"甲",乙:"辛",辛:"乙",丙:"壬",壬:"丙",丁:"癸",癸:"丁" };

/** 원국 4지지·4천간의 합충형파해 탐지. */
export function detectRelations(c: SajuChart): string[] {
  const zhis = [c.pillars.year.zhi, c.pillars.month.zhi, c.pillars.day.zhi, c.pillars.time.zhi];
  const gans = [c.pillars.year.gan, c.pillars.month.gan, c.pillars.day.gan, c.pillars.time.gan];
  const out: string[] = [];
  const pos = ["년","월","일","시"];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if (GAN_HAP[gans[i]] === gans[j]) out.push(`천간합 ${gans[i]}${gans[j]}(${pos[i]}·${pos[j]}간)`);
    if (GAN_CHUNG[gans[i]] === gans[j]) out.push(`천간충 ${gans[i]}${gans[j]}(${pos[i]}·${pos[j]}간)`);
    const a = zhis[i], b = zhis[j];
    if (HAP6[a] === b) out.push(`지지 육합 ${a}${b}(${pos[i]}·${pos[j]}지)`);
    if (CHUNG[a] === b) out.push(`지지 충 ${a}${b}(${pos[i]}·${pos[j]}지)`);
    if (HAE[a] === b) out.push(`해(害) ${a}${b}`);
    if (PA[a] === b) out.push(`파(破) ${a}${b}`);
  }
  // 삼합/반합
  for (const [x, y, z, name] of SANHAP) {
    const has = [x, y, z].filter((q) => zhis.includes(q));
    if (has.length === 3) out.push(`삼합 ${x}${y}${z} ${name}`);
    else if (has.length === 2 && (has.includes(y))) out.push(`반합 ${has.join("")} (${name} 지향)`);
  }
  // 형(삼형·자형)
  const set = zhis;
  if (["寅","巳","申"].every((q)=>set.includes(q))) out.push("삼형 寅巳申(지세지형)");
  if (["丑","戌","未"].every((q)=>set.includes(q))) out.push("삼형 丑戌未(무은지형)");
  if (set.filter((q)=>q==="子").length && set.filter((q)=>q==="卯").length) out.push("상형 子卯(무례지형)");
  for (const q of ["辰","午","酉","亥"]) if (set.filter((x)=>x===q).length>=2) out.push(`자형 ${q}${q}`);
  return [...new Set(out)];
}

const CHEONEUL: Record<string,string[]> = { 甲:["丑","未"],戊:["丑","未"],庚:["丑","未"],乙:["子","申"],己:["子","申"],丙:["亥","酉"],丁:["亥","酉"],壬:["巳","卯"],癸:["巳","卯"],辛:["午","寅"] };
const MUNCHANG: Record<string,string> = { 甲:"巳",乙:"午",丙:"申",丁:"酉",戊:"申",己:"酉",庚:"亥",辛:"子",壬:"寅",癸:"卯" };
const YANGIN: Record<string,string> = { 甲:"卯",丙:"午",戊:"午",庚:"酉",壬:"子" };
const SANHAP_BY_BRANCH: Record<string,string> = {}; // 지지→그 지지가 속한 삼합의 생지 group key
SANHAP.forEach(([a,b,cc])=>{ [a,b,cc].forEach((x)=>{ SANHAP_BY_BRANCH[x]=a; }); });
const YEOKMA: Record<string,string> = { 申:"寅",子:"寅",辰:"寅",寅:"申",午:"申",戌:"申",巳:"亥",酉:"亥",丑:"亥",亥:"巳",卯:"巳",未:"巳" };
const DOHWA: Record<string,string> = { 申:"酉",子:"酉",辰:"酉",寅:"卯",午:"卯",戌:"卯",巳:"午",酉:"午",丑:"午",亥:"子",卯:"子",未:"子" };
const HWAGAE: Record<string,string> = { 申:"辰",子:"辰",辰:"辰",寅:"戌",午:"戌",戌:"戌",巳:"丑",酉:"丑",丑:"丑",亥:"未",卯:"未",未:"未" };
const BAEKHO = new Set(["甲辰","乙未","丙戌","丁丑","戊辰","壬戌","癸丑"]);
const GOEGANG = new Set(["庚辰","庚戌","壬辰","戊戌"]);

/** 핵심 신살(일간·일지/년지 기준 규칙표). 보조 지표 — 단독 사건예언 금지. */
export function deriveSinsal(c: SajuChart): string[] {
  const dg = c.pillars.day.gan, dz = c.pillars.day.zhi, yz = c.pillars.year.zhi, dgz = c.pillars.day.gz;
  const zhis = [c.pillars.year.zhi, c.pillars.month.zhi, c.pillars.day.zhi, c.pillars.time.zhi];
  const out: string[] = [];
  for (const z of zhis) {
    if (CHEONEUL[dg]?.includes(z)) out.push(`천을귀인(${BR_KO[z]})`);
  }
  if (zhis.includes(MUNCHANG[dg])) out.push(`문창귀인(${BR_KO[MUNCHANG[dg]]})`);
  if (YANGIN[dg] && zhis.includes(YANGIN[dg])) out.push(`양인(${BR_KO[YANGIN[dg]]})`);
  for (const base of [yz, dz]) {
    if (zhis.includes(YEOKMA[base])) out.push(`역마(${BR_KO[YEOKMA[base]]})`);
    if (zhis.includes(DOHWA[base])) out.push(`도화(${BR_KO[DOHWA[base]]})`);
    if (zhis.includes(HWAGAE[base])) out.push(`화개(${BR_KO[HWAGAE[base]]})`);
  }
  if (BAEKHO.has(dgz)) out.push("백호대살(일주)");
  if (GOEGANG.has(dgz)) out.push("괴강(일주)");
  for (const k of c.xunKong) if (zhis.includes(k)) out.push(`공망(${BR_KO[k]})`);
  return [...new Set(out)];
}

/** 용신 오행 → 개운(색·방위·계절·직업) + 부족오행 보완. */
export function recommendByYongsin(c: SajuChart): { yongsin: Element[]; colors: string[]; directions: string[]; jobs: string[]; missing: Element[]; advice: string } {
  const ys = pickYongsin(c);
  const { missing } = analyzeElements(c);
  const targets = [...new Set([...ys.primary, ...missing])];
  return {
    yongsin: ys.primary, missing,
    colors: targets.map((e) => `${e}=${EL_COLOR[e]}`),
    directions: targets.map((e) => `${e}=${EL_DIR[e]}쪽`),
    jobs: ys.primary.map((e) => `${e}: ${EL_JOB[e]}`),
    advice: `용신/보완 오행(${targets.join("·")})의 색을 의상·소품에, 방위를 공간 배치·잠자리 머리 방향에 의식적으로 활용. 기피 오행(${ys.avoid.join("·") || "없음"}) 색은 절제. ※ 보조 개운 수단이며 ${ys.method} heuristic.`
  };
}

/** 임의 날짜의 일진 간지 + 절기 위치 + 음양(陰陽) 판정. */
export function yinYangForDate(year: number, month: number, day: number): { date: string; dayGanZhi: string; dayGanYinYang: string; dayBranchYinYang: string; jieQiPhase: string; yangPhase: string; note: string } {
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const gz = lunar.getDayInGanZhi();
  const g = gz[0], z = gz[1];
  const prev = lunar.getPrevJieQi(true); // 직전 절(節/氣)
  const jqName = prev.getName();
  // 동지(冬至)~하지(夏至) = 양 점증, 하지~동지 = 음 점증
  const yangSeason = ["冬至","小寒","大寒","立春","雨水","驚蟄","惊蛰","春分","清明","穀雨","谷雨","立夏","小滿","小满","芒種","芒种"].includes(jqName);
  return {
    date: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,
    dayGanZhi: pillarKo(gz),
    dayGanYinYang: `일간 ${STEM_KO[g]}=${STEM_YANG.has(g) ? "양" : "음"}`,
    dayBranchYinYang: `일지 ${BR_KO[z]}=${BR_YANG.has(z) ? "양" : "음"}`,
    jieQiPhase: `직전 절기: ${jqName}`,
    yangPhase: yangSeason ? "양기 증장기(동지~하지: 一陽生 이후 양 상승)" : "음기 증장기(하지~동지: 一陰生 이후 음 상승)",
    note: `${jqName} 절기 구간. 연중 양음 큰 흐름은 ${yangSeason ? "양기 상승" : "음기 상승"}, 그날의 미시 음양은 일진 ${pillarKo(gz)}의 간지 음양으로 본다(일간 ${STEM_YANG.has(g)?"양":"음"}·일지 ${BR_YANG.has(z)?"양":"음"}). ※ 절기는 입절 실시각 기준이라 날짜 경계일은 시각까지 확인.`
  };
}

/** 두 사주 궁합(일주·일지 합충·용신 상보·띠). */
export function compatibility(a: SajuInput, b: SajuInput): { dayPillarA: string; dayPillarB: string; signals: string[]; note: string } {
  const ca = computeSajuChart(a), cb = computeSajuChart(b);
  const za = ca.pillars.day.zhi, zb = cb.pillars.day.zhi;
  const signals: string[] = [];
  if (HAP6[za] === zb) signals.push(`일지 육합 ${za}${zb} — 친밀·결속`);
  if (CHUNG[za] === zb) signals.push(`일지 충 ${za}${zb} — 변동·긴장(끌림과 충돌 공존)`);
  if (HAE[za] === zb) signals.push(`일지 해 ${za}${zb}`);
  for (const [x,y,z,name] of SANHAP) if ([x,y,z].includes(za) && [x,y,z].includes(zb) && za!==zb) signals.push(`일지 ${name} 삼합계 — 기운 공명`);
  const ysa = pickYongsin(ca).primary, ysb = pickYongsin(cb).primary;
  const aHelpsB = ysb.includes(ca.dayMaster.el), bHelpsA = ysa.includes(cb.dayMaster.el);
  if (aHelpsB) signals.push(`A의 일간 오행(${ca.dayMaster.el})이 B의 용신 — A가 B에 보탬`);
  if (bHelpsA) signals.push(`B의 일간 오행(${cb.dayMaster.el})이 A의 용신 — B가 A에 보탬`);
  return { dayPillarA: pillarKo(ca.pillars.day.gz), dayPillarB: pillarKo(cb.pillars.day.gz), signals: signals.length ? signals : ["뚜렷한 합충 신호 약함 — 일지 외 전체 원국 종합 필요"], note: "일지=배우자궁 중심 1차 신호. 용신 상보는 heuristic. 전체 궁합은 원국·대운 종합." };
}

export { pillarKo, STEM_KO, BR_KO, EL_COLOR, EL_DIR };
export type { };
// vault 연결 헬퍼 재노출(라우터에서 사용)
export function vaultRefsFor(terms: string[]): string[] {
  const refs = new Set<string>();
  for (const t of terms) lookupMyeongriTerm(t, 2).forEach((f) => refs.add(`${f.termKr}(${f.hanja})`));
  return [...refs];
}
