/**
 * Azure AI Search Knowledge Bases – client API helpers
 *
 * Uses the proxied Express endpoints at /api/azure/knowledge-bases
 * and /api/azure/knowledge-sources so the SPA never touches credentials.
 */

import type {
  AzureKnowledgeBase,
  AzureKnowledgeSource,
  AzureKnowledgeSourceStatus,
  KBRetrievalResponse,
  CreateKBPayload,
  RetrieveParams,
  ProcessedTrace,
  TracePhase,
  TraceIteration,
  TraceSummary,
  KBActivityRecord,
  KBReference,
} from '@/types/azure-knowledge';

const KB_BASE = '/api/azure/knowledge-bases';
const KS_BASE = '/api/azure/knowledge-sources';

async function azureRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Knowledge Bases ─────────────────────────────────────────────────

export const azureKnowledgeApi = {
  /** Check if Azure Search is configured */
  getStatus: () =>
    azureRequest<{ configured: boolean; endpoint: string | null; apiVersion: string }>(
      `${KB_BASE}/status`,
    ),

  /** List all Azure knowledge bases */
  listKnowledgeBases: () =>
    azureRequest<AzureKnowledgeBase[]>(KB_BASE),

  /** Get a single knowledge base */
  getKnowledgeBase: (id: string) =>
    azureRequest<AzureKnowledgeBase>(`${KB_BASE}/${encodeURIComponent(id)}`),

  /** Create a new knowledge base */
  createKnowledgeBase: (data: CreateKBPayload) =>
    azureRequest<AzureKnowledgeBase>(`${KB_BASE}/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an existing knowledge base */
  updateKnowledgeBase: (id: string, data: Partial<AzureKnowledgeBase>, etag?: string) =>
    azureRequest<AzureKnowledgeBase>(`${KB_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: etag ? { 'If-Match': etag } as any : undefined,
    }),

  /** Delete a knowledge base */
  deleteKnowledgeBase: (id: string) =>
    azureRequest<{ deleted: boolean }>(`${KB_BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  /** Full retrieve/RAG call on a knowledge base */
  retrieve: (id: string, params: RetrieveParams) =>
    azureRequest<KBRetrievalResponse>(`${KB_BASE}/${encodeURIComponent(id)}/retrieve`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /** Simpler query endpoint */
  query: (id: string, query: string, topK?: number) =>
    azureRequest<KBRetrievalResponse>(
      `${KB_BASE}/${encodeURIComponent(id)}/query`,
      {
        method: 'POST',
        body: JSON.stringify({ query, topK }),
      },
    ),

  // ── Knowledge Sources ───────────────────────────────────────────

  /** List all knowledge sources */
  listKnowledgeSources: () =>
    azureRequest<AzureKnowledgeSource[]>(KS_BASE),

  /** Create or update a knowledge source */
  createKnowledgeSource: (data: AzureKnowledgeSource) =>
    azureRequest<AzureKnowledgeSource>(KS_BASE, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get indexing status for a knowledge source */
  getKnowledgeSourceStatus: (sourceName: string) =>
    azureRequest<AzureKnowledgeSourceStatus>(
      `${KS_BASE}/${encodeURIComponent(sourceName)}/status`,
    ),

  /** Delete a knowledge source */
  deleteKnowledgeSource: (sourceName: string) =>
    azureRequest<{ deleted: boolean }>(
      `${KS_BASE}/${encodeURIComponent(sourceName)}`,
      { method: 'DELETE' },
    ),
};

// ── Trace transform (client-side) ──────────────────────────────────

function isRetrievalActivity(a: KBActivityRecord): boolean {
  return ['searchIndex', 'azureBlob', 'web', 'remoteSharePoint', 'indexedSharePoint', 'indexedOneLake'].includes(a.type);
}

function isModelActivity(a: KBActivityRecord): boolean {
  return ['modelQueryPlanning', 'modelAnswerSynthesis', 'agenticReasoning'].includes(a.type);
}

const SOURCE_LABELS: Record<string, string> = {
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

export function transformRetrievalResponse(response: KBRetrievalResponse): ProcessedTrace {
  const activities = response.activity ?? [];
  const references = response.references ?? [];
  const messages = response.response ?? [];

  const answerText = messages.find((m) => m.role === 'assistant')?.content ?? '';

  // Group by iteration
  const groups = new Map<number, KBActivityRecord[]>();
  for (const a of activities) {
    const iter = a.iteration ?? 0;
    if (!groups.has(iter)) groups.set(iter, []);
    groups.get(iter)!.push(a);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
  const lastKey = sortedKeys[sortedKeys.length - 1];

  const iterations: TraceIteration[] = sortedKeys.map((index) => {
    const acts = groups.get(index)!;
    let iterMs = 0;

    const phases: TracePhase[] = acts.map((a) => {
      iterMs += a.elapsedMs ?? 0;
      const phase: TracePhase = {
        type: a.type,
        label: SOURCE_LABELS[a.type] ?? a.type,
        status: a.status,
        elapsedMs: a.elapsedMs ?? 0,
        query: a.query ?? a.searchQuery,
        sourceName: a.sourceName,
        resultCount: a.resultCount,
        reasoning: a.reasoning,
      };
      if (isModelActivity(a) && (a.inputTokens || a.outputTokens)) {
        phase.tokens = { input: a.inputTokens ?? 0, output: a.outputTokens ?? 0 };
      }
      return phase;
    });

    return {
      index,
      phases,
      references: index === lastKey ? references : [],
      elapsedMs: iterMs,
    };
  });

  // Summary
  const sources = new Set<string>();
  let totalMs = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let totalTokens = 0;

  for (const a of activities) {
    totalMs += a.elapsedMs ?? 0;
    if (a.sourceName) sources.add(a.sourceName);
    if (isModelActivity(a)) {
      totalInput += a.inputTokens ?? 0;
      totalOutput += a.outputTokens ?? 0;
      totalTokens += a.totalTokens ?? (a.inputTokens ?? 0) + (a.outputTokens ?? 0);
    }
  }

  const summary: TraceSummary = {
    totalMs,
    iterationCount: iterations.length || 1,
    sourceCount: sources.size,
    referenceCount: references.length,
    tokenUsage: {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens,
    },
  };

  return { summary, iterations, answerText, references };
}

// ── Citation helpers ────────────────────────────────────────────────

export function parseInlineCitations(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

export function stripInlineCitations(text: string): string {
  return text.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

export function mapCitationsToReferences(
  citations: string[],
  references: KBReference[],
): Map<string, KBReference> {
  const map = new Map<string, KBReference>();
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

// ── Formatting helpers ──────────────────────────────────────────────

export function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1)}k`;
}
