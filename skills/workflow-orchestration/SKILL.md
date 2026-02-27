# Multi-Agent Workflow Orchestration

> Skill for defining and executing deterministic multi-agent pipelines.
> Inspired by [Antfarm](https://github.com/snarktank/antfarm) patterns, adapted for Moltbot Talent.

## Overview

Multi-agent workflows orchestrate several specialized personas through a deterministic pipeline of steps. Each step:

1. Assigns an **agent** with a specific **role** (analysis, coding, verification, testing, scanning, coordination)
2. Receives a **prompt template** with `{{variable}}` placeholders resolved from prior step outputs
3. Must produce output containing an **expected string** to succeed (e.g., `STATUS: done`)
4. Can **retry** automatically, with optional **verification loops** and **human escalation**

## Key Concepts

### Fresh Context Per Step
Each agent step starts with fresh context — only the prompt template (with resolved variables from prior steps) is passed in. This prevents context bloat and ensures focused, deterministic execution.

### Role-Based Access Control
Agent roles determine tool permissions:

| Role           | Read | Write | Execute | Browser | Web Search |
|----------------|------|-------|---------|---------|------------|
| `analysis`     | ✅   | ❌    | ✅      | ❌      | ❌         |
| `coding`       | ✅   | ✅    | ✅      | ❌      | ❌         |
| `verification` | ✅   | ❌    | ✅      | ❌      | ❌         |
| `testing`      | ✅   | ❌    | ✅      | ✅      | ❌         |
| `scanning`     | ✅   | ❌    | ✅      | ❌      | ✅         |
| `coordination` | ✅   | ❌    | ✅      | ❌      | ✅         |

### Verification Loops
Steps can define `on_fail.retry_step` to create verification loops. When a step fails, the retry step agent examines the output and provides feedback, then the original step retries with improved context.

### Story-Based Decomposition
Loop steps (`type: loop`) iterate over a list of stories (work items) produced by a prior planning step. Each story is executed independently with optional per-story verification.

## Workflow YAML Format

```yaml
id: incident-response
name: Incident Response Pipeline
version: 1
description: Multi-agent incident triage and resolution

agents:
  - id: triager
    name: Bug Triager
    role: analysis
    persona: bug-triager
    description: Classifies and reproduces incidents

  - id: developer
    name: Developer
    role: coding
    persona: it-ops-specialist
    description: Implements fixes

  - id: verifier
    name: Verifier
    role: verification
    persona: code-reviewer
    description: Reviews and verifies fixes

steps:
  - id: triage
    agent: triager
    input: |
      Triage this incident:
      {{task}}

      Classify severity, identify root cause, and document reproduction steps.
    expects: "STATUS: done"
    max_retries: 1

  - id: fix
    agent: developer
    input: |
      Fix the issue identified during triage:
      {{prev_output}}

      Implement the minimal correct fix.
    expects: "STATUS: done"
    max_retries: 2
    on_fail:
      retry_step: verify
      escalate_to: human

  - id: verify
    agent: verifier
    input: |
      Verify the fix for:
      {{task}}

      Check that:
      1. The fix addresses the root cause
      2. No regressions introduced
      3. Tests pass
    expects: "STATUS: done"
    max_retries: 1
    on_fail:
      escalate_to: human
```

## Template Variables

Steps communicate through `KEY: value` pairs extracted from agent output.

**Built-in variables:**
- `{{task}}` — Original task/incident description
- `{{prev_output}}` — Raw output from the immediately preceding step

**Custom variables** are automatically extracted from agent output:
```
STATUS: done
ROOT_CAUSE: Memory leak in connection pool
SEVERITY: SEV-2
FIX_BRANCH: fix/connection-pool-leak
```

These become `{{root_cause}}`, `{{severity}}`, `{{fix_branch}}` (lowercased) for downstream steps.

## TypeScript API

### Initialize the workflow engine

```typescript
import { TalentOrchestrator } from '@moltbot-talent/knowledge';

const orchestrator = new TalentOrchestrator('session-123');

// Initialize the workflow engine with your LLM executor
orchestrator.initWorkflowEngine(
  async (agent, prompt, context) => {
    // Build persona context for this agent
    const personaContext = await orchestrator.getAgentContext(agent, prompt);
    
    // Call your LLM with the persona context + prompt
    const response = await llm.chat({
      systemPrompt: personaContext,
      userMessage: prompt,
    });
    
    return response.text;
  },
  {
    onEscalation: async (run, step, error) => {
      // Notify human via Slack, PagerDuty, etc.
      await notifyHuman(run, step, error);
      return false; // Return true if human resolved it
    },
    onEvent: (event) => {
      console.log(`[${event.type}] step=${event.stepId} agent=${event.agentId}`);
    },
  }
);
```

### Load and run workflows

```typescript
// Load all workflow definitions
await orchestrator.loadWorkflowsFromDirectory('./workflows');

// Or load a specific workflow
await orchestrator.loadWorkflow('./workflows/incident-response.yml');

// Run a workflow
const run = await orchestrator.runWorkflow(
  'incident-response',
  'Production API returning 500 errors on /api/payments endpoint since 14:30 UTC',
  './personas', // Base directory for persona loading
);

console.log(`Run ${run.id}: ${run.status}`);
console.log(`Steps completed: ${run.steps.filter(s => s.status === 'done').length}/${run.steps.length}`);
```

## Available Workflows

### incident-response
Multi-agent incident triage and resolution pipeline.
**Steps:** triage → investigate → fix → verify → review
**Personas:** it-ops-specialist, bug-triager, code-reviewer

### security-audit
Security vulnerability scanning, prioritization, and remediation.
**Steps:** scan → prioritize → fix (loop) → verify → test → review
**Personas:** security-auditor, code-reviewer

### change-management
Enterprise change management with risk assessment and approval gates.
**Steps:** plan → implement → security-scan → review → deploy
**Personas:** it-ops-specialist, security-auditor, code-reviewer

## Verification Best Practices

1. **Verifier agents should NEVER have write access** — Use `analysis` or `verification` roles
2. **Keep retry limits reasonable** — 2-3 max retries per step
3. **Always define an escalation path** — Every workflow should have at least one `escalate_to: human` fallback
4. **Include acceptance criteria in prompts** — Tell the agent exactly what "done" looks like
5. **Use STATUS: done convention** — Consistent success signaling across all agents
