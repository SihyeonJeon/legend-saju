/**
 * 사주 엔진 라우터 — 호환 intent를 결정적 계산기로 연결하는 단일 진입점.
 * intent로 결정적 엔진을 호출해 {data, groundingText, vaultRefs}를 반환한다.
 * groundingText는 설명용 근거 문자열이고, vaultRefs는 관련 명리 용어 표제다.
 */
import {
  computeSajuChart, analyzeElements,
  detectRelations, deriveSinsal, yinYangForDate, compatibility,
  vaultRefsFor, type SajuChart, type SajuInput
} from "./saju-engine";
import {
  compareZiweiPalaceFlyingProfiles,
  computeZiweiChart,
  computeZiweiQintianStructuralLayer,
  serializeZiwei
} from "./ziwei-engine";
import { evaluateMyeongriDoctrine, evaluateZiweiDoctrine } from "./doctrine-engine";
import { deriveTwelveSinsal, johooDirection, currentLuck } from "./saju-engine-advanced";
import { gaeunPrescription, serializeGaeun, gaeunProDetail, serializeGaeunPro } from "./saju-engine-gaeun";
import { ziweiGaeun, selectAuspiciousDays, namingElements } from "./saju-engine-closure";
import { analyzeSuri, suggestNamingHanja } from "./saju-engine-suri";
import { bonMyeongSeong } from "./saju-engine-gusung";
import { castHexagram, dongseoSataek } from "./divination-engines";
import { castYukim } from "./yukim-engine";
import { castGimun } from "./gimun-engine";
import { dangSaju, tojeongGwae } from "./divination-engines";
import {
  preflightCapability,
  type CapabilityPreflight,
  type LegacySajuIntent
} from "./engine-capabilities";
import { computeSajuChartEnvelope } from "./myeongri-structure";
import { evaluateMyeongriJudgment } from "./myeongri-judgment";
import {
  buildMyeongriActionGuidance,
  serializeMyeongriActionGuidance
} from "./myeongri-action-guidance";

export type SajuIntent = LegacySajuIntent;
export interface SajuQuery { intent: SajuIntent; birth?: SajuInput; birthA?: SajuInput; birthB?: SajuInput; date?: { year: number; month: number; day: number; hour?: number; minute?: number }; asOfYear?: number; rangeDays?: number; purpose?: string; surnameStrokes?: number[]; givenStrokes?: number[]; lineValues?: number[]; }
export interface SajuEvidence { ok: boolean; intent: SajuIntent; data: unknown; groundingText: string; vaultRefs: string[]; disclaimer: string; capability: CapabilityPreflight; }

const DISCLAIMER = "[엔진 산출 — 계산·구조 관찰·해석의 성숙도와 유파는 capability 메타데이터에 기록됨.]";

function chartLines(c: ReturnType<typeof computeSajuChart>): string {
  const p = c.pillars;
  return `사주: 年 ${p.year.gz} / 月 ${p.month.gz} / 日 ${p.day.gz} / 時 ${p.time.gz} | 일간 ${c.dayMaster.ko}(${c.dayMaster.el}·${c.dayMaster.yinYang}) | 일주 십이운성 ${p.day.diShi} | 일납음 ${p.day.naYin} | 공망 ${c.xunKong.join("")}`;
}

function qiongtongLines(chart: SajuChart): { doctrine: ReturnType<typeof evaluateMyeongriDoctrine>; text: string } {
  const doctrine = evaluateMyeongriDoctrine(chart);
  const stems = doctrine.presences.map((presence) => `${presence.stem}:${presence.state}`).join("·");
  const subclauses = doctrine.subclauseMatches.map((match) => `${match.classicalPattern}:${match.normalizedReading}`).join(" / ");
  return {
    doctrine,
    text: `궁통보감 ${doctrine.sourceLocator.section} [${doctrine.ruleId}] ${doctrine.normalizedReading}` +
      `${stems ? ` | 투출·통근 ${stems}` : ""}` +
      `${subclauses ? ` | 하위절 ${subclauses}` : ""}`
  };
}

/** 호환 intent 진입점. */
export function querySajuEngine(q: SajuQuery): SajuEvidence {
  const capability = preflightCapability(q.intent, q);
  const wrap = (data: unknown, groundingText: string, refs: string[]): SajuEvidence =>
    ({ ok: true, intent: q.intent, data, groundingText: `${DISCLAIMER} ${groundingText}`, vaultRefs: refs, disclaimer: DISCLAIMER, capability });
  if (capability.status === "blocked") {
    return {
      ok: false,
      intent: q.intent,
      data: { error: "CAPABILITY_PREFLIGHT_BLOCKED", missing: capability.missingRequired },
      groundingText: `${DISCLAIMER} ${capability.reasons.join(" ")}`,
      vaultRefs: [],
      disclaimer: DISCLAIMER,
      capability
    };
  }
  try {
    switch (q.intent) {
      case "chart": {
        if (q.birth!.hour === undefined) {
          const envelope = computeSajuChartEnvelope(q.birth!);
          return wrap(
            { envelope },
            `시간 미상 원국: 년주 ${envelope.stablePillars.year} / 월주 ${envelope.stablePillars.month} / 일주 ${envelope.stablePillars.day}. 시주 ${envelope.candidates.length}개 후보를 단일값으로 고르지 않음.`,
            vaultRefsFor(["일간", "오행", "시주"])
          );
        }
        const c = computeSajuChart(q.birth!);
        const el = analyzeElements(c);
        return wrap({ chart: c, elements: el }, `${chartLines(c)} | 오행 강약 강:${el.strongest} 약:${el.weakest}${el.missing.length ? " 무:" + el.missing.join("") : ""}`, vaultRefsFor(["일간", c.dayMaster.ko, "오행", p0(c)]));
      }
      case "strength_yongsin": {
        const c = computeSajuChart(q.birth!);
        const judgment = evaluateMyeongriJudgment(c);
        const qiongtong = qiongtongLines(c);
        const lenses = judgment.usefulGods.lenses.map((lens) =>
          `${lens.school}=${lens.status};천간 ${lens.candidateStems.join("·") || "보류"};십신군 ${lens.candidateFamilies.join("·") || "보류"};오행 ${lens.candidateElements.join("·") || "보류"}`
        ).join(" / ");
        return wrap(
          { strength: judgment.strength, yongsin: judgment.usefulGods, judgment, qiongtong: qiongtong.doctrine },
          `${chartLines(c)} | 왕쇠 ${judgment.strength.status}: 월령 ${judgment.strength.monthCommandTenGod}, 일간 동오행 통근 ${judgment.strength.sameElementRoots.map((root) => `${root.position}${root.branch}`).join("·") || "없음"}. ` +
          `용신 관법 분리 ${lenses}. ${judgment.usefulGods.conflicts.join(" ") || "관법 간 명시 충돌 없음"} | ${qiongtong.text}`,
          vaultRefsFor(["신강·신약", "용신·기신", "조후", "억부", "궁통보감"])
        );
      }
      case "sinsal": {
        const c = computeSajuChart(q.birth!);
        const ss = deriveSinsal(c);
        return wrap({ sinsal: ss }, `${chartLines(c)} | 신살: ${ss.join(", ") || "주요 신살 없음"}. 신살은 보조 지표.`, vaultRefsFor(["천을귀인", "도화살", "역마살", "화개살", "공망"]));
      }
      case "relations": {
        const c = computeSajuChart(q.birth!);
        const rel = detectRelations(c);
        return wrap({ relations: rel }, `${chartLines(c)} | 합충형파해: ${rel.join(", ") || "뚜렷한 합충 없음"}.`, vaultRefsFor(["삼합·육합", "지지충", "합충형파해"]));
      }
      case "recommend": {
        const c = computeSajuChart(q.birth!);
        const r = buildMyeongriActionGuidance(c, { input: q.birth!, asOfYear: q.asOfYear ?? 2026 });
        return wrap(
          { recommend: r },
          `${chartLines(c)}\n${serializeMyeongriActionGuidance(r)}`,
          vaultRefsFor(["용신·기신", "조후", "격국", "개운법"])
        );
      }
      case "date_yinyang": {
        const d = q.date!;
        const yy = yinYangForDate(d.year, d.month, d.day);
        return wrap({ dateYinYang: yy }, `${yy.date} | ${yy.dayGanZhi} | ${yy.dayGanYinYang}·${yy.dayBranchYinYang} | ${yy.jieQiPhase} | ${yy.yangPhase}. ${yy.note}`, vaultRefsFor(["음양", "절기와 월지", "천간", "지지(12지)"]));
      }
      case "compatibility": {
        const cm = compatibility(q.birthA!, q.birthB!);
        return wrap({ compatibility: cm }, `궁합 A ${cm.dayPillarA} × B ${cm.dayPillarB} | ${cm.signals.join(" / ")}. ${cm.note}`, vaultRefsFor(["삼합·육합", "지지충", "궁합"]));
      }
      case "ziwei": {
        const z = computeZiweiChart(q.birth!);
        const doctrine = evaluateZiweiDoctrine(z);
        const flying = compareZiweiPalaceFlyingProfiles(q.birth!);
        const qintian = computeZiweiQintianStructuralLayer(q.birth!);
        const matched = doctrine.matches.slice(0, 8).map((match) =>
          `${match.palace}.${match.matchedStars.join("·")}:${match.normalizedReading}`
        ).join(" / ");
        const structural = [
          `궁간비화 ${flying.graphs.iztro_documented.edges.length}개`,
          `이심 자화 ${qintian.outwardSelfTransformations.length}개`,
          `향심 자화 ${qintian.inwardSelfTransformations.length}개`,
          `내인궁 ${qintian.laiyinPalace.name}(${qintian.natalYearStem})`,
          `사화표별 차이 ${flying.differences.length}개`
        ].join("·");
        return wrap(
          { ziwei: z, doctrine, palaceFlyingProfiles: flying, qintian },
          `${serializeZiwei(z)}\n실행한 십이궁 규칙 ${doctrine.evaluatedRuleCount}개 중 일치 ${doctrine.matches.length}개${matched ? ` | ${matched}` : ""}\n${structural}`,
          vaultRefsFor(["자미두수", "명궁", "자미", "십이궁", "사화", "내인궁"])
        );
      }
      case "twelve_sinsal": {
        const c = computeSajuChart(q.birth!);
        const ss = deriveTwelveSinsal(c, "year");
        return wrap({ twelveSinsal: ss }, `${chartLines(c)} | 십이신살(년지 기준): ${Object.entries(ss).map(([k,v])=>`${k}=${v}`).join(", ")}`, vaultRefsFor(["십이신살", "역마", "도화", "화개"]));
      }
      case "joho": {
        const c = computeSajuChart(q.birth!);
        const j = johooDirection(c);
        const qiongtong = qiongtongLines(c);
        return wrap(
          { joho: j, qiongtong: qiongtong.doctrine },
          `${chartLines(c)} | ${qiongtong.text} | 넓은 계절 보조표 ${j.season}:${j.need.join("·")}는 정확 월령 규칙을 대신하지 않음.`,
          vaultRefsFor(["조후", "용신·기신", "절기와 월지", "궁통보감"])
        );
      }
      case "current_luck": {
        const cl = currentLuck(q.birth!, q.asOfYear ?? 2026);
        return wrap({ currentLuck: cl }, cl.note, vaultRefsFor(["대운", "세운", "용신·기신"]));
      }
      case "geokguk": {
        const c = computeSajuChart(q.birth!);
        const judgment = evaluateMyeongriJudgment(c);
        const pattern = judgment.pattern;
        const displayPattern = pattern.pattern.startsWith("편관") ? pattern.pattern.replace("편관", "편관(칠살)") : pattern.pattern;
        const compatibility = {
          geok: displayPattern,
          basis: `월지 본기 ${pattern.monthMainStem}=${pattern.monthMainTenGod}; 투출 ${pattern.exposedMonthHiddenStems.map((item) => `${item.stem}:${item.exposedAt.join("·")}`).join(" / ") || "없음"}; 성패 ${pattern.status}`,
          isHeuristic: true as const
        };
        const qiongtong = qiongtongLines(c);
        return wrap(
          { geokguk: compatibility, pattern, judgment, qiongtong: qiongtong.doctrine },
          `${chartLines(c)} | 월령 격국 ${pattern.pattern}, 성패 상태 ${pattern.status}. ${compatibility.basis}. ` +
          `보강·훼손 장치 ${pattern.mechanisms.map((mechanism) => `${mechanism.label}:${mechanism.polarity}:${mechanism.grade}`).join(" / ") || "한 방향으로 확정되지 않음"} | ${qiongtong.text}`,
          vaultRefsFor(["격국", "월지", "십성", "궁통보감"])
        );
      }
      case "gaeun": {
        const g = gaeunPrescription(q.birth!, q.asOfYear ?? 2026);
        return wrap({ gaeun: g }, serializeGaeun(g), vaultRefsFor(["개운법", "오행 색·방위·계절 배속", "용신·기신", "조후"]));
      }
      case "gimun": {
        const dt = q.date ?? { year: q.birth!.year, month: q.birth!.month, day: q.birth!.day };
        const hour = dt.hour ?? q.birth?.hour;
        if (hour === undefined) throw new Error("QUESTION_TIME_REQUIRED: 기문둔갑에는 점시가 필요하다.");
        const g = castGimun(dt.year, dt.month, dt.day, hour, dt.minute ?? 0);
        return wrap({ gimun: g }, `${g.disclaimer} ${g.jeolgi} ${g.dun} ${g.won} 국수${g.gukSu} 부두 ${g.bidu} | 직부 ${g.zhiFu.star} ${g.zhiFu.originalPalace}→${g.zhiFu.palace}궁 · 직사 ${g.zhiShi.door}→${g.zhiShi.palace}궁 | ${g.palaces.map((p)=>`${p.palace}궁=${p.heavenStem}/${p.earthStem}·${p.star ?? "-"}·${p.door ?? "-"}·${p.god ?? "-"}`).join(" ")}`, vaultRefsFor(["기문둔갑", "구궁", "팔문"]));
      }
      case "tojeong": {
        const b = q.birth!;
        const t = tojeongGwae(b.year, b.month, b.day, q.asOfYear ?? 2026);
        return wrap({ tojeong: t }, `${t.disclaimer} ${q.asOfYear ?? 2026}년 ${t.age}세 | 상괘${t.sangGwae}·중괘${t.jungGwae}·하괘${t.haGwae} → ${t.gwaeNo}`, vaultRefsFor(["토정비결"]));
      }
      case "dangsaju": {
        const dt = q.birth ?? { year: q.date!.year, month: q.date!.month, day: q.date!.day };
        if (dt.hour === undefined) throw new Error("BIRTH_TIME_REQUIRED: 당사주 말년성 계산에는 출생시각이 필요하다.");
        const ds = dangSaju(dt.year, dt.month, dt.day, dt.hour);
        return wrap({ dangsaju: ds }, `${ds.disclaimer} ${ds.zodiac} | ${ds.cho} · ${ds.jung} · ${ds.jang} · ${ds.mal}`, vaultRefsFor(["십이성", "당사주"]));
      }
      case "yukim": {
        const dt = q.date ?? { year: q.birth!.year, month: q.birth!.month, day: q.birth!.day };
        const hr = dt.hour ?? q.birth?.hour;
        if (hr === undefined) throw new Error("QUESTION_TIME_REQUIRED: 육임에는 점시가 필요하다.");
        const y = castYukim(dt.year, dt.month, dt.day, hr);
        const text = `${y.disclaimer} 일간지 ${y.dayGan}${y.dayBranch} ${y.dayNight} 점시 ${y.hourBranch} 월장 ${y.monthGeneral} | 사과 ${y.fourLessons.map((l)=>`${l.top}/${l.bottom}`).join(" ")} | 삼전 ${y.threeTransmissions.map((t)=>`${t.branch}(${t.general})`).join("→")} [${y.method}]`;
        return wrap({ yukim: y }, text, vaultRefsFor(["십이천장", "사과삼전", "육임"]));
      }
      case "juyeok_cast": {
        const h = castHexagram(q.lineValues);
        return wrap({ hexagram: h }, `${h.disclaimer} ${h.reading} (상괘 ${h.upperTrigram}·하괘 ${h.lowerTrigram})`, vaultRefsFor(["육십사괘", "팔괘", "괘사", "효사"]));
      }
      case "pungsu_bangwi": {
        const d = q.birth ?? { year: q.date!.year, month: q.date!.month, day: q.date!.day, gender: "남" as const };
        const r = dongseoSataek(d.year, d.month, d.day, d.gender ?? "남");
        return wrap({ pungsu: r }, `${r.disclaimer} 본명괘 ${r.bonMyeongGwae}(${r.sataek}) | 길방위 ${Object.entries(r.auspicious).map(([k,v])=>`${v}=${k}`).join(", ")} | 흉방위 ${Object.entries(r.inauspicious).map(([k,v])=>`${v}=${k}`).join(", ")}`, vaultRefsFor(["나경·이십사산", "양택삼요", "풍수"]));
      }
      case "gusung": {
        const d = q.birth ?? { year: q.date!.year, month: q.date!.month, day: q.date!.day };
        const b = bonMyeongSeong(d.year, d.month, d.day);
        return wrap({ gusung: b }, `${b.disclaimer} 본명성 ${b.name}(오행 ${b.element}) | ${b.trait}`, vaultRefsFor(["구성기학", "방위", "오행"]));
      }
      case "gaeun_pro": {
        const g = gaeunProDetail(q.birth!, q.asOfYear ?? 2026);
        return wrap({ gaeunPro: g }, serializeGaeunPro(g), vaultRefsFor(["개운법", "오행 색·방위·계절 배속", "용신·기신"]));
      }
      case "ziwei_gaeun": {
        const zg = ziweiGaeun(q.birth!);
        const text = `${zg.disclaimer} 五行局 ${zg.fiveElementsClass}·命主 ${zg.soul} | ${zg.byPalace.map((p)=>`${p.palace}(${p.stars.join("·")||"무주성"})→${p.advice}`).join("\n")}\n복: ${zg.luckPalace} / 주의: ${zg.jealousPalace}`;
        return wrap({ ziweiGaeun: zg }, text, vaultRefsFor(["자미두수", "명궁", "화록", "화기"]));
      }
      case "taekil": {
        const t = selectAuspiciousDays(q.birth!, q.date!, q.rangeDays ?? 60, q.purpose);
        const candidates = (t.shortlist.length ? t.shortlist : t.review).slice(0, 5)
          .map((day) => `${day.date}(${day.ganZhi}): ${day.selectionReason}`).join(" / ");
        const excluded = t.excluded.slice(0, 3)
          .map((day) => `${day.date}(${day.ganZhi}): ${day.selectionReason}`).join(" / ");
        return wrap(
          { taekil: t },
          `${t.disclaimer} 정책 ${t.policy.id}: ${t.policy.rule} | 후보: ${candidates || "없음"} | 제외: ${excluded || "없음"}`,
          vaultRefsFor(["절기와 월지", "용신·기신", "개운법"])
        );
      }
      case "suri": {
        const r = analyzeSuri(q.surnameStrokes!, q.givenStrokes!);
        const grids = [r.cheon, r.in_, r.ji, r.oe, r.chong]
          .map((grid) => `${grid.name} ${grid.strokes}→${grid.suri}수(${grid.interpretation.fortune}·${grid.interpretation.name}; 원전 대조 전)`)
          .join(" / ");
        const text = `${r.disclaimer} 산술 정책 ${r.policy.id}·획수 입력 ${r.policy.strokeInput}·자전 ${r.policy.strokeDictionary} | ${grids} | 홀짝 ${r.eumyang.observation} | 삼원 ${r.samwon.observation} | 종합 판정 없음`;
        return wrap({ suri: r }, text, vaultRefsFor(["작명", "오행 색·방위·계절 배속"]));
      }
      case "naming_hanja": {
        const n = suggestNamingHanja(q.birth!);
        const lenses = n.myeongriLenses
          .map((lens) => `${lens.school}:${lens.status}:${lens.candidateElements.join("·") || "보류"}`)
          .join(" / ");
        const candidates = n.researchCandidatesByElement
          .map((group) => `${group.element}[${group.candidates.map((candidate) => `${candidate.char}${candidate.localStrokeClaim}획`).join(",")}]`)
          .join(" / ");
        const text = `${n.disclaimer} 명리 관법 ${lenses} | 현지 연구 후보 ${candidates || "없음"} | 전 항목 법적 적격성·지정 음·자형·뜻·획수 미검증 | 작명 준비 ${n.readyForNaming}`;
        return wrap({ namingHanja: n }, text, vaultRefsFor(["작명", "용신·기신", "오행 불급"]));
      }
      case "naming": {
        const n = namingElements(q.birth!);
        const lenses = n.myeongriLenses
          .map((lens) => `${lens.school}:${lens.status}:${lens.candidateElements.join("·") || "보류"}`)
          .join(" / ");
        const methods = n.methodLayers.map((method) => `${method.id}:${method.status}:권장안 없음`).join(" / ");
        const text = `${n.disclaimer} 명리 관법 ${lenses} | 성명학 방법 ${methods} | 공식 한자·지정 음·뜻·발음·항렬 검토 전 | 작명 준비 ${n.readyForNaming}`;
        return wrap({ naming: n }, text, vaultRefsFor(["오행 색·방위·계절 배속", "용신·기신", "오행 불급"]));
      }
      default:
        return { ok: false, intent: q.intent, data: null, groundingText: "", vaultRefs: [], disclaimer: DISCLAIMER, capability };
    }
  } catch (e) {
    return { ok: false, intent: q.intent, data: { error: String(e) }, groundingText: `${DISCLAIMER} 엔진 계산 실패(입력 확인 필요).`, vaultRefs: [], disclaimer: DISCLAIMER, capability };
  }
}

function p0(c: ReturnType<typeof computeSajuChart>): string { return c.pillars.day.naYin; }
