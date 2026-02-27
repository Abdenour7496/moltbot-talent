/**
 * Talent Orchestrator
 * 
 * The main integration layer between Moltbot and the AI Virtual Talent system.
 * Handles persona routing, context assembly, and approval workflow management.
 */

import { KnowledgeBase, type KnowledgeBaseConfig } from './knowledge-base.js';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { WorkflowEngine, type StepExecutorFn, type EscalationHandlerFn, type WorkflowEventHandler } from './workflow-engine.js';
import { loadWorkflowFile, loadAllWorkflows, validateWorkflowReferences } from './workflow-loader.js';
import type { WorkflowDefinition, WorkflowRun, WorkflowAgent } from './workflow-types.js';

/**
 * Persona configuration
 */
export interface PersonaConfig {
  /** Persona identifier (e.g., 'it-ops-specialist') */
  id: string;
  /** Display name */
  name: string;
  /** Path to persona directory */
  path: string;
  /** Knowledge base configuration */
  knowledge?: KnowledgeBaseConfig;
  /** Enabled integrations */
  integrations?: string[];
  /** Enabled skills */
  skills?: string[];
}

/**
 * Loaded persona with all files
 */
export interface LoadedPersona {
  config: PersonaConfig;
  /** IDENTITY.md — name, role, capabilities summary (Antfarm pattern) */
  identity: string;
  soul: string;
  expertise: string;
  procedures: string;
  tools: string;
  knowledgeBase?: KnowledgeBase;
}

/**
 * Context assembled for an agent turn
 */
export interface TurnContext {
  /** System prompt additions from persona */
  systemPrompt: string;
  /** Retrieved knowledge context */
  knowledgeContext: string;
  /** Available tools for this turn */
  tools: string[];
  /** Approval requirements for pending actions */
  approvalRequired: boolean;
}

/**
 * Approval request for human-in-the-loop workflows
 */
export interface ApprovalRequest {
  id: string;
  action: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  reversible: boolean;
  context: Record<string, unknown>;
  requestedAt: Date;
  expiresAt?: Date;
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  timestamp: Date;
  persona: string;
  sessionId: string;
  action: string;
  target?: string;
  approval?: {
    required: boolean;
    grantedBy?: string;
    grantedAt?: Date;
  };
  outcome: 'success' | 'failure' | 'pending';
  details?: Record<string, unknown>;
}

/**
 * Talent Orchestrator
 * 
 * Manages persona loading, context assembly, and the bridge between
 * Moltbot's agent runtime and the Virtual Talent system.
 */
export class TalentOrchestrator {
  private personas: Map<string, LoadedPersona> = new Map();
  private activePersona: string | null = null;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private auditLog: AuditEntry[] = [];
  private sessionId: string;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private workflowEngine: WorkflowEngine | null = null;
  private workflowRuns: Map<string, WorkflowRun> = new Map();

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? this.generateSessionId();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Load a persona from disk
   */
  async loadPersona(config: PersonaConfig): Promise<LoadedPersona> {
    // Verify persona directory exists
    try {
      await access(config.path, constants.R_OK);
    } catch {
      throw new Error(`Persona directory not found: ${config.path}`);
    }

    const [identity, soul, expertise, procedures, tools] = await Promise.all([
      readFile(join(config.path, 'IDENTITY.md'), 'utf-8').catch(() => ''),
      readFile(join(config.path, 'SOUL.md'), 'utf-8').catch(() => ''),
      readFile(join(config.path, 'EXPERTISE.md'), 'utf-8').catch(() => ''),
      readFile(join(config.path, 'PROCEDURES.md'), 'utf-8').catch(() => ''),
      readFile(join(config.path, 'TOOLS.md'), 'utf-8').catch(() => ''),
    ]);

    // Initialize knowledge base if configured
    let knowledgeBase: KnowledgeBase | undefined;
    if (config.knowledge) {
      knowledgeBase = new KnowledgeBase(config.knowledge);
      await knowledgeBase.initialize();
    }

    const loaded: LoadedPersona = {
      config,
      identity,
      soul,
      expertise,
      procedures,
      tools,
      knowledgeBase,
    };

    this.personas.set(config.id, loaded);
    
    this.log({
      action: 'persona_loaded',
      outcome: 'success',
      details: { personaId: config.id, name: config.name },
    });

    return loaded;
  }

  /**
   * Set the active persona for the session
   */
  setActivePersona(personaId: string): void {
    if (!this.personas.has(personaId)) {
      throw new Error(`Persona '${personaId}' not loaded`);
    }
    this.activePersona = personaId;
    
    this.log({
      action: 'persona_activated',
      outcome: 'success',
      details: { personaId },
    });
  }

  /**
   * Get the currently active persona
   */
  getActivePersona(): LoadedPersona | null {
    if (!this.activePersona) return null;
    return this.personas.get(this.activePersona) ?? null;
  }

  /**
   * Build context for an agent turn
   * 
   * This assembles the system prompt additions, retrieves relevant
   * knowledge, and determines what tools are available.
   */
  async buildContext(query: string): Promise<TurnContext> {
    const persona = this.getActivePersona();
    if (!persona) {
      return {
        systemPrompt: '',
        knowledgeContext: '',
        tools: [],
        approvalRequired: false,
      };
    }

    // Build system prompt from persona files
    const systemPromptParts: string[] = [];
    
    if (persona.identity) {
      systemPromptParts.push(`<persona_identity>\n${persona.identity}\n</persona_identity>`);
    }
    if (persona.soul) {
      systemPromptParts.push(`<persona_soul>\n${persona.soul}\n</persona_soul>`);
    }
    if (persona.expertise) {
      systemPromptParts.push(`<persona_expertise>\n${persona.expertise}\n</persona_expertise>`);
    }
    if (persona.procedures) {
      systemPromptParts.push(`<persona_procedures>\n${persona.procedures}\n</persona_procedures>`);
    }
    if (persona.tools) {
      systemPromptParts.push(`<persona_tools>\n${persona.tools}\n</persona_tools>`);
    }

    // Retrieve knowledge context if available
    let knowledgeContext = '';
    if (persona.knowledgeBase) {
      try {
        const results = await persona.knowledgeBase.query(query, { topK: 5 });
        knowledgeContext = persona.knowledgeBase.buildContext(results);
      } catch (error) {
        console.warn('Knowledge retrieval failed:', error);
      }
    }

    // Determine available tools based on persona config
    const tools = persona.config.integrations ?? [];

    return {
      systemPrompt: systemPromptParts.join('\n\n'),
      knowledgeContext,
      tools,
      approvalRequired: this.pendingApprovals.size > 0,
    };
  }

  /**
   * Request approval for an action
   */
  requestApproval(request: Omit<ApprovalRequest, 'id' | 'requestedAt'>): ApprovalRequest {
    const id = `apr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const approval: ApprovalRequest = {
      ...request,
      id,
      requestedAt: new Date(),
    };
    
    this.pendingApprovals.set(id, approval);
    
    this.log({
      action: 'approval_requested',
      target: request.action,
      approval: { required: true },
      outcome: 'pending',
      details: { approvalId: id, risk: request.risk },
    });

    return approval;
  }

  /**
   * Grant approval for a pending request
   */
  grantApproval(approvalId: string, grantedBy: string): boolean {
    const request = this.pendingApprovals.get(approvalId);
    if (!request) return false;

    this.pendingApprovals.delete(approvalId);
    
    this.log({
      action: 'approval_granted',
      target: request.action,
      approval: {
        required: true,
        grantedBy,
        grantedAt: new Date(),
      },
      outcome: 'success',
      details: { approvalId },
    });

    return true;
  }

  /**
   * Deny approval for a pending request
   */
  denyApproval(approvalId: string, deniedBy: string, reason?: string): boolean {
    const request = this.pendingApprovals.get(approvalId);
    if (!request) return false;

    this.pendingApprovals.delete(approvalId);
    
    this.log({
      action: 'approval_denied',
      target: request.action,
      approval: { required: true },
      outcome: 'failure',
      details: { approvalId, deniedBy, reason },
    });

    return true;
  }

  /**
   * Get all pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Log an action to the audit trail
   */
  private log(entry: Omit<AuditEntry, 'timestamp' | 'persona' | 'sessionId'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date(),
      persona: this.activePersona ?? 'none',
      sessionId: this.sessionId,
    };
    
    this.auditLog.push(fullEntry);
    
    // Keep audit log bounded (last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get the audit log
   */
  getAuditLog(options?: {
    since?: Date;
    action?: string;
    limit?: number;
  }): AuditEntry[] {
    let entries = [...this.auditLog];
    
    if (options?.since) {
      entries = entries.filter(e => e.timestamp >= options.since!);
    }
    if (options?.action) {
      entries = entries.filter(e => e.action === options.action);
    }
    if (options?.limit) {
      entries = entries.slice(-options.limit);
    }
    
    return entries;
  }

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    for (const persona of this.personas.values()) {
      if (persona.knowledgeBase) {
        await persona.knowledgeBase.close();
      }
    }
    this.personas.clear();
    this.pendingApprovals.clear();
  }

  // -----------------------------------------------------------------------
  // Workflow support (Antfarm-inspired multi-agent pipelines)
  // -----------------------------------------------------------------------

  /**
   * Initialize the workflow engine.
   * Must be called before running workflows.
   *
   * @param executor   - Function that sends a prompt to an LLM/agent runtime and returns the response
   * @param options    - Optional escalation handler and event handler
   */
  initWorkflowEngine(
    executor: StepExecutorFn,
    options?: {
      onEscalation?: EscalationHandlerFn;
      onEvent?: WorkflowEventHandler;
      defaultMaxRetries?: number;
    },
  ): void {
    this.workflowEngine = new WorkflowEngine({
      executor,
      onEscalation: options?.onEscalation,
      onEvent: (event) => {
        // Audit log integration
        this.log({
          action: `workflow:${event.type}`,
          target: event.stepId,
          outcome: event.type.includes('fail') || event.type.includes('escalat')
            ? 'failure'
            : 'success',
          details: { runId: event.runId, agentId: event.agentId, ...event.meta },
        });
        options?.onEvent?.(event);
      },
      defaultMaxRetries: options?.defaultMaxRetries,
    });
  }

  /**
   * Load a single workflow definition from a YAML file.
   */
  async loadWorkflow(filePath: string): Promise<WorkflowDefinition> {
    const def = await loadWorkflowFile(filePath);
    const errors = validateWorkflowReferences(def);
    if (errors.length > 0) {
      throw new Error(
        `Workflow "${def.id}" has reference errors:\n${errors.join('\n')}`,
      );
    }
    this.workflows.set(def.id, def);
    this.log({
      action: 'workflow_loaded',
      outcome: 'success',
      details: { workflowId: def.id, name: def.name, steps: def.steps.length },
    });
    return def;
  }

  /**
   * Load all workflows from a directory.
   */
  async loadWorkflowsFromDirectory(dir: string): Promise<number> {
    const loaded = await loadAllWorkflows(dir);
    for (const [id, def] of loaded) {
      this.workflows.set(id, def);
    }
    this.log({
      action: 'workflows_loaded',
      outcome: 'success',
      details: { directory: dir, count: loaded.size },
    });
    return loaded.size;
  }

  /**
   * List all loaded workflow definitions.
   */
  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Run a workflow by its ID.
   *
   * Automatically loads the personas referenced by each agent in the workflow
   * (if they aren't loaded already) and executes the pipeline.
   *
   * @param workflowId  - ID of a loaded workflow definition
   * @param task        - The task or incident description to process
   * @param personasDir - Root directory containing persona subdirectories
   * @returns The completed WorkflowRun
   */
  async runWorkflow(
    workflowId: string,
    task: string,
    personasDir?: string,
  ): Promise<WorkflowRun> {
    if (!this.workflowEngine) {
      throw new Error(
        'Workflow engine not initialized. Call initWorkflowEngine() first.',
      );
    }

    const definition = this.workflows.get(workflowId);
    if (!definition) {
      throw new Error(`Workflow "${workflowId}" not found. Load it first.`);
    }

    // Auto-load personas referenced by workflow agents
    if (personasDir) {
      for (const agent of definition.agents) {
        if (agent.persona && !this.personas.has(agent.persona)) {
          const personaPath = join(personasDir, agent.persona);
          try {
            await this.loadPersona({
              id: agent.persona,
              name: agent.name,
              path: personaPath,
            });
          } catch {
            console.warn(
              `Could not load persona "${agent.persona}" for agent "${agent.id}"`,
            );
          }
        }
      }
    }

    this.log({
      action: 'workflow_started',
      outcome: 'pending',
      details: { workflowId, task: task.slice(0, 200) },
    });

    const run = await this.workflowEngine.run(definition, task);
    this.workflowRuns.set(run.id, run);

    this.log({
      action: 'workflow_completed',
      outcome: run.status === 'completed' ? 'success' : 'failure',
      details: {
        runId: run.id,
        workflowId,
        status: run.status,
        stepsCompleted: run.steps.filter((s) => s.status === 'done').length,
        totalSteps: run.steps.length,
      },
    });

    return run;
  }

  /**
   * Get a previous workflow run by ID.
   */
  getWorkflowRun(runId: string): WorkflowRun | undefined {
    return this.workflowRuns.get(runId);
  }

  /**
   * Get the persona context string for a workflow agent.
   * Useful when building prompts inside the step executor callback.
   */
  async getAgentContext(agent: WorkflowAgent, query: string): Promise<string> {
    if (!agent.persona) return '';

    const persona = this.personas.get(agent.persona);
    if (!persona) return '';

    // Temporarily switch active persona to build context
    const prev = this.activePersona;
    this.activePersona = agent.persona;
    const ctx = await this.buildContext(query);
    this.activePersona = prev;

    return ctx.systemPrompt + (ctx.knowledgeContext ? `\n\n${ctx.knowledgeContext}` : '');
  }
}

export default TalentOrchestrator;
