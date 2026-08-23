/**
 * Source-bounded dream interpretation over the five semantically audited
 * cross-cultural concepts. The larger primary corpora remain searchable
 * provenance, not an automatically interpreted dictionary.
 */
import zhougongJson from "../../data/dreams/zhougong-primary.json";
import artemidorusJson from "../../data/dreams/artemidorus-1644-primary.json";
import auditJson from "../../data/dreams/cross-culture-seed-audit.json";

type AuditConcept = (typeof auditJson.concepts)[number];

export interface DreamInterpretationInput {
  dream: string;
  context?: string;
  maxMatches?: number;
}

export interface DreamSourceExcerpt {
  id: string;
  sourceId: "zhougong-dreambook" | "artemidorus-oneirocritica-1644";
  locator: string;
  sourceText: string;
}

export interface DreamConceptMatch {
  concept: string;
  matchedBy: string[];
  sharedMotif: string;
  conflict: string;
  safeGeneralization: string;
  sourceEvidence: AuditConcept["sourceEvidence"];
  excerpts: DreamSourceExcerpt[];
  clarificationQuestions: string[];
}

export interface DreamInterpretationResult {
  status: "matched" | "outside_active_scope";
  dream: string;
  context?: string;
  matches: DreamConceptMatch[];
  coverage: {
    activeCrossCulturalConcepts: number;
    zhougongPrimaryEntries: number;
    artemidorusPrimarySections: number;
    broaderPrimaryCorpusSemanticallyNormalized: false;
  };
  sourceIds: string[];
  limitations: string[];
  boundary: string;
}

const CONCEPT_PATTERNS: Record<string, { patterns: RegExp[]; questions: string[] }> = {
  "배설물": {
    patterns: [/배설물/u, /분뇨/u, /대변/u, /똥/u, /변기/u],
    questions: ["쌓여 있었는지 배출됐는지 오염됐는지", "장소가 집·화장실·길 가운데 어디였는지", "불쾌감·안도감 가운데 무엇이 컸는지"],
  },
  "물": {
    patterns: [/물에/u, /물을/u, /물이/u, /바다/u, /강물/u, /홍수/u, /범람/u, /수영/u, /익사/u],
    questions: ["물이 맑았는지 탁했는지", "잔잔했는지 거셌는지", "이동하거나 빠져나올 수 있었는지"],
  },
  "이": {
    patterns: [/이빨/u, /치아/u, /이가\s*(빠|부러|흔들|나)/u, /이를\s*(뽑|닦|갈)/u],
    questions: ["어느 이가 어떻게 변했는지", "빠진 뒤 다시 났는지", "가족·채무·건강 가운데 현재 걸린 맥락이 있는지"],
  },
  "불": {
    patterns: [/화재/u, /불길/u, /불꽃/u, /불이\s*(나|붙|번|꺼)/u, /불타/u, /연기/u],
    questions: ["불빛이 밝았는지 연기가 탁했는지", "불을 통제할 수 있었는지", "집·몸·물건 가운데 무엇이 타고 있었는지"],
  },
  "죽은 사람": {
    patterns: [/죽은\s*사람/u, /고인/u, /망자/u, /돌아가신/u, /조상/u, /장례/u],
    questions: ["누가 나타났고 생전 관계가 어땠는지", "무슨 말을 했거나 무엇을 주고받았는지", "함께 왔는지 떠났는지 다시 살아났는지"],
  },
};

const zhougongById = new Map(zhougongJson.entries.map((entry) => [entry.id, entry]));
const artemidorusById = new Map(artemidorusJson.sections.map((entry) => [entry.id, entry]));

function compact(value: string, max = 500): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function excerptsFor(concept: AuditConcept): DreamSourceExcerpt[] {
  const zhougong = concept.sourceEvidence.zhougong.flatMap((id): DreamSourceExcerpt[] => {
    const entry = zhougongById.get(id);
    return entry ? [{
      id,
      sourceId: "zhougong-dreambook",
      locator: entry.section,
      sourceText: compact(entry.sourceText),
    }] : [];
  });
  const artemidorus = concept.sourceEvidence.artemidorus1644.flatMap((id): DreamSourceExcerpt[] => {
    const entry = artemidorusById.get(id);
    return entry ? [{
      id,
      sourceId: "artemidorus-oneirocritica-1644",
      locator: `Book ${entry.book}: ${entry.title}`,
      sourceText: compact(entry.sourceText),
    }] : [];
  });
  return [...zhougong, ...artemidorus];
}

export function interpretDream(input: DreamInterpretationInput): DreamInterpretationResult {
  const dream = input.dream?.trim();
  if (!dream) throw new Error("DREAM_REQUIRED: dream must be a non-empty string.");
  const searchable = `${dream} ${input.context ?? ""}`.normalize("NFKC");
  const maxMatches = Math.max(1, Math.min(input.maxMatches ?? 5, 5));
  const matches = auditJson.concepts.flatMap((concept): DreamConceptMatch[] => {
    const config = CONCEPT_PATTERNS[concept.concept];
    if (!config) return [];
    const matchedBy = config.patterns.filter((pattern) => pattern.test(searchable)).map((pattern) => pattern.source);
    if (!matchedBy.length) return [];
    return [{
      concept: concept.concept,
      matchedBy,
      sharedMotif: concept.sharedMotif,
      conflict: concept.conflict,
      safeGeneralization: concept.safeGeneralization,
      sourceEvidence: concept.sourceEvidence,
      excerpts: excerptsFor(concept),
      clarificationQuestions: config.questions,
    }];
  }).slice(0, maxMatches);

  return {
    status: matches.length ? "matched" : "outside_active_scope",
    dream,
    ...(input.context ? { context: input.context } : {}),
    matches,
    coverage: {
      activeCrossCulturalConcepts: auditJson.concepts.length,
      zhougongPrimaryEntries: zhougongJson.entries.length,
      artemidorusPrimarySections: artemidorusJson.sections.length,
      broaderPrimaryCorpusSemanticallyNormalized: false,
    },
    sourceIds: ["zhougong-dreambook", "artemidorus-oneirocritica-1644", "dream-cross-culture-audit"],
    limitations: matches.length
      ? [auditJson.method.scientificBoundary, "현재 자동 해석은 교차 전승 의미가 항목 단위로 감사된 5개 개념에 한정한다."]
      : [auditJson.method.scientificBoundary, "입력한 꿈은 현재 의미 정규화가 끝난 5개 개념 밖이다. 1,199개 원문이 존재해도 원문 검색을 곧바로 해석으로 바꾸지 않는다."],
    boundary: "전통 문헌의 공통 모티프와 충돌을 함께 반환한다. 미래 사건·질병·사망·임신·복권 결과를 확정하지 않는다.",
  };
}
