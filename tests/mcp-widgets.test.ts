import { describe, expect, it } from "vitest";
import {
  buildCompatibilityCardPayload,
  buildFortuneCardsPayload,
  buildLuckTimelinePayload,
  buildNatalCardPayload,
} from "../src/mcp-render";
import {
  COMPATIBILITY_CARD_HTML,
  FORTUNE_CARDS_HTML,
  LUCK_TIMELINE_HTML,
  NATAL_CARD_HTML,
  WIDGET_URIS,
} from "../src/widgets/widget-html";
import { runFortuneCardsTool, runNatalCardTool } from "../src/mcp";

const birth = { year: 1991, month: 3, day: 14, hour: 7, minute: 0, gender: "여" as const };
const partner = { year: 1989, month: 8, day: 17, hour: 11, minute: 0, gender: "남" as const };

describe("ChatGPT Apps widget payloads", () => {
  it("builds a natal card with pillars, elements, verdicts, and sinsal", () => {
    const payload = buildNatalCardPayload(birth, { headline: "표현으로 여는 사주" }) as any;
    expect(payload.widget).toBe("saju-natal-card");
    expect(payload.pillars.day.gan).toBe("癸");
    expect(payload.dayMaster.label).toContain("일간");
    expect(Object.keys(payload.elements.weights)).toHaveLength(5);
    expect(payload.verdicts.geokguk.label).toContain("격");
    expect(Array.isArray(payload.sinsal)).toBe(true);
    expect(payload.narrative.headline).toBe("표현으로 여는 사주");
    expect(payload.disclaimer.length).toBeGreaterThan(0);
  });

  it("builds fortune cards with engine luck facts and clamps model scores", () => {
    const payload = buildFortuneCardsPayload(birth, [
      { domain: "재물운", score: 9, text: "결과물을 수입으로 잇는 흐름." },
      { domain: "연애운", text: "서두르지 않는 편이 좋다." },
    ], { asOfYear: 2026, actions: [{ title: "물건 정리" }] }) as any;
    expect(payload.widget).toBe("saju-fortune-cards");
    expect(payload.luck.year).toBe(2026);
    expect(payload.luck.daYun).toMatch(/^[一-鿿]{2}$/);
    expect(payload.cards[0].score).toBe(5);
    expect(payload.cards[1].score).toBeUndefined();
    expect(payload.verdictChips.length).toBe(3);
  });

  it("builds a compatibility card with typed deterministic signals", () => {
    const payload = buildCompatibilityCardPayload(birth, partner, { nameA: "나", nameB: "상대", score: 4 }) as any;
    expect(payload.widget).toBe("saju-compatibility-card");
    expect(payload.personA.dayGan).toBe("癸");
    expect(payload.signals.length).toBeGreaterThan(0);
    expect(payload.signals.every((signal: any) => typeof signal.type === "string" && signal.text.length > 0)).toBe(true);
  });

  it("builds a luck timeline with exactly one current 대운 and a focus year", () => {
    const payload = buildLuckTimelinePayload(birth, { asOfYear: 2026, focusYear: 2027, focusNote: "이직 후보 해" }) as any;
    expect(payload.widget).toBe("saju-luck-timeline");
    expect(payload.daYun.length).toBeGreaterThanOrEqual(7);
    expect(payload.daYun.filter((step: any) => step.current)).toHaveLength(1);
    expect(payload.focus.year).toBe(2027);
    expect(payload.focus.seYun).toMatch(/^[一-鿿]{2}$/);
    expect(payload.seYun).toBe("丙午");
  });

  it("requires gender for the luck timeline", () => {
    expect(() => buildLuckTimelinePayload({ ...birth, gender: undefined }, {})).toThrow("GENDER_REQUIRED");
  });
});

describe("widget MCP tools", () => {
  it("returns widget structuredContent from the natal card tool", () => {
    const result = runNatalCardTool({ birth });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent.widget).toBe("saju-natal-card");
  });

  it("surfaces engine errors as tool errors", () => {
    const result = runFortuneCardsTool({ birth: { ...birth, gender: undefined }, cards: [{ domain: "총운", text: "x" }] });
    expect(result.isError).toBe(true);
  });
});

describe("widget HTML resources", () => {
  const pages = [NATAL_CARD_HTML, FORTUNE_CARDS_HTML, COMPATIBILITY_CARD_HTML, LUCK_TIMELINE_HTML];

  it("are self-contained skybridge documents", () => {
    for (const html of pages) {
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("window.openai");
      expect(html).toContain("openai:set_globals");
      expect(html).not.toMatch(/src\s*=\s*"http/);
      expect(html).not.toMatch(/href\s*=\s*"http/);
    }
  });

  it("registers matching ui:// URIs", () => {
    expect(Object.values(WIDGET_URIS).every((uri) => uri.startsWith("ui://widget/"))).toBe(true);
    expect(new Set(Object.values(WIDGET_URIS)).size).toBe(4);
  });
});
