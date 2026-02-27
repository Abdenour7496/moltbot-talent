/**
 * Workflow Engine
 * 
 * Executes multi-agent workflow pipelines with step chaining,
 * template variable substitution, verification loops, retry logic,
 * and human escalation.
 * 
 * Inspired by Antfarm's deterministic agent pipelines.
 */

import { randomUUID } from 'crypto';
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowAgent,
  WorkflowRun,
  WorkflowRunStatus,
  StepExecution,
  StepStatus,
  ParsedStepOutput,
  TemplateContext,
  WorkflowStory,
} from './workflow-types.js';

// ---------------------------------------------------------------------------
// Step executor callback (injected by consumer)
// ---------------------------------------------------------------------------

/**
 * Callback that the engine invokes for each step.
 * The consumer wires this to their LLM / agent runtime.
 *
 * @param agent      - The agent definition for this step
 * @param prompt     - The fully-resolved prompt (template vars replaced)
 * @param context    - Accumulated run context
 * @returns The agent's raw output text
 */
export type StepExecutorFn = (
  agent: WorkflowAgent,
  prompt: string,
  context: {
    runId: string;
    stepId: string;
    attempt: number;
    variables: Record<string, string>;
    stories?: WorkflowStory[];
  },
) => Promise<string>;

/**
 * Callback invoked when a step is escalated to a human.
 * Returns `true` to continue the workflow (human resolved it),
 * or `false` to abort.
 */
export type EscalationHandlerFn = (
  run: WorkflowRun,
  step: StepExecution,
  error: string,
) => Promise<boolean>;

/**
 * Event emitted by the engine for observability.
 */
export interface WorkflowEvent {
  type:
    | 'run:start'
    | 'step:start'
    | 'step:done'
    | 'step:retry'
    | 'step:failed'
    | 'step:escalated'
    | 'run:completed'
    | 'run:failed';
  runId: string;
  stepId?: string;
  agentId?: string;
  attempt?: number;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

// ---------------------------------------------------------------------------
// Engine configuration
// ---------------------------------------------------------------------------

export interface WorkflowEngineConfig {
  /** Function that executes a single step (calls the LLM / agent runtime) */
  executor: StepExecutorFn;
  /** Optional escalation handler */
  onEscalation?: EscalationHandlerFn;
  /** Optional event handler for observability */
  onEvent?: WorkflowEventHandler;
  /** Default max retries if not specified on step (default: 2) */
  defaultMaxRetries?: number;
  /** Default step timeout in ms (default: 300_000 = 5 min) */
  defaultTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Template variable resolution
// ---------------------------------------------------------------------------

/**
 * Replace `{{variable}}` placeholders in a template string
 * using the provided context.
 *
 * Unknown variables are left as-is (e.g., `{{unknown}}`).
 */
export function resolveTemplate(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = context[key];
    return val !== undefined ? val : `{{${key}}}`;
  });
}

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

/**
 * Extract KEY: value pairs from agent raw output.
 * Also checks whether the `expects` string is present.
 *
 * Antfarm convention: agents emit `STATUS: done` and `KEY: value` lines.
 */
export function parseStepOutput(
  rawOutput: string,
  expects: string,
): ParsedStepOutput {
  const variables: Record<string, string> = {};
  const lines = rawOutput.split('\n');

  for (const line of lines) {
    const match = line.match(/^([A-Z_]+):\s*(.+)$/);
    if (match) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      variables[key] = value;
    }
  }

  return {
    success: rawOutput.includes(expects),
    variables,
    rawOutput,
  };
}

// ---------------------------------------------------------------------------
// Workflow Engine
// ---------------------------------------------------------------------------

export class WorkflowEngine {
  private config: Required<
    Pick<WorkflowEngineConfig, 'executor' | 'defaultMaxRetries' | 'defaultTimeoutMs'>
  > &
    WorkflowEngineConfig;

  constructor(config: WorkflowEngineConfig) {
    this.config = {
      ...config,
      defaultMaxRetries: config.defaultMaxRetries ?? 2,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 300_000,
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Run a workflow end-to-end.
   *
   * @param definition - The workflow definition to execute
   * @param task       - The initial task description
   * @returns The completed (or failed) WorkflowRun
   */
  async run(
    definition: WorkflowDefinition,
    task: string,
  ): Promise<WorkflowRun> {
    const run = this.createRun(definition, task);
    this.emit({
      type: 'run:start',
      runId: run.id,
      timestamp: new Date(),
    });

    const agentMap = new Map(definition.agents.map((a) => [a.id, a]));

    for (const step of definition.steps) {
      const agent = agentMap.get(step.agent);
      if (!agent) {
        run.status = 'failed';
        const stepExec = run.steps.find((s) => s.stepId === step.id)!;
        stepExec.status = 'failed';
        stepExec.error = `Agent "${step.agent}" not found in workflow definition`;
        break;
      }

      const success = await this.executeStep(run, step, agent, definition);
      if (!success) {
        // Step failed and could not be recovered
        if (run.status !== 'escalated') {
          run.status = 'failed';
          this.emit({
            type: 'run:failed',
            runId: run.id,
            stepId: step.id,
            timestamp: new Date(),
          });
        }
        break;
      }
    }

    if (run.status === 'running') {
      run.status = 'completed';
      run.completedAt = new Date();
      this.emit({
        type: 'run:completed',
        runId: run.id,
        timestamp: new Date(),
      });
    }

    run.updatedAt = new Date();
    return run;
  }

  // -----------------------------------------------------------------------
  // Step execution
  // -----------------------------------------------------------------------

  private async executeStep(
    run: WorkflowRun,
    step: WorkflowStep,
    agent: WorkflowAgent,
    definition: WorkflowDefinition,
  ): Promise<boolean> {
    const stepExec = run.steps.find((s) => s.stepId === step.id)!;
    const maxRetries = step.max_retries ?? this.config.defaultMaxRetries;

    stepExec.status = 'running';
    stepExec.startedAt = new Date();

    this.emit({
      type: 'step:start',
      runId: run.id,
      stepId: step.id,
      agentId: agent.id,
      timestamp: new Date(),
    });

    // Loop steps iterate over stories
    if (step.type === 'loop') {
      return this.executeLoopStep(run, step, agent, definition);
    }

    // Standard step — execute with retries
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      stepExec.attempts = attempt;

      try {
        const prompt = resolveTemplate(step.input, {
          task: run.task,
          ...run.variables,
        });

        const rawOutput = await this.config.executor(agent, prompt, {
          runId: run.id,
          stepId: step.id,
          attempt,
          variables: run.variables,
        });

        const parsed = parseStepOutput(rawOutput, step.expects);

        if (parsed.success) {
          // Step succeeded
          stepExec.status = 'done';
          stepExec.rawOutput = parsed.rawOutput;
          stepExec.variables = parsed.variables;
          stepExec.completedAt = new Date();

          // Merge variables into run context
          Object.assign(run.variables, parsed.variables);

          this.emit({
            type: 'step:done',
            runId: run.id,
            stepId: step.id,
            agentId: agent.id,
            attempt,
            timestamp: new Date(),
          });

          return true;
        }

        // Step output didn't contain expected string — retry
        if (attempt <= maxRetries) {
          stepExec.status = 'retrying';
          this.emit({
            type: 'step:retry',
            runId: run.id,
            stepId: step.id,
            agentId: agent.id,
            attempt,
            timestamp: new Date(),
            meta: { reason: `Output missing expected: "${step.expects}"` },
          });

          // If there's a retry_step, execute that first (verification loop)
          if (step.on_fail?.retry_step) {
            const retryStep = definition.steps.find(
              (s) => s.id === step.on_fail!.retry_step,
            );
            if (retryStep) {
              const retryAgent = definition.agents.find(
                (a) => a.id === retryStep.agent,
              );
              if (retryAgent) {
                // Add the failed output to variables so retry agent can see it
                run.variables.prev_output = rawOutput;
                await this.config.executor(retryAgent, resolveTemplate(retryStep.input, {
                  task: run.task,
                  ...run.variables,
                }), {
                  runId: run.id,
                  stepId: retryStep.id,
                  attempt,
                  variables: run.variables,
                });
              }
            }
          }
          continue;
        }

        // Retries exhausted
        stepExec.status = 'failed';
        stepExec.error = `Output missing expected string "${step.expects}" after ${attempt} attempts`;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (attempt <= maxRetries) {
          stepExec.status = 'retrying';
          stepExec.error = errorMsg;
          this.emit({
            type: 'step:retry',
            runId: run.id,
            stepId: step.id,
            agentId: agent.id,
            attempt,
            timestamp: new Date(),
            meta: { reason: errorMsg },
          });
          continue;
        }
        stepExec.status = 'failed';
        stepExec.error = errorMsg;
      }
    }

    // Handle escalation
    if (step.on_fail?.escalate_to === 'human') {
      return this.escalate(run, stepExec, stepExec.error ?? 'Step failed');
    }

    this.emit({
      type: 'step:failed',
      runId: run.id,
      stepId: step.id,
      agentId: agent.id,
      timestamp: new Date(),
      meta: { error: stepExec.error },
    });

    return false;
  }

  // -----------------------------------------------------------------------
  // Loop step execution (story-based iteration)
  // -----------------------------------------------------------------------

  private async executeLoopStep(
    run: WorkflowRun,
    step: WorkflowStep,
    agent: WorkflowAgent,
    _definition: WorkflowDefinition,
  ): Promise<boolean> {
    const stepExec = run.steps.find((s) => s.stepId === step.id)!;

    // Stories should have been populated by a prior step's output
    // (e.g., a planning step that decomposes work into stories)
    const stories = stepExec.stories ?? [];

    if (stories.length === 0) {
      // Try to extract stories from prior step variables
      const storiesJson = run.variables.stories;
      if (storiesJson) {
        try {
          const parsed = JSON.parse(storiesJson);
          if (Array.isArray(parsed)) {
            stepExec.stories = parsed.map((s: Record<string, unknown>, i: number) => ({
              id: (s.id as string) ?? `S-${i + 1}`,
              title: (s.title as string) ?? `Story ${i + 1}`,
              description: (s.description as string) ?? '',
              acceptanceCriteria: (s.acceptanceCriteria as string[]) ?? [],
              status: 'pending' as const,
              retryCount: 0,
            }));
          }
        } catch {
          // Not valid JSON, treat as single story
          stepExec.stories = [
            {
              id: 'S-1',
              title: 'Main task',
              description: storiesJson,
              acceptanceCriteria: [],
              status: 'pending',
              retryCount: 0,
            },
          ];
        }
      }
    }

    const maxRetries = step.max_retries ?? this.config.defaultMaxRetries;

    for (const story of stepExec.stories ?? []) {
      story.status = 'running';

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          const prompt = resolveTemplate(step.input, {
            task: run.task,
            story_id: story.id,
            story_title: story.title,
            story_description: story.description,
            ...run.variables,
          });

          const rawOutput = await this.config.executor(agent, prompt, {
            runId: run.id,
            stepId: step.id,
            attempt,
            variables: run.variables,
            stories: stepExec.stories,
          });

          const parsed = parseStepOutput(rawOutput, step.expects);

          if (parsed.success) {
            story.status = 'done';
            Object.assign(run.variables, parsed.variables);
            break;
          }

          if (attempt > maxRetries) {
            story.status = 'failed';
          } else {
            story.retryCount++;
          }
        } catch {
          if (attempt > maxRetries) {
            story.status = 'failed';
          } else {
            story.retryCount++;
          }
        }
      }

      if (story.status === 'failed') {
        stepExec.status = 'failed';
        stepExec.error = `Story "${story.id}" failed after ${maxRetries + 1} attempts`;

        if (step.on_fail?.escalate_to === 'human') {
          return this.escalate(run, stepExec, stepExec.error);
        }

        this.emit({
          type: 'step:failed',
          runId: run.id,
          stepId: step.id,
          agentId: agent.id,
          timestamp: new Date(),
          meta: { storyId: story.id },
        });

        return false;
      }
    }

    stepExec.status = 'done';
    stepExec.completedAt = new Date();

    this.emit({
      type: 'step:done',
      runId: run.id,
      stepId: step.id,
      agentId: agent.id,
      timestamp: new Date(),
    });

    return true;
  }

  // -----------------------------------------------------------------------
  // Escalation
  // -----------------------------------------------------------------------

  private async escalate(
    run: WorkflowRun,
    stepExec: StepExecution,
    error: string,
  ): Promise<boolean> {
    stepExec.status = 'escalated';

    this.emit({
      type: 'step:escalated',
      runId: run.id,
      stepId: stepExec.stepId,
      agentId: stepExec.agentId,
      timestamp: new Date(),
      meta: { error },
    });

    if (this.config.onEscalation) {
      const resolved = await this.config.onEscalation(run, stepExec, error);
      if (resolved) {
        stepExec.status = 'done';
        stepExec.completedAt = new Date();
        return true;
      }
    }

    run.status = 'escalated';
    return false;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private createRun(
    definition: WorkflowDefinition,
    task: string,
  ): WorkflowRun {
    const now = new Date();
    return {
      id: randomUUID(),
      workflowId: definition.id,
      task,
      status: 'running',
      steps: definition.steps.map((step) => ({
        stepId: step.id,
        status: 'pending' as StepStatus,
        agentId: step.agent,
        attempts: 0,
      })),
      variables: { task },
      createdAt: now,
      updatedAt: now,
    };
  }

  private emit(event: WorkflowEvent): void {
    this.config.onEvent?.(event);
  }
}
