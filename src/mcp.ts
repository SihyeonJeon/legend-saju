import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import {
  getEngineManifest,
  LEGEND_SAJU_ENGINE_VERSION,
  resolveAsync,
  searchCapabilities,
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

function resolutionSummary(result: Awaited<ReturnType<typeof resolveAsync>>): string {
  const available = result.routes.filter((route) => route.status !== "blocked").length;
  const blocked = result.routes.filter((route) => route.status === "blocked").length;
  const claims = result.dossier?.claims.length ?? 0;
  const nameSummary = result.nameAnalysis
    ? `Analyzed ${result.nameAnalysis.surname.length + result.nameAnalysis.givenName.length} name characters against the official-entry snapshot.`
    : "";
  const excerpts = result.evidence
    .filter((item) => item.ok)
    .slice(0, 4)
    .map((item) => `- ${item.intent}: ${item.groundingText}`)
    .join("\n");
  return [
    `Selected ${result.selection.selected.length} capabilities; ${available} available/partial and ${blocked} blocked.`,
    `Produced ${claims} dossier claims and ${result.evidence.length} legacy evidence packets.`,
    nameSummary,
    result.selection.unsupported.length ? `Unsupported IDs: ${result.selection.unsupported.join(", ")}` : "",
    excerpts,
    "No model call, API key lookup, network request, or publication occurred inside Legend Saju.",
  ].filter(Boolean).join("\n");
}

export async function runLegendSajuResolveTool(input: LegendSajuResolveInput): Promise<ToolResult> {
  try {
    const result = await resolveAsync(input);
    return {
      content: [{ type: "text", text: resolutionSummary(result) }],
      structuredContent: jsonObject(result),
    };
  } catch (error) {
    return toolError("Legend Saju could not resolve the request", error);
  }
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
    description: "Search the live capability registry with natural language before resolving a specialized request.",
    inputSchema: z.object({
      query: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
      systems: z.array(z.string()).optional(),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runCapabilitySearchTool(input));

  server.registerTool("legend_saju_resolve", {
    title: "Resolve with Legend Saju",
    description: "Route an open-ended request through deterministic Saju, Myeongri, Zi Wei, Qimen, Daliuren, Tieban, naming, or related calculations. No API key or model call inside the tool.",
    inputSchema: resolveSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (input) => runLegendSajuResolveTool(input));

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
