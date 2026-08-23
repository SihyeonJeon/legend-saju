import sourceComparisonJson from "./data/kumazaki-81-source-comparison.json";
import type { FiveGridValue } from "./five-grid";

export interface Suri81SourceEntry {
  number: number;
  primary1930: {
    direction: string;
    printedPage: number;
    ndlCanvas: number;
    canvasUri: string;
    imageUri: string;
    reviewStatus: "primary_scan_direction_and_core_motif_reviewed";
  };
  authorRestatement1939: {
    summaryKo: string;
    ndlPage: number;
    pageUri: string;
    sourceTextMode: "non_verbatim_korean_paraphrase";
    reviewStatus: "concise_table_scan_and_ndl_ocr_reviewed";
  };
  laterKoreanLineage: {
    fortune: string;
    name: string;
    meaning: string;
    primaryHeading: false;
  };
  comparison: {
    status: "broadly_aligned" | "broadly_aligned_but_condition_sensitive" | "later_summary_conflicts_with_primary_condition";
    conditionNote: string | null;
    primaryToAuthorRestatement: "direction_and_core_motif_consistent";
    localAuditStatus: string;
  };
}

interface Suri81SourceDataset {
  schemaVersion: number;
  status: "source_bounded_non_aggregate_interpretation";
  generatedAt: string;
  sources: Record<string, unknown>;
  reductionRule: {
    status: "primary_verified";
    rule: string;
    primary1930PrintedPage: number;
    primary1930NdlCanvas: number;
    authorRestatement1939NdlPage: number;
  };
  boundaries: string[];
  entries: Suri81SourceEntry[];
}

const DATA = sourceComparisonJson as unknown as Suri81SourceDataset;

if (DATA.entries.length !== 81 || DATA.entries.some((entry, index) => entry.number !== index + 1)) {
  throw new Error("SURI81_RUNTIME_DATA_INVALID");
}

const BY_NUMBER = new Map(DATA.entries.map((entry) => [entry.number, entry]));

export interface Suri81Lookup {
  inputNumber: number;
  reduced81: number;
  reductionApplied: boolean;
  entry: Suri81SourceEntry;
  aggregateVerdict: null;
  boundaries: string[];
}

export interface FiveGridSuri81Interpretation {
  status: "source_bounded_non_aggregate_interpretation";
  grids: Array<FiveGridValue & { sourceComparison: Suri81SourceEntry }>;
  aggregateVerdict: null;
  sources: Record<string, unknown>;
  boundaries: string[];
}

/** 원전이 밝힌 81 초과 수의 80 감산 환원만 수행한다. */
export function reduceToSuri81(value: number): number {
  if (!Number.isInteger(value) || value < 1) throw new Error("SURI81_NUMBER_INVALID");
  let reduced = value;
  while (reduced > 81) reduced -= 80;
  return reduced;
}

/** 한 수의 원전·저자 재서술·후대 한국어 계열을 병렬로 돌려준다. */
export function lookupSuri81(value: number): Suri81Lookup {
  const reduced81 = reduceToSuri81(value);
  const entry = BY_NUMBER.get(reduced81);
  if (!entry) throw new Error(`SURI81_ROW_MISSING_${reduced81}`);
  return {
    inputNumber: value,
    reduced81,
    reductionApplied: value !== reduced81,
    entry,
    aggregateVerdict: null,
    boundaries: [...DATA.boundaries],
  };
}

/** 다섯 격마다 대응 수를 붙이되 격 사이의 합산 등급은 만들지 않는다. */
export function interpretFiveGridSuri81(grids: FiveGridValue[]): FiveGridSuri81Interpretation {
  return {
    status: DATA.status,
    grids: grids.map((grid) => ({
      ...grid,
      sourceComparison: lookupSuri81(grid.rawStrokeTotal).entry,
    })),
    aggregateVerdict: null,
    sources: { ...DATA.sources },
    boundaries: [...DATA.boundaries],
  };
}

export function getSuri81SourceSummary() {
  return {
    schemaVersion: DATA.schemaVersion,
    status: DATA.status,
    generatedAt: DATA.generatedAt,
    entryCount: DATA.entries.length,
    sources: { ...DATA.sources },
    reductionRule: { ...DATA.reductionRule },
    boundaries: [...DATA.boundaries],
  };
}
