/**
 * Deterministic consumer-facing projection of the claim graph.
 *
 * This layer never calculates a chart and never invents an event. It promotes
 * bounded interpretation claims over calculation logs, keeps every sentence
 * linked to claim/source IDs, and translates the existing life timeline into
 * neutral life-domain themes.
 */
import type { EngineClaim, LifeDomain } from "./engine-v2";
import type { MyeongriActionGuidance } from "./myeongri-action-guidance";
import type { MyeongriJudgment } from "./myeongri-judgment";
import type { LegendSajuOutputMode, LegendSajuResolution } from "./resolver";

export interface ConsumerReadingPoint {
  text: string;
  timeframe: EngineClaim["timeframe"];
  confidence: EngineClaim["confidence"];
  evidenceClaimIds: string[];
  counterClaimIds: string[];
  sourceIds: string[];
  limitations: string[];
}

export interface ConsumerReadingSection {
  domain: LifeDomain;
  interpretations: ConsumerReadingPoint[];
  evidenceClaimIds: string[];
  sourceIds: string[];
}

export interface ConsumerTimelineDomain {
  domain: string;
  coverage: "myeongri_only" | "ziwei_only" | "parallel_evidence";
  themes: string[];
  opportunities: string[];
  cautions: string[];
}

export interface ConsumerTimelineEntry {
  period: string;
  summary: string;
  domains: ConsumerTimelineDomain[];
  confidence: "medium";
  evidenceClaimIds: string[];
  sourceIds: string[];
  limitations: string[];
}

export interface ConsumerReadingProjection {
  summary: string;
  highlights: string[];
  sections: ConsumerReadingSection[];
  recommendations: ConsumerRecommendations | null;
  timeline: ConsumerTimelineEntry[];
  omittedTimelineYears: number;
  sourceIds: string[];
}

export interface ConsumerRecommendationBasis {
  lensId: string;
  school: string;
  status: string;
  candidateElements: string[];
  candidateFunctions: string[];
}

export interface ConsumerRecommendation {
  id: string;
  title: string;
  domains: string[];
  actions: string[];
  caution: string;
  basis: ConsumerRecommendationBasis[];
  sourceIds: string[];
}

export interface ConsumerRecommendations {
  items: ConsumerRecommendation[];
  safeguards: { id: string; label: string; action: string; evidence: string[] }[];
  timing: MyeongriActionGuidance["timing"];
  evidenceIntents: string[];
  sourceIds: string[];
  boundary: string;
}

export interface ConsumerMethodologyVerdicts {
  /** 왕쇠 판정 — 월령·통근·투출을 분리 대조한 상태값. */
  wangswae: {
    status: MyeongriJudgment["strength"]["status"];
    monthCommandTenGod: string;
    sameElementRoots: string[];
    followingCandidate: MyeongriJudgment["strength"]["followingCandidate"];
  } | null;
  /** 월령 격국 판정 — 격국명·성패 상태·보강/훼손 장치. */
  geokguk: {
    pattern: string;
    status: MyeongriJudgment["pattern"]["status"];
    monthMainStem: string;
    monthMainTenGod: string;
    mechanisms: { label: string; polarity: "supporting" | "damaging"; grade: string }[];
  } | null;
  /** 용신 후보 — 조후·격국 기능·부억 세 관법을 합치지 않고 병기. */
  yongsin: {
    lenses: { school: string; status: string; candidateElements: string[]; candidateFunctions: string[] }[];
    conflicts: string[];
    boundary: string;
  } | null;
  sourceIds: string[];
}

/**
 * Always-on methodology conclusions for the consumer projection. These are the
 * verdict values (격국명·성패·왕쇠·용신 후보) that interpretation sentences rest
 * on; they ride outside the item budget so a reading never arrives without them.
 */
export function buildMethodologyVerdicts(result: LegendSajuResolution): ConsumerMethodologyVerdicts | null {
  const method = result.dossier?.methodResults?.myeongri_judgment as { judgment?: MyeongriJudgment } | undefined;
  const judgment = method?.judgment;
  if (!judgment) return null;
  return {
    wangswae: {
      status: judgment.strength.status,
      monthCommandTenGod: judgment.strength.monthCommandTenGod,
      sameElementRoots: judgment.strength.sameElementRoots.map((root) => `${root.position}${root.branch}`),
      followingCandidate: judgment.strength.followingCandidate,
    },
    geokguk: {
      pattern: judgment.pattern.pattern,
      status: judgment.pattern.status,
      monthMainStem: judgment.pattern.monthMainStem,
      monthMainTenGod: judgment.pattern.monthMainTenGod,
      mechanisms: judgment.pattern.mechanisms.map((mechanism) => ({
        label: mechanism.label,
        polarity: mechanism.polarity,
        grade: mechanism.grade,
      })),
    },
    yongsin: {
      lenses: judgment.usefulGods.lenses.map((lens) => ({
        school: lens.school,
        status: lens.status,
        candidateElements: lens.candidateElements,
        candidateFunctions: lens.candidateFamilies,
      })),
      conflicts: judgment.usefulGods.conflicts,
      boundary: judgment.usefulGods.boundary,
    },
    sourceIds: judgment.sourceIds,
  };
}

export interface ConsumerEvidenceIndexGroup {
  domain: string;
  kind: EngineClaim["kind"];
  count: number;
  claimIds: string[];
  capabilityIds: string[];
}

export interface ConsumerEvidenceIndex {
  omittedClaimCount: number;
  groups: ConsumerEvidenceIndexGroup[];
  fetchHint: string;
}

/**
 * Compact index of every dossier claim the projection did not render —
 * including methodology and structural/calculated layers that consumer
 * sections never show. Claim IDs are deterministic for identical inputs, so a
 * follow-up call with claimIds can pull any of them in full.
 */
export function buildConsumerEvidenceIndex(
  result: LegendSajuResolution,
  shownClaimIds: ReadonlySet<string>,
): ConsumerEvidenceIndex {
  const omitted = (result.dossier?.claims ?? []).filter((claim) => !shownClaimIds.has(claim.id));
  const groups = new Map<string, ConsumerEvidenceIndexGroup>();
  for (const claim of omitted) {
    const key = `${claim.domain}|${claim.kind}`;
    const group = groups.get(key) ?? { domain: claim.domain, kind: claim.kind, count: 0, claimIds: [], capabilityIds: [] };
    group.count += 1;
    group.claimIds.push(claim.id);
    if (!group.capabilityIds.includes(claim.capabilityId)) group.capabilityIds.push(claim.capabilityId);
    groups.set(key, group);
  }
  return {
    omittedClaimCount: omitted.length,
    groups: [...groups.values()],
    fetchHint: omitted.length
      ? "동일한 입력으로 같은 도구를 다시 호출하면서 claimIds에 이 ID들을 넣으면 해당 계산 근거 전문을 받는다. 왕쇠·격국 구조나 해석법 설명이 필요할 때 선택적으로 가져온다."
      : "생략된 계산 근거가 없다.",
  };
}

const DOMAIN_LABELS: Partial<Record<LifeDomain | string, string>> = {
  identity: "타고난 구조",
  career: "직업",
  wealth: "재물",
  relationship: "관계",
  family: "가족",
  health: "건강",
  timing: "시기",
  move: "이동",
  education: "학습",
  other: "기타",
};

const FAMILY_THEMES = {
  peer: "협업·경쟁·자기결정",
  output: "표현·생산·결과물",
  wealth: "거래·재무·운영",
  officer: "책임·규정·평가",
  resource: "학습·문서·회복",
} as const;

const TRANSFORMATION_THEMES = {
  록: "자원·기회",
  권: "주도권·책임",
  과: "평판·문서·인정",
  기: "마찰·집중",
} as const;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function counterClaimIds(result: LegendSajuResolution, claimId: string): string[] {
  return unique((result.dossier?.conflicts ?? []).flatMap((conflict) =>
    conflict.claimIds.includes(claimId) ? conflict.claimIds.filter((id) => id !== claimId) : []
  ));
}

function readingPoint(result: LegendSajuResolution, claim: EngineClaim): ConsumerReadingPoint {
  return {
    text: claim.statement,
    timeframe: claim.timeframe,
    confidence: claim.confidence,
    evidenceClaimIds: [claim.id],
    counterClaimIds: counterClaimIds(result, claim.id),
    sourceIds: claim.sourceIds,
    limitations: claim.limitations,
  };
}

function buildSections(
  result: LegendSajuResolution,
): ConsumerReadingSection[] {
  const claims = result.dossier?.claims ?? [];
  const focus = result.executionPlan.domains.filter((domain) => domain !== "methodology" && domain !== "decision");
  return focus.flatMap((domain): ConsumerReadingSection[] => {
    const domainClaims = claims
      .filter((claim) => claim.domain === domain && claim.kind === "heuristic_interpretation")
      .sort((a, b) => {
        const aDoctrine = a.capabilityId.endsWith("_doctrine") ? 0 : 1;
        const bDoctrine = b.capabilityId.endsWith("_doctrine") ? 0 : 1;
        return aDoctrine - bDoctrine || (a.evidenceRole === "primary" ? -1 : 0) - (b.evidenceRole === "primary" ? -1 : 0);
      })
      .filter((claim, index, rows) => rows.findIndex((row) => row.statement === claim.statement) === index);
    if (!domainClaims.length) return [];
    return [{
      domain,
      interpretations: domainClaims.map((claim) => readingPoint(result, claim)),
      evidenceClaimIds: unique(domainClaims.map((claim) => claim.id)),
      sourceIds: unique(domainClaims.flatMap((claim) => claim.sourceIds)),
    }];
  });
}

function buildTimeline(
  result: LegendSajuResolution,
): { entries: ConsumerTimelineEntry[]; omitted: number } {
  const timeline = result.dossier?.timeline;
  if (!timeline) return { entries: [], omitted: 0 };
  const timelineClaim = result.dossier?.claims.find((claim) => claim.capabilityId === "life_timeline");
  const topicalDomains = result.executionPlan.domains.filter((domain) => !["timing", "methodology", "decision"].includes(domain));
  const years = timeline.years;

  const entries = years.map((year): ConsumerTimelineEntry => {
    const windows = year.domainWindows.filter((window) => !topicalDomains.length || topicalDomains.includes(window.domain as LifeDomain));
    const selectedWindows = topicalDomains.length ? windows : windows.slice(0, 4);
    const domains = selectedWindows.map((window): ConsumerTimelineDomain => {
      const roles = year.myeongriTransitRoles.filter((role) => role.candidateDomains.includes(window.domain));
      const transformations = year.ziwei.transformations.filter((item) => item.candidateDomains.includes(window.domain));
      const themes = unique([
        ...roles.map((role) => FAMILY_THEMES[role.family]),
        ...transformations.map((item) => TRANSFORMATION_THEMES[item.transformation]),
      ]);
      const opportunities = unique(transformations.flatMap((item) =>
        item.transformation === "록"
          ? [`화록(${item.star})의 자원·기회 주제가 이 영역에 들어온다.`]
          : item.transformation === "과"
            ? [`화과(${item.star})의 평판·문서·인정 주제가 이 영역에 들어온다.`]
            : []
      ));
      const cautions = unique(transformations.flatMap((item) =>
        item.transformation === "기" ? [`화기(${item.star})의 마찰·집중 조건을 따로 점검한다.`] : []
      ));
      return { domain: window.domain, coverage: window.coverage, themes, opportunities, cautions };
    });
    if (year.daYunTransition && domains.length) {
      domains[0].cautions.unshift("대운 구간이 바뀌는 해이므로 전후 시기를 한 조건으로 묶지 않는다.");
    }
    const summary = domains.length
      ? `${year.year}년에는 ${domains.map((domain) => `${DOMAIN_LABELS[domain.domain] ?? domain.domain}의 ${domain.themes.join("·")}`).join(", ")} 주제가 계산 구간에 들어온다.`
      : `${year.year}년의 대운·세운과 자미 운한은 계산됐으나 요청 영역에 해당하는 해석 단위는 없다.`;
    return {
      period: String(year.year),
      summary,
      domains,
      confidence: "medium",
      evidenceClaimIds: timelineClaim ? [timelineClaim.id] : [],
      sourceIds: timelineClaim?.sourceIds ?? timeline.sourceIds,
      limitations: [timeline.boundary],
    };
  });

  return { entries, omitted: Math.max(0, timeline.years.length - entries.length) };
}

function actionGuidanceFromResult(result: LegendSajuResolution): { guidance: MyeongriActionGuidance; intent: string } | null {
  for (const evidence of result.evidence) {
    if (!evidence.ok || !evidence.data || typeof evidence.data !== "object") continue;
    const data = evidence.data as Record<string, unknown>;
    if (evidence.intent === "recommend" && data.recommend) {
      return { guidance: data.recommend as MyeongriActionGuidance, intent: evidence.intent };
    }
    if (evidence.intent === "gaeun" || evidence.intent === "gaeun_pro") {
      const prescription = (evidence.intent === "gaeun" ? data.gaeun : data.gaeunPro) as { actionGuidance?: MyeongriActionGuidance } | undefined;
      if (prescription?.actionGuidance) return { guidance: prescription.actionGuidance, intent: evidence.intent };
    }
  }
  return null;
}

function buildRecommendations(
  result: LegendSajuResolution,
): ConsumerRecommendations | null {
  const extracted = actionGuidanceFromResult(result);
  if (!extracted) return null;
  const { guidance } = extracted;
  const grouped = new Map<string, ConsumerRecommendation>();

  for (const lens of guidance.lenses) {
    for (const practice of lens.practices) {
      const id = `action-${practice.family}`;
      const basis: ConsumerRecommendationBasis = {
        lensId: lens.id,
        school: lens.school,
        status: lens.status,
        candidateElements: lens.candidateElements,
        candidateFunctions: lens.candidateFamilies,
      };
      const existing = grouped.get(id);
      if (existing) {
        if (!existing.basis.some((item) => item.lensId === basis.lensId)) existing.basis.push(basis);
        existing.sourceIds = unique([...existing.sourceIds, ...lens.sourceIds]);
      } else {
        grouped.set(id, {
          id,
          title: practice.label,
          domains: practice.domains,
          actions: practice.actions,
          caution: practice.guardrail,
          basis: [basis],
          sourceIds: lens.sourceIds,
        });
      }
    }
  }

  return {
    items: [...grouped.values()],
    safeguards: guidance.mechanismGuardrails.map((item) => ({
      id: item.mechanismId,
      label: item.label,
      action: item.action,
      evidence: item.evidence,
    })),
    timing: guidance.timing,
    evidenceIntents: [extracted.intent],
    sourceIds: guidance.sourceIds,
    boundary: guidance.boundary,
  };
}

function applyProjectionBudget(
  sections: ConsumerReadingSection[],
  recommendations: ConsumerRecommendations | null,
  timeline: ConsumerTimelineEntry[],
  maxItems: number,
  actionOnly: boolean,
): {
  sections: ConsumerReadingSection[];
  recommendations: ConsumerRecommendations | null;
  timeline: ConsumerTimelineEntry[];
  omittedTimelineYears: number;
} {
  if (actionOnly) {
    const items = recommendations?.items.slice(0, maxItems) ?? [];
    return {
      sections: [],
      recommendations: recommendations ? { ...recommendations, items } : null,
      timeline: [],
      omittedTimelineYears: timeline.length,
    };
  }

  const sectionBuckets = sections.map((section) => ({
    section,
    values: [...section.interpretations],
    selected: [] as ConsumerReadingPoint[],
  }));
  const recommendationValues = [...(recommendations?.items ?? [])];
  const selectedRecommendations: ConsumerRecommendation[] = [];
  const timelineValues = [...timeline];
  const selectedTimeline: ConsumerTimelineEntry[] = [];
  const buckets: Array<{ take: () => boolean }> = [
    ...sectionBuckets.map((bucket) => ({
      take: () => {
        const value = bucket.values.shift();
        if (!value) return false;
        bucket.selected.push(value);
        return true;
      },
    })),
    {
      take: () => {
        const value = recommendationValues.shift();
        if (!value) return false;
        selectedRecommendations.push(value);
        return true;
      },
    },
    {
      take: () => {
        const value = timelineValues.shift();
        if (!value) return false;
        selectedTimeline.push(value);
        return true;
      },
    },
  ];

  let used = 0;
  while (used < maxItems) {
    let progressed = false;
    for (const bucket of buckets) {
      if (used >= maxItems) break;
      if (!bucket.take()) continue;
      used += 1;
      progressed = true;
    }
    if (!progressed) break;
  }

  const selectedSections = sectionBuckets.flatMap(({ section, selected }): ConsumerReadingSection[] => {
    if (!selected.length) return [];
    return [{
      ...section,
      interpretations: selected,
      evidenceClaimIds: unique(selected.flatMap((item) => item.evidenceClaimIds)),
      sourceIds: unique(selected.flatMap((item) => item.sourceIds)),
    }];
  });

  return {
    sections: selectedSections,
    recommendations: recommendations ? { ...recommendations, items: selectedRecommendations } : null,
    timeline: selectedTimeline,
    omittedTimelineYears: Math.max(0, timeline.length - selectedTimeline.length),
  };
}

export function buildConsumerReading(
  result: LegendSajuResolution,
  mode: LegendSajuOutputMode,
  requestedMaxPoints?: number,
): ConsumerReadingProjection {
  const defaultMax = mode === "action_only" ? 6 : 12;
  const maxPoints = Math.max(1, Math.min(requestedMaxPoints ?? defaultMax, 100));
  const allSections = buildSections(result);
  const allRecommendations = buildRecommendations(result);
  const allTimeline = buildTimeline(result);
  const projection = applyProjectionBudget(
    allSections,
    allRecommendations,
    allTimeline.entries,
    maxPoints,
    mode === "action_only",
  );
  const { sections, recommendations, timeline } = projection;
  const highlights = unique([
    ...(recommendations?.items.flatMap((item) => item.actions.slice(0, 1)) ?? []),
    ...sections.flatMap((section) => section.interpretations.map((item) => item.text)),
    ...timeline.slice(0, 2).map((entry) => entry.summary),
  ]);
  const firstByDomain = sections.map((section) => section.interpretations[0]?.text).filter((text): text is string => Boolean(text));
  const firstAction = recommendations?.items[0]?.actions[0];
  const summary = mode === "action_only"
    ? [firstAction, recommendations?.items[0]?.caution].filter(Boolean).join(" ")
    : firstByDomain.slice(0, 3).join(" ") || timeline[0]?.summary || firstAction || "현재 입력과 검증 범위에서 소비자용 해석 문장을 만들 근거가 부족하다.";
  return {
    summary,
    highlights,
    sections,
    recommendations,
    timeline,
    omittedTimelineYears: projection.omittedTimelineYears,
    sourceIds: unique([
      ...sections.flatMap((section) => section.sourceIds),
      ...(recommendations?.sourceIds ?? []),
      ...timeline.flatMap((entry) => entry.sourceIds),
    ]),
  };
}
