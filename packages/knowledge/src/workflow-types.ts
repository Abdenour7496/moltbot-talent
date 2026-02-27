/**
 * Workflow Types
 * 
 * Type definitions for multi-agent workflow orchestration.
 * Inspired by Antfarm's (https://github.com/snarktank/antfarm) YAML workflow patterns,
 * adapted for Moltbot Talent enterprise pipelines.
 */

/**
 * Agent role determines tool access permissions
 * Adapted from Antfarm's role-based access control
 */
export type AgentRole = 
  | 'analysis'        // Read-only code exploration (planner, reviewer, triager, investigator)
  | 'coding'          // Full read/write/exec for implementation (developer, fixer)
  | 'verification'    // Read + exec, NO write — preserves verification integrity
  | 'testing'         // Read + exec + browser for E2E testing, NO write
  | 'scanning'        // Read + exec + web search for CVE lookups, NO write
  | 'coordination';   // IT Ops coordination — read + exec + integrations

/**
 * Agent definition within a workflow
 */
export interface WorkflowAgent {
  /** Unique agent identifier within the workflow */
  id: string;
  /** Display name */
  name: string;
  /** Role controls tool access */
  role: AgentRole;
  /** What this agent does */
  description: string;
  /** Persona to load for this agent (references personas/ directory) */
  persona?: string;
  /** Override default timeout (seconds) */
  timeoutSeconds?: number;
}

/**
 * Loop configuration for story-based execution
 * Allows a step to iterate over a list of stories/tasks
 */
export interface StepLoopConfig {
  /** What to iterate over (currently only 'stories') */
  over: 'stories';
  /** When the loop is considered complete */
  completion: 'all_done';
  /** Whether each iteration gets a fresh agent session */
  fresh_session: boolean;
  /** Whether to verify after each iteration */
  verify_each?: boolean;
  /** Which step to use for per-iteration verification */
  verify_step?: string;
}

/**
 * Failure handling configuration for a step
 */
export interface StepFailureConfig {
  /** Step to retry when this step fails */
  retry_step?: string;
  /** Escalate to human when retries are exhausted or immediately */
  escalate_to?: 'human';
  /** Maximum retries for the retry_step */
  max_retries?: number;
  /** What to do when max retries are exhausted */
  on_exhausted?: {
    escalate_to: 'human';
  };
}

/**
 * Step definition in a workflow pipeline
 */
export interface WorkflowStep {
  /** Unique step identifier */
  id: string;
  /** Which agent handles this step */
  agent: string;
  /** Step type — 'standard' (default) or 'loop' for story iteration */
  type?: 'standard' | 'loop';
  /** Loop configuration (required if type is 'loop') */
  loop?: StepLoopConfig;
  /** Prompt template with {{variable}} placeholders */
  input: string;
  /** String the output must contain to count as success */
  expects: string;
  /** Maximum retry attempts for this step */
  max_retries?: number;
  /** Failure handling configuration */
  on_fail?: StepFailureConfig;
}

/**
 * Full workflow definition (corresponds to a YAML workflow file)
 */
export interface WorkflowDefinition {
  /** Unique workflow identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Integer version number */
  version: number;
  /** Description of what the workflow does */
  description: string;
  /** List of agent definitions */
  agents: WorkflowAgent[];
  /** Ordered list of pipeline steps */
  steps: WorkflowStep[];
}

/**
 * Status of a workflow step execution
 */
export type StepStatus = 
  | 'pending'     // Not yet started
  | 'running'     // Currently executing
  | 'done'        // Completed successfully
  | 'retrying'    // Failed, retrying
  | 'failed'      // Failed, retries exhausted
  | 'escalated';  // Escalated to human

/**
 * Status of a story within a loop step
 */
export type StoryStatus = 'pending' | 'running' | 'done' | 'failed';

/**
 * A story/task within a loop step
 */
export interface WorkflowStory {
  /** Unique story ID (e.g., S-1, fix-001) */
  id: string;
  /** Short description */
  title: string;
  /** What needs to be done */
  description: string;
  /** Verifiable acceptance criteria */
  acceptanceCriteria: string[];
  /** Story status */
  status: StoryStatus;
  /** Retry count for this story */
  retryCount: number;
  /** Additional metadata (e.g., severity for security fixes) */
  metadata?: Record<string, unknown>;
}

/**
 * State of a single step execution
 */
export interface StepExecution {
  /** Step ID */
  stepId: string;
  /** Current status */
  status: StepStatus;
  /** Agent that handled/is handling this step */
  agentId: string;
  /** Number of attempts */
  attempts: number;
  /** Output from the step (KEY: value pairs) */
  output?: Record<string, string>;
  /** Raw output text */
  rawOutput?: string;
  /** Extracted variables for downstream steps */
  variables?: Record<string, string>;
  /** Stories (for loop steps) */
  stories?: WorkflowStory[];
  /** Error message if failed */
  error?: string;
  /** Start timestamp */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
}

/**
 * Status of a full workflow run
 */
export type WorkflowRunStatus = 
  | 'pending'     // Created but not started
  | 'running'     // Steps are executing
  | 'completed'   // All steps finished successfully
  | 'failed'      // A step failed and couldn't recover
  | 'escalated';  // Escalated to human intervention

/**
 * State of a full workflow run
 */
export interface WorkflowRun {
  /** Unique run identifier */
  id: string;
  /** Workflow definition ID */
  workflowId: string;
  /** The original task/input that triggered this run */
  task: string;
  /** Current run status */
  status: WorkflowRunStatus;
  /** State of each step */
  steps: StepExecution[];
  /** Accumulated variables from all completed steps */
  variables: Record<string, string>;
  /** When the run was created */
  createdAt: Date;
  /** When the run was last updated */
  updatedAt: Date;
  /** When the run completed (if applicable) */
  completedAt?: Date;
}

/**
 * Template variable resolution context
 */
export interface TemplateContext {
  /** Original task string */
  task: string;
  /** Accumulated variables from prior steps */
  [key: string]: string | undefined;
}

/**
 * Result from parsing step output for KEY: value pairs
 */
export interface ParsedStepOutput {
  /** Whether the expected string was found */
  success: boolean;
  /** Extracted KEY: value pairs (keys lowercased) */
  variables: Record<string, string>;
  /** Raw output text */
  rawOutput: string;
}
