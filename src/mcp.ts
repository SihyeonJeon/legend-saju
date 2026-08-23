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

const outputModeSchema = z.enum(["action_only", "consumer", "evidence", "debug"]);
const detailLevelSchema = z.enum(["brief", "standard", "expert", "raw"]);
const outputControlFields = {
  detailLevel: detailLevelSchema.optional().describe("Calculation breadth. This does not choose the response projection."),
  outputMode: outputModeSchema.optional().describe("Response projection: action_only returns actions, consumer returns a readable interpretation, evidence returns claims and source-linked method data, and debug returns the internal resolver record."),
  maxClaims: z.number().int().min(1).max(100).optional().describe("Global item budget outside debug mode. It limits interpretations, actions, timeline entries, claims, legacy evidence, and method results together."),
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
  const mode = String(formatted.mode ?? "consumer");
  const calculation = formatted.calculationSummary as { returnedItemCount?: number } | undefined;
  const returned = calculation?.returnedItemCount;
  if (mode === "debug") return `Returned the full resolver record for ${result.selection.selected.length} calculations.`;
  if (mode === "evidence") return `Returned ${returned ?? 0} source-linked evidence items.`;
  if (mode === "action_only") return `Returned ${returned ?? 0} action items.`;
  return `Returned ${returned ?? 0} readable interpretation items.`;
}

function compactText(value: string, max = 700): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

const EVIDENCE_LIMIT_KEYS = new Set([
  "boundary",
  "boundaries",
  "disclaimer",
  "interpretationBoundary",
  "limitation",
  "limitations",
  "limitationRefs",
]);

function withoutEvidenceLimits(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutEvidenceLimits);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !EVIDENCE_LIMIT_KEYS.has(key))
    .map(([key, item]) => [key, withoutEvidenceLimits(item)]));
}

function claimPriority(kind: string, evidenceRole: string, mode: LegendSajuOutputMode): number {
  const meaningFirst = mode === "consumer" || mode === "action_only";
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

function defaultOutputBudget(mode: LegendSajuOutputMode, detailLevel: LegendSajuDetailLevel): number | undefined {
  if (mode === "debug") return undefined;
  if (mode === "action_only") return 6;
  if (mode === "consumer") return detailLevel === "brief" ? 4 : 12;
  return detailLevel === "brief" ? 8 : detailLevel === "expert" || detailLevel === "raw" ? 40 : 20;
}

function resolvedOutputControls(input: LegendSajuResolveInput): ResolvedOutputControls {
  const detailLevel = input.detailLevel ?? "standard";
  const mode = input.outputMode ?? "consumer";
  return { detailLevel, mode, maxClaims: input.maxClaims ?? defaultOutputBudget(mode, detailLevel) };
}

export function formatLegendSajuResolution(
  result: LegendSajuResolution,
  mode: LegendSajuOutputMode = "consumer",
  requestedMaxClaims?: number,
  detailLevel: LegendSajuDetailLevel = "standard",
): Record<string, unknown> {
  if (mode === "debug") {
    return jsonObject({ mode, detailLevel, ...(withoutEvidenceLimits(result) as Record<string, unknown>) });
  }
  const defaultMax = defaultOutputBudget(mode, detailLevel) ?? 100;
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
    return mode === "consumer" || mode === "action_only"
      ? priorityDelta || domainDelta
      : domainDelta || priorityDelta;
  });
  const inputNotes = [...new Map(result.routes.flatMap((route) => route.inputAudit?.issues ?? [])
    .map((issue) => [`${issue.code}:${issue.field}:${issue.message}`, issue])).values()];
  const blockedCandidates = result.routes
    .filter((route) => route.status === "blocked")
    .map((route) => ({
      capabilityId: route.capability.id,
      missingRequired: route.missingRequired,
      reasons: route.reasons,
      inputIssues: route.inputAudit?.issues ?? [],
    }));

  if (mode === "action_only" || mode === "consumer") {
    const reading = buildConsumerReading(result, mode, maxClaims);
    const primaryItemCount = reading.sections.reduce((sum, section) => sum + section.interpretations.length, 0)
      + (reading.recommendations?.items.length ?? 0)
      + reading.timeline.length;
    let remaining = Math.max(0, maxClaims - primaryItemCount);
    const dreamMatches = mode === "consumer" ? result.dreamAnalysis?.matches.slice(0, remaining) ?? [] : [];
    remaining -= dreamMatches.length;
    const nameCharacters = mode === "consumer" && result.nameAnalysis
      ? [...result.nameAnalysis.surname, ...result.nameAnalysis.givenName].slice(0, remaining)
      : [];
    const sections = Object.fromEntries(reading.sections.map((section) => [section.domain, {
      interpretations: section.interpretations.map((point) => ({
        text: point.text,
        timeframe: point.timeframe,
        confidence: point.confidence,
        evidenceClaimIds: point.evidenceClaimIds,
        counterClaimIds: point.counterClaimIds,
      })),
      evidenceClaimIds: section.evidenceClaimIds,
    }]));
    const recommendations = reading.recommendations ? {
      items: reading.recommendations.items.map((item) => ({
        id: item.id,
        title: item.title,
        domains: item.domains,
        actions: item.actions,
        caution: item.caution,
      })),
      evidenceIntents: reading.recommendations.evidenceIntents,
    } : null;
    const timeline = reading.timeline.map((entry) => ({
      period: entry.period,
      summary: entry.summary,
      domains: entry.domains,
      confidence: entry.confidence,
      evidenceClaimIds: entry.evidenceClaimIds,
    }));
    const dreamSummary = mode === "consumer" && result.dreamAnalysis ? {
      status: result.dreamAnalysis.status,
      matches: dreamMatches.map((match) => ({
        concept: match.concept,
        sharedMotif: match.sharedMotif,
        conflict: match.conflict,
        interpretation: match.safeGeneralization,
        clarificationQuestions: match.clarificationQuestions,
      })),
    } : undefined;
    const nameSummary = mode === "consumer" && result.nameAnalysis ? {
      legalIdentityStatus: result.nameAnalysis.legalIdentityStatus,
      characters: nameCharacters.map((item) => ({
        character: item.identity.character,
        officialReadings: item.reading.official,
        readingStatus: item.reading.status,
        nameMeanings: item.officialLabels.nameMeanings,
      })),
      fiveGridStatus: result.nameAnalysis.fiveGrid.status,
      eightyOneNumbersStatus: result.nameAnalysis.eightyOneNumbers.status,
    } : undefined;
    const specialHighlights = dreamMatches.map((match) => match.safeGeneralization);
    const highlights = [...new Set([...specialHighlights, ...reading.highlights])].slice(0, Math.min(maxClaims, 6));
    const summary = mode === "action_only"
      ? reading.summary
      : result.dreamAnalysis?.status === "matched"
      ? dreamMatches.map((match) => match.safeGeneralization).join(" ")
      : result.nameAnalysis
        ? `성과 이름 ${result.nameAnalysis.surname.length + result.nameAnalysis.givenName.length}자의 인명용 한자 정보를 확인했다.`
        : reading.summary;
    const common = {
      mode,
      detailLevel,
      question: result.question,
      inputNotes,
      calculationSummary: {
        selectedCapabilityCount: result.executionPlan.selected.length,
        internalClaimCount: rawClaims.length,
        returnedItemCount: primaryItemCount + dreamMatches.length + nameCharacters.length,
        deterministic: result.noModelCalls,
      },
    };
    if (mode === "action_only") {
      return jsonObject({ ...common, recommendations });
    }
    return jsonObject({
      ...common,
      readingSummary: {
        focus: result.executionPlan.domains,
        summary,
        highlights,
        returnedItemCount: primaryItemCount + dreamMatches.length + nameCharacters.length,
        totalInternalClaimCount: rawClaims.length,
      },
      recommendations,
      ...(dreamSummary ? { dreamSummary } : {}),
      ...(nameSummary ? { nameSummary } : {}),
      sections,
      timeline,
      omittedTimelineYears: reading.omittedTimelineYears,
    });
  }

  type EvidenceUnit =
    | { kind: "claim"; value: (typeof allClaims)[number] }
    | { kind: "legacy"; value: (typeof result.evidence)[number] }
    | { kind: "method"; value: [string, unknown] }
    | { kind: "synthesis"; value: NonNullable<typeof result.dossier>["synthesis"][number] }
    | { kind: "conflict"; value: NonNullable<typeof result.dossier>["conflicts"][number] }
    | { kind: "blocked"; value: (typeof blockedCandidates)[number] }
    | { kind: "dream"; value: NonNullable<typeof result.dreamAnalysis>["matches"][number] }
    | { kind: "name"; value: NonNullable<typeof result.nameAnalysis> };
  const methodEntries = Object.entries(result.dossier?.methodResults ?? {});
  const methodIds = new Set(methodEntries.map(([id]) => id));
  const legacyCandidates = result.evidence.filter((item) => !methodIds.has(item.intent));
  const groups: EvidenceUnit[][] = [
    [
      ...(result.nameAnalysis ? [{ kind: "name" as const, value: result.nameAnalysis }] : []),
      ...(result.dreamAnalysis?.matches.map((value) => ({ kind: "dream" as const, value })) ?? []),
    ],
    allClaims.map((value) => ({ kind: "claim" as const, value })),
    legacyCandidates.map((value) => ({ kind: "legacy" as const, value })),
    methodEntries.map((value) => ({ kind: "method" as const, value })),
    (result.dossier?.synthesis ?? []).map((value) => ({ kind: "synthesis" as const, value })),
    (result.dossier?.conflicts ?? []).map((value) => ({ kind: "conflict" as const, value })),
    blockedCandidates.map((value) => ({ kind: "blocked" as const, value })),
  ];
  const units: EvidenceUnit[] = [];
  const availableItemsByKind = Object.fromEntries(groups.flat().reduce((counts, unit) => {
    counts.set(unit.kind, (counts.get(unit.kind) ?? 0) + 1);
    return counts;
  }, new Map<EvidenceUnit["kind"], number>()));
  while (units.length < maxClaims) {
    let progressed = false;
    for (const group of groups) {
      if (units.length >= maxClaims) break;
      const value = group.shift();
      if (!value) continue;
      units.push(value);
      progressed = true;
    }
    if (!progressed) break;
  }

  const sourceIds = new Set<string>();
  const selectedClaims = units.filter((unit): unit is Extract<EvidenceUnit, { kind: "claim" }> => unit.kind === "claim");
  const observationLimit = Math.max(1, Math.min(12, Math.ceil(maxClaims / Math.max(1, selectedClaims.length))));
  const claims = selectedClaims.map(({ value: { claim, domains } }) => {
    claim.sourceIds.forEach((id) => {
      sourceIds.add(id);
    });
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
    };
  });
  const evidence = units
    .filter((unit): unit is Extract<EvidenceUnit, { kind: "legacy" }> => unit.kind === "legacy")
    .map(({ value: item }) => {
      item.capability.capability.sourceIds.forEach((id) => {
        sourceIds.add(id);
      });
      return {
        intent: item.intent,
        ok: item.ok,
        groundingText: compactText(item.groundingText, 4000),
        vaultRefs: item.vaultRefs,
        status: item.capability.status,
        sourceRefs: item.capability.capability.sourceIds,
        data: withoutEvidenceLimits(item.data),
      };
    });
  const selectedMethodEntries = units
    .filter((unit): unit is Extract<EvidenceUnit, { kind: "method" }> => unit.kind === "method")
    .map((unit) => unit.value);
  for (const [id] of selectedMethodEntries) {
    const route = result.routes.find((item) => item.capability.id === id);
    route?.capability.sourceIds.forEach((sourceId) => {
      sourceIds.add(sourceId);
    });
  }
  const selectedDreamMatches = units
    .filter((unit): unit is Extract<EvidenceUnit, { kind: "dream" }> => unit.kind === "dream")
    .map((unit) => unit.value);
  if (result.dreamAnalysis) {
    result.dreamAnalysis.sourceIds.forEach((id) => {
      sourceIds.add(id);
    });
  }
  const nameAnalysis = units.find((unit): unit is Extract<EvidenceUnit, { kind: "name" }> => unit.kind === "name")?.value;
  const sourceById = new Map(Object.values(ENGINE_SOURCES).map((source) => [source.id, source]));
  const sources = [...sourceIds].flatMap((id) => {
    const source = sourceById.get(id);
    return source ? [source] : [];
  });
  const synthesis = units.filter((unit): unit is Extract<EvidenceUnit, { kind: "synthesis" }> => unit.kind === "synthesis").map((unit) => unit.value);
  const conflicts = units.filter((unit): unit is Extract<EvidenceUnit, { kind: "conflict" }> => unit.kind === "conflict").map((unit) => unit.value);
  const blocked = units.filter((unit): unit is Extract<EvidenceUnit, { kind: "blocked" }> => unit.kind === "blocked").map((unit) => unit.value);
  const returnedItemsByKind = Object.fromEntries(units.reduce((counts, unit) => {
    counts.set(unit.kind, (counts.get(unit.kind) ?? 0) + 1);
    return counts;
  }, new Map<EvidenceUnit["kind"], number>()));
  const omittedItemsByKind = Object.fromEntries(Object.entries(availableItemsByKind)
    .map(([kind, count]) => [kind, count - (returnedItemsByKind[kind] ?? 0)] as const)
    .filter(([, count]) => count > 0));
  return jsonObject({
    mode,
    detailLevel,
    question: result.question,
    calculationSummary: {
      selectedCapabilityCount: result.executionPlan.selected.length,
      internalClaimCount: rawClaims.length,
      returnedItemCount: units.length,
      deterministic: result.noModelCalls,
    },
    omittedItemsByKind,
    executionPlan: result.executionPlan,
    claims,
    evidence,
    methodAnalysis: {
      synthesis,
      methodResults: withoutEvidenceLimits(Object.fromEntries(selectedMethodEntries)),
    },
    ...(result.dreamAnalysis ? {
      dreamAnalysis: withoutEvidenceLimits({ ...result.dreamAnalysis, matches: selectedDreamMatches }),
    } : {}),
    ...(nameAnalysis ? { nameAnalysis: withoutEvidenceLimits(nameAnalysis) } : {}),
    sources,
    blocked,
    conflicts,
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
    instructions: "일반 운세는 legend_saju_read_fortune을 호출한다. detailLevel은 계산 범위, outputMode는 반환 형식을 정한다. 기본 consumer는 readingSummary·sections·recommendations·timeline을 사용하고, 행동만 필요하면 action_only를 쓴다. 계산 근거·지식 자산·원문·출처가 필요할 때만 evidence로 다시 호출한다. 특정 유파나 산법을 지목한 요청은 legend_saju_capabilities에서 ID를 찾은 뒤 legend_saju_run_methods에 함께 전달한다. debug는 개발자 점검용이다.",
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
    description: "Use this for natal, current, annual, career, wealth, relationship, health, and action readings. Use detailLevel for calculation breadth and outputMode for action, readable, evidence, or debug results.",
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
