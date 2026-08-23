import { describe, expect, it } from "vitest";
import {
  analyze,
  getEngineManifest,
  query,
  LEGEND_SAJU_ENGINE_VERSION,
} from "../src/engine/public-entry";

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

describe("stable Legend Saju public entry", () => {
  it("describes the same capability surface without side effects", () => {
    const manifest = getEngineManifest();
    expect(manifest.version).toBe(LEGEND_SAJU_ENGINE_VERSION);
    expect(manifest.capabilityCount).toBe(Object.keys(manifest.capabilities).length);
    expect(manifest.capabilityCount).toBeGreaterThanOrEqual(42);
    expect(manifest.legacyIntentCount).toBe(26);
    expect(manifest.knowledge).toEqual({
      factCount: 777,
      areaCount: 36,
      trilingualTermCount: 777,
      sipsinIlganCellCount: 100,
      runtimeStorage: "embedded_typed_constants",
    });
    expect(manifest.deterministic).toBe(true);
    expect(manifest.publicationSideEffects).toBe(false);
  });

  it("routes the current intent caller through the facade", () => {
    const result = query({ intent: "chart", birth });
    expect(result.ok).toBe(true);
    expect(result.intent).toBe("chart");
  });

  it("routes question-first analysis through the facade", () => {
    const result = analyze({
      birth,
      question: "직업과 재물, 연애 결혼, 앞으로 3년 운세",
      targetDate: { year: 2026, month: 8, day: 23, hour: 12 },
      timelineRange: { startYear: 2026, endYear: 2028 },
    });
    expect(result.claims.length).toBeGreaterThan(0);
    expect(result.timeline?.years).toHaveLength(3);
    expect(result.interpretationBoundary).toContain("계산값");
  });
});
