import { describe, expect, it } from "vitest";
import {
  analyzeKoreanName,
  analyzeNameCharacter,
  calculateFiveGrid,
  getNameEngineDatasetSummary,
  getSuri81SourceSummary,
  interpretFiveGridSuri81,
  lookupSuri81,
  lookupNameHanja,
  reduceToSuri81,
} from "../src/naming/index";

describe("별도 한국 성명 엔진", () => {
  it("대법원 전수 스냅샷과 Unicode·구조 분해 자료를 독립 층으로 연다", () => {
    const summary = getNameEngineDatasetSummary();
    expect(summary.counts.officialEntries).toBe(9495);
    expect(summary.counts.portableEntries).toBe(9090);
    expect(summary.counts.nonPortableEntries).toBe(405);
    expect(summary.counts.ambiguousCourtLookupStrokes).toBe(2003);
    expect(summary.status).toBe("source_bounded_observations_not_name_fortune");
  });

  it("합성 한자 입력의 법적 사용 가능성과 공식 표지를 정확히 찾는다", () => {
    const result = analyzeKoreanName({
      surname: [{ character: "洪", expectedReading: "홍" }],
      givenName: [
        { character: "哲", expectedReading: "철" },
        { character: "榮", expectedReading: "영" },
      ],
    });
    expect(result.engine.separateFromSaju).toBe(true);
    expect(result.legalIdentityStatus).toBe("all_official_eligible");
    expect(result.surname[0].reading.status).toBe("exact_match");
    expect(result.surname[0].officialLabels.nameMeanings).toContain("홍 : 클(홍) 큰물(홍)");
    expect(result.givenName[1].unicode?.definition).toBeTruthy();
    expect(result.aggregateVerdict).toBeNull();
    expect(result.readyForNaming).toBe(false);
  });

  it("洪의 복수 법원 조회 획수를 그대로 보존하고 수리 획수로 고르지 않는다", () => {
    const result = analyzeNameCharacter({ character: "洪", expectedReading: "홍" });
    expect(result.strokes.courtLookupCandidates).toEqual([9, 10]);
    expect(result.strokes.courtLookupStatus).toBe("ambiguous");
    expect(result.strokes.unicodeTotalStrokes).toBe("9");
    expect(result.strokes.selectedForFiveGrid).toBeNull();
  });

  it("구조 파자는 모양 구성만 반환하고 의미·길흉 주장을 만들지 않는다", () => {
    const result = analyzeNameCharacter({ character: "洪" });
    expect(result.paja.status).toBe("graphical_observation");
    expect(result.paja.immediateComponents).toEqual(["氵", "共"]);
    expect(result.paja.semanticClaim).toBe(false);
    expect(result.paja.fortuneClaim).toBe(false);
  });

  it("두음법칙 후보를 지정 음 일치로 몰아가지 않는다", () => {
    const result = analyzeNameCharacter({ character: "林", expectedReading: "이" });
    expect(result.reading.official).toEqual(["림", "임"]);
    expect(result.reading.status).toBe("initial_sound_exception_review_required");
  });

  it("선언한 획수 체계가 없으면 수리 계산을 닫는다", () => {
    const result = analyzeKoreanName({
      surname: [{ character: "洪", declaredStrokeCount: 10 }],
      givenName: [{ character: "哲", declaredStrokeCount: 10 }, { character: "榮", declaredStrokeCount: 14 }],
    });
    expect(result.fiveGrid.status).toBe("not_run_missing_stroke_standard");
  });

  it("호출자가 밝힌 획수만으로 다섯 격 산술을 수행한다", () => {
    const result = calculateFiveGrid({ surname: [10], givenName: [5, 11], strokeStandard: "호출자 선언 강희 원획" });
    expect(result.grids.find((grid) => grid.id === "person")?.rawStrokeTotal).toBe(15);
    expect(result.grids.find((grid) => grid.id === "total")?.rawStrokeTotal).toBe(26);
    expect(result.aggregateVerdict).toBeNull();
    expect(result.interpretation).toBeNull();
  });

  it("81수 원전과 같은 저자의 1939년 재서술을 81행 모두 연다", () => {
    const summary = getSuri81SourceSummary();
    expect(summary.entryCount).toBe(81);
    expect(summary.reductionRule.status).toBe("primary_verified");
    expect(summary.sources).toHaveProperty("primary1930");
    expect(summary.sources).toHaveProperty("authorRestatement1939");
  });

  it("81 초과 수는 원전에 확인된 방식으로 80을 빼서 환원한다", () => {
    expect(reduceToSuri81(1)).toBe(1);
    expect(reduceToSuri81(81)).toBe(81);
    expect(reduceToSuri81(82)).toBe(2);
    expect(reduceToSuri81(161)).toBe(81);
    expect(lookupSuri81(162)).toMatchObject({ inputNumber: 162, reduced81: 2, reductionApplied: true });
  });

  it("49수와 73수의 후대 단순 판정을 원전 조건과 충돌한 것으로 보존한다", () => {
    const fortyNine = lookupSuri81(49).entry;
    const seventyThree = lookupSuri81(73).entry;
    expect(fortyNine.primary1930.direction).toBe("길흉교차");
    expect(fortyNine.comparison.status).toBe("later_summary_conflicts_with_primary_condition");
    expect(seventyThree.primary1930.direction).toBe("성취난·만년평안");
    expect(seventyThree.comparison.conditionNote).toContain("성취가 어렵다는 앞부분");
  });

  it("합성 획수 입력의 다섯 격을 각각 해석하고 종합 등급은 만들지 않는다", () => {
    const grids = calculateFiveGrid({ surname: [6], givenName: [9, 9], strokeStandard: "호출자 선언 강희 원획" });
    const interpretation = interpretFiveGridSuri81(grids.grids);
    expect(grids.grids.map((grid) => grid.rawStrokeTotal)).toEqual([7, 15, 18, 10, 24]);
    expect(interpretation.grids.map((grid) => grid.sourceComparison.number)).toEqual([7, 15, 18, 10, 24]);
    expect(interpretation.aggregateVerdict).toBeNull();
  });

  it("성명 분석에서 다섯 격과 81수 대조를 분리해 함께 반환한다", () => {
    const result = analyzeKoreanName({
      surname: [{ character: "洪", declaredStrokeCount: 10 }],
      givenName: [
        { character: "哲", declaredStrokeCount: 10 },
        { character: "榮", declaredStrokeCount: 14 },
      ],
      declaredStrokeStandard: "호출자 선언 강희 원획",
    });
    expect(result.fiveGrid.status).toBe("calculated_from_caller_declared_strokes");
    expect(result.eightyOneNumbers.status).toBe("source_bounded_non_aggregate_interpretation");
    if (result.eightyOneNumbers.status === "source_bounded_non_aggregate_interpretation") {
      expect(result.eightyOneNumbers.grids).toHaveLength(5);
      expect(result.eightyOneNumbers.aggregateVerdict).toBeNull();
    }
    expect(result.aggregateVerdict).toBeNull();
    expect(result.readyForNaming).toBe(false);
  });

  it("획수 갈래가 다르면 호출자가 선택한 각 입력을 별도 결과로 유지한다", () => {
    const nineStroke = calculateFiveGrid({ surname: [8], givenName: [9, 9], strokeStandard: "획수 후보 A" });
    const tenStroke = calculateFiveGrid({ surname: [8], givenName: [9, 10], strokeStandard: "획수 후보 B" });
    expect(nineStroke.grids.map((grid) => grid.rawStrokeTotal)).not.toEqual(tenStroke.grids.map((grid) => grid.rawStrokeTotal));
    expect(interpretFiveGridSuri81(nineStroke.grids).grids.map((grid) => grid.sourceComparison.number))
      .not.toEqual(interpretFiveGridSuri81(tenStroke.grids).grids.map((grid) => grid.sourceComparison.number));
  });

  it("문자와 법원 코드 양쪽으로 동일 항목을 찾는다", () => {
    expect(lookupNameHanja("哲")?.codeHex).toBe("54F2");
    expect(lookupNameHanja("U+54F2")?.character).toBe("哲");
  });
});
