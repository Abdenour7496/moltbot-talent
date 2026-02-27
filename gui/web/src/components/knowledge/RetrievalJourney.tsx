import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain,
  Search,
  Globe,
  HardDrive,
  FileText,
  Database,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { ProcessedTrace, TracePhase, TraceIteration } from '@/types/azure-knowledge';
import { formatElapsedTime, formatTokenCount } from '@/lib/azure-knowledge-api';

interface RetrievalJourneyProps {
  trace: ProcessedTrace;
}

const PHASE_ICONS: Record<string, React.ReactNode> = {
  modelQueryPlanning: <Brain className="h-4 w-4 text-blue-400" />,
  modelAnswerSynthesis: <Brain className="h-4 w-4 text-purple-400" />,
  agenticReasoning: <Zap className="h-4 w-4 text-amber-400" />,
  searchIndex: <Search className="h-4 w-4 text-green-400" />,
  azureBlob: <HardDrive className="h-4 w-4 text-cyan-400" />,
  web: <Globe className="h-4 w-4 text-orange-400" />,
  remoteSharePoint: <FileText className="h-4 w-4 text-teal-400" />,
  indexedSharePoint: <FileText className="h-4 w-4 text-teal-400" />,
  indexedOneLake: <Database className="h-4 w-4 text-indigo-400" />,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  started: <Loader2 className="h-3 w-3 animate-spin text-muted" />,
  completed: <CheckCircle className="h-3 w-3 text-emerald-400" />,
  failed: <XCircle className="h-3 w-3 text-red-400" />,
};

// ── Phase row ───────────────────────────────────────────────────────

function PhaseRow({ phase }: { phase: TracePhase }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 bg-input/30 px-3 py-2">
      <div className="shrink-0">{PHASE_ICONS[phase.type] ?? <Zap className="h-4 w-4" />}</div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{phase.label}</span>
          {STATUS_ICONS[phase.status]}
        </div>
        {phase.query && (
          <p className="text-xs text-muted truncate">Query: {phase.query}</p>
        )}
        {phase.reasoning && (
          <p className="text-xs text-muted truncate">Reasoning: {phase.reasoning}</p>
        )}
        {phase.sourceName && (
          <p className="text-xs text-muted">Source: {phase.sourceName}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2 text-xs text-muted">
        {phase.resultCount != null && (
          <Badge variant="outline">{phase.resultCount} results</Badge>
        )}
        {phase.tokens && (
          <span>
            {formatTokenCount(phase.tokens.input + phase.tokens.output)} tok
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {formatElapsedTime(phase.elapsedMs)}
        </span>
      </div>
    </div>
  );
}

// ── Iteration block ─────────────────────────────────────────────────

function IterationBlock({ iteration, total }: { iteration: TraceIteration; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
          {iteration.index + 1}
        </div>
        <span className="text-xs text-muted">
          Iteration {iteration.index + 1} of {total} — {formatElapsedTime(iteration.elapsedMs)}
        </span>
      </div>
      <div className="ml-3 border-l-2 border-border/50 pl-4 space-y-2">
        {iteration.phases.map((phase, i) => (
          <PhaseRow key={`${phase.type}-${i}`} phase={phase} />
        ))}
      </div>
      {iteration.references.length > 0 && (
        <div className="ml-3 pl-4 pt-1">
          <p className="text-xs text-muted mb-1">
            References ({iteration.references.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {iteration.references.slice(0, 8).map((ref, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {ref.title ?? ref.docKey ?? ref.url ?? `ref-${i + 1}`}
              </Badge>
            ))}
            {iteration.references.length > 8 && (
              <span className="text-[10px] text-muted">
                +{iteration.references.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary banner ──────────────────────────────────────────────────

function TraceSummaryBanner({ trace }: { trace: ProcessedTrace }) {
  const { summary } = trace;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-accent/5 border border-accent/20 px-4 py-2 text-xs">
      <span className="flex items-center gap-1">
        <Zap className="h-3 w-3 text-accent" />
        {summary.iterationCount} iteration{summary.iterationCount !== 1 ? 's' : ''}
      </span>
      <span className="text-border">|</span>
      <span>{summary.sourceCount} source{summary.sourceCount !== 1 ? 's' : ''}</span>
      <span className="text-border">|</span>
      <span>{summary.referenceCount} reference{summary.referenceCount !== 1 ? 's' : ''}</span>
      <span className="text-border">|</span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatElapsedTime(summary.totalMs)}
      </span>
      {summary.tokenUsage.totalTokens > 0 && (
        <>
          <span className="text-border">|</span>
          <span>{formatTokenCount(summary.tokenUsage.totalTokens)} tokens</span>
        </>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function RetrievalJourney({ trace }: RetrievalJourneyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retrieval Journey</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TraceSummaryBanner trace={trace} />

        {trace.iterations.map((iter) => (
          <IterationBlock
            key={iter.index}
            iteration={iter}
            total={trace.iterations.length}
          />
        ))}

        {/* Answer preview */}
        {trace.answerText && (
          <div className="space-y-1 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted">Synthesized Answer</p>
            <div className="rounded-md bg-input/30 border border-border/50 p-3 text-sm whitespace-pre-wrap">
              {trace.answerText}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
