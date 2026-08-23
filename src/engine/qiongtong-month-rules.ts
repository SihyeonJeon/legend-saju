/**
 * Exact day-stem x month-branch doctrine crosswalk compiled from 窮通寶鑑.
 *
 * A cell records only the stems that the matching month clause asks the reader
 * to inspect.  It does not turn a lookup cell into a final yongsin verdict.
 * Slash-separated groups mean primary / support / conditional inspection.
 * Some source clauses cover two or three months together; that provenance is
 * retained instead of pretending that the book supplied twelve isolated rows.
 */

export type QiongtongSourceGranularity = "individual_month_clause" | "grouped_month_clause" | "intra_month_phase_clause";

export interface QiongtongMonthRule {
  id: string;
  dayStem: string;
  monthBranch: string;
  /** Jian-month ordinal from 寅=1 through 丑=12; not a civil lunar-month input. */
  monthOrdinal: number;
  monthLabel: string;
  primary: string[];
  support: string[];
  conditional: string[];
  inspectStems: string[];
  section: string;
  sourceGranularity: QiongtongSourceGranularity;
  phaseNote?: string;
  normalizedPrinciple: string;
}

const MONTHS = [
  { branch: "寅", monthOrdinal: 1, label: "정월" },
  { branch: "卯", monthOrdinal: 2, label: "이월" },
  { branch: "辰", monthOrdinal: 3, label: "삼월" },
  { branch: "巳", monthOrdinal: 4, label: "사월" },
  { branch: "午", monthOrdinal: 5, label: "오월" },
  { branch: "未", monthOrdinal: 6, label: "유월" },
  { branch: "申", monthOrdinal: 7, label: "칠월" },
  { branch: "酉", monthOrdinal: 8, label: "팔월" },
  { branch: "戌", monthOrdinal: 9, label: "구월" },
  { branch: "亥", monthOrdinal: 10, label: "시월" },
  { branch: "子", monthOrdinal: 11, label: "십일월" },
  { branch: "丑", monthOrdinal: 12, label: "십이월" }
] as const;

/** primary/support/conditional. Order inside a group is retained. */
const MONTH_MATRIX: Record<string, readonly string[]> = {
  甲: ["丙/癸", "庚/丙丁戊/己癸", "庚/壬/丁癸", "癸/丁/庚壬", "癸/丁庚/壬", "丁/庚/癸", "丁/庚/甲壬戊癸", "丁/丙庚/癸", "丁/壬癸庚/戊己", "庚丁/丙/戊壬", "丁/庚丙/戊己癸壬", "庚/丁"],
  乙: ["丙/癸", "丙/癸/庚戊", "癸/丙/戊己庚辛壬", "癸/辛庚/丙戊", "癸/丙/庚辛", "丙/癸", "己/丙癸/庚", "癸丙//丁", "癸/辛/壬戊", "丙/戊/壬癸甲", "丙//戊壬癸", "丙//戊壬癸"],
  丙: ["壬/庚/戊", "壬/己庚辛/丁", "壬/甲庚/戊", "壬/庚/癸戊", "壬/庚/戊己丁", "壬/庚/戊己丁", "壬/戊/甲", "壬/癸/戊", "甲/壬癸/庚戊", "甲戊/庚壬/辛", "壬/戊/己", "壬/甲/己"],
  丁: ["庚/甲/壬癸己", "庚/甲/乙", "甲/庚/戊", "甲庚/壬/癸戊", "壬/庚癸/甲", "甲/壬庚", "甲/庚丙/壬癸戊", "甲丙庚//壬癸戊", "甲庚//壬癸戊", "甲/庚/癸戊丙壬", "甲/庚/癸戊丙壬", "甲/庚/癸戊丙壬"],
  戊: ["丙/甲/癸", "丙/甲/癸", "甲/丙/癸", "甲/丙癸", "壬/甲/丙癸", "癸/丙甲", "丙/癸/甲", "丙/癸", "甲/癸/丙", "甲/丙", "丙/甲/壬", "丙/甲/壬"],
  己: ["丙/庚甲癸/戊壬", "甲/癸/丙", "丙/癸/甲庚", "癸/丙/辛戊壬", "癸/丙/辛戊壬", "癸/丙/辛戊壬", "癸/丙辛/甲", "癸/丙辛", "癸/丙甲辛/戊", "丙/甲/戊壬", "丙/甲/戊壬丁", "丙/甲/戊壬丁"],
  庚: ["丙/甲/丁壬戊", "丁/甲/庚丙", "甲/丁/壬癸", "壬/戊/丙丁", "壬/癸/戊己", "丁/甲/癸", "丁/甲", "丁甲/丙", "甲/壬/己", "丁/丙/己", "丁甲/丙", "丙/丁甲"],
  辛: ["己/壬/庚丙", "壬/甲/戊己", "壬/甲", "壬/甲癸/丙丁戊", "壬己/癸/丁", "壬/庚/甲戊", "壬/甲/戊", "壬/甲/戊己", "壬/甲/戊己", "壬/丙", "壬丙/戊甲/癸", "丙/壬/戊己癸"],
  壬: ["庚/丙戊", "戊/辛庚", "甲/庚/癸", "壬/辛庚癸/甲", "癸/庚辛", "辛/甲癸", "戊/丁", "甲//庚戊", "甲/丙/戊", "戊/庚丙/甲", "戊/丙", "丙/甲丁"],
  癸: ["辛/丙", "庚/辛/丁己", "丙/辛甲", "辛/庚壬/丁", "庚辛/壬癸/丁", "庚辛/壬癸/丁", "丁/甲", "辛/丙/戊己", "辛/甲癸/戊", "庚辛/戊/丁", "丙/辛/壬癸", "丙/壬/戊丁"]
};

const GROUPED_SOURCE_KEYS = new Set([
  "乙-丑",
  "丁-亥", "丁-子", "丁-丑",
  "戊-寅", "戊-卯", "戊-子", "戊-丑",
  "己-巳", "己-午", "己-未", "己-申", "己-酉", "己-亥", "己-子", "己-丑"
]);

const PHASE_NOTES: Record<string, string> = {
  "乙-午": "오월 상반은 계수를 앞세우고, 하반은 병화·계수를 함께 확인한다.",
  "乙-酉": "백로 뒤와 추분 뒤의 온도 차이 때문에 계수·병화의 순서가 달라진다.",
  "癸-辰": "청명 뒤와 곡우 뒤를 나누며, 곡우 뒤에는 신금·갑목 보조를 더 확인한다.",
  "癸-未": "미월 상반과 하반의 금기 세력이 달라 비겁 보조 필요성이 달라진다.",
  "壬-丑": "축월 상반과 하반의 사령 차이를 나누되 양쪽 모두 병화 조후를 확인한다."
};

function uniqueStems(value: string): string[] {
  return [...new Set([...value].filter((stem) => "甲乙丙丁戊己庚辛壬癸".includes(stem)))];
}

function decodeGroups(encoded: string): [string[], string[], string[]] {
  const [primary = "", support = "", conditional = ""] = encoded.split("/");
  const primaryStems = uniqueStems(primary);
  const supportStems = uniqueStems(support).filter((stem) => !primaryStems.includes(stem));
  const conditionalStems = uniqueStems(conditional).filter((stem) => !primaryStems.includes(stem) && !supportStems.includes(stem));
  return [primaryStems, supportStems, conditionalStems];
}

function seasonForBranch(branch: string): string {
  if (["寅", "卯", "辰"].includes(branch)) return "삼춘";
  if (["巳", "午", "未"].includes(branch)) return "삼하";
  if (["申", "酉", "戌"].includes(branch)) return "삼추";
  return "삼동";
}

export const QIONGTONG_MONTH_RULES: QiongtongMonthRule[] = Object.entries(MONTH_MATRIX).flatMap(([dayStem, cells]) => {
  if (cells.length !== MONTHS.length) throw new Error(`QTB_MONTH_CELL_COUNT:${dayStem}:${cells.length}`);
  return cells.map((encoded, index) => {
    const month = MONTHS[index];
    const key = `${dayStem}-${month.branch}`;
    const [primary, support, conditional] = decodeGroups(encoded);
    if (!primary.length) throw new Error(`QTB_MONTH_PRIMARY_EMPTY:${key}`);
    const phaseNote = PHASE_NOTES[key];
    const sourceGranularity: QiongtongSourceGranularity = phaseNote
      ? "intra_month_phase_clause"
      : GROUPED_SOURCE_KEYS.has(key)
        ? "grouped_month_clause"
        : "individual_month_clause";
    const primaryText = primary.join("·");
    const supportText = support.length ? `, 보조로 ${support.join("·")}` : "";
    const conditionalText = conditional.length ? `, 조건군으로 ${conditional.join("·")}` : "";
    return {
      id: `QTB-MONTH-${dayStem}-${month.branch}-V1`,
      dayStem,
      monthBranch: month.branch,
      monthOrdinal: month.monthOrdinal,
      monthLabel: month.label,
      primary,
      support,
      conditional,
      inspectStems: uniqueStems(`${primary.join("")}${support.join("")}${conditional.join("")}`),
      section: `논${dayStem}·${seasonForBranch(month.branch)}${dayStem}·${month.label}${dayStem}`,
      sourceGranularity,
      phaseNote,
      normalizedPrinciple: `${month.label} ${dayStem}은 ${primaryText}을 우선 확인하고${supportText}${conditionalText}의 상태를 함께 대조한다.`
    };
  });
});

if (QIONGTONG_MONTH_RULES.length !== 120) throw new Error(`QTB_MONTH_RULE_TOTAL:${QIONGTONG_MONTH_RULES.length}`);
if (new Set(QIONGTONG_MONTH_RULES.map((rule) => `${rule.dayStem}-${rule.monthBranch}`)).size !== 120) {
  throw new Error("QTB_MONTH_RULE_DUPLICATE");
}

export function findQiongtongMonthRule(dayStem: string, monthBranch: string): QiongtongMonthRule | undefined {
  return QIONGTONG_MONTH_RULES.find((rule) => rule.dayStem === dayStem && rule.monthBranch === monthBranch);
}
