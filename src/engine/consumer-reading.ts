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
  mode: LegendSajuOutputMode,
  maxPoints: number,
): ConsumerReadingSection[] {
  const claims = result.dossier?.claims ?? [];
  const focus = result.executionPlan.domains.filter((domain) => domain !== "methodology" && domain !== "decision");
  const perDomain = mode === "consumer" ? 2 : 3;
  const candidates = new Map<LifeDomain, EngineClaim[]>();

  for (const domain of focus) {
    candidates.set(domain, claims
      .filter((claim) => claim.domain === domain && claim.kind === "heuristic_interpretation")
      .sort((a, b) => {
        const aDoctrine = a.capabilityId.endsWith("_doctrine") ? 0 : 1;
        const bDoctrine = b.capabilityId.endsWith("_doctrine") ? 0 : 1;
        return aDoctrine - bDoctrine || (a.evidenceRole === "primary" ? -1 : 0) - (b.evidenceRole === "primary" ? -1 : 0);
      }));
  }

  const picked = new Map<LifeDomain, EngineClaim[]>();
  let used = 0;
  for (let pass = 0; pass < perDomain && used < maxPoints; pass += 1) {
    for (const domain of focus) {
      if (used >= maxPoints) break;
      const claim = candidates.get(domain)?.[pass];
      if (!claim) continue;
      const rows = picked.get(domain) ?? [];
      if (rows.some((row) => row.statement === claim.statement)) continue;
      rows.push(claim);
      picked.set(domain, rows);
      used += 1;
    }
  }

  return focus.flatMap((domain): ConsumerReadingSection[] => {
    const domainClaims = picked.get(domain) ?? [];
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
  mode: LegendSajuOutputMode,
): { entries: ConsumerTimelineEntry[]; omitted: number } {
  const timeline = result.dossier?.timeline;
  if (!timeline) return { entries: [], omitted: 0 };
  const timelineClaim = result.dossier?.claims.find((claim) => claim.capabilityId === "life_timeline");
  const topicalDomains = result.executionPlan.domains.filter((domain) => !["timing", "methodology", "decision"].includes(domain));
  const yearLimit = mode === "consumer" ? 6 : mode === "compact" ? 12 : timeline.years.length;
  const years = timeline.years.slice(0, yearLimit);

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
  mode: LegendSajuOutputMode,
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

  const limit = mode === "consumer" ? 8 : mode === "compact" ? 12 : Number.POSITIVE_INFINITY;
  return {
    items: [...grouped.values()].slice(0, limit),
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

export function buildConsumerReading(
  result: LegendSajuResolution,
  mode: LegendSajuOutputMode,
  requestedMaxPoints?: number,
): ConsumerReadingProjection {
  const defaultMax = mode === "consumer" ? 8 : mode === "compact" ? 16 : 100;
  const maxPoints = Math.max(1, Math.min(requestedMaxPoints ?? defaultMax, 100));
  const sections = buildSections(result, mode, maxPoints);
  const recommendations = buildRecommendations(result, mode);
  const timeline = buildTimeline(result, mode);
  const highlights = unique([
    ...(recommendations?.items.flatMap((item) => item.actions.slice(0, 1)) ?? []),
    ...sections.flatMap((section) => section.interpretations.map((item) => item.text)),
    ...timeline.entries.slice(0, 2).map((entry) => entry.summary),
  ]).slice(0, 6);
  const firstByDomain = sections.map((section) => section.interpretations[0]?.text).filter((text): text is string => Boolean(text));
  const firstAction = recommendations?.items[0]?.actions[0];
  const summary = firstAction
    ? [firstAction, recommendations?.items[0]?.caution, firstByDomain[0]].filter(Boolean).join(" ")
    : firstByDomain.slice(0, 3).join(" ") || timeline.entries[0]?.summary || "현재 입력과 검증 범위에서 소비자용 해석 문장을 만들 근거가 부족하다.";
  return {
    summary,
    highlights,
    sections,
    recommendations,
    timeline: timeline.entries,
    omittedTimelineYears: timeline.omitted,
    sourceIds: unique([
      ...sections.flatMap((section) => section.sourceIds),
      ...(recommendations?.sourceIds ?? []),
      ...timeline.entries.flatMap((entry) => entry.sourceIds),
    ]),
  };
}
