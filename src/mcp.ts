import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import {
  ENGINE_SOURCES,
  getEngineManifest,
  LEGEND_SAJU_ENGINE_VERSION,
  resolveAsync,
  searchCapabilities,
  type LegendSajuEntryIntent,
  type LegendSajuOutputMode,
  type LegendSajuResolution,
  type LegendSajuResolveInput,
} from "./engine/public-entry";

const dateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).optional(),
  minute: z.number().int().min(0).max(59).optional(),
});

const birthSchema = dateSchema.extend({
  calendar: z.enum(["solar", "lunar"]).optional().describe("Defaults to solar."),
  isLeapMonth: z.boolean().optional(),
  gender: z.enum(["남", "여"]).optional(),
  birthTimeAccuracy: z.enum(["recorded", "family_memory", "estimated", "unknown"]).optional(),
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
const outputControlFields = {
  outputMode: outputModeSchema.optional().describe("consumer is the default. Use evidence or debug only when the user asks for raw methodology."),
  maxClaims: z.number().int().min(1).max(100).optional().describe("Maximum claims returned outside debug mode."),
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
  rangeDays: z.number().int().positive().max(366).optional(),
  purpose: z.string().optional(),
  asOfYear: z.number().int().optional(),
  maxAutoCapabilities: z.number().int().min(0).max(20).optional(),
  ...outputControlFields,
});

const readingSchema = z.object({
  question: z.string().min(1).describe("The user's original request, such as 올해 재물운과 사업운을 봐줘."),
  birth: birthSchema,
  targetDate: dateSchema.optional().describe("The date whose current or future fortune is being read."),
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

function claimPriority(kind: string, evidenceRole: string): number {
  const kindScore = kind === "calculated_fact" ? 0 : kind === "structural_observation" ? 1 : kind === "heuristic_interpretation" ? 2 : 3;
  return kindScore + (evidenceRole === "primary" ? 0 : evidenceRole === "support" ? 4 : 8);
}

export function formatLegendSajuResolution(
  result: LegendSajuResolution,
  mode: LegendSajuOutputMode = "consumer",
  requestedMaxClaims?: number
): Record<string, unknown> {
  if (mode === "debug") return jsonObject({ mode, ...result });
  const defaultMax = mode === "consumer" ? 8 : mode === "compact" ? 16 : 100;
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
  const allClaims = [...groupedClaims.values()].sort((a, b) =>
    Math.min(...a.domains.map((domain) => domainOrder.get(domain) ?? 99)) -
      Math.min(...b.domains.map((domain) => domainOrder.get(domain) ?? 99)) ||
    claimPriority(a.claim.kind, a.claim.evidenceRole) - claimPriority(b.claim.kind, b.claim.evidenceRole)
  );
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
  const sources = [...sourceIds].map((id) => sourceById.get(id) ?? { id, title: id, uri: "", kind: "local_audit", scope: "", checkedAt: "" });
  const limitations = [...limitationIds].map(([text, id]) => ({ id, text }));
  const highlights = [...new Set([
    ...claims.filter((claim) => claim.kind !== "limitation").map((claim) => claim.statement),
    ...legacyEvidence.filter((item) => item.ok).map((item) => compactText(item.groundingText, 500)),
  ])].slice(0, 6);
  const blocked = result.routes
    .filter((route) => route.status === "blocked")
    .map((route) => ({
      capabilityId: route.capability.id,
      missingRequired: route.missingRequired,
      reasons: route.reasons,
      inputIssues: route.inputAudit?.issues ?? [],
    }));

  return jsonObject({
    mode,
    question: result.question,
    readingSummary: {
      focus: result.executionPlan.domains,
      highlights,
      returnedClaimCount: claims.length,
      uniqueInternalClaimCount: allClaims.length,
      totalInternalClaimCount: rawClaims.length,
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
    nameAnalysis: result.nameAnalysis,
    sources,
    limitations,
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
    const formatted = formatLegendSajuResolution(result, input.outputMode ?? "consumer", input.maxClaims);
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
    outputMode: input.outputMode ?? "consumer",
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
      requestedCapabilityContract: "Pass IDs as strings to legend_saju_resolve; unknown IDs are reported without freezing the schema.",
    });
    return {
      content: [{
        type: "text",
        text: input.query?.trim()
          ? `${hits.length} matching capabilities found. Use their string IDs with legend_saju_resolve.`
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
  });

  server.registerTool("legend_saju_manifest", {
    title: "Inspect Legend Saju",
    description: "Return the live, source-traceable deterministic engine manifest. No model or network call.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => runManifestTool());

  server.registerTool("legend_saju_capabilities", {
    title: "Find a calculation method",
    description: "Use this when a user asks which Saju, Zi Wei, Qimen, Daliuren, Tieban, naming, or traditional calculation method fits a specialized question. Do not use it for an ordinary fortune reading.",
    inputSchema: z.object({
      query: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
      systems: z.array(z.string()).optional(),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runCapabilitySearchTool(input));

  server.registerTool("legend_saju_read_fortune", {
    title: "Read a Saju fortune",
    description: "Use this when the user says 사주 봐줘, 운세 봐줘, 올해 운세, 재물운, 사업운, 직업운, 연애운, 결혼운, 건강운, or asks what to do over a future period. It selects only calculations relevant to that focus.",
    inputSchema: readingSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "general_reading"));

  server.registerTool("legend_saju_analyze_compatibility", {
    title: "Analyze two-person compatibility",
    description: "Use this when the user asks 궁합, 결혼 가능성, relationship compatibility, or wants two birth charts compared. Requires both people's birth data.",
    inputSchema: compatibilitySchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "compatibility"));

  server.registerTool("legend_saju_select_dates", {
    title: "Select auspicious dates",
    description: "Use this only when the user explicitly asks for 택일, 좋은 날, 계약일, 이사일, 개업일, 수술일, or another date-selection task. Do not use it merely because a fortune request mentions this year.",
    inputSchema: dateSelectionSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "date_selection"));

  server.registerTool("legend_saju_cast_divination", {
    title: "Cast a traditional divination chart",
    description: "Use this for 기문둔갑, 대육임, 주역, 점괘, or a concrete decision cast from a question time or six line values. Do not use it for a general natal fortune reading.",
    inputSchema: divinationSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "divination"));

  server.registerTool("legend_saju_analyze_name", {
    title: "Analyze a Korean name",
    description: "Use this for 작명, 성명학, 81수, 이름 한자, 인명용 한자, 획수, or 파자 questions. It keeps legal Hanja observations, declared stroke standards, and birth-based naming guidance separate.",
    inputSchema: namingSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runIntentTool(input, "naming"));

  server.registerTool("legend_saju_resolve", {
    title: "Run an expert Legend Saju plan",
    description: "Use this only for expert or mixed-system requests that name a specific traditional method, capability ID, evidence depth, or debugging need. For ordinary fortune, compatibility, date selection, divination, or naming requests, use the focused tool instead.",
    inputSchema: resolveSchema,
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
