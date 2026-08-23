/**
 * Stable public facade for the deterministic Legend Saju engine.
 *
 * Keep presentation and external integrations outside this module. The package
 * exports this exact boundary so every client uses the same calculation API.
 */
import {
  ENGINE_CAPABILITIES,
  ENGINE_SOURCES,
  LEGACY_SAJU_INTENTS,
  type CapabilityDescriptor,
  type EngineCapabilityId,
} from "./engine-capabilities";
import {
  buildLifeDossier,
  type LifeDossier,
  type LifeDossierInput,
} from "./engine-v2";
import {
  querySajuEngine,
  type SajuEvidence,
  type SajuQuery,
} from "./saju-engine-router";
import {
  getMyeongriKnowledgeAssetSummary,
  type MyeongriKnowledgeAssetSummary,
} from "./myeongri-knowledge-trilingual";
import {
  resolve,
  resolveAsync,
  searchCapabilities,
  type CapabilityExecutionPlan,
  type CapabilitySearchHit,
  type CapabilitySearchInput,
  type LegendSajuEntryIntent,
  type LegendSajuDateInput,
  type LegendSajuOutputMode,
  type LegendSajuResolution,
  type LegendSajuResolveInput,
} from "./resolver";

export const LEGEND_SAJU_ENGINE_VERSION = "0.2.0" as const;

export interface LegendSajuEngineManifest {
  version: typeof LEGEND_SAJU_ENGINE_VERSION;
  deterministic: true;
  publicationSideEffects: false;
  capabilityCount: number;
  legacyIntentCount: number;
  sourceCount: number;
  knowledge: MyeongriKnowledgeAssetSummary;
  capabilities: Readonly<Record<EngineCapabilityId, CapabilityDescriptor>>;
}

/** Question-first cross-system analysis. Performs no LLM call or publication. */
export function analyze(input: LifeDossierInput): LifeDossier {
  return buildLifeDossier(input);
}

/** Narrow compatibility API for intent-based callers such as the current bot. */
export function query(input: SajuQuery): SajuEvidence {
  return querySajuEngine(input);
}

export function getEngineManifest(): LegendSajuEngineManifest {
  return {
    version: LEGEND_SAJU_ENGINE_VERSION,
    deterministic: true,
    publicationSideEffects: false,
    capabilityCount: Object.keys(ENGINE_CAPABILITIES).length,
    legacyIntentCount: LEGACY_SAJU_INTENTS.length,
    sourceCount: Object.keys(ENGINE_SOURCES).length,
    knowledge: getMyeongriKnowledgeAssetSummary(),
    capabilities: ENGINE_CAPABILITIES,
  };
}

export {
  resolve,
  resolveAsync,
  searchCapabilities,
};

export type {
  CapabilityDescriptor,
  EngineCapabilityId,
  LifeDossier,
  LifeDossierInput,
  SajuEvidence,
  SajuQuery,
  MyeongriKnowledgeAssetSummary,
  CapabilityExecutionPlan,
  CapabilitySearchHit,
  CapabilitySearchInput,
  LegendSajuEntryIntent,
  LegendSajuDateInput,
  LegendSajuOutputMode,
  LegendSajuResolution,
  LegendSajuResolveInput,
};

export type {
  BirthTimeAccuracy,
  Element,
  Gender,
  SajuChart,
  SajuInput,
  SajuPillar,
} from "./saju-engine";

export type {
  KoreanNameAnalysis,
  KoreanNameInput,
  NameCharacterAnalysis,
  NameCharacterInput,
} from "../naming/index";

export {
  ENGINE_CAPABILITIES,
  ENGINE_SOURCES,
  LEGACY_SAJU_INTENTS,
};
