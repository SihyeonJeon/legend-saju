/**
 * 사주 엔진 심화 모듈 — 십이신살·조후·진태양시 보정·현재 대운/세운·격국 판정.
 * saju-engine(기본)·lunar-typescript 위에 결정적/원리기반 분석을 추가한다.
 */
import { Lunar, Solar } from "lunar-typescript";
import { computeSajuChart, type SajuChart, type SajuInput, type Element } from "./saju-engine";

const BR_ORDER = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BR_KO: Record<string,string> = { 子:"자",丑:"축",寅:"인",卯:"묘",辰:"진",巳:"사",午:"오",未:"미",申:"신",酉:"유",戌:"술",亥:"해" };
const STEM_EL: Record<string, Element> = { 甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",己:"토",庚:"금",辛:"금",壬:"수",癸:"수" };
// 삼합 생지(生支): 申子辰→申, 寅午戌→寅, 巳酉丑→巳, 亥卯未→亥
const SANHAP_SAENGJI: Record<string,string> = { 申:"申",子:"申",辰:"申", 寅:"寅",午:"寅",戌:"寅", 巳:"巳",酉:"巳",丑:"巳", 亥:"亥",卯:"亥",未:"亥" };
const SINSAL12 = ["겁살","재살","천살","지살","년살(도화)","월살","망신","장성","반안","역마","육해","화개"];

/** 십이신살(十二神煞) — 삼합국 기준. 기준지지(년지/일지)의 삼합 생지에서 겁살=(생지+9)%12. */
export function deriveTwelveSinsal(c: SajuChart, base: "year" | "day" = "year"): Record<string, string> {
  const baseZhi = base === "year" ? c.pillars.year.zhi : c.pillars.day.zhi;
  const saengji = SANHAP_SAENGJI[baseZhi];
  const saengIdx = BR_ORDER.indexOf(saengji);
  const gyeobIdx = (saengIdx + 9) % 12; // 겁살 위치
  const branchToSinsal: Record<string, string> = {};
  for (let i = 0; i < 12; i++) branchToSinsal[BR_ORDER[(gyeobIdx + i) % 12]] = SINSAL12[i];
  const out: Record<string, string> = {};
  const ps = [["년", c.pillars.year.zhi], ["월", c.pillars.month.zhi], ["일", c.pillars.day.zhi], ["시", c.pillars.time.zhi]] as const;
  for (const [pos, z] of ps) out[`${pos}지 ${BR_KO[z]}`] = branchToSinsal[z];
  return out;
}

/** 조후(調候) 원리 방향 — 월지 계절의 한난조습으로 1차 조후 오행을 도출(궁통보감 핵심). */
export function johooDirection(c: SajuChart): { season: string; need: Element[]; reason: string; isPrincipled: true } {
  const m = c.pillars.month.zhi;
  let season: string; let need: Element[]; let reason: string;
  if (["亥","子","丑"].includes(m)) { season = "겨울(한랭)"; need = ["화", "목"]; reason = "겨울 출생은 한기가 강해 火(온기)가 조후의 핵심, 木이 火를 돕는다."; }
  else if (["巳","午","未"].includes(m)) { season = "여름(조열)"; need = ["수", "금"]; reason = "여름 출생은 조열해 水(윤기)가 조후의 핵심, 金이 水의 근원이 된다."; }
  else if (["寅","卯","辰"].includes(m)) { season = "봄(목왕)"; need = ["화", "금"]; reason = "봄은 목기가 왕성해 火로 설기·金으로 다듬어 균형을 잡는다."; }
  else { season = "가을(금왕)"; need = ["화", "수"]; reason = "가을은 금기가 강해 火로 단련하고 水로 흐름을 틔운다."; }
  return { season, need, reason, isPrincipled: true };
}

/** 진태양시 보정 — 표준 자오선 대비 경도차 ×4분(+근사 균시차). KST 자오선 135°E 기본. */
export function trueSolarTime(hour: number, minute: number, longitudeE: number, meridianE = 135, month = 6): { adjHour: number; adjMinute: number; deltaMin: number; note: string } {
  const lonCorr = (longitudeE - meridianE) * 4; // 분
  // 균시차 근사(월 기준 대표값, ±16분 범위)
  const eot = [-3, -13, -8, 4, 3, -1, -6, -3, 7, 16, 14, 4][(month - 1 + 12) % 12];
  const delta = lonCorr + eot;
  let total = hour * 60 + minute + delta;
  total = ((total % 1440) + 1440) % 1440;
  const adjHour = Math.floor(total / 60), adjMinute = Math.round(total % 60);
  return { adjHour, adjMinute, deltaMin: Math.round(delta), note: `경도보정 ${Math.round(lonCorr)}분 + 균시차근사 ${eot}분 = ${Math.round(delta)}분. 표준시 ${hour}:${String(minute).padStart(2,"0")} → 진태양시 ${adjHour}:${String(adjMinute).padStart(2,"0")}. 시주(時柱) 경계일 때 영향.` };
}

/** 진태양시로 보정한 원국(출생지 경도 입력). */
export function computeChartTrueSolar(input: SajuInput, longitudeE: number, meridianE = 135): SajuChart {
  if (input.hour === undefined) {
    throw new Error("BIRTH_TIME_REQUIRED: 진태양시 보정에는 출생시각이 필요하다.");
  }
  const t = trueSolarTime(input.hour, input.minute ?? 0, longitudeE, meridianE, input.month);
  return computeSajuChart({ ...input, hour: t.adjHour, minute: t.adjMinute });
}

/** 현재(또는 지정 연도) 대운·세운. */
export function currentLuck(input: SajuInput, asOfYear: number): { daYun: string; daYunAge: string; seYun: string; note: string } {
  if (input.hour === undefined) {
    throw new Error("BIRTH_TIME_REQUIRED: 대운 시작 시점 계산에는 출생시각이 필요하다.");
  }
  if (!input.gender) {
    throw new Error("GENDER_REQUIRED: 대운 순역 계산에는 성별이 필요하다.");
  }
  const lunarMonth = input.calendar === "lunar" && input.isLeapMonth ? -Math.abs(input.month) : input.month;
  const lunar = (input.calendar === "lunar")
    ? Lunar.fromYmdHms(input.year, lunarMonth, input.day, input.hour, input.minute ?? 0, 0)
    : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute ?? 0, 0).getLunar();
  const ec = lunar.getEightChar();
  const yun = ec.getYun(input.gender === "남" ? 1 : 0);
  const list = yun.getDaYun();
  let cur = list[0];
  for (const dy of list) { if (dy.getStartYear() <= asOfYear) cur = dy; }
  const seYun = Solar.fromYmd(asOfYear, 6, 1).getLunar().getYearInGanZhi();
  return { daYun: cur.getGanZhi(), daYunAge: `${cur.getStartAge()}~${cur.getEndAge()}세`, seYun, note: `${asOfYear}년 기준 대운 ${cur.getGanZhi()}(${cur.getStartAge()}세~) · 세운 ${seYun}. 대운=10년 무대, 세운=당해 방아쇠.` };
}

/** 격국 1차 판정 — 월지 본기/지장간이 천간 투출하면 그 십성격, 아니면 월지 본기 십성. */
export function judgeGeokguk(c: SajuChart): { geok: string; basis: string; isHeuristic: true } {
  const monthHide = c.pillars.month.hideGan; // [여기,중기,정기] 순
  const gans = [c.pillars.year.gan, c.pillars.month.gan, c.pillars.time.gan];
  const dayGan = c.pillars.day.gan;
  // lunar-typescript getHideGan은 본기-first 순서([본기,중기,여기]) — 본기 우선 투출 검사
  const ordered = monthHide;
  let chosen = ordered[0];
  for (const h of ordered) { if (gans.includes(h)) { chosen = h; break; } }
  const ss = shishen(dayGan, chosen);
  // 일간과 월지 본기 동일 오행이면 건록/양인 계열
  let geok = `${ss}격`;
  if (STEM_EL[chosen] === STEM_EL[dayGan]) geok = "건록/양인 계열(월지 비겁)";
  return { geok, basis: `월지(${c.pillars.month.zhi}) 지장간 ${monthHide.join("")} 중 ${chosen} 기준, 일간 ${dayGan}과의 십성=${ss}`, isHeuristic: true };
}

const GEN: Record<Element, Element> = { 목:"화",화:"토",토:"금",금:"수",수:"목" };
const CTRL: Record<Element, Element> = { 목:"토",토:"수",수:"화",화:"금",금:"목" };
const YANG = new Set(["甲","丙","戊","庚","壬"]);
function shishen(day: string, other: string): string {
  const de = STEM_EL[day], oe = STEM_EL[other];
  const same = YANG.has(day) === YANG.has(other);
  if (de === oe) return same ? "비견" : "겁재";
  if (GEN[de] === oe) return same ? "식신" : "상관";
  if (CTRL[de] === oe) return same ? "편재" : "정재";
  if (CTRL[oe] === de) return same ? "편관(칠살)" : "정관";
  return same ? "편인" : "정인";
}
