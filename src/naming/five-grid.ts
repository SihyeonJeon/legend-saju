import { reduceToSuri81 } from "./eighty-one-numbers";

export interface DeclaredStrokeInput {
  surname: number[];
  givenName: number[];
  strokeStandard: string;
}

export interface FiveGridValue {
  id: "heaven" | "person" | "earth" | "outer" | "total";
  koreanName: "천격" | "인격" | "지격" | "외격" | "총격";
  rawStrokeTotal: number;
  reduced81: number;
}

export interface FiveGridCalculation {
  status: "calculated_from_caller_declared_strokes";
  strokeStandard: string;
  surnameStrokes: number[];
  givenNameStrokes: number[];
  grids: FiveGridValue[];
  parity: ("음" | "양")[];
  aggregateVerdict: null;
  interpretation: null;
  readyForNaming: false;
  sourceIds: string[];
  boundary: string;
}

function validateStrokes(label: string, values: number[]): number[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > 2) {
    throw new Error(`${label}_LENGTH_UNSUPPORTED_BY_FIVE_GRID_LINEAGE`);
  }
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 81)) {
    throw new Error(`${label}_STROKE_INVALID`);
  }
  return [...values];
}

/** 구마사키식 다섯 격의 산술만 수행한다. 81수 길흉표는 이 계산과 분리한다. */
export function calculateFiveGrid(input: DeclaredStrokeInput): FiveGridCalculation {
  const surname = validateStrokes("SURNAME", input.surname);
  const givenName = validateStrokes("GIVEN_NAME", input.givenName);
  const strokeStandard = input.strokeStandard.trim();
  if (!strokeStandard) throw new Error("STROKE_STANDARD_REQUIRED");

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const virtualOne = (length: number) => (length === 1 ? 1 : 0);
  const heaven = sum(surname) + virtualOne(surname.length);
  const person = surname[surname.length - 1] + givenName[0];
  const earth = sum(givenName) + virtualOne(givenName.length);
  const total = sum(surname) + sum(givenName);
  const outer = total - person + virtualOne(surname.length) + virtualOne(givenName.length);
  const values: [FiveGridValue["id"], FiveGridValue["koreanName"], number][] = [
    ["heaven", "천격", heaven],
    ["person", "인격", person],
    ["earth", "지격", earth],
    ["outer", "외격", outer],
    ["total", "총격", total],
  ];

  return {
    status: "calculated_from_caller_declared_strokes",
    strokeStandard,
    surnameStrokes: surname,
    givenNameStrokes: givenName,
    grids: values.map(([id, koreanName, rawStrokeTotal]) => ({ id, koreanName, rawStrokeTotal, reduced81: reduceToSuri81(rawStrokeTotal) })),
    parity: [...surname, ...givenName].map((value) => value % 2 === 0 ? "음" : "양"),
    aggregateVerdict: null,
    interpretation: null,
    readyForNaming: false,
    sourceIds: ["kumazaki-unmei-no-shinpi-1930-pages-47-51"],
    boundary: "호출자가 밝힌 획수 체계의 입력으로 다섯 격 산술만 계산했다. 획수 선택, 81수 길흉, 이름 추천은 수행하지 않았다.",
  };
}
