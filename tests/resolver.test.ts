import { describe, expect, it } from "vitest";
import {
  resolve,
  resolveAsync,
  searchCapabilities,
} from "../src/engine/public-entry";
import {
  createLegendSajuMcpServer,
  runCapabilitySearchTool,
  runLegendSajuResolveTool,
  runManifestTool,
} from "../src/mcp";

const birth = {
  year: 1990,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  calendar: "solar" as const,
  gender: "여" as const,
  birthTimeAccuracy: "recorded" as const,
};

describe("open-ended resolver", () => {
  it("discovers specialized methods from a natural-language question", () => {
    const hits = searchCapabilities({ query: "철판신수 질문 시각 숫자표", limit: 5 });
    expect(hits.map((hit) => hit.id)).toContain("cheolpan_shenshu");
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it("discovers each domain in a broad English request", () => {
    const hits = searchCapabilities({ query: "career, wealth, marriage, and luck for the next 3 years", limit: 30 });
    const domains = new Set(hits.flatMap((hit) => hit.capability.domains));
    expect(domains.has("career")).toBe(true);
    expect(domains.has("wealth")).toBe(true);
    expect(domains.has("relationship")).toBe(true);
    expect(domains.has("timing")).toBe(true);
  });

  it("treats saju as a Myeongri system alias and returns real source metadata", () => {
    const hits = searchCapabilities({
      query: "사용자의 현재 운세와 올해 운세를 사주로 풀이하려면 어떤 기능이 필요한가",
      systems: ["saju"],
      limit: 20,
    });

    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.capability.system === "myeongri")).toBe(true);
    expect(hits.map((hit) => hit.id)).toContain("current_luck");
    expect(hits.some((hit) => hit.sources.length > 0)).toBe(true);
  });

  it("keeps an ordinary wealth reading on a focused execution plan", () => {
    const result = resolve({
      question: "올해 재물운과 사업운을 봐줘",
      birth,
      targetDate: { year: 2026, month: 8, day: 23 },
    });

    expect(result.executionPlan.entryIntent).toBe("general_reading");
    expect(result.selection.selected).toEqual([
      "chart",
      "myeongri_structure",
      "myeongri_judgment",
      "current_luck",
    ]);
    expect(result.routes.map((route) => route.capability.id).sort()).toEqual([...result.selection.selected].sort());
    expect(result.selection.selected).not.toContain("taekil");
    expect(result.selection.selected).not.toContain("gaeun");
    expect(result.selection.selected).not.toContain("ziwei_gaeun");
  });

  it("treats a generic fortune request as broad while keeping its engine set bounded", () => {
    const result = resolve({
      question: "내 운세 봐줘",
      birth,
      targetDate: { year: 2026, month: 8, day: 23 },
    });

    expect(result.executionPlan.domains).toEqual(["identity", "career", "wealth", "relationship", "family", "timing"]);
    expect(result.selection.selected).toContain("myeongri_judgment");
    expect(result.selection.selected).toContain("ziwei_topology");
    expect(result.selection.selected).toContain("ziwei_doctrine");
    expect(result.selection.selected).not.toContain("taekil");
    expect(result.selection.selected).not.toContain("recommend");
  });

  it("adds action guidance without silently turning it into date selection", () => {
    const result = resolve({
      question: "재물운을 보고 구체적 액션도 알려줘",
      birth,
    });

    expect(result.selection.selected).toContain("recommend");
    expect(result.selection.selected).not.toContain("taekil");
  });

  it("does not route an unused extra person into an unrelated reading", () => {
    const result = resolve({
      question: "내 올해 재물운을 봐줘",
      birth,
      partnerBirth: { ...birth, year: 1992, gender: "남" },
      targetDate: { year: 2026, month: 8, day: 23 },
      entryIntent: "general_reading",
    });

    expect(result.selection.selected).not.toContain("compatibility");
  });

  it("routes explicit date selection through its dedicated plan", () => {
    const result = resolve({
      question: "개업하기 좋은 날을 골라줘",
      entryIntent: "date_selection",
      birth,
      targetDate: { year: 2026, month: 9, day: 1 },
      rangeDays: 14,
    });

    expect(result.selection.selected).toEqual(["taekil", "date_yinyang"]);
    expect(result.selection.selected).not.toContain("myeongri_judgment");
  });

  it("accepts runtime string IDs without exposing a capability enum", () => {
    const result = resolve({
      question: "철판신수를 다른 체계와 같이 보고 싶다",
      birth,
      questionDateTime: { year: 2026, month: 8, day: 23, hour: 13 },
      requestedCapabilities: ["cheolpan_shenshu", "future_capability_not_yet_shipped"],
    });

    expect(result.selection.selected).toEqual(["cheolpan_shenshu"]);
    expect(result.selection.unsupported).toEqual(["future_capability_not_yet_shipped"]);
    expect(result.dossier?.claims.some((claim) => claim.capabilityId === "cheolpan_shenshu")).toBe(true);
    expect(result.noModelCalls).toBe(true);
    expect(result.publicationSideEffects).toBe(false);
  });

  it("supports useful calculations without birth data", () => {
    const result = resolve({
      question: "이 날의 일진과 절기 음양을 보자",
      targetDate: { year: 2026, month: 8, day: 23 },
      requestedCapabilities: ["date_yinyang"],
      maxAutoCapabilities: 0,
    });

    expect(result.dossier).toBeUndefined();
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].ok).toBe(true);
  });

  it("routes synthetic name characters through the full official-entry engine", async () => {
    const result = await resolveAsync({
      question: "합성 이름 한자와 획수 출처를 확인해줘",
      name: {
        surname: [{ character: "洪", expectedReading: "홍", declaredStrokeCount: 10 }],
        givenName: [
          { character: "哲", expectedReading: "철", declaredStrokeCount: 10 },
          { character: "榮", expectedReading: "영", declaredStrokeCount: 14 },
        ],
        declaredStrokeStandard: "호출자 선언 강희 원획",
      },
      maxAutoCapabilities: 0,
    });

    expect(result.selection.selected).toContain("korean_name_analysis");
    expect(result.routes.find((route) => route.capability.id === "korean_name_analysis")?.status).toBe("available");
    expect(result.nameAnalysis?.legalIdentityStatus).toBe("all_official_eligible");
    expect(result.nameAnalysis?.fiveGrid.status).toBe("calculated_from_caller_declared_strokes");
    expect(result.nameAnalysis?.engine.separateFromSaju).toBe(true);
  });

  it("rejects impossible target dates instead of fabricating a calendar result", () => {
    expect(() => resolve({
      question: "이 날의 일진을 보자",
      targetDate: { year: 2026, month: 2, day: 30 },
      requestedCapabilities: ["date_yinyang"],
      maxAutoCapabilities: 0,
    })).toThrow("INVALID_TARGET_DATE");
  });

  it("returns an impossible birth date as a structured blocked route", async () => {
    const input = {
      question: "원국을 봐줘",
      birth: { year: 2000, month: 2, day: 30, hour: 10, calendar: "solar" as const },
      requestedCapabilities: ["chart"],
      maxAutoCapabilities: 0,
    };
    const result = resolve(input);
    const route = result.routes.find((item) => item.capability.id === "chart");
    expect(route?.status).toBe("blocked");
    expect(route?.inputAudit?.issues).toContainEqual(expect.objectContaining({ code: "INVALID_BIRTH_DATE", severity: "blocking" }));
    expect(result.evidence[0].ok).toBe(false);

    const mcpResult = await runLegendSajuResolveTool(input);
    expect(mcpResult.isError).not.toBe(true);
    expect(JSON.stringify(mcpResult.structuredContent)).toContain("INVALID_BIRTH_DATE");
  });
});

describe("token-free MCP handlers", () => {
  it("returns structured results without a model call", async () => {
    const result = await runLegendSajuResolveTool({
      question: "일진 음양",
      targetDate: { year: 2026, month: 8, day: 23 },
      requestedCapabilities: ["date_yinyang"],
      maxAutoCapabilities: 0,
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.noModelCalls).toBe(true);
  });

  it("returns a bounded consumer payload while retaining a full debug mode", async () => {
    const input = {
      question: "올해 재물운과 사업운을 봐줘",
      birth,
      targetDate: { year: 2026, month: 8, day: 23 },
    };
    const consumer = await runLegendSajuResolveTool({ ...input, maxClaims: 4 });
    const debug = await runLegendSajuResolveTool({ ...input, outputMode: "debug" });
    const consumerClaims = consumer.structuredContent.claims as unknown[];
    const highlights = (consumer.structuredContent.readingSummary as { highlights: string[] }).highlights;

    expect(consumerClaims.length).toBeLessThanOrEqual(4);
    expect(new Set(highlights).size).toBe(highlights.length);
    expect(JSON.stringify(consumer.structuredContent).length).toBeLessThan(50_000);
    expect(debug.structuredContent.dossier).toBeDefined();
    expect(JSON.stringify(debug.structuredContent).length).toBeGreaterThan(JSON.stringify(consumer.structuredContent).length);
  });

  it("returns meaning-first consumer sections linked to evidence claims", async () => {
    const result = await runLegendSajuResolveTool({
      question: "직업과 재물, 연애 결혼, 앞으로 3년을 종합적으로 봐줘",
      birth,
      targetDate: { year: 2026, month: 8, day: 23 },
      timelineRange: { startYear: 2026, endYear: 2028 },
    });
    const summary = result.structuredContent.readingSummary as { summary: string; highlights: string[] };
    const sections = result.structuredContent.sections as Record<string, { interpretations: Array<{ text: string; evidenceClaimIds: string[]; sourceRefs: string[] }> }>;
    const timeline = result.structuredContent.timeline as Array<{ period: string; summary: string; evidenceClaimIds: string[] }>;
    const claims = result.structuredContent.claims as Array<{ kind: string; statement: string }>;

    expect(summary.summary).not.toMatch(/계산했다|기록했다|보존했다/);
    expect(summary.highlights.every((text) => !/계산했다|기록했다|보존했다/.test(text))).toBe(true);
    expect(Object.keys(sections)).toEqual(expect.arrayContaining(["career", "wealth", "relationship", "timing"]));
    expect(sections.wealth.interpretations[0].evidenceClaimIds.length).toBeGreaterThan(0);
    expect(sections.wealth.interpretations[0].sourceRefs.length).toBeGreaterThan(0);
    expect(timeline).toHaveLength(3);
    expect(timeline.every((entry) => entry.evidenceClaimIds.length > 0 && entry.summary.includes(entry.period))).toBe(true);
    expect(claims[0].kind).toBe("heuristic_interpretation");
  });

  it("surfaces input assumptions without silently upgrading birth-time certainty", async () => {
    const { birthTimeAccuracy: _omitted, ...birthWithoutAccuracy } = birth;
    const result = await runLegendSajuResolveTool({
      question: "올해 직업운을 봐줘",
      birth: birthWithoutAccuracy,
      targetDate: { year: 2026, month: 8, day: 23 },
    });
    const inputNotes = result.structuredContent.inputNotes as Array<{ code: string }>;

    expect(inputNotes.map((note) => note.code)).toContain("BIRTH_TIME_SOURCE_UNSPECIFIED");
  });

  it("exposes a server factory and searchable live manifest", async () => {
    expect(createLegendSajuMcpServer()).toBeDefined();
    const manifest = await runManifestTool();
    expect((manifest.structuredContent.naming as any).dataset.counts.officialEntries).toBe(9495);
    const result = runCapabilitySearchTool({ query: "자미두수 비성", limit: 8 });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain("ziwei_palace_flying");
  });
});
