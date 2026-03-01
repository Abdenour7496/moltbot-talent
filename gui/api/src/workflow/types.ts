export interface StepResult {
  status: 'done' | 'failed' | 'escalated';
  data: Record<string, unknown>;
  error?: string;
  metadata: {
    durationMs?: number;
    attempt: number;
    agentId: string;
    inputHash?: string;
    outputHash?: string;
  };
}

export interface StepDefinition {
  stepId: string;
  agentId: string;
  inputTemplate: string;
  expects?: string;
  maxRetries: number;
  onFail?: 'escalate' | 'fail' | string;
}

export type EventType =
  | 'run_created'
  | 'run_completed'
  | 'run_failed'
  | 'run_escalated'
  | 'run_cancelled'
  | 'step_started'
  | 'step_retrying'
  | 'step_completed'
  | 'step_failed'
  | 'step_escalated'
  | 'step_cancelled';

export interface ExecutionEvent {
  eventId: string;
  timestamp: string;
  eventType: EventType;
  stepId?: string;
  fromStatus?: string;
  toStatus?: string;
  actor: string;
  data?: Record<string, unknown>;
}
