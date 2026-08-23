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

  it("accepts runtime string IDs without exposing a capability enum", () => {
    const result = resolve({
      question: "철판신수를 다른 체계와 같이 보고 싶다",
      birth,
      questionDateTime: { year: 2026, month: 8, day: 23, hour: 13 },
      requestedCapabilities: ["cheolpan_shenshu", "future_capability_not_yet_shipped"],
      maxAutoCapabilities: 0,
    });

    expect(result.selection.selected).toContain("cheolpan_shenshu");
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

  it("exposes a server factory and searchable live manifest", async () => {
    expect(createLegendSajuMcpServer()).toBeDefined();
    const manifest = await runManifestTool();
    expect((manifest.structuredContent.naming as any).dataset.counts.officialEntries).toBe(9495);
    const result = runCapabilitySearchTool({ query: "자미두수 비성", limit: 8 });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain("ziwei_palace_flying");
  });
});
