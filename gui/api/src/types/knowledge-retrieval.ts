/**
 * Azure AI Search Knowledge Base Retrieval Types
 *
 * Comprehensive types for the Azure AI Search Knowledge Bases API (2025-11-01-preview).
 * Adapted from foundry-iq-demo for the moltbot-talent platform.
 */

// ── Knowledge Base ─────────────────────────────────────────────────

export interface AzureKnowledgeBase {
  name: string;
  description?: string;
  models?: AzureKBModel[];
  knowledgeSources?: string[];
  outputConfiguration?: AzureKBOutputConfiguration;
  outputMode?: 'extractiveData' | 'answerSynthesis';
  retrievalReasoningEffort?: 'low' | 'medium' | 'high';
  retrievalInstructions?: string;
  answerInstructions?: string;
  requestLimits?: AzureKBRequestLimits;
  '@odata.etag'?: string;
}

export interface AzureKBModel {
  modelId: string;
  azureOpenAIParameters?: {
    resourceUri: string;
    deploymentId: string;
    apiKey: string;
    modelName?: string;
  };
}

export interface AzureKBOutputConfiguration {
  semanticConfiguration?: string;
  vector?: { kind: string };
}

export interface AzureKBRequestLimits {
  maxDocsPerSource?: number;
  maxTextCharsPerPage?: number;
}

// ── Knowledge Source ───────────────────────────────────────────────

export type KnowledgeSourceKind =
  | 'searchIndex'
  | 'azureBlob'
  | 'web'
  | 'remoteSharePoint'
  | 'indexedSharePoint'
  | 'indexedOneLake';

export interface AzureKnowledgeSource {
  name: string;
  kind: KnowledgeSourceKind;
  description?: string;
  searchIndex?: { indexName: string; endpoint?: string };
  azureBlob?: { containerName: string; connectionString: string; endpoint?: string };
  web?: { urls: string[] };
  remoteSharePoint?: { siteUrl: string; libraryName?: string };
  indexedSharePoint?: { siteUrl: string };
  indexedOneLake?: { workspaceId: string; artifactId: string };
  chunkingProperties?: {
    isEnabled: boolean;
    maxTokensPerChunk?: number;
  };
  '@odata.etag'?: string;
}

export interface AzureKnowledgeSourceStatus {
  name: string;
  status: 'notStarted' | 'running' | 'completed' | 'failed';
  lastUpdatedDateTime?: string;
  details?: string;
}

// ── Retrieval Response ─────────────────────────────────────────────

export interface KnowledgeBaseRetrievalResponse {
  response: KnowledgeBaseMessage[];
  activity: KnowledgeBaseActivityRecord[];
  references: KnowledgeBaseReference[];
}

export interface KnowledgeBaseMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

// ── Activity Records ───────────────────────────────────────────────

export type KnowledgeBaseActivityType =
  | 'searchIndex'
  | 'azureBlob'
  | 'web'
  | 'remoteSharePoint'
  | 'indexedSharePoint'
  | 'indexedOneLake'
  | 'modelQueryPlanning'
  | 'modelAnswerSynthesis'
  | 'agenticReasoning';

export interface KnowledgeBaseActivityRecord {
  type: KnowledgeBaseActivityType;
  status: 'started' | 'completed' | 'failed';
  elapsedMs?: number;
  query?: string;
  sourceName?: string;
  resultCount?: number;
  iteration?: number;
  // Model activity fields
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelId?: string;
  // Search-specific
  searchQuery?: string;
  filter?: string;
  // Agentic reasoning
  reasoning?: string;
  plan?: string[];
}

// ── References ─────────────────────────────────────────────────────

export type KnowledgeBaseReferenceType =
  | 'searchIndex'
  | 'azureBlob'
  | 'web'
  | 'remoteSharePoint'
  | 'indexedSharePoint'
  | 'indexedOneLake';

export interface KnowledgeBaseReference {
  type: KnowledgeBaseReferenceType;
  docKey?: string;
  citationIndex?: number;
  score?: number;
  title?: string;
  // Search index
  indexName?: string;
  content?: string;
  // Blob
  blobUrl?: string;
  containerName?: string;
  // Web
  url?: string;
  snippet?: string;
  // SharePoint / OneLake
  webUrl?: string;
  siteUrl?: string;
  libraryName?: string;
  workspaceId?: string;
  artifactId?: string;
}

// ── Type Guards ────────────────────────────────────────────────────

export function isRetrievalActivity(
  activity: KnowledgeBaseActivityRecord,
): boolean {
  return [
    'searchIndex',
    'azureBlob',
    'web',
    'remoteSharePoint',
    'indexedSharePoint',
    'indexedOneLake',
  ].includes(activity.type);
}

export function isModelActivity(
  activity: KnowledgeBaseActivityRecord,
): boolean {
  return ['modelQueryPlanning', 'modelAnswerSynthesis', 'agenticReasoning'].includes(
    activity.type,
  );
}

export function isSearchIndexReference(ref: KnowledgeBaseReference): boolean {
  return ref.type === 'searchIndex';
}

export function isBlobReference(ref: KnowledgeBaseReference): boolean {
  return ref.type === 'azureBlob';
}

export function isWebReference(ref: KnowledgeBaseReference): boolean {
  return ref.type === 'web';
}

export function isSharePointReference(ref: KnowledgeBaseReference): boolean {
  return ref.type === 'remoteSharePoint' || ref.type === 'indexedSharePoint';
}

// ── Utility Functions ──────────────────────────────────────────────

export interface TokenUsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  modelBreakdown: Record<string, { input: number; output: number; total: number }>;
}

export interface PerformanceMetrics {
  totalElapsedMs: number;
  retrievalElapsedMs: number;
  modelElapsedMs: number;
  activityCount: number;
  iterationCount: number;
  sourceCount: number;
  referenceCount: number;
}

export function calculateTokenUsage(
  activities: KnowledgeBaseActivityRecord[],
): TokenUsageSummary {
  const summary: TokenUsageSummary = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    modelBreakdown: {},
  };

  for (const a of activities) {
    if (!isModelActivity(a)) continue;
    const input = a.inputTokens ?? 0;
    const output = a.outputTokens ?? 0;
    const total = a.totalTokens ?? input + output;

    summary.totalInputTokens += input;
    summary.totalOutputTokens += output;
    summary.totalTokens += total;

    const model = a.modelId ?? 'unknown';
    if (!summary.modelBreakdown[model]) {
      summary.modelBreakdown[model] = { input: 0, output: 0, total: 0 };
    }
    summary.modelBreakdown[model].input += input;
    summary.modelBreakdown[model].output += output;
    summary.modelBreakdown[model].total += total;
  }

  return summary;
}

export function getPerformanceMetrics(
  response: KnowledgeBaseRetrievalResponse,
): PerformanceMetrics {
  const activities = response.activity ?? [];
  let retrievalMs = 0;
  let modelMs = 0;
  const iterations = new Set<number>();
  const sources = new Set<string>();

  for (const a of activities) {
    if (a.iteration != null) iterations.add(a.iteration);
    if (a.sourceName) sources.add(a.sourceName);

    const elapsed = a.elapsedMs ?? 0;
    if (isRetrievalActivity(a)) {
      retrievalMs += elapsed;
    } else if (isModelActivity(a)) {
      modelMs += elapsed;
    }
  }

  return {
    totalElapsedMs: retrievalMs + modelMs,
    retrievalElapsedMs: retrievalMs,
    modelElapsedMs: modelMs,
    activityCount: activities.length,
    iterationCount: iterations.size || 1,
    sourceCount: sources.size,
    referenceCount: (response.references ?? []).length,
  };
}

/**
 * Parse inline citations like [doc1], [doc2] from answer text.
 */
export function parseInlineCitations(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

/**
 * Strip inline citations from answer text.
 */
export function stripInlineCitations(text: string): string {
  return text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Map inline citation keys to their reference objects.
 */
export function mapCitationsToReferences(
  citations: string[],
  references: KnowledgeBaseReference[],
): Map<string, KnowledgeBaseReference> {
  const map = new Map<string, KnowledgeBaseReference>();
  for (const cite of citations) {
    const ref = references.find(
      (r) =>
        r.docKey === cite ||
        r.title === cite ||
        (r.citationIndex != null && `doc${r.citationIndex}` === cite),
    );
    if (ref) map.set(cite, ref);
  }
  return map;
}

/**
 * Get a human-readable label for a source type.
 */
export function getSourceTypeLabel(type: KnowledgeSourceKind | KnowledgeBaseActivityType): string {
  const labels: Record<string, string> = {
    searchIndex: 'Search Index',
    azureBlob: 'Blob Storage',
    web: 'Web',
    remoteSharePoint: 'SharePoint (Remote)',
    indexedSharePoint: 'SharePoint (Indexed)',
    indexedOneLake: 'OneLake',
    modelQueryPlanning: 'Query Planning',
    modelAnswerSynthesis: 'Answer Synthesis',
    agenticReasoning: 'Agentic Reasoning',
  };
  return labels[type] ?? type;
}
