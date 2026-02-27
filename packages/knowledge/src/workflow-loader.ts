/**
 * Workflow Loader
 * 
 * Loads and validates YAML workflow definitions from the filesystem.
 */

import { readFile } from 'fs/promises';
import { resolve, join, basename } from 'path';
import { glob } from 'glob';
import { z } from 'zod';
import type {
  WorkflowDefinition,
  WorkflowAgent,
  WorkflowStep,
  AgentRole,
  StepLoopConfig,
  StepFailureConfig,
} from './workflow-types.js';

// ---------------------------------------------------------------------------
// Zod schemas for validating raw YAML
// ---------------------------------------------------------------------------

const AgentRoleSchema = z.enum([
  'analysis',
  'coding',
  'verification',
  'testing',
  'scanning',
  'coordination',
]);

const WorkflowAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: AgentRoleSchema,
  description: z.string(),
  persona: z.string().optional(),
  timeoutSeconds: z.number().optional(),
});

const StepLoopSchema = z.object({
  over: z.literal('stories'),
  completion: z.literal('all_done'),
  fresh_session: z.boolean(),
  verify_each: z.boolean().optional(),
  verify_step: z.string().optional(),
});

const StepFailureSchema = z.object({
  retry_step: z.string().optional(),
  escalate_to: z.literal('human').optional(),
  max_retries: z.number().optional(),
  on_exhausted: z.object({ escalate_to: z.literal('human') }).optional(),
});

const WorkflowStepSchema = z.object({
  id: z.string(),
  agent: z.string(),
  type: z.enum(['standard', 'loop']).optional(),
  loop: StepLoopSchema.optional(),
  input: z.string(),
  expects: z.string(),
  max_retries: z.number().optional(),
  on_fail: StepFailureSchema.optional(),
});

const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  description: z.string(),
  agents: z.array(WorkflowAgentSchema),
  steps: z.array(WorkflowStepSchema),
});

// ---------------------------------------------------------------------------
// YAML parsing helpers (lightweight, no dependency on js-yaml at runtime
// unless it's available — falls back to a minimal parser for simple cases)
// ---------------------------------------------------------------------------

/**
 * Dynamically import js-yaml if available. Otherwise throw with install instructions.
 */
async function loadYamlParser(): Promise<{ load: (input: string) => unknown }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jsYaml: { default?: { load: (s: string) => unknown }; load?: (s: string) => unknown } =
      await import(/* webpackIgnore: true */ 'js-yaml' as string);
    return (jsYaml.default ?? jsYaml) as { load: (input: string) => unknown };
  } catch {
    throw new Error(
      'js-yaml is required for loading workflow definitions. ' +
        'Install it with: pnpm add js-yaml && pnpm add -D @types/js-yaml',
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a single workflow YAML file and return a validated WorkflowDefinition.
 */
export async function loadWorkflowFile(filePath: string): Promise<WorkflowDefinition> {
  const yaml = await loadYamlParser();
  const raw = await readFile(filePath, 'utf-8');
  const parsed = yaml.load(raw);

  const result = WorkflowDefinitionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid workflow definition in ${filePath}: ${result.error.message}`,
    );
  }
  return result.data as WorkflowDefinition;
}

/**
 * Discover and load all workflow YAML files from a directory.
 *
 * @param workflowsDir - Absolute path to the workflows directory
 * @returns Map of workflow ID → WorkflowDefinition
 */
export async function loadAllWorkflows(
  workflowsDir: string,
): Promise<Map<string, WorkflowDefinition>> {
  const pattern = join(workflowsDir, '*.{yml,yaml}');
  const files = await glob(pattern);

  const workflows = new Map<string, WorkflowDefinition>();

  for (const file of files) {
    try {
      const def = await loadWorkflowFile(file);
      workflows.set(def.id, def);
    } catch (err) {
      console.warn(`Skipping invalid workflow file ${basename(file)}: ${err}`);
    }
  }

  return workflows;
}

/**
 * Validate cross-references within a workflow definition
 * (e.g., step.agent references exist, retry_step references exist).
 */
export function validateWorkflowReferences(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const agentIds = new Set(def.agents.map((a) => a.id));
  const stepIds = new Set(def.steps.map((s) => s.id));

  for (const step of def.steps) {
    // Check agent reference
    if (!agentIds.has(step.agent)) {
      errors.push(
        `Step "${step.id}" references unknown agent "${step.agent}"`,
      );
    }

    // Check retry_step reference
    if (step.on_fail?.retry_step && !stepIds.has(step.on_fail.retry_step)) {
      errors.push(
        `Step "${step.id}" on_fail.retry_step references unknown step "${step.on_fail.retry_step}"`,
      );
    }

    // Check loop verify_step reference
    if (step.loop?.verify_step && !stepIds.has(step.loop.verify_step)) {
      errors.push(
        `Step "${step.id}" loop.verify_step references unknown step "${step.loop.verify_step}"`,
      );
    }
  }

  return errors;
}
