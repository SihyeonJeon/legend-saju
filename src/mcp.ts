import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import {
  ENGINE_SOURCES,
  getEngineManifest,
  LEGEND_SAJU_ENGINE_VERSION,
  type LegendSajuDetailLevel,
  resolveAsync,
  searchCapabilities,
  type LegendSajuEntryIntent,
  type LegendSajuOutputMode,
  type LegendSajuResolution,
  type LegendSajuResolveInput,
} from "./engine/public-entry";
import { buildConsumerReading } from "./engine/consumer-reading";
import type { MyeongriJudgment } from "./engine/myeongri-judgment";
import {
  capabilitySearchOutputSchema,
  legendSajuResultOutputSchema,
  manifestOutputSchema,
} from "./mcp-output-schema";

const dateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).optional().describe("Local civil time in 24-hour notation. Korean 오후 12시는 12 (noon), 오전 12시는 0 (midnight). Do not guess when the wording is ambiguous."),
  minute: z.number().int().min(0).max(59).optional(),
});

const birthSchema = dateSchema.extend({
  calendar: z.enum(["solar", "lunar"]).optional().describe("Defaults to solar."),
  isLeapMonth: z.boolean().optional(),
  gender: z.enum(["남", "여"]).optional(),
  birthTimeAccuracy: z.enum(["recorded", "family_memory", "estimated", "unknown"]).optional().describe("Use recorded only when the user explicitly says the time comes from an official or written record. Use family_memory for family recollection, estimated for inference, and unknown or omission when unclear."),
  timezone: z.string().optional().describe("Birthplace time-zone metadata. Birth clock time must already be local civil time; no automatic conversion is applied."),
  longitudeE: z.number().min(-180).max(180).optional().describe("Birthplace longitude metadata. The default chart does not silently apply true-solar-time correction."),
  latitudeN: z.number().min(-90).max(90).optional(),
  birthplace: z.string().optional(),
});

const lifeEventSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
  domain: z.enum(["career", "wealth", "relationship", "family", "health", "move", "education", "other"]),
  description: z.string(),
});

const nameCharacterSchema = z.object({
  character: z.string().optional().describe("One Korean-name Hanja character."),
  courtCodeHex: z.string().optional().describe("Optional U+XXXX or hexadecimal court snapshot code."),
  expectedReading: z.string().optional(),
  declaredStrokeCount: z.number().int().positive().optional(),
}).refine((input) => Boolean(input.character || input.courtCodeHex), {
  message: "Provide character or courtCodeHex.",
});

const koreanNameSchema = z.object({
  surname: z.array(nameCharacterSchema).min(1).max(2),
  givenName: z.array(nameCharacterSchema).min(1).max(2),
  declaredStrokeStandard: z.string().optional().describe("Required before caller-declared five-grid arithmetic is run."),
});

const outputModeSchema = z.enum(["consumer", "compact", "evidence", "debug"]);
const detailLevelSchema = z.enum(["brief", "standard", "expert", "raw"]);
const outputControlFields = {
  detailLevel: detailLevelSchema.optional().describe("Preferred depth. brief is shortest, standard is the default readable answer, expert automatically composes question-relevant deep methods and evidence in one call, and raw is the complete developer record."),
  outputMode: outputModeSchema.optional().describe("Backward-compatible developer projection override. Ordinary callers should use detailLevel instead."),
  maxClaims: z.number().int().min(1).max(100).optional().describe("Maximum interpretation points and raw claims returned outside debug mode."),
};

const resolveSchema = z.object({
  question: z.string().min(1).describe("Open-ended question. Built-in routing terms cover Korean plus common English, Chinese, and Japanese metaphysics vocabulary."),
  birth: birthSchema.optional(),
  partnerBirth: birthSchema.optional(),
  targetDate: dateSchema.optional().describe("Date or range anchor being analyzed."),
  questionDateTime: dateSchema.optional().describe("Moment a Qimen, Daliuren, or question-time calculation is cast."),
  timelineRange: z.object({
    startYear: z.number().int(),
    endYear: z.number().int(),
  }).optional(),
  lifeEvents: z.array(lifeEventSchema).optional(),
  requestedCapabilities: z.array(z.string()).optional().describe("Optional runtime IDs from legend_saju_capabilities. This is intentionally not an enum."),
  lineValues: z.array(z.number().int().min(6).max(9)).length(6).optional(),
  surnameStrokes: z.array(z.number().int().positive()).optional(),
  givenStrokes: z.array(z.number().int().positive()).optional(),
  name: koreanNameSchema.optional().describe("Actual Korean name characters for the separate 9,495-entry official-name analysis path."),
  dream: z.string().min(1).optional().describe("Dream narrative for the source-bounded cross-cultural dream engine."),
  dreamContext: z.string().optional().describe("Optional emotion, setting, relationship, work, health, or other context explicitly supplied by the user."),
  maxDreamMatches: z.number().int().min(1).max(5).optional(),
  rangeDays: z.number().int().positive().max(366).optional(),
  purpose: z.string().optional(),
  asOfYear: z.number().int().optional(),
  maxAutoCapabilities: z.number().int().min(0).max(20).optional(),
  ...outputControlFields,
});

const readingSchema = z.object({
  question: z.string().min(1).describe("The user's original request, such as 올해 재물운과 사업운을 봐줘."),
  birth: birthSchema,
  targetDate: dateSchema.optional().describe("The date whose current or future fortune is being read. Supply the current local date for requests such as 올해 운세 or 현재 운세."),
  timelineRange: z.object({ startYear: z.number().int(), endYear: z.number().int() }).optional(),
  lifeEvents: z.array(lifeEventSchema).optional(),
  asOfYear: z.number().int().optional(),
  ...outputControlFields,
});

const compatibilitySchema = z.object({
  question: z.string().min(1).describe("What the user wants to know about the relationship."),
  birth: birthSchema,
  partnerBirth: birthSchema,
  targetDate: dateSchema.optional(),
  lifeEvents: z.array(lifeEventSchema).optional(),
  ...outputControlFields,
});

const dateSelectionSchema = z.object({
  question: z.string().min(1).describe("The event and constraints for choosing a date."),
  birth: birthSchema,
  targetDate: dateSchema.describe("Start date for the candidate range."),
  rangeDays: z.number().int().positive().max(366).optional(),
  purpose: z.string().optional(),
  ...outputControlFields,
});

const divinationSchema = z.object({
  question: z.string().min(1).describe("The concrete decision or divination question."),
  questionDateTime: dateSchema.optional().describe("Casting moment for Qimen, Daliuren, or Tieban question-time calculations."),
  lineValues: z.array(z.number().int().min(6).max(9)).length(6).optional().describe("Six I Ching line values, bottom line first."),
  birth: birthSchema.optional().describe("Optional natal input when the requested method needs it."),
  ...outputControlFields,
}).refine((input) => Boolean(input.questionDateTime || input.lineValues), {
  message: "Provide questionDateTime or six lineValues.",
});

const namingSchema = z.object({
  question: z.string().min(1).describe("Name, Hanja, stroke-count, or naming question."),
  birth: birthSchema.optional(),
  name: koreanNameSchema.optional(),
  surnameStrokes: z.array(z.number().int().positive()).optional(),
  givenStrokes: z.array(z.number().int().positive()).optional(),
  ...outputControlFields,
}).refine((input) => Boolean(input.name || (input.surnameStrokes?.length && input.givenStrokes?.length) || input.birth), {
  message: "Provide name characters, both stroke arrays, or a birth chart for naming guidance.",
});

const dreamSchema = z.object({
  question: z.string().min(1).describe("What the user wants to understand about the dream."),
  dream: z.string().min(1).describe("The dream narrative. Preserve the user's details instead of reducing it to one symbol."),
  dreamContext: z.string().optional().describe("Only context the user actually supplied, such as emotion, setting, relationships, work, or health."),
  maxDreamMatches: z.number().int().min(1).max(5).optional(),
  ...outputControlFields,
});

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent: Record<string, unknown>;
  isError?: boolean;
};

function jsonObject(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function toolError(prefix: string, error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `${prefix}: ${message}` }],
    structuredContent: { error: message },
    isError: true,
  };
}

function resolutionSummary(result: LegendSajuResolution, formatted: Record<string, unknown>): string {
  const available = result.routes.filter((route) => route.status !== "blocked").length;
  const blocked = result.routes.filter((route) => route.status === "blocked").length;
  const claims = result.dossier?.claims.length ?? 0;
  const nameSummary = result.nameAnalysis
    ? `Analyzed ${result.nameAnalysis.surname.length + result.nameAnalysis.givenName.length} name characters against the official-entry snapshot.`
    : "";
  const readingSummary = formatted.readingSummary as { highlights?: string[] } | undefined;
  const excerpts = (readingSummary?.highlights ?? []).slice(0, 4).map((item) => `- ${item}`).join("\n");
  return [
    `Legend Saju selected ${result.selection.selected.length} focused calculations; ${available} available/partial and ${blocked} blocked.`,
    `Produced ${claims} internal claims and returned a ${String(formatted.mode ?? "consumer")} view.`,
    nameSummary,
    result.selection.unsupported.length ? `Unsupported IDs: ${result.selection.unsupported.join(", ")}` : "",
    excerpts,
    "No model call, API key lookup, network request, or publication occurred inside Legend Saju.",
  ].filter(Boolean).join("\n");
}

function compactText(value: string, max = 700): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function claimPriority(kind: string, evidenceRole: string, mode: LegendSajuOutputMode): number {
  const meaningFirst = mode === "consumer" || mode === "compact";
  const kindScore = meaningFirst
    ? kind === "heuristic_interpretation" ? 0 : kind === "structural_observation" ? 1 : kind === "calculated_fact" ? 2 : 3
    : kind === "calculated_fact" ? 0 : kind === "structural_observation" ? 1 : kind === "heuristic_interpretation" ? 2 : 3;
  const roleScore = evidenceRole === "primary" ? 0 : evidenceRole === "support" ? 1 : 2;
  return kindScore * 10 + roleScore;
}

type ResolvedOutputControls = {
  detailLevel: LegendSajuDetailLevel;
  mode: LegendSajuOutputMode;
  maxClaims: number | undefined;
};

function resolvedOutputControls(input: LegendSajuResolveInput): ResolvedOutputControls {
  const inferredDetail: LegendSajuDetailLevel = input.outputMode === "debug"
    ? "raw"
    : input.outputMode === "evidence"
      ? "expert"
      : "standard";
  const detailLevel = input.detailLevel ?? inferredDetail;
  const mode = input.outputMode ?? (detailLevel === "raw" ? "debug" : detailLevel === "expert" ? "evidence" : "consumer");
  const defaultClaims = detailLevel === "brief" ? 4 : detailLevel === "expert" ? 40 : detailLevel === "raw" ? 100 : undefined;
  return { detailLevel, mode, maxClaims: input.maxClaims ?? defaultClaims };
}

function extractMyeongriJudgment(result: LegendSajuResolution): MyeongriJudgment | undefined {
  for (const evidence of result.evidence) {
    if (!evidence.ok || !evidence.data || typeof evidence.data !== "object") continue;
    const data = evidence.data as Record<string, unknown>;
    if (data.judgment) return data.judgment as MyeongriJudgment;
    const recommendation = data.recommend as { judgment?: MyeongriJudgment } | undefined;
    if (recommendation?.judgment) return recommendation.judgment;
    const prescription = (data.gaeun ?? data.gaeunPro) as { actionGuidance?: { judgment?: MyeongriJudgment } } | undefined;
    if (prescription?.actionGuidance?.judgment) return prescription.actionGuidance.judgment;
  }
  return undefined;
}

export function formatLegendSajuResolution(
  result: LegendSajuResolution,
  mode: LegendSajuOutputMode = "consumer",
  requestedMaxClaims?: number,
  detailLevel: LegendSajuDetailLevel = "standard",
): Record<string, unknown> {
  if (mode === "debug") return jsonObject({ mode, detailLevel, ...result });
  const defaultMax = detailLevel === "brief" ? 4 : detailLevel === "expert" ? 40 : mode === "consumer" ? 8 : mode === "compact" ? 16 : 100;
  const maxClaims = Math.max(1, Math.min(requestedMaxClaims ?? defaultMax, 100));
  const domainOrder = new Map(result.executionPlan.domains.map((domain, index) => [domain, index]));
  const rawClaims = result.dossier?.claims ?? [];
  const groupedClaims = new Map<string, {
    claim: (typeof rawClaims)[number];
    domains: Array<(typeof rawClaims)[number]["domain"]>;
  }>();
  for (const claim of rawClaims) {
    const signature = JSON.stringify([claim.capabilityId, claim.kind, claim.statement, claim.observations, claim.timeframe]);
    const existing = groupedClaims.get(signature);
    if (existing) {
      if (!existing.domains.includes(claim.domain)) existing.domains.push(claim.domain);
    } else {
      groupedClaims.set(signature, { claim, domains: [claim.domain] });
    }
  }
  const allClaims = [...groupedClaims.values()].sort((a, b) => {
    const domainDelta = Math.min(...a.domains.map((domain) => domainOrder.get(domain) ?? 99)) -
      Math.min(...b.domains.map((domain) => domainOrder.get(domain) ?? 99));
    const priorityDelta = claimPriority(a.claim.kind, a.claim.evidenceRole, mode) - claimPriority(b.claim.kind, b.claim.evidenceRole, mode);
    return mode === "consumer" || mode === "compact"
      ? priorityDelta || domainDelta
      : domainDelta || priorityDelta;
  });
  const selectedClaims = allClaims.slice(0, maxClaims);
  const claimCapabilityIds = new Set(rawClaims.map((claim) => claim.capabilityId));
  const limitationIds = new Map<string, string>();
  const registerLimitation = (value: string): string => {
    const existing = limitationIds.get(value);
    if (existing) return existing;
    const id = `limit-${limitationIds.size + 1}`;
    limitationIds.set(value, id);
    return id;
  };
  const sourceIds = new Set<string>();
  const observationLimit = mode === "consumer" ? 6 : mode === "compact" ? 12 : Number.POSITIVE_INFINITY;
  const claims = selectedClaims.map(({ claim, domains }) => {
    claim.sourceIds.forEach((id) => sourceIds.add(id));
    return {
      id: claim.id,
      domain: claim.domain,
      relatedDomains: domains,
      system: claim.system,
      capabilityId: claim.capabilityId,
      kind: claim.kind,
      statement: claim.statement,
      observations: claim.observations.slice(0, observationLimit),
      omittedObservationCount: Math.max(0, claim.observations.length - observationLimit),
      timeframe: claim.timeframe,
      confidence: claim.confidence,
      sourceRefs: claim.sourceIds,
      limitationRefs: claim.limitations.map(registerLimitation),
    };
  });
  const legacyEvidence = result.evidence
    .filter((item) => mode === "evidence" || !claimCapabilityIds.has(item.intent))
    .map((item) => {
    item.capability.capability.sourceIds.forEach((id) => sourceIds.add(id));
    item.capability.capability.omittedDimensions.forEach(registerLimitation);
    return {
      intent: item.intent,
      ok: item.ok,
      groundingText: compactText(item.groundingText, mode === "consumer" ? 1200 : 4000),
      vaultRefs: item.vaultRefs,
      status: item.capability.status,
      sourceRefs: item.capability.capability.sourceIds,
      limitationRefs: item.capability.capability.omittedDimensions.map(registerLimitation),
      ...(mode === "evidence" ? { data: item.data } : {}),
    };
  });
  const sourceById = new Map(Object.values(ENGINE_SOURCES).map((source) => [source.id, source]));
  const consumerReading = buildConsumerReading(result, mode, maxClaims);
  consumerReading.sourceIds.forEach((id) => sourceIds.add(id));
  result.dreamAnalysis?.sourceIds.forEach((id) => sourceIds.add(id));
  result.dreamAnalysis?.limitations.forEach(registerLimitation);
  const serializePoint = (point: (typeof consumerReading.sections)[number]["interpretations"][number]) => ({
    text: point.text,
    timeframe: point.timeframe,
    confidence: point.confidence,
    evidenceClaimIds: point.evidenceClaimIds,
    counterClaimIds: point.counterClaimIds,
    sourceRefs: point.sourceIds,
    limitationRefs: point.limitations.map(registerLimitation),
  });
  const sections = Object.fromEntries(consumerReading.sections.map((section) => [section.domain, {
    interpretations: section.interpretations.map(serializePoint),
    evidenceClaimIds: section.evidenceClaimIds,
    sourceRefs: section.sourceIds,
  }]));
  const recommendations = consumerReading.recommendations ? {
    items: consumerReading.recommendations.items.map((item) => ({
      ...item,
      sourceRefs: item.sourceIds,
      sourceIds: undefined,
    })),
    safeguards: consumerReading.recommendations.safeguards,
    timing: consumerReading.recommendations.timing,
    evidenceIntents: consumerReading.recommendations.evidenceIntents,
    sourceRefs: consumerReading.recommendations.sourceIds,
    boundary: consumerReading.recommendations.boundary,
  } : null;
  const timeline = consumerReading.timeline.map((entry) => ({
    period: entry.period,
    summary: entry.summary,
    domains: entry.domains,
    confidence: entry.confidence,
    evidenceClaimIds: entry.evidenceClaimIds,
    sourceRefs: entry.sourceIds,
    limitationRefs: entry.limitations.map(registerLimitation),
  }));
  const sourcesWithReading = [...sourceIds].map((id) => sourceById.get(id) ?? { id, title: id, uri: "", kind: "local_audit", scope: "", checkedAt: "" });
  const limitationsWithReading = [...limitationIds].map(([text, id]) => ({ id, text }));
  const highlights = [...new Set([
    ...(result.dreamAnalysis?.matches.map((match) => match.safeGeneralization) ?? []),
    ...consumerReading.highlights,
    ...(consumerReading.highlights.length
      ? []
      : legacyEvidence.filter((item) => item.ok).map((item) => compactText(item.groundingText, 500))),
  ])].slice(0, 6);
  const readingSummaryText = consumerReading.sections.length || consumerReading.timeline.length
    ? consumerReading.summary
    : result.dreamAnalysis?.status === "matched"
      ? result.dreamAnalysis.matches.map((match) => match.safeGeneralization).join(" ")
      : result.dreamAnalysis
        ? "현재 의미 감사가 끝난 5개 교차 전승 개념 밖이므로 원문 존재만으로 해석하지 않는다."
    : legacyEvidence.find((item) => item.ok)?.groundingText
      ? compactText(legacyEvidence.find((item) => item.ok)!.groundingText, 700)
      : result.nameAnalysis
        ? `공식 인명용 한자 스냅샷으로 성과 이름 ${result.nameAnalysis.surname.length + result.nameAnalysis.givenName.length}자를 분석했다.`
        : consumerReading.summary;
  const inputNotes = [...new Map(result.routes.flatMap((route) => route.inputAudit?.issues ?? [])
    .map((issue) => [`${issue.code}:${issue.field}:${issue.message}`, issue])).values()];
  const blocked = result.routes
    .filter((route) => route.status === "blocked")
    .map((route) => ({
      capabilityId: route.capability.id,
      missingRequired: route.missingRequired,
      reasons: route.reasons,
      inputIssues: route.inputAudit?.issues ?? [],
    }));
  const myeongriJudgment = extractMyeongriJudgment(result);
  const methodAnalysis = result.dossier ? {
    ...(myeongriJudgment ? { myeongriJudgment } : {}),
    synthesis: result.dossier.synthesis,
    ...((detailLevel === "expert" || detailLevel === "raw")
      ? { methodResults: result.dossier.methodResults }
      : {}),
    ...((detailLevel === "expert" || detailLevel === "raw") && result.dossier.knowledgeAssets
      ? { knowledgeAssets: result.dossier.knowledgeAssets }
      : {}),
  } : undefined;

  return jsonObject({
    mode,
    detailLevel,
    question: result.question,
    readingSummary: {
      focus: result.executionPlan.domains,
      summary: readingSummaryText,
      highlights,
      returnedClaimCount: claims.length,
      uniqueInternalClaimCount: allClaims.length,
      totalInternalClaimCount: rawClaims.length,
    },
    sections,
    recommendations,
    timeline,
    omittedTimelineYears: consumerReading.omittedTimelineYears,
    inputNotes,
    calculationSummary: {
      selectedCapabilities: result.executionPlan.selected,
      internalClaimCount: rawClaims.length,
      returnedClaimCount: claims.length,
      deterministic: result.noModelCalls,
    },
    executionPlan: {
      entryIntent: result.executionPlan.entryIntent,
      domains: result.executionPlan.domains,
      core: result.executionPlan.core,
      supporting: result.executionPlan.supporting,
      selected: result.executionPlan.selected,
      omitted: result.executionPlan.omitted,
      unsupported: result.executionPlan.unsupported,
    },
    claims,
    evidence: legacyEvidence,
    dreamAnalysis: result.dreamAnalysis,
    methodAnalysis,
    nameAnalysis: result.nameAnalysis,
    sources: sourcesWithReading,
    limitations: limitationsWithReading,
    blocked,
    conflicts: result.dossier?.conflicts ?? [],
    interpretationBoundary: result.interpretationBoundary,
    noModelCalls: result.noModelCalls,
    publicationSideEffects: result.publicationSideEffects,
  });
}

export async function runLegendSajuResolveTool(input: LegendSajuResolveInput): Promise<ToolResult> {
  try {
    const result = await resolveAsync(input);
    const controls = resolvedOutputControls(input);
    const formatted = formatLegendSajuResolution(result, controls.mode, controls.maxClaims, controls.detailLevel);
    return {
      content: [{ type: "text", text: resolutionSummary(result, formatted) }],
      structuredContent: formatted,
    };
  } catch (error) {
    return toolError("Legend Saju could not resolve the request", error);
  }
}

async function runIntentTool(input: Omit<LegendSajuResolveInput, "entryIntent">, entryIntent: LegendSajuEntryIntent): Promise<ToolResult> {
  return runLegendSajuResolveTool({
    ...input,
    entryIntent,
    ...(entryIntent === "expert" && !input.detailLevel ? { detailLevel: "expert" as const } : {}),
  });
}

export function runCapabilitySearchTool(input: { query?: string; limit?: number; systems?: string[] }): ToolResult {
  try {
    const manifest = getEngineManifest();
    const hits = input.query?.trim()
      ? searchCapabilities({ query: input.query, limit: input.limit, systems: input.systems })
      : Object.values(manifest.capabilities).slice(0, input.limit ?? 50).map((capability) => ({ capability }));
    const structuredContent = jsonObject({
      capabilityCount: manifest.capabilityCount,
      query: input.query ?? "",
      hits,
      requestedCapabilityContract: "Pass IDs as strings to legend_saju_run_methods; unknown IDs are reported without freezing the schema.",
    });
    return {
      content: [{
        type: "text",
        text: input.query?.trim()
          ? `${hits.length} matching capabilities found. Use their string IDs with legend_saju_run_methods.`
          : `${manifest.capabilityCount} live capabilities. Filter with a natural-language query to reduce context.`,
      }],
      structuredContent,
    };
  } catch (error) {
    return toolError("Legend Saju could not search capabilities", error);
  }
}

export async function runManifestTool(): Promise<ToolResult> {
  try {
    const manifest = getEngineManifest();
    const { getNameEngineDatasetSummary, getSuri81SourceSummary } = await import("./naming/index");
    const naming = {
      dataset: getNameEngineDatasetSummary(),
      eightyOneNumbers: getSuri81SourceSummary(),
    };
    return {
      content: [{ type: "text", text: `${manifest.capabilityCount} capabilities, ${manifest.sourceCount} registered sources, ${manifest.knowledge.factCount} embedded knowledge facts, and ${naming.dataset.counts.officialEntries} official Korean-name observations.` }],
      structuredContent: jsonObject({ ...manifest, naming }),
    };
  } catch (error) {
    return toolError("Legend Saju could not inspect the manifest", error);
  }
}

export function createLegendSajuMcpServer(): McpServer {
  const server = new McpServer({
    name: "legend-saju",
    version: LEGEND_SAJU_ENGINE_VERSION,
  }, {
    instructions: "일반 운세는 legend_saju_read_fortune을 호출한다. content의 계산 완료 요약만으로 답하지 말고 structuredContent의 readingSummary, sections, recommendations, timeline을 사용한다. 깊은 종합 분석은 같은 도구에 detailLevel=expert를 주며 capability ID를 먼저 찾게 하지 않는다. 특정 유파·산법·복합 체계를 지목한 요청은 legend_saju_capabilities로 필요한 ID를 한 번 찾은 뒤 legend_saju_run_methods에 함께 전달한다. expert 결과는 methodAnalysis.methodResults와 충돌·출처·누락 범위도 읽는다. raw는 개발자 요청에만 쓴다. 각 해석은 evidenceClaimIds·sourceRefs·limitationRefs의 범위를 지킨다.",
  });

  server.registerTool("legend_saju_manifest", {
    title: "Inspect Legend Saju",
    description: "Return the live, source-traceable deterministic engine manifest. No model or network call.",
    inputSchema: z.object({}),
    outputSchema: manifestOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => runManifestTool());

  server.registerTool("legend_saju_capabilities", {
    title: "Find a calculation method",
    description: "Use this when a user asks which Saju, Myeongri, Zi Wei, Qimen, Daliuren, I Ching, Tieban, Dang Saju, Tojeong, Feng Shui, naming, dream, or other traditional calculation method fits a specialized question. Do not use it for an ordinary fortune reading.",
    inputSchema: z.object({
      query: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
      systems: z.array(z.string()).optional(),
    }),
    outputSchema: capabilitySearchOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runCapabilitySearchTool(input));

  server.registerTool("legend_saju_read_fortune", {
    title: "Read a Saju fortune",
    description: "Use this when the user says 사주 봐줘, 운세 봐줘, 올해 운세, 재물운, 사업운, 직업운, 연애운, 결혼운, 건강운, 개운법, 구체적 액션, or asks what to do over a future period. Read structuredContent, especially recommendations for action requests. Use detailLevel=expert for a deep one-call analysis; do not search capability IDs first.",
    inputSchema: readingSchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "general_reading"));

  server.registerTool("legend_saju_analyze_compatibility", {
    title: "Analyze two-person compatibility",
    description: "Use this when the user asks 궁합, 결혼 가능성, relationship compatibility, or wants two birth charts compared. Requires both people's birth data.",
    inputSchema: compatibilitySchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "compatibility"));

  server.registerTool("legend_saju_select_dates", {
    title: "Select auspicious dates",
    description: "Use this only when the user explicitly asks for 택일, 좋은 날, 계약일, 이사일, 개업일, 수술일, or another date-selection task. Do not use it merely because a fortune request mentions this year.",
    inputSchema: dateSelectionSchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "date_selection"));

  server.registerTool("legend_saju_cast_divination", {
    title: "Cast a traditional divination chart",
    description: "Use this for 기문둔갑, 대육임, 주역, 점괘, or a concrete decision cast from a question time or six line values. Do not use it for a general natal fortune reading.",
    inputSchema: divinationSchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "divination"));

  server.registerTool("legend_saju_analyze_name", {
    title: "Analyze a Korean name",
    description: "Use this for 작명, 성명학, 81수, 이름 한자, 인명용 한자, 획수, or 파자 questions. It keeps legal Hanja observations, declared stroke standards, and birth-based naming guidance separate.",
    inputSchema: namingSchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "naming"));

  server.registerTool("legend_saju_interpret_dream", {
    title: "Interpret a dream from audited traditions",
    description: "Use this for 해몽, 꿈풀이, or dream interpretation. It currently handles five cross-culturally audited concepts and returns both shared motifs and conflicting conditions with primary-source excerpts; it does not turn the remaining raw corpus into invented meanings.",
    inputSchema: dreamSchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "dream"));

  server.registerTool("legend_saju_run_methods", {
    title: "Run specific or mixed traditional methods",
    description: "Use this for expert, mixed-system, or named-method requests. It covers Myeongri details such as 십성·지장간·투간·통근·합충형파해·삼합·방합·육합·월령·격국·조후·억부·통관·병약·궁통보감·적천수·삼명통회·연해자평·종격·화격·특수격; Zi Wei 12궁·삼방사정·대한·유년·유월·유일·유시·생년사화·궁간사화·자화·비성·흠천사화·중주파; and Qimen, Daliuren, I Ching, Tieban, Dang Saju, Tojeong, Feng Shui, naming, 81-number, Hanja decomposition, and dream traditions. Pass discovered capability IDs together in requestedCapabilities, or let the server plan from the question. Use focused tools for ordinary single-goal requests.",
    inputSchema: resolveSchema,
    outputSchema: legendSajuResultOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "expert"));

  return server;
}

export function startLegendSajuStdioServer(): void {
  serveStdio(createLegendSajuMcpServer, {
    onerror: (error) => process.stderr.write(`[legend-saju] ${error.message}\n`),
  });
}

const executedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (executedDirectly) {
  startLegendSajuStdioServer();
}
