/**
 * Trace Transform Utilities
 *
 * Transforms raw Azure AI Search retrieval responses into
 * UI-ready trace structures for the Retrieval Journey visualisation.
 */

import type {
  KnowledgeBaseRetrievalResponse,
  KnowledgeBaseActivityRecord,
  KnowledgeBaseReference,
  KnowledgeBaseActivityType,
  TokenUsageSummary,
} from '../types/knowledge-retrieval.js';

import {
  isRetrievalActivity,
  isModelActivity,
  calculateTokenUsage,
  getSourceTypeLabel,
} from '../types/knowledge-retrieval.js';

// ── Processed trace types ──────────────────────────────────────────

export interface TraceSummary {
  totalMs: number;
  iterationCount: number;
  sourceCount: number;
  referenceCount: number;
  tokenUsage: TokenUsageSummary;
}

export interface TracePhase {
  type: KnowledgeBaseActivityType;
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
  references: KnowledgeBaseReference[];
  elapsedMs: number;
}

export interface ProcessedTrace {
  summary: TraceSummary;
  iterations: TraceIteration[];
  answerText: string;
  references: KnowledgeBaseReference[];
  raw: KnowledgeBaseRetrievalResponse;
}

// ── Transform function ─────────────────────────────────────────────

export function transformKnowledgeRetrievalResponse(
  response: KnowledgeBaseRetrievalResponse,
): ProcessedTrace {
  const activities = response.activity ?? [];
  const references = response.references ?? [];
  const messages = response.response ?? [];

  const answerText = extractAnswerText(messages);
  const iterations = deriveIterations(activities, references);
  const tokenUsage = calculateTokenUsage(activities);

  const sources = new Set<string>();
  for (const a of activities) {
    if (a.sourceName) sources.add(a.sourceName);
  }

  let totalMs = 0;
  for (const a of activities) {
    totalMs += a.elapsedMs ?? 0;
  }

  const summary: TraceSummary = {
    totalMs,
    iterationCount: iterations.length || 1,
    sourceCount: sources.size,
    referenceCount: references.length,
    tokenUsage,
  };

  return { summary, iterations, answerText, references, raw: response };
}

// ── Helpers ────────────────────────────────────────────────────────

function extractAnswerText(
  messages: { role: string; content: string }[],
): string {
  const assistant = messages.find((m) => m.role === 'assistant');
  return assistant?.content ?? '';
}

function deriveIterations(
  activities: KnowledgeBaseActivityRecord[],
  references: KnowledgeBaseReference[],
): TraceIteration[] {
  // Group activities by iteration number (default to 0)
  const groups = new Map<number, KnowledgeBaseActivityRecord[]>();
  for (const a of activities) {
    const iter = a.iteration ?? 0;
    if (!groups.has(iter)) groups.set(iter, []);
    groups.get(iter)!.push(a);
  }

  const iterations: TraceIteration[] = [];

  for (const [index, acts] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    let iterMs = 0;
    const phases: TracePhase[] = acts.map((a) => {
      iterMs += a.elapsedMs ?? 0;
      const phase: TracePhase = {
        type: a.type,
        label: getSourceTypeLabel(a.type),
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

    // Assign references to their closest iteration (simplified)
    const iterRefs = index === [...groups.keys()].sort((a, b) => a - b).pop()
      ? references
      : [];

    iterations.push({ index, phases, references: iterRefs, elapsedMs: iterMs });
  }

  return iterations;
}

// ── Formatting helpers ─────────────────────────────────────────────

export function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1)}k`;
}

export function getPhaseInfo(
  type: KnowledgeBaseActivityType,
): { color: string; icon: string } {
  switch (type) {
    case 'modelQueryPlanning':
      return { color: 'text-blue-500', icon: '🧠' };
    case 'modelAnswerSynthesis':
      return { color: 'text-purple-500', icon: '✍️' };
    case 'agenticReasoning':
      return { color: 'text-amber-500', icon: '🔄' };
    case 'searchIndex':
      return { color: 'text-green-500', icon: '🔎' };
    case 'azureBlob':
      return { color: 'text-cyan-500', icon: '📦' };
    case 'web':
      return { color: 'text-orange-500', icon: '🌐' };
    case 'remoteSharePoint':
    case 'indexedSharePoint':
      return { color: 'text-teal-500', icon: '📄' };
    case 'indexedOneLake':
      return { color: 'text-indigo-500', icon: '🗄️' };
    default:
      return { color: 'text-muted', icon: '⚡' };
  }
}

export function getRetrievalSummary(trace: ProcessedTrace): string {
  const { summary } = trace;
  const parts: string[] = [];
  parts.push(`${summary.iterationCount} iteration(s)`);
  parts.push(`${summary.sourceCount} source(s)`);
  parts.push(`${summary.referenceCount} reference(s)`);
  parts.push(formatElapsedTime(summary.totalMs));
  if (summary.tokenUsage.totalTokens > 0) {
    parts.push(`${formatTokenCount(summary.tokenUsage.totalTokens)} tokens`);
  }
  return parts.join(' · ');
}
