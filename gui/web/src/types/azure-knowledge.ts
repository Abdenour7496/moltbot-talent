/**
 * Azure AI Search Knowledge Base types – frontend
 *
 * Mirrors the API types for use in React components.
 */

// ── Knowledge Base ─────────────────────────────────────────────────

export interface AzureKnowledgeBase {
  name: string;
  description?: string;
  models?: AzureKBModel[];
  knowledgeSources?: string[];
  outputConfiguration?: Record<string, unknown>;
  outputMode?: 'extractiveData' | 'answerSynthesis';
  retrievalReasoningEffort?: 'low' | 'medium' | 'high';
  retrievalInstructions?: string;
  answerInstructions?: string;
  requestLimits?: { maxDocsPerSource?: number; maxTextCharsPerPage?: number };
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
  azureBlob?: { containerName: string; connectionString?: string; endpoint?: string };
  web?: { urls: string[] };
  remoteSharePoint?: { siteUrl: string; libraryName?: string };
  indexedSharePoint?: { siteUrl: string };
  indexedOneLake?: { workspaceId: string; artifactId: string };
  '@odata.etag'?: string;
}

export interface AzureKnowledgeSourceStatus {
  name: string;
  status: 'notStarted' | 'running' | 'completed' | 'failed';
  lastUpdatedDateTime?: string;
  details?: string;
}

// ── Retrieval Response ─────────────────────────────────────────────

export interface KBRetrievalResponse {
  response: KBMessage[];
  activity: KBActivityRecord[];
  references: KBReference[];
}

export interface KBMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

export type KBActivityType =
  | 'searchIndex'
  | 'azureBlob'
  | 'web'
  | 'remoteSharePoint'
  | 'indexedSharePoint'
  | 'indexedOneLake'
  | 'modelQueryPlanning'
  | 'modelAnswerSynthesis'
  | 'agenticReasoning';

export interface KBActivityRecord {
  type: KBActivityType;
  status: 'started' | 'completed' | 'failed';
  elapsedMs?: number;
  query?: string;
  sourceName?: string;
  resultCount?: number;
  iteration?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelId?: string;
  searchQuery?: string;
  reasoning?: string;
  plan?: string[];
}

export interface KBReference {
  type: string;
  docKey?: string;
  citationIndex?: number;
  score?: number;
  title?: string;
  indexName?: string;
  content?: string;
  blobUrl?: string;
  url?: string;
  webUrl?: string;
  snippet?: string;
}

// ── Create / edit payloads ─────────────────────────────────────────

export interface CreateKBPayload {
  name: string;
  description?: string;
  models?: AzureKBModel[];
  knowledgeSources?: string[];
  outputMode?: 'extractiveData' | 'answerSynthesis';
  retrievalReasoningEffort?: 'low' | 'medium' | 'high';
  retrievalInstructions?: string;
  answerInstructions?: string;
}

export interface RetrieveParams {
  messages: { role: string; content: string }[];
  queryParameters?: { maxDocsPerSource?: number };
  intents?: string[];
}

// ── Trace structures (UI-ready) ─────────────────────────────────────

export interface TraceSummary {
  totalMs: number;
  iterationCount: number;
  sourceCount: number;
  referenceCount: number;
  tokenUsage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
  };
}

export interface TracePhase {
  type: KBActivityType;
  label: string;
  status: 'started' | 'completed' | 'failed';
  elapsedMs: number;
  query?: string;
  sourceName?: string;
  resultCount?: number;
  tokens?: { input: number; output: number };
  reasoning?: string;
}

export interface TraceIteration {
  index: number;
  phases: TracePhase[];
  references: KBReference[];
  elapsedMs: number;
}

export interface ProcessedTrace {
  summary: TraceSummary;
  iterations: TraceIteration[];
  answerText: string;
  references: KBReference[];
}
