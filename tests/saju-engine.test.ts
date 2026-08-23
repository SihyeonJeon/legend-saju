/** 사주 엔진 결정적 계산 + LLM 라우터 검증. */
import { describe, it, expect } from "vitest";
import { computeSajuChart, analyzeStrength, pickYongsin, deriveSinsal } from "../src/engine/saju-engine";
import { querySajuEngine } from "../src/engine/saju-engine-router";

const birth = { year: 1990, month: 6, day: 15, hour: 14, minute: 30, gender: "남" as const };

describe("saju-engine 결정적 계산", () => {
  it("원국 4주를 정확히 산출(검증된 만세력)", () => {
    const c = computeSajuChart(birth);
    expect(c.pillars.year.gz).toBe("庚午");
    expect(c.pillars.month.gz).toBe("壬午");
    expect(c.pillars.day.gz).toBe("辛亥");
    expect(c.pillars.time.gz).toBe("乙未");
    expect(c.dayMaster.ko).toBe("신");
    expect(c.dayMaster.el).toBe("금");
    expect(c.xunKong.sort()).toEqual(["卯", "寅"].sort());
    expect(c.pillars.day.naYin).toContain("金"); // 钗钏金
  });
  it("십신/십이운성/지장간 일관", () => {
    const c = computeSajuChart(birth);
    // 辛 일간: 年干 庚=겁재, 月干 壬=상관, 時干 乙=편재
    expect(c.pillars.year.shiShenGan).toBe("겁재");
    expect(c.pillars.month.shiShenGan).toBe("상관");
    expect(c.pillars.time.shiShenGan).toBe("편재");
    expect(c.pillars.day.diShi).toBe("목욕"); // 辛(음금) on 亥 = 목욕(역행)
  });
  it("신강신약·용신 heuristic 플래그", () => {
    const st = analyzeStrength(birth as any && computeSajuChart(birth));
    expect(["신강", "중화", "신약"]).toContain(st.verdict);
    expect(st.isHeuristic).toBe(true);
    const ys = pickYongsin(computeSajuChart(birth));
    expect(ys.primary.length).toBeGreaterThanOrEqual(1);
    expect(ys.isHeuristic).toBe(true);
  });
  it("신살 규칙 도출(배열)", () => {
    expect(Array.isArray(deriveSinsal(computeSajuChart(birth)))).toBe(true);
  });
});

describe("querySajuEngine 라우터(LLM 경유 진입점)", () => {
  const intents = ["chart", "strength_yongsin", "sinsal", "relations", "recommend"] as const;
  for (const intent of intents) {
    it(`intent=${intent} 비어있지 않은 grounding + disclaimer`, () => {
      const r = querySajuEngine({ intent, birth });
      expect(r.ok).toBe(true);
      expect(r.groundingText.length).toBeGreaterThan(20);
      expect(r.groundingText).toContain("엔진 산출");
    });
  }
  it("date_yinyang: 일진 간지 + 음양 위상", () => {
    const r = querySajuEngine({ intent: "date_yinyang", date: { year: 2026, month: 6, day: 27 } });
    expect(r.ok).toBe(true);
    expect(r.groundingText).toMatch(/양기|음기/);
  });
  it("compatibility: 두 사주 일주 신호", () => {
    const r = querySajuEngine({ intent: "compatibility", birthA: birth, birthB: { year: 1992, month: 3, day: 3, hour: 9 } });
    expect(r.ok).toBe(true);
    expect((r.data as any).compatibility.signals.length).toBeGreaterThanOrEqual(1);
  });
  it("intent=ziwei: 자미두수 명반 grounding", () => {
    const r = querySajuEngine({ intent: "ziwei", birth });
    expect(r.ok).toBe(true);
    expect(r.groundingText).toContain("자미두수 명반");
    expect((r.data as any).ziwei.palaces.length).toBe(12);
    expect((r.data as any).ziwei.fiveElementsClass.length).toBeGreaterThan(0);
    expect((r.data as any).doctrine.evaluatedRuleCount).toBe(170);
    expect((r.data as any).palaceFlyingProfiles.graphs.iztro_documented.edges).toHaveLength(48);
    expect((r.data as any).qintian.laiyinPalace.name).toBeTruthy();
    expect(r.groundingText).toContain("내인궁");
  });

  it("advanced intents: 십이신살·조후·격국·현재운", () => {
    const ss = querySajuEngine({ intent: "twelve_sinsal", birth });
    expect(ss.ok).toBe(true);
    expect((ss.data as any).twelveSinsal["일지 해"]).toBe("겁살");
    const jh = querySajuEngine({ intent: "joho", birth });
    expect((jh.data as any).joho.need).toContain("수"); // 午월 여름
    expect((jh.data as any).qiongtong.ruleId).toMatch(/^QTB-MONTH-/);
    const gk = querySajuEngine({ intent: "geokguk", birth });
    expect((gk.data as any).geokguk.geok).toContain("칠살"); // 午 본기 丁 vs 辛 = 칠살격
    expect((gk.data as any).qiongtong.sourceLocator.sourceId).toBe("qiongtong-baojian");
    const cl = querySajuEngine({ intent: "current_luck", birth, asOfYear: 2026 });
    expect((cl.data as any).currentLuck.seYun).toBe("丙午");
  });

  it("gaeun: 유형별 세세 개운 행동 강령", () => {
    const r = querySajuEngine({ intent: "gaeun", birth });
    expect(r.ok).toBe(true);
    const g = (r.data as any).gaeun;
    expect(g.actionGuidance.lenses).toHaveLength(3);
    expect(g.actionGuidance.lenses.flatMap((lens: any) => lens.practices).length).toBeGreaterThan(0);
    expect(g.actionGuidance.timing.contacts).toHaveLength(2);
    expect(g.symbolicCandidateElements.every((item: any) => item.causalClaim === false)).toBe(true);
    expect(g.disclaimer).toContain("보장하지 않는다");
  });

  it("종결 intents: 자미 궁별개운·택일·작명", () => {
    const zg = querySajuEngine({ intent: "ziwei_gaeun", birth });
    expect(zg.ok).toBe(true);
    expect((zg.data as any).ziweiGaeun.byPalace.length).toBeGreaterThan(0);
    const tk = querySajuEngine({ intent: "taekil", birth, date: { year: 2026, month: 7, day: 1 }, rangeDays: 30, purpose: "嫁娶" });
    expect(tk.ok).toBe(true);
    expect((tk.data as any).taekil.allDays.length).toBe(30);
    expect((tk.data as any).taekil.policy.id).toBe("calendar-constraint-matrix-v2");
    expect((tk.data as any).taekil.allDays.every((day: any) => day.score === undefined)).toBe(true);
    const nm = querySajuEngine({ intent: "naming", birth });
    expect(nm.ok).toBe(true);
    expect((nm.data as any).naming.myeongriLenses).toHaveLength(3);
    expect((nm.data as any).naming.methodLayers).toHaveLength(3);
    expect((nm.data as any).naming.readyForNaming).toBe(false);
    expect((nm.data as any).naming.recommendInitials).toBeUndefined();
  });

  it("수리성명학: 81수리 4격 + 한자추천", () => {
    const r = querySajuEngine({ intent: "suri", surnameStrokes: [8], givenStrokes: [5, 12] });
    expect(r.ok).toBe(true);
    const d = (r.data as any).suri;
    expect(d.in_.suri).toBe(13);      // 8+5=13 人格
    expect(d.chong.suri).toBe(25);    // 8+5+12=25 總格
    expect(d.aggregateVerdict).toBeNull();
    expect(d.grade).toBeUndefined();
    expect(d.policy.tableStatus).toBe("local_table_not_line_by_line_validated_against_primary_text");
    const nh = querySajuEngine({ intent: "naming_hanja", birth });
    const namingHanja = (nh.data as any).namingHanja;
    expect(namingHanja.myeongriLenses).toHaveLength(3);
    expect(namingHanja.readyForNaming).toBe(false);
    expect(namingHanja.goodChongNumbers).toBeUndefined();
    expect(namingHanja.researchCandidatesByElement.flatMap((group: any) => group.candidates)
      .every((candidate: any) => candidate.legalEligibility === "unverified")).toBe(true);
  });

  it("심화 개운 비보: 오행별 상세", () => {
    const r = querySajuEngine({ intent: "gaeun_pro", birth });
    expect(r.ok).toBe(true);
    const d = (r.data as any).gaeunPro;
    expect(d.symbolicCorrespondences.length).toBeGreaterThan(0);
    expect(d.symbolicCorrespondences[0].detail.보석).toBeTruthy();
    expect(d.symbolicCorrespondences[0].detail.비보물).toBeTruthy();
    expect(d.symbolicCorrespondences.every((item: any) => item.causalClaim === false)).toBe(true);
  });

  it("구성기학 본명성", () => {
    const r = querySajuEngine({ intent: "gusung", birth });
    expect(r.ok).toBe(true);
    expect((r.data as any).gusung.star).toBeGreaterThanOrEqual(1);
    expect((r.data as any).gusung.name).toContain("星");
  });

  it("점술 엔진: 주역 괘 + 풍수 동서사택", () => {
    const h = querySajuEngine({ intent: "juyeok_cast", lineValues: [9,7,7,7,7,7] });
    expect(h.ok).toBe(true);
    expect((h.data as any).hexagram.primary.num).toBe(1);   // 건위천
    expect((h.data as any).hexagram.changed.kr).toBe("천풍구");
    const p = querySajuEngine({ intent: "pungsu_bangwi", birth });
    expect(p.ok).toBe(true);
    expect(["동사택(東四宅)","서사택(西四宅)"]).toContain((p.data as any).pungsu.sataek);
  });

  it("대육임 사과삼전", () => {
    const r = querySajuEngine({ intent: "yukim", date: { year: 2026, month: 4, day: 10 }, birth: { year: 2026, month: 4, day: 10, hour: 10 } });
    expect(r.ok).toBe(true);
    const y = (r.data as any).yukim;
    expect(Object.keys(y.heavenPlate).length).toBe(12);
    expect(y.fourLessons.length).toBe(4);
    expect(y.threeTransmissions.length).toBe(3);
  });

  it("기문·당사주·토정 엔진", () => {
    const g = querySajuEngine({ intent: "gimun", date: { year: 2026, month: 6, day: 28 }, birth: { year: 2026, month: 6, day: 28, hour: 14 } });
    expect(g.ok).toBe(true);
    expect((g.data as any).gimun.jiban.length).toBe(9);
    const d = querySajuEngine({ intent: "dangsaju", birth });
    expect((d.data as any).dangsaju.cho).toContain("초년");
    const t = querySajuEngine({ intent: "tojeong", birth, asOfYear: 2026 });
    const tj = (t.data as any).tojeong;
    expect(tj.sangGwae).toBeGreaterThanOrEqual(1);
    expect(tj.haGwae).toBeLessThanOrEqual(3);
  });
});
