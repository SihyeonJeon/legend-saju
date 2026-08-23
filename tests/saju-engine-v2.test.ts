import { describe, expect, it } from "vitest";
import { Solar } from "lunar-typescript";
import {
  ENGINE_CAPABILITIES,
  ENGINE_SOURCE_BY_ID,
  LEGACY_SAJU_INTENTS,
  auditBirthInput,
  preflightCapability
} from "../src/engine/engine-capabilities";
import { analyzeEarthAnatomy, evaluateMyeongriDoctrine, evaluateZiweiDoctrine } from "../src/engine/doctrine-engine";
import {
  advanceCheolpanHuangjiCandidate,
  calibrateCheolpanCandidates,
  CHEOLPAN_HUANGJI_GOLDEN_FIXTURES,
  CHEOLPAN_STANDARD_GOLDEN_FIXTURES,
  CHEOLPAN_STANDARD_TABLE_AUDIT,
  computeCheolpanHuangjiNumbers,
  computeCheolpanStandardNumbers,
  encodeCheolpanKunjiCode
} from "../src/engine/cheolpan-engine";
import { buildLifeDossier } from "../src/engine/engine-v2";
import { routeKnowledgeAssets } from "../src/engine/knowledge-asset-router";
import { castGimun } from "../src/engine/gimun-engine";
import { castYukim } from "../src/engine/yukim-engine";
import yukimSanChuanTable from "../src/engine/yukim-sanchuan-table.json";
import {
  buildBirthTimeRectificationMatrix,
  buildLifeEventValidationMatrix,
  buildLifeTimeline,
  transitPairInteractions
} from "../src/engine/life-timeline";
import { analyzeMyeongriStructure, computeSajuChartEnvelope } from "../src/engine/myeongri-structure";
import {
  evaluateMyeongriCompatibility,
  evaluateMyeongriJudgment
} from "../src/engine/myeongri-judgment";
import { buildMyeongriActionGuidanceForInput } from "../src/engine/myeongri-action-guidance";
import { computeSajuChart } from "../src/engine/saju-engine";
import { currentLuck } from "../src/engine/saju-engine-advanced";
import { namingElements, selectAuspiciousDays } from "../src/engine/saju-engine-closure";
import { analyzeSuri, suggestNamingHanja } from "../src/engine/saju-engine-suri";
import { findQiongtongMonthRule, QIONGTONG_MONTH_RULES } from "../src/engine/qiongtong-month-rules";
import { QIONGTONG_SEASONAL_RULES } from "../src/engine/qiongtong-seasonal-rules";
import { evaluateQiongtongSubclauses, QIONGTONG_SUBCLAUSE_RULES } from "../src/engine/qiongtong-subclauses";
import {
  compareZiweiLineages,
  buildZiweiPalaceTopology,
  compareZiweiPalaceFlyingProfiles,
  computeZiweiChart,
  computeZiweiHoroscope,
  computeZiweiPalaceFlyingGraph,
  computeZiweiQintianActivationLayer,
  computeZiweiQintianStructuralLayer,
  ZIWEI_MUTAGEN_PROFILES
} from "../src/engine/ziwei-engine";
import { ZIWEI_PALACE_DOCTRINE_RULES } from "../src/engine/ziwei-palace-doctrine-rules";
import { ZIWEI_REMAINING_PALACE_RULE_COUNTS } from "../src/engine/ziwei-palace-doctrine-rules-remaining";

// Synthetic regression fixture; it does not represent a user or case record.
const recordedBirth = {
  year: 1820,
  month: 7,
  day: 14,
  hour: 8,
  minute: 17,
  calendar: "solar" as const,
  gender: "여" as const,
  birthTimeAccuracy: "recorded" as const,
  birthplace: "합성 위치",
  longitudeE: 127
};

describe("Engine V2 capability registry", () => {
  it("legacy 26개 intent를 빠짐없이 등급화한다", () => {
    expect(LEGACY_SAJU_INTENTS).toHaveLength(26);
    for (const intent of LEGACY_SAJU_INTENTS) {
      const capability = ENGINE_CAPABILITIES[intent];
      expect(capability.id).toBe(intent);
      expect(capability.sourceIds).toBeDefined();
      expect(capability.note.length).toBeGreaterThan(10);
      for (const sourceId of capability.sourceIds) expect(ENGINE_SOURCE_BY_ID[sourceId]).toBeDefined();
    }
    for (const capability of Object.values(ENGINE_CAPABILITIES)) {
      for (const sourceId of capability.sourceIds) expect(ENGINE_SOURCE_BY_ID[sourceId]).toBeDefined();
    }
  });

  it("부분 구현은 support에 두고 검증된 폐쇄 구간만 계산 가능하게 연다", () => {
    expect(ENGINE_CAPABILITIES.gimun.maturity).toBe("bounded_calculation");
    expect(ENGINE_CAPABILITIES.gimun.evidenceRole).toBe("support");
    expect(ENGINE_CAPABILITIES.cheolpan_shenshu.maturity).toBe("bounded_calculation");
    expect(ENGINE_CAPABILITIES.cheolpan_shenshu.evidenceRole).toBe("support");
    const cheolpan = preflightCapability("cheolpan_shenshu", { birth: recordedBirth });
    expect(cheolpan.status).toBe("partial");
  });

  it("작명 출처는 원전·법령·공식 조회와 현지 표 감사를 분리한다", () => {
    expect(ENGINE_SOURCE_BY_ID["kumazaki-unmei-no-shinpi-1930"]?.kind).toBe("primary_text");
    expect(ENGINE_SOURCE_BY_ID["korean-family-registration-rule-article-37"]?.kind).toBe("official_government");
    expect(ENGINE_SOURCE_BY_ID["korean-efamily-name-hanja"]?.kind).toBe("official_government");
    expect(ENGINE_CAPABILITIES.suri.omittedDimensions).toContain("종합 길흉·개명 판단");
    expect(ENGINE_CAPABILITIES.naming_hanja.note).toContain("공식 조회");
  });

  it("음력 윤달 중복 월은 윤달 표지가 없으면 막는다", () => {
    // 2023년 음력 2월은 윤2월이 존재한다.
    const audit = auditBirthInput({ year: 2023, month: 2, day: 3, calendar: "lunar", hour: 10 });
    expect(audit.leapMonthStatus).toBe("ambiguous");
    expect(audit.issues.some((issue) => issue.code === "LUNAR_LEAP_MONTH_AMBIGUOUS" && issue.severity === "blocking")).toBe(true);
  });

  it("실재하지 않는 양력과 음력 생일은 계산 전에 막는다", () => {
    const solarAudit = auditBirthInput({ year: 2000, month: 2, day: 30, calendar: "solar", hour: 10 });
    const lunarAudit = auditBirthInput({ year: 2023, month: 2, day: 30, calendar: "lunar", isLeapMonth: true, hour: 10 });
    expect(solarAudit.issues).toContainEqual(expect.objectContaining({ code: "INVALID_BIRTH_DATE", severity: "blocking" }));
    expect(lunarAudit.issues).toContainEqual(expect.objectContaining({ code: "INVALID_BIRTH_DATE", severity: "blocking" }));
    expect(() => computeSajuChart({ year: 2000, month: 2, day: 30, calendar: "solar", hour: 10 }))
      .toThrow("INVALID_BIRTH_DATE");
  });

  it("그해 존재하지 않는 윤달 입력도 막는다", () => {
    const audit = auditBirthInput({ year: 2024, month: 2, day: 3, calendar: "lunar", isLeapMonth: true, hour: 10 });
    expect(audit.issues).toContainEqual(expect.objectContaining({
      code: "INVALID_BIRTH_DATE",
      severity: "blocking",
      message: expect.stringContaining("윤2월이 없다"),
    }));
  });

  it("경도와 시간대를 실제 계산에 쓴 것처럼 표시하지 않는다", () => {
    const audit = auditBirthInput({ ...recordedBirth, timezone: "Asia/Seoul" });
    expect(audit.issues).toContainEqual(expect.objectContaining({ code: "TIME_BASIS_UNCORRECTED", severity: "warning" }));
    expect(ENGINE_CAPABILITIES.chart.improvesWith).not.toContain("longitude");
    expect(ENGINE_CAPABILITIES.chart.omittedDimensions).toContain("진태양시 자동 보정");
  });

  it("대법원 전수 성명 엔진을 별도 capability로 공개한다", () => {
    const capability = ENGINE_CAPABILITIES.korean_name_analysis;
    expect(capability.requiredInputs).toContain("name_characters");
    expect(capability.sourceIds).toEqual(expect.arrayContaining([
      "korean-efamily-name-hanja",
      "unicode-unihan-17",
      "amake-cjk-decomp-c29b391",
    ]));
  });
});

describe("Engine V2 작명 경계", () => {
  it("사격 산술과 현지 81수 해석을 분리하고 종합 길흉을 만들지 않는다", () => {
    const result = analyzeSuri([8], [5, 12]);
    expect(result.in_.suri).toBe(13);
    expect(result.chong.suri).toBe(25);
    expect(result.aggregateVerdict).toBeNull();
    expect((result as unknown as Record<string, unknown>).grade).toBeUndefined();
    expect(result.in_.calculationStatus).toBe("calculated_from_caller_supplied_strokes");
    expect(result.in_.interpretation.status).toBe("local_table_not_line_by_line_validated_against_primary_text");
    expect(result.policy.formulaStatus).toBe("primary_examples_validated_printed_pages_47_51");
    expect(result.policy.tableStatus).toBe("local_table_not_line_by_line_validated_against_primary_text");
    expect(result.readyForNaming).toBe(false);
  });

  it("단성·외자 이름의 외격에는 두 가상 1을 반영한다", () => {
    const result = analyzeSuri([8], [5]);
    expect(result.oe.strokes).toBe(2);
    expect(result.policy.formulas.oe).toContain("외자 이름 가상 1");
  });

  it("작명 방향은 세 명리 관법을 보존하고 발음·부수·수리를 권장안으로 합치지 않는다", () => {
    const result = namingElements(recordedBirth);
    expect(result.myeongriLenses.map((lens) => lens.id)).toEqual(["climate", "pattern_function", "support_control"]);
    expect(result.methodLayers.every((method) => method.recommendationIssued === false)).toBe(true);
    expect(result.readyForNaming).toBe(false);
    expect((result as unknown as Record<string, unknown>).recommendInitials).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).avoidInitials).toBeUndefined();
  });

  it("현지 한자 subset은 법적 적격성·지정 음·뜻을 확인하기 전 연구 후보로만 남긴다", () => {
    const result = suggestNamingHanja(recordedBirth, 3);
    const candidates = result.researchCandidatesByElement.flatMap((group) => group.candidates);
    expect(result.myeongriLenses).toHaveLength(3);
    expect(result.readyForNaming).toBe(false);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.legalEligibility === "unverified")).toBe(true);
    expect(candidates.every((candidate) => candidate.officialReading === "unverified")).toBe(true);
    expect(candidates.every((candidate) => candidate.meaning === "unverified")).toBe(true);
    expect(result.officialVerification.lookupSourceId).toBe("korean-efamily-name-hanja");
    expect((result as unknown as Record<string, unknown>).goodChongNumbers).toBeUndefined();
  });
});

describe("기문둔갑 차보 전반 전층", () => {
  it("외부 금표본의 9궁 천지암간·구성·팔문·팔신과 직부직사를 재현한다", () => {
    const result = castGimun(2026, 1, 14, 18, 45);
    expect(result).toMatchObject({
      jeolgi: "小寒",
      dun: "양둔",
      won: "중원(中元)",
      gukSu: 8,
      dayPillar: "戊子",
      timePillar: "辛酉",
      xunHead: "甲寅",
      xunHiddenStem: "癸",
      kongWang: ["子", "丑"],
      zhiFu: { star: "천보", originalPalace: 4, palace: 2, inCenter: false },
      zhiShi: { door: "두문", palace: 2, inCenter: false }
    });
    expect(result.palaces.map((palace) => [
      palace.heavenStem,
      palace.earthStem,
      palace.hiddenStem,
      palace.star ?? "-",
      palace.door ?? "-",
      palace.god ?? "-"
    ].join("/"))).toEqual([
      "乙/庚/乙/천주/경문/육합",
      "癸/辛/癸/천보/두문/직부",
      "庚/壬/庚/천봉/휴문/현무",
      "戊/癸/戊/천임/생문/구지",
      "丁/丁/丁/-/-/-",
      "辛/丙/辛/금예/사문/태음",
      "己/乙/己/천영/경문(景門)/등사",
      "丙/戊/丙/천심/개문/백호",
      "壬/己/壬/천충/상문/구천"
    ]);
    expect(result.sourceIds).toContain("qimen-rotating-golden");
    expect((result as unknown as Record<string, unknown>).luckScore).toBeUndefined();
  });

  it("9궁 중심 직부·직사의 실제 궁과 곤궁 투영을 구분한다", () => {
    const result = castGimun(2024, 12, 10, 4, 0);
    expect(result.zhiFu).toMatchObject({ star: "천금", originalPalace: 5, palace: 5, inCenter: true });
    expect(result.zhiShi).toMatchObject({ door: "사문", palace: 5, inCenter: true });
    expect(result.palaces[4]).toMatchObject({ palace: 5, star: null, door: null, god: null });
    expect(result.boundary).toContain("飛盤");
  });
});

describe("대육임 닫힌 720국 사과삼전", () => {
  it("육십 일진마다 십이 천반 위치가 모두 있고 삼전과 과체가 닫혀 있다", () => {
    const rows = Object.values(yukimSanChuanTable);
    expect(rows).toHaveLength(60);
    expect(rows.every((row) => row.length === 12)).toBe(true);
    expect(rows.flat()).toHaveLength(720);
    expect(rows.flat().every((entry) => entry["干支组合"].length === 3 && entry["格局"].length > 0)).toBe(true);
  });

  it("구종문의 통상과와 특수과를 임의 대체 없이 실제 삼전으로 찾는다", () => {
    const fixtures = [
      [2020, 1, 1, 0, "重审", "辰巳午"],
      [2020, 1, 1, 2, "伏吟", "丑戌未"],
      [2020, 1, 1, 6, "涉害", "丑亥酉"],
      [2020, 1, 1, 8, "元首", "戌未辰"],
      [2020, 1, 1, 12, "比用", "卯戌巳"],
      [2020, 1, 1, 14, "反吟", "卯酉卯"],
      [2020, 1, 1, 22, "遥克", "未酉亥"],
      [2020, 1, 5, 4, "八专", "卯午午"],
      [2020, 1, 6, 0, "昴星", "戌酉午"],
      [2020, 1, 14, 0, "别责", "亥午午"],
      [2020, 2, 3, 2, "知一", "戌酉申"]
    ] as const;
    for (const [year, month, day, hour, methodCode, transmissions] of fixtures) {
      const result = castYukim(year, month, day, hour);
      expect(result.methodCode).toBe(methodCode);
      expect(result.threeTransmissions.map((transmission) => transmission.branch).join("")).toBe(transmissions);
      expect(result.sourceTrace.tableCoverage).toBe("60_day_pillars_x_12_heaven_plate_positions");
      expect(result.method).not.toContain("단순화");
    }
  });
});

describe("철판신수의 출처가 닫힌 부분 산법", () => {
  const chartFromPillars = (pillars: readonly [string, string, string, string]) => {
    const base = computeSajuChart(recordedBirth);
    const replace = (pillar: typeof base.pillars.year, gz: string) => ({ ...pillar, gz, gan: gz[0], zhi: gz[1] });
    return {
      ...base,
      pillars: {
        year: replace(base.pillars.year, pillars[0]),
        month: replace(base.pillars.month, pillars[1]),
        day: replace(base.pillars.day, pillars[2]),
        time: replace(base.pillars.time, pillars[3])
      }
    };
  };

  it("세 판본 교차 명례 두 건의 모든 공개 중간값을 재현한다", () => {
    expect(CHEOLPAN_HUANGJI_GOLDEN_FIXTURES).toHaveLength(2);
    for (const fixture of CHEOLPAN_HUANGJI_GOLDEN_FIXTURES) {
      const result = computeCheolpanHuangjiNumbers(chartFromPillars(fixture.pillars));
      expect(result.status).toBe("computed");
      expect(result).toMatchObject(fixture.expected);
    }
    const first = computeCheolpanHuangjiNumbers(chartFromPillars(CHEOLPAN_HUANGJI_GOLDEN_FIXTURES[0].pillars));
    expect(advanceCheolpanHuangjiCandidate(first.parentInitialCode!, 1)).toBe(9645);
    expect(advanceCheolpanHuangjiCandidate(12990, 1)).toBe(1020);
  });

  it("곤집 암호 변환은 재현하되 출생 정보에서 암호를 골랐다고 가장하지 않는다", () => {
    expect(encodeCheolpanKunjiCode("辛月月戊")).toEqual({ code: "辛月月戊", digits: "9003", clauseId: 9003 });
    expect(encodeCheolpanKunjiCode("庚丁庚乙").clauseId).toBe(4746);
    expect(encodeCheolpanKunjiCode("戊己月辛").clauseId).toBe(3809);
    expect(() => encodeCheolpanKunjiCode("甲乙丙")).toThrow("CHEOLPAN_INVALID_KUNJI_CODE");
  });

  it("판본이 설명하지 않은 한 자리·역순 01 조건은 임의 보정하지 않는다", () => {
    const result = computeCheolpanHuangjiNumbers(chartFromPillars(["戊巳", "己卯", "甲子", "丁巳"]));
    expect(result.status).toBe("blocked_ambiguous_digit");
    expect(result.blockedReasons.length).toBeGreaterThan(0);
    expect(result.parentInitialCode).toBeUndefined();
  });

  it("질문 시각 표준표 계통의 선천수부터 본명·유년 조문 번호까지 재현한다", () => {
    expect(CHEOLPAN_STANDARD_TABLE_AUDIT).toMatchObject({
      initialHexagramCells: 750,
      mainHexagramCells: 750,
      destinyRows: 144,
      yearSoundRows: 120,
      markerRows: 96,
      letterRows: 128,
      lifetimeRows: 2028,
      sourceId: "tieban-standard-published-tables"
    });
    expect(CHEOLPAN_STANDARD_TABLE_AUDIT.corrections).toContain("14-9 正刻 second 670 -> 700 (sequence-confirmed OCR/index typo)");
    for (const fixture of CHEOLPAN_STANDARD_GOLDEN_FIXTURES) {
      const result = computeCheolpanStandardNumbers(fixture.input);
      expect(result).toMatchObject({
        preheavenNumber: fixture.expected.preheavenNumber,
        fiveToneNumber: fixture.expected.fiveToneNumber,
        dayFateNumber: fixture.expected.dayFateNumber,
        timeLuckNumber: fixture.expected.timeLuckNumber,
        moment: fixture.expected.moment,
        natalNumber: fixture.expected.natalNumber,
        hexagram: fixture.expected.hexagram,
        afterheavenNumber: fixture.expected.afterheavenNumber
      });
      expect(result.natalClauses?.personality).toEqual(fixture.expected.personality);
      expect(result.natalClauses?.career).toEqual(fixture.expected.career);
      expect(result.natalClauses?.wealth).toEqual(fixture.expected.wealth);
      expect(result.natalClauses?.siblings).toEqual(fixture.expected.siblings);
      expect(result.lifetime.slice(0, 10).map((year) => year.originalClauseId)).toEqual(fixture.expected.firstLifetimeClauseIds);
      expect(result.lifetime).toHaveLength(108);
      expect(result.lifetime[107].status).toBe("blocked_missing_table_cell");
    }
  });

  it("고각은 독립 사실 세 건·두 주제와 단일 전부일치 후보가 있을 때만 잠근다", () => {
    const candidates = [30, 60].map((offset) => ({
      id: `huangji-${offset}`,
      lineage: "huangji_30" as const,
      state: { offset },
      sourceIds: ["tieban-research-corpus"]
    }));
    const facts = [
      { id: "father-zodiac", topic: "parents" as const, statement: "부친 띠", independence: "external_known_fact" as const },
      { id: "mother-zodiac", topic: "parents" as const, statement: "모친 띠", independence: "external_known_fact" as const },
      { id: "move-year", topic: "residence" as const, statement: "큰 이사 연도", independence: "external_known_fact" as const }
    ];
    expect(calibrateCheolpanCandidates({ candidates, facts: facts.slice(0, 2), assessments: [] }).status).toBe("insufficient_evidence");
    const assessments = candidates.flatMap((candidate) => facts.map((fact) => ({
      candidateId: candidate.id,
      factId: fact.id,
      outcome: candidate.id === "huangji-60" ? "match" as const : "mismatch" as const
    })));
    const locked = calibrateCheolpanCandidates({ candidates, facts, assessments });
    expect(locked.status).toBe("locked");
    expect(locked.lockedCandidate?.id).toBe("huangji-60");
  });

  it("철판신수 질문일 때 닫힌 숫자 사슬만 라우팅한다", () => {
    const dossier = buildLifeDossier({
      birth: { ...recordedBirth, year: 1925, month: 3, day: 23, hour: 11, minute: 0 },
      question: "철판신수 산법과 가족 구조"
    });
    expect(dossier.routes.map((route) => route.capability.id)).toContain("cheolpan_shenshu");
    expect(dossier.blockedSystems.map((item) => item.capabilityId)).not.toContain("cheolpan_shenshu");
    const claim = dossier.claims.find((item) => item.capabilityId === "cheolpan_shenshu");
    expect(claim).toBeDefined();
    expect(claim?.evidenceRole).toBe("support");
    expect(claim?.limitations.join(" ")).toContain("전체 유년 조문 선택");
  });

  it("질문 시각이 있으면 황극과 표준표 계통을 한 결과로 섞지 않고 각각 라우팅한다", () => {
    const dossier = buildLifeDossier({
      birth: recordedBirth,
      question: "철판신수 산법",
      targetDate: { year: 2026, month: 8, day: 21, hour: 14, minute: 30 }
    });
    const claims = dossier.claims.filter((claim) => claim.capabilityId === "cheolpan_shenshu");
    expect(claims).toHaveLength(2);
    expect(claims.map((claim) => claim.statement).join(" ")).toContain("황극");
    expect(claims.map((claim) => claim.statement).join(" ")).toContain("표준표");
    expect(claims.every((claim) => claim.lineage.includes("황극·곤집·질문시각"))).toBe(true);
  });
});

describe("시간 미상과 명리 구조", () => {
  it("단일 원국 함수가 정오를 조작하지 않는다", () => {
    expect(() => computeSajuChart({ year: 1991, month: 2, day: 2, calendar: "solar", gender: "남" })).toThrow("BIRTH_TIME_REQUIRED");
  });

  it("시간 미상은 조자시·야자시를 포함한 후보 묶음으로 계산한다", () => {
    const envelope = computeSajuChartEnvelope({ year: 1991, month: 2, day: 2, calendar: "solar", gender: "남", birthTimeAccuracy: "unknown" });
    expect(envelope.status).toBe("time_unknown");
    expect(envelope.fullChart).toBeUndefined();
    expect(envelope.candidates).toHaveLength(13);
    expect(envelope.candidates.map((candidate) => candidate.key)).toContain("early_zi");
    expect(envelope.candidates.map((candidate) => candidate.key)).toContain("late_zi");
    expect(envelope.stablePillars.year).toBeTruthy();
    expect(envelope.elementRanges.토.max).toBeGreaterThanOrEqual(envelope.elementRanges.토.min);
  });

  it("통근·투출·십신 위치를 점수와 분리한다", () => {
    const structure = analyzeMyeongriStructure(computeSajuChart(recordedBirth));
    expect(structure.stemRoots).toHaveLength(4);
    expect(structure.tenGodPositions).toHaveLength(4);
    expect(structure.monthCommand.hiddenOrder.length).toBeGreaterThan(0);
    expect(structure.provenance.doctrineBoundary).toContain("포함하지 않는다");
    expect((structure as unknown as Record<string, unknown>).finalFateScore).toBeUndefined();
  });

  it("월령·통근·투출을 독립 축으로 읽고 고정 왕쇠 점수를 만들지 않는다", () => {
    const judgment = evaluateMyeongriJudgment(computeSajuChart(recordedBirth));
    expect(judgment.strength.status).toBe("support_leaning");
    expect(judgment.strength.monthCommandTenGod).toBe("비견");
    expect(judgment.strength.axes.map((axis) => axis.id)).toEqual([
      "month_command", "root", "visible_support", "visible_drain_control"
    ]);
    expect(judgment.strength.exactRoots.some((root) => root.branch === "未" && root.grade === "substantial")).toBe(true);
    expect(judgment.strength.sourceLocator.sourceId).toBe("di-tian-sui-chan-wei");
    expect((judgment.strength as unknown as Record<string, unknown>).score).toBeUndefined();
    expect((judgment as unknown as Record<string, unknown>).finalFateScore).toBeUndefined();
  });

  it("월지 본기 격 후보와 보강·훼손 장치를 조후·부억 용신과 섞지 않는다", () => {
    const judgment = evaluateMyeongriJudgment(computeSajuChart(recordedBirth));
    expect(judgment.pattern.pattern).toBe("월령 비견 후보");
    expect(judgment.pattern.status).toBe("damaged");
    expect(judgment.pattern.mechanisms.map((mechanism) => mechanism.id)).toContain("month-command-clash");
    expect(judgment.pattern.mechanisms.map((mechanism) => mechanism.id)).not.toContain("lu-wealth-officer");
    expect(judgment.usefulGods.lenses.map((lens) => lens.id)).toEqual(["climate", "pattern_function", "support_control"]);
    expect(judgment.usefulGods.lenses.find((lens) => lens.id === "climate")?.candidateStems).toEqual(["癸"]);
    expect(judgment.usefulGods.lenses.find((lens) => lens.id === "climate")?.candidateElements).toEqual(["수"]);
    expect(judgment.usefulGods.boundary).toContain("자동 승격하지 않고");
    expect(ENGINE_CAPABILITIES.myeongri_judgment.maturity).toBe("bounded_calculation");
    expect(ENGINE_SOURCE_BY_ID["yuanhai-ziping"]?.uri).toContain("wikisource.org");
  });

  it("행동 처방도 조후·격국·부억을 한 용신으로 합치지 않고 번역 근거를 표시한다", () => {
    const guidance = buildMyeongriActionGuidanceForInput(recordedBirth, 2026);
    expect(guidance.lenses.map((lens) => lens.id)).toEqual(["climate", "pattern_function", "support_control"]);
    expect(guidance.lenses.find((lens) => lens.id === "climate")?.practices).toEqual([]);
    expect(guidance.lenses.flatMap((lens) => lens.practices).every((practice) =>
      practice.evidenceRole === "modern_interpretive_translation" && practice.actions.length > 0
    )).toBe(true);
    expect(guidance.timing?.contacts).toHaveLength(2);
    expect(guidance.timing?.boundary).toContain("길흉");
    expect(guidance.boundary).toContain("상징 대응");
    expect((guidance as unknown as Record<string, unknown>).yongsin).toBeUndefined();
    expect((guidance as unknown as Record<string, unknown>).score).toBeUndefined();
  });

  it("택일은 서로 다른 근거를 합산하지 않고 후보·검토·제외 증거행렬로 나눈다", () => {
    const selection = selectAuspiciousDays(recordedBirth, { year: 2026, month: 7, day: 1 }, 30, "嫁娶");
    expect(selection.policy).toMatchObject({ id: "calendar-constraint-matrix-v2", ordering: "group_then_chronological" });
    expect(selection.allDays).toHaveLength(30);
    expect(selection.shortlist.length + selection.review.length + selection.excluded.length).toBe(30);
    expect(selection.allDays.every((day) => (day as unknown as Record<string, unknown>).score === undefined)).toBe(true);
    expect(selection.allDays.every((day) => [...day.supports, ...day.cautions, ...day.exclusions]
      .every((evidence) => evidence.sourceIds.length > 0))).toBe(true);
    expect(selection.usefulGodLenses.map((lens) => lens.id)).toEqual(["climate", "pattern_function", "support_control"]);
    expect(ENGINE_CAPABILITIES.taekil.maturity).toBe("bounded_calculation");
  });

  it("실제 1년 명조 표본에서 열두 월령 격 후보가 모두 도달하고 빈 판정을 만들지 않는다", () => {
    const patterns = new Set<string>();
    const strengthStates = new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= 31; day += 1) {
        const date = new Date(Date.UTC(1990, month - 1, day));
        if (date.getUTCMonth() !== month - 1) continue;
        const judgment = evaluateMyeongriJudgment(computeSajuChart({
          year: 1990, month, day, hour: 12, calendar: "solar", gender: "남"
        }));
        patterns.add(judgment.pattern.pattern);
        strengthStates.add(judgment.strength.status);
        expect(judgment.pattern.monthMainStem).toBeTruthy();
        expect(judgment.usefulGods.lenses).toHaveLength(3);
      }
    }
    expect(patterns).toEqual(new Set([
      "정관격 후보", "편관격 후보", "정재격 후보", "편재격 후보",
      "정인격 후보", "편인격 후보", "식신격 후보", "상관격 후보",
      "건록격 후보", "양인격 후보", "월겁 후보", "월령 비견 후보"
    ]));
    expect(strengthStates).toEqual(new Set([
      "support_leaning", "weak_leaning", "contested", "extreme_structure_candidate"
    ]));
  });

  it("양 원국의 4×4 접촉에서 일간·배우자궁과 다른 기둥을 분리한다", () => {
    const a = computeSajuChart(recordedBirth);
    const b = computeSajuChart({
      year: 1939, month: 7, day: 29, hour: 11, minute: 5,
      calendar: "solar", gender: "남", birthTimeAccuracy: "recorded"
    });
    const result = evaluateMyeongriCompatibility(a, b);
    expect(result.dayPillars).toEqual({ a: "己丑", b: "丁卯" });
    expect(result.dayMasterContacts).toContainEqual(expect.objectContaining({
      kind: "generates", direction: "b_to_a", salience: "day_master"
    }));
    expect(result.primaryStatus).toBe("supportive_only");
    expect(result.status).toBe("mixed");
    expect(result.crossPillarContacts.some((contact) => contact.kind === "six_harmony")).toBe(true);
    expect(result.crossPillarContacts.some((contact) => contact.kind === "clash")).toBe(true);
    expect((result as unknown as Record<string, unknown>).marriageProbability).toBeUndefined();
    expect(result.boundary).toContain("합은 관계 성공");
  });

  it("천간합을 곧 합화로 확정하지 않고 월령·목표 오행 지지만 기록한다", () => {
    const structure = analyzeMyeongriStructure(computeSajuChart(recordedBirth));
    const candidate = structure.stemTransformationCandidates.find((item) => item.pair === "戊癸");
    expect(candidate).toBeDefined();
    expect(candidate?.targetElement).toBe("화");
    expect(candidate?.monthSupportsTarget).toBe(false);
    expect(candidate?.status).toBe("candidate_only");
    expect((candidate as unknown as Record<string, unknown>).transformed).toBeUndefined();
  });

  it("기토 미월을 토 개수가 아니라 토의 층과 궁통보감 조건으로 해체한다", () => {
    const chart = computeSajuChart(recordedBirth);
    expect(chart.pillars.day.gan).toBe("己");
    expect(chart.pillars.month.zhi).toBe("未");
    const earth = analyzeEarthAnatomy(chart);
    expect(earth.visibleEarthCount).toBeGreaterThan(0);
    expect(earth.earthBranchCount).toBeGreaterThan(0);
    expect(new Set(earth.tokens.map((token) => token.subtype)).size).toBeGreaterThan(2);
    const doctrine = evaluateMyeongriDoctrine(chart);
    expect(doctrine.status).toBe("matched");
    expect(doctrine.ruleId).toBe("QTB-MONTH-己-未-V1");
    expect(doctrine.granularity).toBe("exact_month");
    expect(doctrine.presences.find((presence) => presence.stem === "癸")?.state).toBe("exposed");
    expect(doctrine.presences.find((presence) => presence.stem === "丙")?.state).toBe("absent");
    expect(doctrine.conditionalFindings.some((finding) => finding.includes("무계합"))).toBe(true);
  });

  it("십간 12월령 120칸을 중복 없이 정확 월 규칙으로 제공한다", () => {
    expect(QIONGTONG_SEASONAL_RULES).toHaveLength(40);
    expect(QIONGTONG_MONTH_RULES).toHaveLength(120);
    expect(new Set(QIONGTONG_MONTH_RULES.map((rule) => `${rule.dayStem}-${rule.monthBranch}`)).size).toBe(120);
    for (const stem of [..."甲乙丙丁戊己庚辛壬癸"]) {
      for (const branch of [..."寅卯辰巳午未申酉戌亥子丑"]) {
        const rule = findQiongtongMonthRule(stem, branch);
      expect(rule?.primary.length).toBeGreaterThan(0);
      expect(rule?.inspectStems.length).toBeGreaterThan(0);
      expect(rule?.section).toContain(`논${stem}`);
      expect(rule?.monthOrdinal).toBe("寅卯辰巳午未申酉戌亥子丑".indexOf(branch) + 1);
      const roles = [...(rule?.primary ?? []), ...(rule?.support ?? []), ...(rule?.conditional ?? [])];
      expect(new Set(roles).size).toBe(roles.length);
      expect(rule?.inspectStems).toEqual(roles);
      }
    }
    const results = new Map<string, ReturnType<typeof evaluateMyeongriDoctrine>>();
    for (let day = 1; day <= 20 && results.size < 10; day += 1) {
      const chart = computeSajuChart({ year: 1990, month: 1, day, hour: 12, calendar: "solar", gender: "남" });
      results.set(chart.pillars.day.gan, evaluateMyeongriDoctrine(chart));
    }
    expect(results.size).toBe(10);
    for (const result of results.values()) {
      expect(result.status).toBe("matched");
      expect(result.sourceLocator.sourceId).toBe("qiongtong-baojian");
      expect(result.presences.length).toBeGreaterThan(0);
      expect(result.granularity).toBe("exact_month");
    }
  });

  it("궁통보감의 명시 하위절 66개를 조건식으로 분리한다", () => {
    expect(QIONGTONG_SUBCLAUSE_RULES).toHaveLength(66);
    expect(new Set(QIONGTONG_SUBCLAUSE_RULES.map((rule) => rule.id)).size).toBe(66);
    expect(new Set(QIONGTONG_SUBCLAUSE_RULES.map((rule) => rule.dayStem))).toEqual(new Set([..."甲乙丙丁戊己庚辛壬癸"]));
    expect(QIONGTONG_SUBCLAUSE_RULES.every((rule) => rule.predicates.length > 0 && rule.sourceNote.length > 0)).toBe(true);
    expect(ENGINE_CAPABILITIES.myeongri_doctrine.lineage).toContain("하위절 66개");
  });

  it("삼합국·투출·부재 조건이 모두 맞아야 해당 하위절을 발동한다", () => {
    const base = computeSajuChart(recordedBirth);
    const metalFrame = {
      ...base,
      pillars: {
        year: { ...base.pillars.year, gan: "庚", zhi: "巳", hideGan: ["丙", "庚", "戊"] },
        month: { ...base.pillars.month, gan: "戊", zhi: "寅", hideGan: ["甲", "丙", "戊"] },
        day: { ...base.pillars.day, gan: "甲", zhi: "酉", hideGan: ["辛"] },
        time: { ...base.pillars.time, gan: "辛", zhi: "丑", hideGan: ["己", "癸", "辛"] }
      }
    };
    const matched = evaluateQiongtongSubclauses(metalFrame);
    expect(matched.map((item) => item.ruleId)).toContain("QTB-SUB-JIA-SPRING-METAL-NO-FIRE");
    expect(matched.find((item) => item.ruleId === "QTB-SUB-JIA-SPRING-METAL-NO-FIRE")?.predicateFindings).toHaveLength(3);

    const broken = {
      ...metalFrame,
      pillars: { ...metalFrame.pillars, time: { ...metalFrame.pillars.time, gan: "丁" } }
    };
    expect(evaluateQiongtongSubclauses(broken).map((item) => item.ruleId)).not.toContain("QTB-SUB-JIA-SPRING-METAL-NO-FIRE");
  });

  it("기토 여름의 병·계·신 하위절을 범용 평가기와 통합 결과가 같은 방식으로 반환한다", () => {
    const base = computeSajuChart(recordedBirth);
    const synthetic = {
      ...base,
      pillars: {
        year: { ...base.pillars.year, gan: "丙" },
        month: { ...base.pillars.month, gan: "辛", zhi: "未" },
        day: { ...base.pillars.day, gan: "己" },
        time: { ...base.pillars.time, gan: "癸" }
      }
    };
    const direct = evaluateQiongtongSubclauses(synthetic);
    expect(direct.map((item) => item.ruleId)).toContain("QTB-SUB-JI-SUMMER-BING-GUI-XIN");
    const integrated = evaluateMyeongriDoctrine(synthetic);
    expect(integrated.subclauseMatches.map((item) => item.ruleId)).toContain("QTB-SUB-JI-SUMMER-BING-GUI-XIN");
    expect(integrated.classicalPattern).toContain("수화기제");
  });

  it("같은 일간도 월지에 따라 우선 조후군과 원문 해상도가 달라진다", () => {
    expect(findQiongtongMonthRule("甲", "巳")?.primary).toEqual(["癸"]);
    expect(findQiongtongMonthRule("甲", "未")?.primary).toEqual(["丁"]);
    expect(findQiongtongMonthRule("己", "未")?.sourceGranularity).toBe("grouped_month_clause");
    expect(findQiongtongMonthRule("乙", "酉")?.sourceGranularity).toBe("intra_month_phase_clause");
    expect(findQiongtongMonthRule("乙", "酉")?.phaseNote).toContain("추분");
    expect(ENGINE_CAPABILITIES.myeongri_doctrine.omittedDimensions).not.toContain("기토 외 9개 일간의 정확 월별 우선순위");
  });

  it("실제 만세력 월지·일간 조합으로 120칸 전체에 도달한다", () => {
    const covered = new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= 31; day += 1) {
        const date = new Date(Date.UTC(1990, month - 1, day));
        if (date.getUTCMonth() !== month - 1) continue;
        const chart = computeSajuChart({ year: 1990, month, day, hour: 12, calendar: "solar", gender: "남" });
        const key = `${chart.pillars.day.gan}-${chart.pillars.month.zhi}`;
        const result = evaluateMyeongriDoctrine(chart);
        expect(result.ruleId).toBe(`QTB-MONTH-${key}-V1`);
        expect(result.granularity).toBe("exact_month");
        covered.add(key);
      }
    }
    expect(covered.size).toBe(120);
  });

  it("계산된 일간·십신을 기존 지식 자산에 연결하되 보조 근거로만 둔다", () => {
    const routed = routeKnowledgeAssets(computeSajuChart(recordedBirth));
    expect(routed.assets.some((asset) => asset.termKr === "기토")).toBe(true);
    expect(routed.assets.some((asset) => asset.termKr.includes("기토 조후요결"))).toBe(true);
    expect(routed.assets.every((asset) => asset.evidenceRole === "support")).toBe(true);
    expect(routed.assets.every((asset) => asset.provenance.executableRule === false)).toBe(true);
    expect(routed.assets.every((asset) => asset.provenance.locatable === false)).toBe(true);
    expect(routed.assets.some((asset) => asset.termKr.includes("금수상관"))).toBe(false);
  });

  it("자미 명반이 있으면 명리 자산에 밀리지 않고 자미 자산도 함께 고른다", () => {
    const chart = computeSajuChart(recordedBirth);
    const ziwei = computeZiweiChart(recordedBirth);
    const routed = routeKnowledgeAssets(chart, ziwei, 12);
    expect(routed.assets.some((asset) => asset.system === "myeongri")).toBe(true);
    expect(routed.assets.some((asset) => asset.system === "ziwei")).toBe(true);
  });

  it("음력 생일 대운 계산이 대응 양력과 일치한다", () => {
    const solar = Solar.fromYmdHms(1990, 6, 15, 14, 30, 0);
    const lunar = solar.getLunar();
    const solarResult = currentLuck({ year: 1990, month: 6, day: 15, hour: 14, minute: 30, calendar: "solar", gender: "남" }, 2026);
    const lunarResult = currentLuck({
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      hour: 14,
      minute: 30,
      calendar: "lunar",
      isLeapMonth: lunar.getMonth() < 0,
      gender: "남"
    }, 2026);
    expect(lunarResult).toEqual(solarResult);
  });
});

describe("자미두수 유파·삼방사정·운한", () => {
  it("명반에 계산 정책과 각 궁의 삼방사정을 남긴다", () => {
    const chart = computeZiweiChart(recordedBirth);
    expect(chart.lineageProfile.id).toBe("common");
    expect(chart.lineageProfile.algorithm).toBe("default");
    expect(chart.palaces).toHaveLength(12);
    for (const palace of chart.palaces) {
      expect(Object.values(palace.sanfangSizheng).every(Boolean)).toBe(true);
    }
  });

  it("단일 별이 아니라 각 궁의 삼방사정 네 궁 성요·묘왕·사화를 행렬로 푼다", () => {
    const chart = computeZiweiChart(recordedBirth);
    for (const palace of chart.palaces) {
      const matrix = buildZiweiPalaceTopology(chart, palace.name);
      expect(Object.keys(matrix.roles)).toHaveLength(4);
      expect(matrix.roles.target.name).toBe(palace.name);
      expect(matrix.brightnessLedger.length).toBe(matrix.uniqueMajorStars.length);
      expect(matrix.sourceIds).toContain("iztro-astrolabe");
      expect((matrix as unknown as Record<string, unknown>).luckScore).toBeUndefined();
    }
  });

  it("통행판과 중주파를 독립 계산하고 diff 형식을 보존한다", () => {
    const comparison = compareZiweiLineages(recordedBirth);
    expect(comparison.common.lineageProfile.id).toBe("common");
    expect(comparison.zhongzhou.lineageProfile.id).toBe("zhongzhou");
    expect(Array.isArray(comparison.differences)).toBe(true);
  });

  it("대운·소한·유년·유월·유일·유시를 계산한다", () => {
    const horoscope = computeZiweiHoroscope(recordedBirth, { year: 2026, month: 8, day: 20, hour: 12 });
    expect(horoscope.decadal.name).toBeTruthy();
    expect(horoscope.age.nominalAge).toBeGreaterThan(0);
    expect(horoscope.yearly.palaceNames).toHaveLength(12);
    expect(horoscope.monthly.name).toBeTruthy();
    expect(horoscope.daily.name).toBeTruthy();
    expect(horoscope.hourly.name).toBeTruthy();
    expect(horoscope.transformationLayers.map((layer) => layer.layer)).toEqual([
      "natal", "decadal", "age", "yearly", "monthly", "daily", "hourly"
    ]);
    for (const layer of horoscope.transformationLayers) {
      expect(layer.entries.map((entry) => entry.transformation)).toEqual(["록", "권", "과", "기"]);
      expect(layer.entries.every((entry) => entry.star.length > 0)).toBe(true);
      expect(layer.entries.every((entry) => entry.natalPalace && entry.layerPalace)).toBe(true);
    }
    expect(horoscope.transformationLayers[0].sourceStem).toBe("庚");
    expect(horoscope.transformationLayers.find((layer) => layer.layer === "yearly")?.sourceStem).toBe("병");
    expect(horoscope.boundary).toContain("궁간비화");
    expect(ENGINE_CAPABILITIES.ziwei_horoscope.lineage).toContain("층별 사화");
  });

  it("궁간비화 48간선과 자화·화기충 대궁을 공식 십간 사화표로 계산한다", () => {
    const graph = computeZiweiPalaceFlyingGraph(recordedBirth);
    expect(graph.mutagenProfile.id).toBe("iztro_documented");
    expect(Object.keys(ZIWEI_MUTAGEN_PROFILES.iztro_documented.table)).toHaveLength(10);
    expect(ZIWEI_MUTAGEN_PROFILES.iztro_documented.table.甲).toEqual(["廉貞", "破軍", "武曲", "太陽"]);
    expect(graph.edges).toHaveLength(48);
    expect(graph.jiClashes).toHaveLength(12);
    for (const sourcePalace of new Set(graph.edges.map((edge) => edge.sourcePalace))) {
      const edges = graph.edges.filter((edge) => edge.sourcePalace === sourcePalace);
      expect(edges.map((edge) => edge.transformation)).toEqual(["록", "권", "과", "기"]);
      expect(edges.every((edge) => edge.transformedStar && edge.targetPalace && edge.targetBranch)).toBe(true);
    }
    expect(graph.selfTransformations.every((edge) => edge.sourcePalace === edge.targetPalace)).toBe(true);
    expect(graph.boundary).toContain("자동 혼합하지 않는다");
    expect(ENGINE_CAPABILITIES.ziwei_palace_flying.maturity).toBe("verified_calculation");
  });

  it("전서 원문·iztro 문서·중주계 사화표를 섞지 않고 각각 계산한다", () => {
    expect(ZIWEI_MUTAGEN_PROFILES.quanshu_wikisource.table.庚).toEqual(["太陽", "武曲", "天同", "太陰"]);
    expect(ZIWEI_MUTAGEN_PROFILES.quanshu_wikisource.table.壬).toEqual(["天梁", "紫微", "天府", "武曲"]);
    expect(ZIWEI_MUTAGEN_PROFILES.iztro_documented.table.庚).toEqual(["太陽", "武曲", "太陰", "天同"]);
    expect(ZIWEI_MUTAGEN_PROFILES.iztro_documented.table.壬).toEqual(["天梁", "紫微", "左輔", "武曲"]);
    expect(ZIWEI_MUTAGEN_PROFILES.zhongzhou_wanli.table.戊).toEqual(["貪狼", "太陰", "太陽", "天機"]);
    expect(ZIWEI_MUTAGEN_PROFILES.zhongzhou_wanli.table.庚).toEqual(["太陽", "武曲", "天府", "天同"]);

    const comparison = compareZiweiPalaceFlyingProfiles(recordedBirth);
    expect(Object.keys(comparison.graphs)).toHaveLength(3);
    expect(Object.values(comparison.graphs).every((profile) => profile.edges.length === 48)).toBe(true);
    expect(comparison.differences.length).toBeGreaterThan(0);
    expect(comparison.differences.every((difference) => new Set(Object.values(difference.values).map((value) => `${value.star}:${value.targetPalace}`)).size > 1)).toBe(true);
    expect(comparison.boundary).toContain("다수결하지 않고");
    expect(ENGINE_SOURCE_BY_ID["wanli-doushu-volume-five"]?.uri).toContain("wanlibk.com");
  });

  it("번역된 궁·성요 이름에서도 같은 사화표의 48간선을 보존한다", () => {
    const korean = computeZiweiPalaceFlyingGraph(recordedBirth, "ko-KR", "common", "quanshu_wikisource");
    const traditionalChinese = computeZiweiPalaceFlyingGraph(recordedBirth, "zh-TW", "common", "quanshu_wikisource");
    expect(korean.edges).toHaveLength(48);
    expect(traditionalChinese.edges).toHaveLength(48);
    expect(korean.edges.map((edge) => `${edge.sourcePalaceIndex}:${edge.transformation}:${edge.targetPalaceIndex}`))
      .toEqual(traditionalChinese.edges.map((edge) => `${edge.sourcePalaceIndex}:${edge.transformation}:${edge.targetPalaceIndex}`));
  });

  it("대만 비성의 이심·향심 자화와 내인궁을 궁간 간선에서 재현한다", () => {
    const layer = computeZiweiQintianStructuralLayer(recordedBirth);
    expect(layer.natalYearStem).toBe("庚");
    expect(layer.laiyinPalace.heavenlyStem).toBe("庚");
    expect(layer.laiyinPalace.name).toBe("부모");
    expect(layer.outwardSelfTransformations.every((edge) => edge.sourcePalaceIndex === edge.targetPalaceIndex)).toBe(true);
    expect(layer.inwardSelfTransformations.every((edge) => (edge.sourcePalaceIndex + 6) % 12 === edge.targetPalaceIndex)).toBe(true);
    expect(layer.bodyTransformations.map((entry) => entry.transformation)).toEqual(["록", "권", "과", "기"]);
    expect(layer.faxiangLinks).toHaveLength(layer.outwardSelfTransformations.length + layer.inwardSelfTransformations.length);
    expect(layer.faxiangLinks.every((link) => link.body.star && link.use.star)).toBe(true);
    expect(layer.faxiangLinks.every((link) => link.body.palaceIndex >= 0 && link.body.palaceIndex < 12)).toBe(true);
    expect(layer.seriesChains.every((chain) => chain.faxiangLinkIds.length > 0)).toBe(true);
    expect(layer.sourceIds).toContain("baipai-flying-manual");
    expect(layer.sourceIds).toContain("qintian-tiyong-faxiang");
    expect(layer.sourceIds).toContain("iztro-laiyin-palace");
    expect(layer.boundary).toContain("생년 사화를 체");
    expect(ENGINE_CAPABILITIES.ziwei_palace_flying.lineage).toContain("체용법상");
  });

  it("운한 사화는 체·용 법상과의 구조 접촉까지만 계산한다", () => {
    const layer = computeZiweiQintianActivationLayer(recordedBirth, { year: 2026, month: 8, day: 21 });
    expect(layer.activations).toHaveLength(24);
    expect(new Set(layer.activations.map((activation) => activation.layer))).toEqual(
      new Set(["decadal", "age", "yearly", "monthly", "daily", "hourly"])
    );
    expect(layer.activations.every((activation) => activation.sameKindFaxiangLinkIds.length > 0)).toBe(true);
    expect(layer.boundary).toContain("사건을 자동 판정하지 않는다");
  });

  it("신·임년 중복 궁간에서는 자·축을 제외하고 묘·인을 내인궁으로 취한다", () => {
    const xin = computeZiweiQintianStructuralLayer({ year: 1991, month: 3, day: 14, hour: 7, gender: "여" });
    const ren = computeZiweiQintianStructuralLayer({ year: 1993, month: 1, day: 9, hour: 3, gender: "여" });
    expect(`${xin.laiyinPalace.heavenlyStem}${xin.laiyinPalace.earthlyBranch}`).toBe("辛卯");
    expect(`${ren.laiyinPalace.heavenlyStem}${ren.laiyinPalace.earthlyBranch}`).toBe("壬寅");
    expect(xin.boundary).toContain("자·축");
  });

  it("고전 궁·동궁 조건이 실제로 맞은 조합만 발동한다", () => {
    const chart = computeZiweiChart({ year: 1990, month: 1, day: 1, hour: 4, gender: "여" });
    const doctrine = evaluateZiweiDoctrine(chart);
    expect(doctrine.evaluatedRuleCount).toBe(170);
    expect(doctrine.matches.map((match) => match.ruleId)).toContain("ZW-CAREER-ZIWEI-TIANFU");
    expect(doctrine.matches.every((match) => match.sourceLocator.section.length > 0)).toBe(true);
  });

  it("권2 십이궁 주성 163개를 출처 위치와 문맥 조건으로 실행한다", () => {
    expect(ZIWEI_PALACE_DOCTRINE_RULES).toHaveLength(163);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.filter((rule) => rule.domain === "wealth")).toHaveLength(26);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.some((rule) => rule.id === "ZW2-WEALTH-칠살")).toBe(false);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.filter((rule) => rule.domain === "career")).toHaveLength(42);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.filter((rule) => rule.domain === "relationship")).toHaveLength(14);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.filter((rule) => rule.domain === "family")).toHaveLength(42);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.filter((rule) => rule.domain === "health")).toHaveLength(12);
    expect(ZIWEI_PALACE_DOCTRINE_RULES.filter((rule) => rule.domain === "identity")).toHaveLength(27);
    expect(Object.values(ZIWEI_REMAINING_PALACE_RULE_COUNTS).reduce((sum, count) => sum + count, 0)).toBe(122);
    expect(new Set(ZIWEI_PALACE_DOCTRINE_RULES.map((rule) => rule.id)).size).toBe(163);

    const doctrine = evaluateZiweiDoctrine(computeZiweiChart({
      year: 1940, month: 8, day: 2, hour: 8, minute: 17,
      calendar: "solar", gender: "여", birthTimeAccuracy: "recorded"
    }));
    const wealth = doctrine.matches.find((match) => match.ruleId === "ZW2-WEALTH-태음");
    const relationship = doctrine.matches.find((match) => match.ruleId === "ZW2-RELATIONSHIP-천동");
    expect(wealth?.palace).toBe("재백");
    expect(wealth?.contextFindings.some((finding) => finding.includes("묘왕도"))).toBe(true);
    expect(wealth?.contextFindings.some((finding) => finding.includes("생년사화"))).toBe(true);
    expect(wealth?.sourceLocator.section).toBe("권2·오재백·태음");
    expect(relationship?.palace).toBe("부처");
    expect(relationship?.matchedStars).toContain("거문");
    expect(relationship?.contextFindings.some((finding) => finding.includes("천동:화기"))).toBe(true);
    const health = doctrine.matches.find((match) => match.ruleId.startsWith("ZW2-HEALTH-"));
    expect(health?.boundary).toContain("의료 진단");
    expect(ENGINE_CAPABILITIES.ziwei_doctrine.lineage).toContain("163개");
  });

  it("163개 권2 규칙이 실제 명반 조건에서 모두 도달한다", () => {
    const fixtures = [
      [1, 8, 4], [2, 8, 4], [1, 1, 12], [1, 1, 20], [1, 8, 0], [1, 8, 20], [2, 1, 8],
      [2, 15, 20], [1, 1, 16], [1, 15, 0], [2, 22, 0], [1, 15, 16], [1, 22, 16], [2, 15, 16]
    ] as const;
    const reachable = new Set<string>();
    for (const [month, day, hour] of fixtures) {
      const doctrine = evaluateZiweiDoctrine(computeZiweiChart({
        year: 1980, month, day, hour, gender: "남", calendar: "solar"
      }));
      for (const match of doctrine.matches) {
        if (match.ruleId.startsWith("ZW2-")) reachable.add(match.ruleId);
      }
    }
    expect(reachable).toEqual(new Set(ZIWEI_PALACE_DOCTRINE_RULES.map((rule) => rule.id)));
  });
});

describe("cross-system life dossier", () => {
  it("질문 시각이 있는 기문·육임 요청은 두 계산판을 서로 다른 claim으로 라우팅한다", () => {
    const dossier = buildLifeDossier({
      birth: recordedBirth,
      question: "기문과 대육임으로 이 결정 시각을 계산",
      targetDate: { year: 2026, month: 1, day: 14, hour: 18, minute: 45 }
    });
    expect(dossier.routes.map((route) => route.capability.id)).toEqual(expect.arrayContaining(["gimun", "yukim"]));
    expect(dossier.claims.some((claim) => claim.capabilityId === "gimun" && claim.system === "gimun")).toBe(true);
    expect(dossier.claims.some((claim) => claim.capabilityId === "yukim" && claim.system === "yukim")).toBe(true);
    expect(dossier.claims.find((claim) => claim.capabilityId === "yukim")?.sourceIds).toContain("yukim-closed-720-table");
  });

  it("윤달 모호성 같은 차단 입력은 통합 진입점에서도 하위 계산을 시작하지 않는다", () => {
    const dossier = buildLifeDossier({
      birth: { year: 2023, month: 2, day: 3, calendar: "lunar", hour: 10, gender: "여" },
      question: "전체 인생"
    });
    expect(dossier.claims).toHaveLength(0);
    expect(dossier.blockedSystems.length).toBeGreaterThan(0);
    expect(dossier.interpretationBoundary).toContain("시작하지 않았다");
  });

  it("연도별 대운·세운과 자미 운한을 한 시간축에 놓되 길흉 점수를 만들지 않는다", () => {
    const timeline = buildLifeTimeline(recordedBirth, { startYear: 2026, endYear: 2028 });
    expect(timeline.years).toHaveLength(3);
    expect(timeline.years.every((year) => year.daYun && year.seYun && year.ziwei.yearly.name)).toBe(true);
    expect(timeline.years.every((year) => year.myeongriTransitRoles.length === 2)).toBe(true);
    expect(timeline.years.every((year) => year.ziwei.transformations.length === 8)).toBe(true);
    expect(timeline.years.every((year) => year.domainWindows.length > 0)).toBe(true);
    expect(timeline.years.some((year) => year.domainWindows.some((window) => window.coverage === "parallel_evidence"))).toBe(true);
    expect(timeline.years.every((year) => (year as unknown as Record<string, unknown>).score === undefined)).toBe(true);
    expect(timeline.years.flatMap((year) => year.domainWindows).every((window) =>
      (window as unknown as Record<string, unknown>).auspiciousness === undefined
    )).toBe(true);
    expect(timeline.boundary).toContain("점수화하지 않는다");
  });

  it("대운과 세운의 합충형파해를 원국 접촉과 별도 층으로 보존한다", () => {
    const contacts = transitPairInteractions("甲子", "己丑");
    expect(contacts).toContainEqual(expect.objectContaining({ relation: "stem_combine", tokens: "甲己" }));
    expect(contacts).toContainEqual(expect.objectContaining({ relation: "branch_combine", tokens: "子丑" }));
    expect(contacts.every((contact) => contact.left === "da_yun" && contact.right === "annual")).toBe(true);
  });

  it("출생시각이 알려진 과거 사건은 당시 영역 자료의 유무만 대조한다", () => {
    const validation = buildLifeEventValidationMatrix(recordedBirth, [
      { year: 2026, month: 6, domain: "career", description: "합성 직무 전환" },
      { year: 2026, month: 7, domain: "relationship", description: "합성 공동 프로젝트 시작" }
    ]);
    expect(validation.entries).toHaveLength(2);
    expect(validation.entries.every((entry) => entry.coverage !== "not_covered")).toBe(true);
    expect(validation.entries.some((entry) => entry.coverage === "parallel_evidence")).toBe(true);
    expect((validation as unknown as Record<string, unknown>).accuracy).toBeUndefined();
    expect(validation.boundary).toContain("맞혔다는 뜻이 아니고");
  });

  it("과거 사건은 13개 시각 후보의 서명을 비교하고 정답 후보를 자동 선정하지 않는다", () => {
    const matrix = buildBirthTimeRectificationMatrix(
      { year: 1991, month: 2, day: 2, calendar: "solar", gender: "남", birthTimeAccuracy: "unknown" },
      [{ year: 2024, domain: "education", description: "합성 학업 경로 변경" }]
    );
    expect(matrix.candidates).toHaveLength(13);
    expect(matrix.equivalenceGroups.length).toBeGreaterThan(0);
    expect((matrix as unknown as Record<string, unknown>).bestCandidate).toBeUndefined();
    expect(matrix.boundary).toContain("정답 순위");
  });

  it("질문 영역에 명리와 자미 근거를 병렬 배치한다", () => {
    const dossier = buildLifeDossier({
      birth: recordedBirth,
      question: "직업과 재물, 연애 결혼, 앞으로 3년 운세",
      targetDate: { year: 2026, month: 8, day: 20, hour: 12 }
    });
    expect(dossier.claims.some((claim) => claim.system === "myeongri" && claim.domain === "career")).toBe(true);
    expect(dossier.claims.some((claim) => claim.system === "ziwei" && claim.domain === "career")).toBe(true);
    expect(dossier.routes.map((route) => route.capability.id)).toContain("myeongri_judgment");
    expect(dossier.claims.some((claim) => claim.capabilityId === "myeongri_judgment" && claim.statement.includes("왕쇠 상태"))).toBe(true);
    expect(dossier.claims.some((claim) => claim.capabilityId === "myeongri_judgment" && claim.statement.includes("성패 장치"))).toBe(true);
    expect(dossier.synthesis.find((item) => item.domain === "career")?.status).toBe("parallel_evidence");
    expect(dossier.claims.every((claim) => claim.sourceIds.length > 0)).toBe(true);
    expect(dossier.knowledgeAssets?.assets.length).toBeGreaterThan(0);
    expect(dossier.routes.map((route) => route.capability.id)).toContain("knowledge_asset_router");
    expect(dossier.timeline?.years).toHaveLength(3);
    expect(dossier.claims.some((claim) => claim.capabilityId === "life_timeline")).toBe(true);
    expect(dossier.claims.some((claim) =>
      claim.capabilityId === "ziwei_palace_flying" && claim.statement.includes("운한 사화")
    )).toBe(true);
  });

  it("알려진 시각의 과거 사건 검증을 시각 후보 보정과 다른 capability로 라우팅한다", () => {
    const dossier = buildLifeDossier({
      birth: recordedBirth,
      question: "과거 취업과 연애 사건 검증",
      lifeEvents: [
        { year: 2026, month: 6, domain: "career", description: "취업" },
        { year: 2026, month: 7, domain: "relationship", description: "공동 프로젝트 시작" }
      ]
    });
    expect(dossier.routes.map((route) => route.capability.id)).toContain("event_validation_matrix");
    expect(dossier.routes.map((route) => route.capability.id)).not.toContain("event_rectification_matrix");
    expect(dossier.eventValidation?.entries).toHaveLength(2);
    expect(dossier.claims.some((claim) => claim.capabilityId === "event_validation_matrix")).toBe(true);
  });

  it("궁합 질문은 일지 한 쌍이 아니라 양 원국 전체 교차를 라우팅한다", () => {
    const dossier = buildLifeDossier({
      birth: recordedBirth,
      partnerBirth: {
        year: 1939, month: 7, day: 29, hour: 11, minute: 5,
        calendar: "solar", gender: "남", birthTimeAccuracy: "recorded"
      },
      question: "연애와 결혼 궁합"
    });
    const claim = dossier.claims.find((item) => item.capabilityId === "compatibility");
    expect(claim?.maturity).toBe("bounded_calculation");
    expect(claim?.confidence).toBe("medium");
    expect(claim?.statement).toContain("양 원국 4×4");
    expect(claim?.observations).toContain("일간·배우자궁 우선 접촉 supportive_only");
    expect(claim?.observations).toContain("양 원국 전체 교차 mixed");
    expect(claim?.sourceIds).toContain("di-tian-sui-chan-wei");
  });

  it("시간 미상은 자미·완전 명리 구조를 blocked로 남기고 계산하지 않는다", () => {
    const dossier = buildLifeDossier({
      birth: { year: 1991, month: 2, day: 2, calendar: "solar", gender: "남", birthTimeAccuracy: "unknown" },
      question: "전체 인생과 직업 재물"
    });
    expect(dossier.blockedSystems.map((item) => item.capabilityId)).toContain("myeongri_structure");
    expect(dossier.blockedSystems.map((item) => item.capabilityId)).toContain("ziwei_topology");
    expect(dossier.claims.some((claim) => claim.capabilityId === "myeongri_time_envelope")).toBe(true);
    expect(dossier.claims.some((claim) => claim.system === "ziwei")).toBe(false);
  });
});
