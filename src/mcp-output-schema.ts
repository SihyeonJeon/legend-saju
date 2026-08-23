import { z } from "zod/v4";

const sourceRefs = z.array(z.string());
const limitationRefs = z.array(z.string());
const timeframeSchema = z.object({
  kind: z.enum(["natal", "range", "date", "method"]),
  value: z.string(),
});

const interpretationSchema = z.object({
  text: z.string(),
  timeframe: timeframeSchema,
  confidence: z.enum(["high", "medium", "low"]),
  evidenceClaimIds: z.array(z.string()),
  counterClaimIds: z.array(z.string()),
  sourceRefs,
  limitationRefs,
});

const recommendationSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    domains: z.array(z.string()),
    actions: z.array(z.string()),
    caution: z.string(),
    basis: z.array(z.object({
      lensId: z.string(),
      school: z.string(),
      status: z.string(),
      candidateElements: z.array(z.string()),
      candidateFunctions: z.array(z.string()),
    })),
    sourceRefs,
  })),
  safeguards: z.array(z.object({
    id: z.string(),
    label: z.string(),
    action: z.string(),
    evidence: z.array(z.string()),
  })),
  timing: z.object({
    asOfYear: z.number().int(),
    daYunAge: z.string(),
    contacts: z.array(z.object({
      layer: z.enum(["da_yun", "se_yun"]),
      pillar: z.string(),
      stem: z.string(),
      element: z.string(),
      tenGod: z.string(),
      family: z.string(),
      contactedLensIds: z.array(z.string()),
      interpretation: z.string(),
    })),
    boundary: z.string(),
  }).nullable(),
  evidenceIntents: z.array(z.string()),
  sourceRefs,
  boundary: z.string(),
}).nullable();

const judgmentSchema = z.object({
  strength: z.object({
    status: z.enum(["support_leaning", "weak_leaning", "contested", "extreme_structure_candidate"]),
    monthCommandTenGod: z.string(),
    exactRoots: z.array(z.object({
      position: z.string(),
      branch: z.string(),
      stage: z.string(),
      grade: z.enum(["substantial", "residual"]),
    })),
    sameElementRoots: z.array(z.object({ position: z.string(), branch: z.string(), stage: z.string() })),
    axes: z.array(z.object({
      id: z.enum(["month_command", "root", "visible_support", "visible_drain_control"]),
      direction: z.enum(["supports_day_master", "drains_or_controls_day_master", "mixed", "neutral"]),
      observations: z.array(z.string()),
    })),
    followingCandidate: z.enum(["follow_output", "follow_wealth", "follow_officer"]).nullable(),
    policy: z.string(),
    boundary: z.string(),
  }).passthrough(),
  pattern: z.object({
    pattern: z.string(),
    monthMainStem: z.string(),
    monthMainTenGod: z.string(),
    mechanisms: z.array(z.object({
      id: z.string(),
      label: z.string(),
      polarity: z.enum(["supporting", "damaging"]),
      grade: z.enum(["exposed", "rooted", "structural"]),
      evidence: z.array(z.string()),
    })),
    monthBranchClashes: z.array(z.string()),
    status: z.enum(["supported", "contested", "damaged", "unresolved"]),
    boundary: z.string(),
  }).passthrough(),
  usefulGods: z.object({
    lenses: z.array(z.object({
      id: z.enum(["climate", "pattern_function", "support_control"]),
      school: z.string(),
      candidateStems: z.array(z.string()),
      candidateFamilies: z.array(z.string()),
      candidateElements: z.array(z.string()),
      observations: z.array(z.string()),
      sourceIds: z.array(z.string()),
      status: z.enum(["active", "conflicted", "withheld"]),
    })),
    conflicts: z.array(z.string()),
    boundary: z.string(),
  }),
  tenGodPresences: z.array(z.object({
    tenGod: z.string(),
    family: z.string(),
    visibleAt: z.array(z.string()),
    rootedAt: z.array(z.string()),
  })),
  sourceIds: z.array(z.string()),
  boundary: z.string(),
});

const executionPlanSchema = z.object({
  entryIntent: z.string(),
  domains: z.array(z.string()),
  core: z.array(z.string()),
  supporting: z.array(z.string()),
  selected: z.array(z.string()),
  omitted: z.array(z.object({ capabilityId: z.string(), reason: z.string() })),
  unsupported: z.array(z.string()),
});

/** Stable model-facing result contract. Raw dossier fields remain optional developer payloads. */
export const legendSajuResultOutputSchema = z.object({
  error: z.string().optional(),
  mode: z.enum(["consumer", "compact", "evidence", "debug"]).optional(),
  detailLevel: z.enum(["brief", "standard", "expert", "raw"]).optional(),
  question: z.string().optional(),
  readingSummary: z.object({
    focus: z.array(z.string()),
    summary: z.string(),
    highlights: z.array(z.string()),
    returnedClaimCount: z.number().int(),
    uniqueInternalClaimCount: z.number().int(),
    totalInternalClaimCount: z.number().int(),
  }).optional(),
  sections: z.record(z.string(), z.object({
    interpretations: z.array(interpretationSchema),
    evidenceClaimIds: z.array(z.string()),
    sourceRefs,
  })).optional(),
  recommendations: recommendationSchema.optional(),
  timeline: z.array(z.object({
    period: z.string(),
    summary: z.string(),
    domains: z.array(z.object({
      domain: z.string(),
      coverage: z.enum(["myeongri_only", "ziwei_only", "parallel_evidence"]),
      themes: z.array(z.string()),
      opportunities: z.array(z.string()),
      cautions: z.array(z.string()),
    })),
    confidence: z.enum(["high", "medium", "low"]),
    evidenceClaimIds: z.array(z.string()),
    sourceRefs,
    limitationRefs,
  })).optional(),
  omittedTimelineYears: z.number().int().optional(),
  inputNotes: z.array(z.object({
    code: z.string(),
    field: z.string(),
    severity: z.string(),
    message: z.string(),
  }).passthrough()).optional(),
  calculationSummary: z.object({
    selectedCapabilities: z.array(z.string()),
    internalClaimCount: z.number().int(),
    returnedClaimCount: z.number().int(),
    deterministic: z.boolean(),
  }).optional(),
  executionPlan: executionPlanSchema.optional(),
  claims: z.array(z.object({
    id: z.string(),
    domain: z.string(),
    relatedDomains: z.array(z.string()),
    system: z.string(),
    capabilityId: z.string(),
    kind: z.string(),
    statement: z.string(),
    observations: z.array(z.string()),
    omittedObservationCount: z.number().int(),
    timeframe: timeframeSchema,
    confidence: z.string(),
    sourceRefs,
    limitationRefs,
  })).optional(),
  evidence: z.array(z.unknown()).optional(),
  dreamAnalysis: z.object({
    status: z.enum(["matched", "outside_active_scope"]),
    dream: z.string(),
    context: z.string().optional(),
    matches: z.array(z.object({
      concept: z.string(),
      matchedBy: z.array(z.string()),
      sharedMotif: z.string(),
      conflict: z.string(),
      safeGeneralization: z.string(),
      sourceEvidence: z.object({
        zhougong: z.array(z.string()),
        artemidorus1644: z.array(z.string()),
      }),
      excerpts: z.array(z.object({
        id: z.string(),
        sourceId: z.enum(["zhougong-dreambook", "artemidorus-oneirocritica-1644"]),
        locator: z.string(),
        sourceText: z.string(),
      })),
      clarificationQuestions: z.array(z.string()),
    })),
    coverage: z.object({
      activeCrossCulturalConcepts: z.number().int(),
      zhougongPrimaryEntries: z.number().int(),
      artemidorusPrimarySections: z.number().int(),
      broaderPrimaryCorpusSemanticallyNormalized: z.literal(false),
    }),
    sourceIds: z.array(z.string()),
    limitations: z.array(z.string()),
    boundary: z.string(),
  }).optional(),
  methodAnalysis: z.object({
    myeongriJudgment: judgmentSchema.optional(),
    synthesis: z.array(z.object({
      domain: z.string(),
      claimIds: z.array(z.string()),
      systems: z.array(z.string()),
      status: z.enum(["not_covered", "single_system", "parallel_evidence", "conflict"]),
      note: z.string(),
    })),
    methodResults: z.record(z.string(), z.unknown()).optional(),
    knowledgeAssets: z.unknown().optional(),
  }).optional(),
  nameAnalysis: z.unknown().optional(),
  sources: z.array(z.object({
    id: z.string(),
    title: z.string(),
    uri: z.string(),
    kind: z.string(),
    scope: z.string(),
    checkedAt: z.string(),
  })).optional(),
  limitations: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  blocked: z.array(z.object({
    capabilityId: z.string(),
    missingRequired: z.array(z.string()),
    reasons: z.array(z.string()),
    inputIssues: z.array(z.unknown()),
  })).optional(),
  conflicts: z.array(z.unknown()).optional(),
  interpretationBoundary: z.string().optional(),
  noModelCalls: z.boolean().optional(),
  publicationSideEffects: z.boolean().optional(),
  selection: z.unknown().optional(),
  routes: z.array(z.unknown()).optional(),
  dossier: z.unknown().optional(),
});

export const capabilitySearchOutputSchema = z.object({
  error: z.string().optional(),
  capabilityCount: z.number().int().optional(),
  query: z.string().optional(),
  hits: z.array(z.unknown()).optional(),
  requestedCapabilityContract: z.string().optional(),
});

export const manifestOutputSchema = z.object({
  error: z.string().optional(),
  version: z.string().optional(),
  deterministic: z.boolean().optional(),
  publicationSideEffects: z.boolean().optional(),
  capabilityCount: z.number().int().optional(),
  legacyIntentCount: z.number().int().optional(),
  sourceCount: z.number().int().optional(),
  knowledge: z.unknown().optional(),
  capabilities: z.record(z.string(), z.unknown()).optional(),
  naming: z.unknown().optional(),
});
