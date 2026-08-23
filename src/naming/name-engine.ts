import supportJson from "./data/name-hanja-support.json";
import { interpretFiveGridSuri81, type FiveGridSuri81Interpretation } from "./eighty-one-numbers";
import { calculateFiveGrid, type FiveGridCalculation } from "./five-grid";

interface UnicodeObservation {
  definition?: string;
  hangul?: string;
  koreanRomanization?: string;
  koreanEducationListYear?: string;
  unicodeKoreanNameListYear?: string;
  phoneticClass?: string;
  radicalStroke?: string;
  totalStrokes?: string;
  alternateTotalStrokes?: string;
  compatibilityVariant?: string;
  semanticVariant?: string;
  simplifiedVariant?: string;
  specializedSemanticVariant?: string;
  traditionalVariant?: string;
  zVariant?: string;
}

interface GraphicalDecomposition {
  type: string;
  immediateComponents: string[];
  components: string[];
  raw: string;
}

interface NameHanjaRecord {
  codeHex: string;
  character: string | null;
  portableUnicode: boolean;
  officialReadings: string[];
  nameMeaningLabels: string[];
  dictionaryLabels: string[];
  courtLookupStrokeCounts: number[];
  unicode?: UnicodeObservation;
  graphical?: GraphicalDecomposition;
}

interface NameHanjaDataset {
  schemaVersion: number;
  status: string;
  generatedAt: string;
  sources: Record<string, unknown>;
  boundaries: string[];
  counts: Record<string, number>;
  entries: NameHanjaRecord[];
  componentMetadata: Record<string, UnicodeObservation>;
}

const DATA = supportJson as unknown as NameHanjaDataset;
const BY_CHARACTER = new Map(DATA.entries.filter((entry) => entry.character).map((entry) => [entry.character as string, entry]));
const BY_CODE = new Map(DATA.entries.map((entry) => [entry.codeHex, entry]));

export type ReadingCheckStatus = "not_checked" | "exact_match" | "initial_sound_exception_review_required" | "mismatch";

export interface NameCharacterInput {
  character?: string;
  courtCodeHex?: string;
  expectedReading?: string;
  declaredStrokeCount?: number;
}

export interface KoreanNameInput {
  surname: NameCharacterInput[];
  givenName: NameCharacterInput[];
  declaredStrokeStandard?: string;
}

export interface NameCharacterAnalysis {
  input: NameCharacterInput;
  identity: {
    status: "official_eligible" | "not_found_in_snapshot";
    codeHex: string | null;
    character: string | null;
    portableUnicode: boolean | null;
    sourceId: "korean-efamily-name-hanja";
  };
  reading: {
    expected: string | null;
    official: string[];
    status: ReadingCheckStatus;
    note: string;
  };
  officialLabels: {
    nameMeanings: string[];
    dictionary: string[];
  };
  strokes: {
    courtLookupCandidates: number[];
    courtLookupStatus: "single" | "ambiguous" | "unavailable";
    unicodeTotalStrokes: string | null;
    unicodeAlternateTotalStrokes: string | null;
    selectedForFiveGrid: null;
    boundary: string;
  };
  unicode: UnicodeObservation | null;
  paja: {
    status: "graphical_observation" | "unavailable";
    arrangementCode: string | null;
    immediateComponents: string[];
    resolvedComponents: Array<{ character: string; unicode: UnicodeObservation | null }>;
    rawDecomposition: string | null;
    semanticClaim: false;
    fortuneClaim: false;
    sourceId: "amake-cjk-decomp-c29b391";
    boundary: string;
  };
}

export interface KoreanNameAnalysis {
  engine: {
    id: "offhands-korean-name-engine-v1";
    separateFromSaju: true;
    datasetGeneratedAt: string;
    sources: Record<string, unknown>;
  };
  surname: NameCharacterAnalysis[];
  givenName: NameCharacterAnalysis[];
  legalIdentityStatus: "all_official_eligible" | "contains_unresolved_character";
  fiveGrid: FiveGridCalculation | {
    status: "not_run_missing_declared_strokes" | "not_run_missing_stroke_standard" | "not_run_unsupported_name_length";
    boundary: string;
  };
  eightyOneNumbers: FiveGridSuri81Interpretation | {
    status: "not_run_without_five_grid";
    boundary: string;
  };
  aggregateVerdict: null;
  readyForNaming: false;
  boundaries: string[];
}

function normalizeCodeHex(input: string): string {
  const value = input.trim().replace(/^U\+/iu, "").replace(/^0x/iu, "").toUpperCase();
  if (!/^[0-9A-F]{4,6}$/u.test(value)) throw new Error(`INVALID_CODE_HEX:${input}`);
  return value.padStart(4, "0");
}

function resolveRecord(input: NameCharacterInput): NameHanjaRecord | undefined {
  if (input.character !== undefined) {
    if ([...input.character].length !== 1) throw new Error(`NAME_CHARACTER_MUST_BE_ONE_UNICODE_SCALAR:${input.character}`);
    return BY_CHARACTER.get(input.character);
  }
  if (input.courtCodeHex !== undefined) return BY_CODE.get(normalizeCodeHex(input.courtCodeHex));
  throw new Error("NAME_CHARACTER_OR_COURT_CODE_REQUIRED");
}

function readingCheck(expectedReading: string | undefined, official: string[]): Pick<NameCharacterAnalysis["reading"], "expected" | "status" | "note"> {
  if (!expectedReading?.trim()) return { expected: null, status: "not_checked", note: "기대 독음을 받지 않아 지정 음 일치 검사를 하지 않았다." };
  const expected = expectedReading.trim();
  if (official.includes(expected)) return { expected, status: "exact_match", note: "대법원 스냅샷의 지정 음과 정확히 일치한다." };
  if (official.some(hasNieunOrRieulInitial)) {
    return {
      expected,
      status: "initial_sound_exception_review_required",
      note: "지정 음의 첫소리가 니은 또는 리을이다. 두음법칙 허용 여부는 실제 발음과 최신 법원 조회에서 확인해야 한다.",
    };
  }
  return { expected, status: "mismatch", note: "대법원 스냅샷의 지정 음과 일치하지 않는다." };
}

function hasNieunOrRieulInitial(reading: string): boolean {
  const firstCodePoint = [...reading][0]?.codePointAt(0);
  if (firstCodePoint === undefined || firstCodePoint < 0xAC00 || firstCodePoint > 0xD7A3) return false;
  const initialIndex = Math.floor((firstCodePoint - 0xAC00) / 588);
  return initialIndex === 2 || initialIndex === 5;
}

function componentMetadata(character: string): UnicodeObservation | null {
  const ownRecord = BY_CHARACTER.get(character)?.unicode;
  if (ownRecord) return ownRecord;
  if ([...character].length !== 1) return null;
  const codeHex = character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0");
  return codeHex ? DATA.componentMetadata[codeHex] ?? null : null;
}

export function lookupNameHanja(characterOrCode: string): NameHanjaRecord | null {
  if ([...characterOrCode].length === 1) return BY_CHARACTER.get(characterOrCode) ?? null;
  return BY_CODE.get(normalizeCodeHex(characterOrCode)) ?? null;
}

export function analyzeNameCharacter(input: NameCharacterInput): NameCharacterAnalysis {
  const record = resolveRecord(input);
  const officialReadings = record?.officialReadings ?? [];
  const reading = readingCheck(input.expectedReading, officialReadings);
  const lookupStrokes = record?.courtLookupStrokeCounts ?? [];
  const graphical = record?.graphical;
  return {
    input: { ...input },
    identity: {
      status: record ? "official_eligible" : "not_found_in_snapshot",
      codeHex: record?.codeHex ?? null,
      character: record?.character ?? input.character ?? null,
      portableUnicode: record?.portableUnicode ?? null,
      sourceId: "korean-efamily-name-hanja",
    },
    reading: { ...reading, official: officialReadings },
    officialLabels: {
      nameMeanings: record?.nameMeaningLabels ?? [],
      dictionary: record?.dictionaryLabels ?? [],
    },
    strokes: {
      courtLookupCandidates: lookupStrokes,
      courtLookupStatus: lookupStrokes.length > 1 ? "ambiguous" : lookupStrokes.length === 1 ? "single" : "unavailable",
      unicodeTotalStrokes: record?.unicode?.totalStrokes ?? null,
      unicodeAlternateTotalStrokes: record?.unicode?.alternateTotalStrokes ?? null,
      selectedForFiveGrid: null,
      boundary: "법원 조회 획수와 Unicode 총획을 관찰값으로 병렬 보존하며 어느 값도 수리용 원획으로 자동 선택하지 않는다.",
    },
    unicode: record?.unicode ?? null,
    paja: {
      status: graphical ? "graphical_observation" : "unavailable",
      arrangementCode: graphical?.type ?? null,
      immediateComponents: graphical?.immediateComponents ?? [],
      resolvedComponents: (graphical?.components ?? []).map((character) => ({ character, unicode: componentMetadata(character) })),
      rawDecomposition: graphical?.raw ?? null,
      semanticClaim: false,
      fortuneClaim: false,
      sourceId: "amake-cjk-decomp-c29b391",
      boundary: "구성요소와 배치만 보여 준다. 이 자료만으로 어원, 자원오행, 성격, 길흉을 판정하지 않는다.",
    },
  };
}

function calculateOptionalFiveGrid(input: KoreanNameInput): KoreanNameAnalysis["fiveGrid"] {
  if (input.surname.length > 2 || input.givenName.length > 2 || input.surname.length < 1 || input.givenName.length < 1) {
    return { status: "not_run_unsupported_name_length", boundary: "이 유파의 구현은 한두 글자 성과 한두 글자 이름만 계산한다." };
  }
  const all = [...input.surname, ...input.givenName];
  if (all.some((entry) => entry.declaredStrokeCount === undefined)) {
    return { status: "not_run_missing_declared_strokes", boundary: "법원·Unicode 획수를 자동 채택하지 않는다. 모든 글자의 유파별 원획을 사용자가 밝혀야 한다." };
  }
  if (!input.declaredStrokeStandard?.trim()) {
    return { status: "not_run_missing_stroke_standard", boundary: "획수 자전 또는 유파를 밝히지 않은 수리 계산은 실행하지 않는다." };
  }
  return calculateFiveGrid({
    surname: input.surname.map((entry) => entry.declaredStrokeCount as number),
    givenName: input.givenName.map((entry) => entry.declaredStrokeCount as number),
    strokeStandard: input.declaredStrokeStandard,
  });
}

/** 사주와 독립된 성명 입력을 출처별 관찰 층으로 분해한다. */
export function analyzeKoreanName(input: KoreanNameInput): KoreanNameAnalysis {
  if (!Array.isArray(input.surname) || !Array.isArray(input.givenName) || input.surname.length === 0 || input.givenName.length === 0) {
    throw new Error("SURNAME_AND_GIVEN_NAME_REQUIRED");
  }
  const surname = input.surname.map(analyzeNameCharacter);
  const givenName = input.givenName.map(analyzeNameCharacter);
  const all = [...surname, ...givenName];
  const fiveGrid = calculateOptionalFiveGrid(input);
  return {
    engine: {
      id: "offhands-korean-name-engine-v1",
      separateFromSaju: true,
      datasetGeneratedAt: DATA.generatedAt,
      sources: DATA.sources,
    },
    surname,
    givenName,
    legalIdentityStatus: all.every((entry) => entry.identity.status === "official_eligible")
      ? "all_official_eligible"
      : "contains_unresolved_character",
    fiveGrid,
    eightyOneNumbers: fiveGrid.status === "calculated_from_caller_declared_strokes"
      ? interpretFiveGridSuri81(fiveGrid.grids)
      : {
          status: "not_run_without_five_grid",
          boundary: "모든 글자의 유파별 원획과 획수 체계가 확인되어 다섯 격이 계산된 경우에만 81수 원전 대조를 적용한다.",
        },
    aggregateVerdict: null,
    readyForNaming: false,
    boundaries: [...DATA.boundaries],
  };
}

export function getNameEngineDatasetSummary() {
  return {
    schemaVersion: DATA.schemaVersion,
    status: DATA.status,
    generatedAt: DATA.generatedAt,
    counts: { ...DATA.counts },
    sources: DATA.sources,
    boundaries: [...DATA.boundaries],
  };
}
