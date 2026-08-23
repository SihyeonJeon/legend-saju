/**
 * Deterministic payload builders for the ChatGPT Apps widgets.
 *
 * Every fact (pillars, elements, verdicts, luck cycle, compatibility signals)
 * is computed here from the engine; the caller (ChatGPT) contributes only
 * clearly-labeled narrative prose and editorial scores. The widgets render
 * this structuredContent verbatim, so the server stays stateless and the
 * model never has to restate calculation data.
 */
import { Lunar, Solar } from "lunar-typescript";
import {
  analyzeElements,
  BR_KO,
  compatibility,
  computeSajuChart,
  deriveSinsal,
  detectRelations,
  type SajuChart,
  type SajuInput,
  STEM_KO,
} from "./engine/saju-engine";
import { currentLuck } from "./engine/saju-engine-advanced";
import { evaluateMyeongriJudgment, type MyeongriJudgment, tenGodForStem } from "./engine/myeongri-judgment";

export const WIDGET_DISCLAIMER = "전통 명리 관법을 결정적으로 계산한 참고용 해석이며, 미래를 보장하거나 단정하지 않는다.";

const EL_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const STRENGTH_LABEL: Record<MyeongriJudgment["strength"]["status"], string> = {
  support_leaning: "신강 경향",
  weak_leaning: "신약 경향",
  contested: "판단 맞섬",
  extreme_structure_candidate: "종격 후보",
};
const PATTERN_STATUS_LABEL: Record<MyeongriJudgment["pattern"]["status"], string> = {
  supported: "성격(成格) 유지",
  contested: "성패 맞섬",
  damaged: "파격 요소 있음",
  unresolved: "미확정",
};

export interface WidgetNarrative {
  headline?: string;
  reading?: string;
}

function birthLabel(input: SajuInput): string {
  const time = input.hour === undefined
    ? "시간 미상"
    : `${String(input.hour).padStart(2, "0")}:${String(input.minute ?? 0).padStart(2, "0")}`;
  const calendar = input.calendar === "lunar" ? (input.isLeapMonth ? "음력 윤달" : "음력") : "양력";
  const gender = input.gender ? ` · ${input.gender}` : "";
  return `${input.year}.${input.month}.${input.day} ${time} (${calendar}${gender})`;
}

function pillarPayload(pillar: SajuChart["pillars"]["year"]) {
  return {
    gan: pillar.gan,
    zhi: pillar.zhi,
    ganKo: STEM_KO[pillar.gan] ?? pillar.gan,
    zhiKo: BR_KO[pillar.zhi] ?? pillar.zhi,
    ganEl: pillar.ganEl,
    zhiEl: pillar.zhiEl,
    shiShenGan: pillar.shiShenGan,
    diShi: pillar.diShi,
  };
}

function dayMasterPayload(chart: SajuChart) {
  const dm = chart.dayMaster;
  return {
    gan: dm.gan,
    el: dm.el,
    label: `${dm.ko}${EL_HANJA[dm.el]}(${dm.gan}${EL_HANJA[dm.el]}) 일간`,
    detail: `${dm.yinYang}의 ${dm.el} 기운 · 일주 ${chart.pillars.day.gz}`,
  };
}

function verdictsPayload(judgment: MyeongriJudgment) {
  const activeLenses = judgment.usefulGods.lenses.filter((lens) => lens.status === "active");
  const yongsinElements = [...new Set(activeLenses.flatMap((lens) => lens.candidateElements))];
  return {
    wangswae: {
      label: STRENGTH_LABEL[judgment.strength.status],
      detail: `월령 ${judgment.strength.monthCommandTenGod} · 통근 ${judgment.strength.sameElementRoots.map((root) => `${root.position}${root.branch}`).join("·") || "없음"}`,
    },
    geokguk: {
      label: judgment.pattern.pattern,
      detail: PATTERN_STATUS_LABEL[judgment.pattern.status],
    },
    yongsin: {
      label: yongsinElements.join("·") || "관법 보류",
      detail: activeLenses.map((lens) => `${lens.school}: ${lens.candidateElements.join("·") || "—"}`).join(" / ") || judgment.usefulGods.boundary,
    },
  };
}

function verdictChips(judgment: MyeongriJudgment): string[] {
  const verdicts = verdictsPayload(judgment);
  return [
    `왕쇠 ${verdicts.wangswae.label}`,
    `격국 ${verdicts.geokguk.label}`,
    `용신 후보 ${verdicts.yongsin.label}`,
  ];
}

/* ── ① 원국 카드 ── */
export function buildNatalCardPayload(birth: SajuInput, narrative?: WidgetNarrative): Record<string, unknown> {
  const chart = computeSajuChart(birth);
  const elements = analyzeElements(chart);
  const judgment = evaluateMyeongriJudgment(chart);
  return {
    widget: "saju-natal-card",
    birthLabel: birthLabel(birth),
    dayMaster: dayMasterPayload(chart),
    pillars: {
      year: pillarPayload(chart.pillars.year),
      month: pillarPayload(chart.pillars.month),
      day: pillarPayload(chart.pillars.day),
      time: pillarPayload(chart.pillars.time),
    },
    elements: {
      weights: Object.fromEntries(Object.entries(elements.weights).map(([el, weight]) => [el, Math.round(weight * 10) / 10])),
      missing: elements.missing,
      hanja: EL_HANJA,
    },
    verdicts: verdictsPayload(judgment),
    sinsal: deriveSinsal(chart),
    relations: detectRelations(chart),
    ...(narrative ? { narrative } : {}),
    disclaimer: WIDGET_DISCLAIMER,
  };
}

/* ── ② 영역별 운세 카드 ── */
export const FORTUNE_DOMAINS = ["총운", "재물운", "연애운", "결혼운", "재회운", "직업운", "건강운", "학업운", "이동운"] as const;
export interface FortuneCardInput {
  domain: (typeof FORTUNE_DOMAINS)[number];
  score?: number;
  text: string;
}

export function buildFortuneCardsPayload(
  birth: SajuInput,
  cards: FortuneCardInput[],
  options: { title?: string; asOfYear?: number; actions?: { title: string; detail?: string }[]; narrative?: WidgetNarrative },
): Record<string, unknown> {
  const chart = computeSajuChart(birth);
  const judgment = evaluateMyeongriJudgment(chart);
  const asOfYear = options.asOfYear ?? new Date().getFullYear();
  const luck = currentLuck(birth, asOfYear);
  return {
    widget: "saju-fortune-cards",
    title: options.title ?? `${asOfYear}년 운세 리포트`,
    birthLabel: birthLabel(birth),
    dayMaster: dayMasterPayload(chart),
    luck: { year: asOfYear, daYun: luck.daYun, daYunAge: luck.daYunAge, seYun: luck.seYun },
    verdictChips: verdictChips(judgment),
    cards: cards.map((card) => ({
      domain: card.domain,
      ...(card.score ? { score: Math.max(1, Math.min(5, Math.round(card.score))) } : {}),
      text: card.text,
    })),
    ...(options.actions?.length ? { actions: options.actions } : {}),
    ...(options.narrative ? { narrative: options.narrative } : {}),
    disclaimer: WIDGET_DISCLAIMER,
  };
}

/* ── ③ 궁합 카드 ── */
function signalType(text: string): string {
  if (text.includes("육합") || text.includes("삼합")) return "합";
  if (text.includes("충")) return "충";
  if (text.includes("형")) return "형";
  if (text.includes("파")) return "파";
  if (text.includes("해 ") || text.startsWith("일지 해")) return "해";
  if (text.includes("보탬")) return "보";
  return "참";
}

export function buildCompatibilityCardPayload(
  birthA: SajuInput,
  birthB: SajuInput,
  options: { nameA?: string; nameB?: string; score?: number; narrative?: WidgetNarrative },
): Record<string, unknown> {
  const chartA = computeSajuChart(birthA);
  const chartB = computeSajuChart(birthB);
  const match = compatibility(birthA, birthB);
  const person = (chart: SajuChart, name: string | undefined, input: SajuInput) => ({
    name: name ?? "",
    dayGan: chart.pillars.day.gan,
    dayZhi: chart.pillars.day.zhi,
    ganEl: chart.dayMaster.el,
    label: `${chart.dayMaster.ko}${EL_HANJA[chart.dayMaster.el]} 일간 · ${birthLabel(input)}`,
  });
  return {
    widget: "saju-compatibility-card",
    personA: person(chartA, options.nameA, birthA),
    personB: person(chartB, options.nameB, birthB),
    ...(options.score ? { score: Math.max(1, Math.min(5, Math.round(options.score))) } : {}),
    signals: match.signals.map((text) => ({ type: signalType(text), text })),
    ...(options.narrative ? { narrative: options.narrative } : {}),
    disclaimer: `${match.note} ${WIDGET_DISCLAIMER}`,
  };
}

/* ── ④ 대운 타임라인 ── */
function seYunFor(year: number): string {
  return Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhi();
}

export function buildLuckTimelinePayload(
  birth: SajuInput,
  options: { asOfYear?: number; focusYear?: number; focusNote?: string; narrative?: WidgetNarrative },
): Record<string, unknown> {
  if (birth.hour === undefined) throw new Error("BIRTH_TIME_REQUIRED: 대운 계산에는 출생시각이 필요하다.");
  if (!birth.gender) throw new Error("GENDER_REQUIRED: 대운 순역 계산에는 성별이 필요하다.");
  const chart = computeSajuChart(birth);
  const asOfYear = options.asOfYear ?? new Date().getFullYear();
  const lunarMonth = birth.calendar === "lunar" && birth.isLeapMonth ? -Math.abs(birth.month) : birth.month;
  const lunar = birth.calendar === "lunar"
    ? Lunar.fromYmdHms(birth.year, lunarMonth, birth.day, birth.hour, birth.minute ?? 0, 0)
    : Solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute ?? 0, 0).getLunar();
  const list = lunar.getEightChar().getYun(birth.gender === "남" ? 1 : 0).getDaYun()
    .filter((dy) => dy.getGanZhi())
    .slice(0, 9);
  const daYun = list.map((dy) => {
    const gz = dy.getGanZhi();
    const current = dy.getStartYear() <= asOfYear && asOfYear <= dy.getEndYear();
    return {
      gz,
      ageRange: `${dy.getStartAge()}~${dy.getEndAge()}세`,
      years: `${dy.getStartYear()}~${dy.getEndYear()}`,
      tenGod: gz[0] ? `천간 ${tenGodForStem(chart.dayMaster.gan, gz[0])}` : "",
      current,
    };
  });
  return {
    widget: "saju-luck-timeline",
    birthLabel: birthLabel(birth),
    dayMaster: dayMasterPayload(chart),
    asOfYear,
    seYun: seYunFor(asOfYear),
    daYun,
    ...(options.focusYear ? {
      focus: {
        year: options.focusYear,
        seYun: seYunFor(options.focusYear),
        ...(options.focusNote ? { note: options.focusNote } : {}),
      },
    } : {}),
    ...(options.narrative ? { narrative: options.narrative } : {}),
    disclaimer: WIDGET_DISCLAIMER,
  };
}
