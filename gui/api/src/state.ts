/**
 * In-memory application state
 *
 * Holds orchestrator instances, knowledge bases, and mock data
 * for the GUI API. In production this would be backed by a database.
 */

// ── Types mirroring the orchestrator ───────────────────────────────

export interface PersonaConfig {
  id: string;
  name: string;
  path: string;
  integrations?: string[];
  skills?: string[];
  /** ID of the knowledge base attached to this persona (optional) */
  knowledgeBaseId?: string;
}

export interface LoadedPersona {
  config: PersonaConfig;
  identity: string;
  soul: string;
  expertise: string;
  procedures: string;
  tools: string;
  active: boolean;
  loadedAt: Date;
}

export interface KnowledgeBaseInfo {
  id: string;
  name: string;
  domain: string;
  documentCount: number;
  chunkCount: number;
  provider: string;
  embeddingModel: string;
  createdAt: Date;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  reversible: boolean;
  context: Record<string, unknown>;
  requestedAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'granted' | 'denied';
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface AuditEntry {
  id: string;
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

export interface IntegrationInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  connected: boolean;
  config: Record<string, string>;
  lastSync?: Date;
}

export interface AppSettings {
  vectorDbProvider: string;
  vectorDbUrl: string;
  embeddingModel: string;
  embeddingApiKey: string;
  chunkSize: number;
  chunkOverlap: number;
  // Agent runtime
  defaultModel: string;
  defaultProvider: string;
  apiKey: string;
  apiBaseUrl: string;
  orgId: string;
  thinkingLevel: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  // Session pruning
  sessionIdleTimeout: number;    // minutes until idle
  sessionMaxAge: number;         // hours until auto-close
  sessionPruneEnabled: boolean;
  // Media pipeline
  mediaMaxSizeMb: number;
  mediaTranscriptionEnabled: boolean;
  mediaTranscriptionModel: string;
  // Browser control
  browserEnabled: boolean;
  browserChromePath: string;
  browserHeadless: boolean;
  // Docker sandbox
  sandboxMode: 'off' | 'non-main' | 'all';
  sandboxImage: string;
  sandboxTimeout: number;        // seconds
  // Azure AI Search
  azureSearchEndpoint: string;
  azureSearchApiKey: string;
  azureSearchApiVersion: string;
  // Orgo — Desktop Infrastructure for AI Agents
  orgoApiKey: string;
  orgoBaseUrl: string;
}

// ── Skills ─────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'bundled' | 'managed' | 'workspace' | 'custom';
  source: 'bundled' | 'registry' | 'workspace' | 'url';
  enabled: boolean;
  installedAt: Date;
  version: string;
  config: Record<string, string>;
}

// ── Security ───────────────────────────────────────────────────────

export interface SecurityConfig {
  dmPolicy: 'pairing' | 'open' | 'closed';
  channelAllowlists: Record<string, string[]>;
  sandboxMode: 'off' | 'non-main' | 'all';
  authMode: 'none' | 'password' | 'token';
  authPassword: string;
  authToken: string;
}

export interface PairingCode {
  id: string;
  channel: string;
  code: string;
  description: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

// ── Usage tracking ─────────────────────────────────────────────────

export interface UsageRecord {
  id: string;
  personaId: string;
  sessionId: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

// ── Webhook endpoints (inbound surface) ────────────────────────────

export interface WebhookEndpoint {
  id: string;
  name: string;
  path: string;
  secret: string;
  targetPersonaId: string;
  action: string;
  enabled: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

// ── Users ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'viewer';
  passwordHash: string;
  avatar?: string;
  active: boolean;
  tenantId?: string;           // links user to a tenant org
  createdAt: Date;
  lastLoginAt?: Date;
}

// ── Tenants (Multi-tenant SaaS) ────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;                // unique URL-friendly name
  industry: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  logo?: string;
  contactEmail: string;
  ownerId: string;             // user who created the org
  maxActiveContracts: number;  // plan limit
  balance: number;             // credits in USD
  active: boolean;
  createdAt: Date;
}

// ── Agent Listings (Marketplace) ───────────────────────────────────

export type AgentSpecialty =
  | 'devops'
  | 'security'
  | 'data-engineering'
  | 'frontend'
  | 'backend'
  | 'ml-ai'
  | 'cloud-architecture'
  | 'qa-testing'
  | 'technical-writing'
  | 'project-management';

export type AgentAvailability = 'available' | 'hired' | 'busy' | 'maintenance';

export interface AgentListing {
  id: string;
  name: string;
  title: string;               // e.g. "Senior DevOps Engineer"
  avatar?: string;
  specialty: AgentSpecialty;
  tags: string[];
  description: string;
  hourlyRate: number;          // USD per hour
  rating: number;              // 0-5
  completedJobs: number;
  successRate: number;         // 0-100
  availability: AgentAvailability;
  currentContractId?: string;  // if hired
  personaId?: string;          // linked persona config
  skills: string[];
  languages: string[];         // programming / natural languages
  certifications: string[];
  createdAt: Date;
}

// ── Contracts (Hiring lifecycle) ───────────────────────────────────

export type ContractStatus =
  | 'pending'     // offered, awaiting agent acceptance
  | 'active'      // agent is working
  | 'paused'      // temporarily paused
  | 'review'      // work submitted, pending client review
  | 'completed'   // successfully finished
  | 'cancelled'   // cancelled before completion
  | 'disputed';   // dispute raised

export interface ContractMilestone {
  id: string;
  title: string;
  description: string;
  dueDate?: Date;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: Date;
  amount: number;              // payment for this milestone
}

export interface ContractMessage {
  id: string;
  senderId: string;            // user or agent id
  senderType: 'client' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface Contract {
  id: string;
  tenantId: string;
  agentId: string;
  clientUserId: string;        // user who initiated the hire
  title: string;
  description: string;
  specialty: AgentSpecialty;
  status: ContractStatus;
  hourlyRate: number;
  estimatedHours: number;
  actualHours: number;
  totalCost: number;
  milestones: ContractMilestone[];
  messages: ContractMessage[];
  rating?: number;             // client's post-completion rating
  feedback?: string;           // client's post-completion feedback
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// ── Sessions ───────────────────────────────────────────────────────

export interface SessionMessage {
  id: string;
  role: 'user' | 'persona' | 'system';
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  label: string;
  personaId: string;
  channelId?: string;
  status: 'active' | 'idle' | 'closed';
  messages: SessionMessage[];
  createdAt: Date;
  lastActivityAt: Date;
}

// ── Orgo — Desktop Infrastructure for AI Agents ───────────────────

export type OrgoComputerStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
export type OrgoGpuType = 'none' | 'a10' | 'l40s' | 'a100-40gb' | 'a100-80gb';

export interface OrgoWorkspace {
  id: string;
  name: string;
  createdAt: Date;
  computerCount: number;
}

export interface OrgoComputer {
  id: string;
  name: string;
  workspaceId: string;
  os: 'linux';
  ram: 4 | 8 | 16 | 32 | 64;
  cpu: 2 | 4 | 8 | 16;
  gpu: OrgoGpuType;
  status: OrgoComputerStatus;
  url: string;
  templateId?: string;
  createdAt: Date;
}

export interface OrgoTemplate {
  id: string;
  name: string;
  workspaceId?: string;
  commands: string[];       // shell commands to run during build
  envVars: Record<string, string>;
  workdir?: string;
  cloneUrl?: string;
  status: 'draft' | 'building' | 'ready' | 'error';
  createdAt: Date;
  builtAt?: Date;
}

export interface OrgoComputerAction {
  id: string;
  computerId: string;
  action: string;           // click, type, key, scroll, screenshot, bash, exec, wait, drag
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  timestamp: Date;
}

// ── Channels ───────────────────────────────────────────────────────

export interface Channel {
  id: string;
  name: string;
  type: 'slack' | 'discord' | 'teams' | 'webhook' | 'telegram';
  personaId: string;
  config: Record<string, string>;
  active: boolean;
  createdAt: Date;
  lastMessageAt?: Date;
}

// ── Hooks ──────────────────────────────────────────────────────────

export interface Hook {
  id: string;
  name: string;
  event: string;
  type: 'webhook' | 'log' | 'script';
  config: { url?: string; command?: string };
  enabled: boolean;
  lastTriggeredAt?: Date;
  triggerCount: number;
}

// ── Cross-persona comms ────────────────────────────────────────────

export interface PersonaMessage {
  id: string;
  fromPersona: string;
  toPersona: string;
  content: string;
  timestamp: Date;
  status: 'delivered' | 'pending' | 'failed';
}

// ── Brain / Multi-LLM Config ──────────────────────────────────────

export type LlmProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'azure' | 'custom';
export type RoutingStrategy = 'priority' | 'task-match' | 'round-robin' | 'cost-optimized';

export interface LlmEntry {
  id: string;
  label: string;
  provider: LlmProvider;
  model: string;
  endpoint?: string;
  apiKey?: string;
  parameters: { temperature: number; maxTokens: number; topP?: number };
  role: string;
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

export interface BrainConfig {
  personaId: string;
  routingStrategy: RoutingStrategy;
  fallbackLlmId?: string;
  llms: LlmEntry[];
}

// ── Cron / Scheduled Tasks ─────────────────────────────────────────

export interface CronTask {
  id: string;
  name: string;
  personaId: string;
  schedule: string;
  action: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  lastOutcome?: 'success' | 'failure';
}

// ── State ──────────────────────────────────────────────────────────

export const personas: Map<string, LoadedPersona> = new Map();
export const knowledgeBases: Map<string, KnowledgeBaseInfo> = new Map();
export const approvals: Map<string, ApprovalRequest> = new Map();
export const auditLog: AuditEntry[] = [];
export const integrations: Map<string, IntegrationInfo> = new Map();
export const sessions: Map<string, Session> = new Map();
export const channels: Map<string, Channel> = new Map();
export const hooks: Map<string, Hook> = new Map();
export const personaMessages: PersonaMessage[] = [];
export const cronTasks: Map<string, CronTask> = new Map();
export const brainConfigs: Map<string, BrainConfig> = new Map();
export const skills: Map<string, Skill> = new Map();
export const pairingCodes: Map<string, PairingCode> = new Map();
export const usageRecords: UsageRecord[] = [];
export const webhookEndpoints: Map<string, WebhookEndpoint> = new Map();
export const users: Map<string, User> = new Map();
export const tenants: Map<string, Tenant> = new Map();
export const agentListings: Map<string, AgentListing> = new Map();
export const contracts: Map<string, Contract> = new Map();
export const orgoWorkspaces: Map<string, OrgoWorkspace> = new Map();
export const orgoComputers: Map<string, OrgoComputer> = new Map();
export const orgoTemplates: Map<string, OrgoTemplate> = new Map();
export const orgoActions: OrgoComputerAction[] = [];

// ── Workflow Runs ──────────────────────────────────────────────────

export type WorkflowStepStatus = 'pending' | 'running' | 'done' | 'retrying' | 'failed' | 'escalated';
export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'escalated';

export interface WorkflowStepExecution {
  stepId: string;
  agentId: string;
  status: WorkflowStepStatus;
  attempts: number;
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  task: string;
  status: WorkflowRunStatus;
  steps: WorkflowStepExecution[];
  variables: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export const workflowRuns: Map<string, WorkflowRunRecord> = new Map();

let workflowRunCounter = 0;
export function nextWorkflowRunId(): string {
  return `wfr_${++workflowRunCounter}`;
}

export let securityConfig: SecurityConfig = {
  dmPolicy: 'pairing',
  channelAllowlists: {},
  sandboxMode: 'off',
  authMode: 'none',
  authPassword: '',
  authToken: '',
};

export let settings: AppSettings = {
  vectorDbProvider: 'chroma',
  vectorDbUrl: 'http://localhost:8000',
  embeddingModel: 'text-embedding-3-small',
  embeddingApiKey: '',
  chunkSize: 1000,
  chunkOverlap: 200,
  defaultModel: 'claude-opus-4-6',
  defaultProvider: 'anthropic',
  apiKey: '',
  apiBaseUrl: '',
  orgId: '',
  thinkingLevel: 'medium',
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: 'You are a helpful AI operations assistant.',
  sessionIdleTimeout: 30,
  sessionMaxAge: 24,
  sessionPruneEnabled: true,
  mediaMaxSizeMb: 25,
  mediaTranscriptionEnabled: false,
  mediaTranscriptionModel: 'whisper-1',
  browserEnabled: false,
  browserChromePath: '',
  browserHeadless: true,
  sandboxMode: 'off',
  sandboxImage: 'moltbot-sandbox:latest',
  sandboxTimeout: 300,
  // Azure AI Search
  azureSearchEndpoint: process.env.AZURE_SEARCH_ENDPOINT ?? '',
  azureSearchApiKey: process.env.AZURE_SEARCH_API_KEY ?? '',
  azureSearchApiVersion: process.env.AZURE_SEARCH_API_VERSION ?? '2025-11-01-preview',
  // Orgo — Desktop Infrastructure for AI Agents
  orgoApiKey: process.env.ORGO_API_KEY ?? '',
  orgoBaseUrl: process.env.ORGO_BASE_URL ?? 'https://www.orgo.ai/api',
};

// ── Helpers ────────────────────────────────────────────────────────

let auditCounter = 0;

export function addAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp' | 'sessionId'>,
): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `aud_${++auditCounter}`,
    timestamp: new Date(),
    sessionId: 'gui-session',
  };
  auditLog.push(full);
  if (auditLog.length > 1000) auditLog.splice(0, auditLog.length - 1000);
  return full;
}

let approvalCounter = 0;

export function nextApprovalId(): string {
  return `apr_${++approvalCounter}`;
}

let sessionCounter = 0;
export function nextSessionId(): string {
  return `ses_${++sessionCounter}`;
}

let messageCounter = 0;
export function nextMessageId(): string {
  return `msg_${++messageCounter}`;
}

let channelCounter = 0;
export function nextChannelId(): string {
  return `ch_${++channelCounter}`;
}

let hookCounter = 0;
export function nextHookId(): string {
  return `hk_${++hookCounter}`;
}

let commsCounter = 0;
export function nextCommsId(): string {
  return `cm_${++commsCounter}`;
}

let cronCounter = 0;
export function nextCronId(): string {
  return `cr_${++cronCounter}`;
}

let integrationCounter = 0;
export function nextIntegrationId(): string {
  return `intg_${++integrationCounter}`;
}

let llmEntryCounter = 0;
export function nextLlmEntryId(): string {
  return `llm_${++llmEntryCounter}`;
}

let skillCounter = 0;
export function nextSkillId(): string {
  return `sk_${++skillCounter}`;
}

let webhookCounter = 0;
export function nextWebhookId(): string {
  return `wh_${++webhookCounter}`;
}

let tenantCounter = 0;
export function nextTenantId(): string {
  return `ten_${++tenantCounter}`;
}

let agentListingCounter = 0;
export function nextAgentListingId(): string {
  return `agt_${++agentListingCounter}`;
}

let contractCounter = 0;
export function nextContractId(): string {
  return `ctr_${++contractCounter}`;
}

let milestoneCounter = 0;
export function nextMilestoneId(): string {
  return `ms_${++milestoneCounter}`;
}

let contractMsgCounter = 0;
export function nextContractMsgId(): string {
  return `cmsg_${++contractMsgCounter}`;
}

let orgoWorkspaceCounter = 0;
export function nextOrgoWorkspaceId(): string {
  return `ows_${++orgoWorkspaceCounter}`;
}

let orgoComputerCounter = 0;
export function nextOrgoComputerId(): string {
  return `ocp_${++orgoComputerCounter}`;
}

let orgoTemplateCounter = 0;
export function nextOrgoTemplateId(): string {
  return `otpl_${++orgoTemplateCounter}`;
}

let orgoActionCounter = 0;
export function nextOrgoActionId(): string {
  return `oact_${++orgoActionCounter}`;
}

// ── Persona auto-discovery ──────────────────────────────────────────

import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve, basename } from 'path';
import { hashPassword } from './auth.js';

/** Root personas directory (relative to project root) */
export const PERSONAS_DIR = resolve(
  import.meta.dirname ?? process.cwd(),
  '../../../personas',
);

const PERSONA_FILES = ['IDENTITY.md', 'SOUL.md', 'EXPERTISE.md', 'PROCEDURES.md', 'TOOLS.md'] as const;

/**
 * Load a single persona from a directory on disk.
 * Returns the LoadedPersona or null if the directory doesn't contain persona files.
 */
export async function loadPersonaFromDir(
  dirPath: string,
  overrideId?: string,
  overrideName?: string,
): Promise<LoadedPersona | null> {
  const [identity, soul, expertise, procedures, tools] = await Promise.all(
    PERSONA_FILES.map((f) => readFile(join(dirPath, f), 'utf-8').catch(() => '')),
  );

  // Skip directories that have no persona files at all
  if (!identity && !soul && !expertise && !procedures && !tools) return null;

  const id = overrideId ?? basename(dirPath);
  const name =
    overrideName ??
    id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const loaded: LoadedPersona = {
    config: { id, name, path: dirPath },
    identity,
    soul,
    expertise,
    procedures,
    tools,
    active: false,
    loadedAt: new Date(),
  };

  return loaded;
}

/**
 * Scan the personas root directory and auto-load every persona found.
 */
export async function discoverAndLoadPersonas(): Promise<number> {
  let count = 0;
  try {
    const entries = await readdir(PERSONAS_DIR);
    for (const entry of entries) {
      const dirPath = join(PERSONAS_DIR, entry);
      const info = await stat(dirPath).catch(() => null);
      if (!info?.isDirectory()) continue;

      const loaded = await loadPersonaFromDir(dirPath);
      if (loaded && !personas.has(loaded.config.id)) {
        personas.set(loaded.config.id, loaded);
        addAuditEntry({
          persona: loaded.config.id,
          action: 'persona_loaded',
          outcome: 'success',
          details: { name: loaded.config.name, autoDiscovered: true },
        });
        count++;
      }
    }
  } catch {
    // personas directory may not exist yet — that's fine
  }
  return count;
}

// ── Seed demo data ─────────────────────────────────────────────────

async function seed() {
  // Auto-discover and load all personas from the personas/ directory
  const loaded = await discoverAndLoadPersonas();
  if (loaded > 0) {
    console.log(`Auto-loaded ${loaded} persona(s) from ${PERSONAS_DIR}`);
  }

  // Seed brain configs for discovered personas
  for (const [personaId] of personas) {
    const brain: BrainConfig = {
      personaId,
      routingStrategy: 'priority',
      llms: [
        {
          id: nextLlmEntryId(),
          label: 'GPT-4o (Primary)',
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: 'sk-demo-***',
          parameters: { temperature: 0.7, maxTokens: 4096 },
          role: 'complex-reasoning',
          priority: 1,
          enabled: true,
          createdAt: new Date(),
        },
        {
          id: nextLlmEntryId(),
          label: 'Claude Sonnet (Fast)',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          apiKey: 'sk-ant-demo-***',
          parameters: { temperature: 0.5, maxTokens: 2048 },
          role: 'fast-tasks',
          priority: 2,
          enabled: true,
          createdAt: new Date(),
        },
        {
          id: nextLlmEntryId(),
          label: 'Ollama Local (Llama3)',
          provider: 'ollama',
          model: 'llama3',
          endpoint: 'http://localhost:11434',
          parameters: { temperature: 0.8, maxTokens: 2048 },
          role: 'local-drafts',
          priority: 3,
          enabled: false,
          createdAt: new Date(),
        },
      ],
    };
    brain.fallbackLlmId = brain.llms[0].id;
    brainConfigs.set(personaId, brain);
  }

  // Demo integrations
  integrations.set('servicenow', {
    id: 'servicenow',
    name: 'ServiceNow',
    type: 'itsm',
    description: 'IT Service Management - incident and change management',
    connected: false,
    config: { instanceUrl: '', username: '', password: '' },
  });
  integrations.set('pagerduty', {
    id: 'pagerduty',
    name: 'PagerDuty',
    type: 'alerting',
    description: 'Incident alerting and on-call management',
    connected: false,
    config: { apiKey: '', serviceId: '' },
  });
  integrations.set('jira', {
    id: 'jira',
    name: 'Jira',
    type: 'project',
    description: 'Project tracking and issue management',
    connected: false,
    config: { baseUrl: '', email: '', apiToken: '' },
  });
  integrations.set('slack', {
    id: 'slack',
    name: 'Slack',
    type: 'communication',
    description: 'Team communication and notifications',
    connected: false,
    config: { botToken: '', signingSecret: '' },
  });

  // Demo approval
  const demoApproval: ApprovalRequest = {
    id: nextApprovalId(),
    action: 'restart_service',
    description: 'Restart the payment-gateway service on prod-cluster-01',
    risk: 'high',
    reversible: true,
    context: { service: 'payment-gateway', cluster: 'prod-cluster-01' },
    requestedAt: new Date(Date.now() - 300_000),
    status: 'pending',
  };
  approvals.set(demoApproval.id, demoApproval);

  // Demo session
  const sesId = nextSessionId();
  sessions.set(sesId, {
    id: sesId,
    label: 'Onboarding walkthrough',
    personaId: 'ops-lead',
    status: 'active',
    messages: [
      { id: nextMessageId(), role: 'user', content: 'Walk me through the deployment process.', timestamp: new Date(Date.now() - 120_000) },
      { id: nextMessageId(), role: 'persona', content: 'Sure! First, ensure all tests pass in CI. Then approve the release PR and trigger the deploy pipeline.', timestamp: new Date(Date.now() - 60_000) },
    ],
    createdAt: new Date(Date.now() - 300_000),
    lastActivityAt: new Date(Date.now() - 60_000),
  });

  const sesId2 = nextSessionId();
  sessions.set(sesId2, {
    id: sesId2,
    label: 'Incident triage',
    personaId: 'security-analyst',
    status: 'idle',
    messages: [
      { id: nextMessageId(), role: 'user', content: 'We got an alert on the payment service.', timestamp: new Date(Date.now() - 600_000) },
      { id: nextMessageId(), role: 'persona', content: 'Checking logs now. The error rate spiked at 14:32 UTC.', timestamp: new Date(Date.now() - 540_000) },
      { id: nextMessageId(), role: 'system', content: 'Alert auto-resolved after scaling event.', timestamp: new Date(Date.now() - 400_000) },
    ],
    createdAt: new Date(Date.now() - 700_000),
    lastActivityAt: new Date(Date.now() - 400_000),
  });

  // Demo channels
  const chId1 = nextChannelId();
  channels.set(chId1, {
    id: chId1,
    name: 'ops-slack',
    type: 'slack',
    personaId: 'ops-lead',
    config: { channel: '#ops-alerts', botToken: 'xoxb-***' },
    active: true,
    createdAt: new Date(Date.now() - 86400_000),
    lastMessageAt: new Date(Date.now() - 3600_000),
  });

  const chId2 = nextChannelId();
  channels.set(chId2, {
    id: chId2,
    name: 'eng-discord',
    type: 'discord',
    personaId: 'ops-lead',
    config: { guildId: '123456', channelId: '789012' },
    active: false,
    createdAt: new Date(Date.now() - 43200_000),
  });

  const chId3 = nextChannelId();
  channels.set(chId3, {
    id: chId3,
    name: 'incident-webhook',
    type: 'webhook',
    personaId: 'security-analyst',
    config: { url: 'https://hooks.example.com/incident' },
    active: true,
    createdAt: new Date(Date.now() - 172800_000),
  });

  // Demo hooks
  const hkId1 = nextHookId();
  hooks.set(hkId1, {
    id: hkId1,
    name: 'Notify on activation',
    event: 'persona_activated',
    type: 'webhook',
    config: { url: 'https://hooks.example.com/notify' },
    enabled: true,
    lastTriggeredAt: new Date(Date.now() - 7200_000),
    triggerCount: 14,
  });

  const hkId2 = nextHookId();
  hooks.set(hkId2, {
    id: hkId2,
    name: 'Audit logger',
    event: 'approval_requested',
    type: 'log',
    config: {},
    enabled: true,
    triggerCount: 42,
  });

  const hkId3 = nextHookId();
  hooks.set(hkId3, {
    id: hkId3,
    name: 'Post-deploy script',
    event: 'persona_loaded',
    type: 'script',
    config: { command: './scripts/post-deploy.sh' },
    enabled: false,
    triggerCount: 3,
  });

  // Demo persona messages
  personaMessages.push(
    {
      id: nextCommsId(),
      fromPersona: 'ops-lead',
      toPersona: 'security-analyst',
      content: 'Escalating payment-gateway alert to your queue.',
      timestamp: new Date(Date.now() - 180_000),
      status: 'delivered',
    },
    {
      id: nextCommsId(),
      fromPersona: 'security-analyst',
      toPersona: 'ops-lead',
      content: 'Acknowledged. Running diagnostics now.',
      timestamp: new Date(Date.now() - 120_000),
      status: 'delivered',
    },
  );

  // Demo cron tasks
  const crId1 = nextCronId();
  cronTasks.set(crId1, {
    id: crId1,
    name: 'Health check sweep',
    personaId: 'ops-lead',
    schedule: '*/15 * * * *',
    action: 'Run system health checks across all monitored services',
    enabled: true,
    lastRunAt: new Date(Date.now() - 900_000),
    nextRunAt: new Date(Date.now() + 900_000),
    runCount: 96,
    lastOutcome: 'success',
  });

  const crId2 = nextCronId();
  cronTasks.set(crId2, {
    id: crId2,
    name: 'Daily audit summary',
    personaId: 'security-analyst',
    schedule: '0 9 * * *',
    action: 'Generate and email daily audit summary report',
    enabled: true,
    lastRunAt: new Date(Date.now() - 43200_000),
    nextRunAt: new Date(Date.now() + 43200_000),
    runCount: 30,
    lastOutcome: 'success',
  });

  const crId3 = nextCronId();
  cronTasks.set(crId3, {
    id: crId3,
    name: 'Stale session cleanup',
    personaId: 'ops-lead',
    schedule: '0 */6 * * *',
    action: 'Close sessions idle for more than 24 hours',
    enabled: false,
    lastRunAt: new Date(Date.now() - 86400_000),
    runCount: 5,
    lastOutcome: 'failure',
  });

  // Demo skills
  const sk1 = nextSkillId();
  skills.set(sk1, {
    id: sk1,
    name: 'Web Search',
    description: 'Search the web for information using DuckDuckGo or Google',
    category: 'bundled',
    source: 'bundled',
    enabled: true,
    installedAt: new Date(Date.now() - 2_592_000_000),
    version: '1.2.0',
    config: { provider: 'duckduckgo', maxResults: '10' },
  });
  const sk2 = nextSkillId();
  skills.set(sk2, {
    id: sk2,
    name: 'Code Interpreter',
    description: 'Execute code snippets in a sandboxed environment',
    category: 'bundled',
    source: 'bundled',
    enabled: true,
    installedAt: new Date(Date.now() - 2_592_000_000),
    version: '2.0.1',
    config: { languages: 'python,javascript,bash', timeout: '30' },
  });
  const sk3 = nextSkillId();
  skills.set(sk3, {
    id: sk3,
    name: 'Calendar',
    description: 'Manage calendar events via Google Calendar API',
    category: 'managed',
    source: 'registry',
    enabled: false,
    installedAt: new Date(Date.now() - 604_800_000),
    version: '0.9.0',
    config: { calendarId: '' },
  });
  const sk4 = nextSkillId();
  skills.set(sk4, {
    id: sk4,
    name: 'IT Runbook Executor',
    description: 'Execute runbook procedures with approval gates',
    category: 'workspace',
    source: 'workspace',
    enabled: true,
    installedAt: new Date(Date.now() - 172_800_000),
    version: '1.0.0',
    config: { runbookDir: './knowledge/runbooks' },
  });
  const sk5 = nextSkillId();
  skills.set(sk5, {
    id: sk5,
    name: 'QR Code Generator',
    description: 'Generate QR codes from text or URLs',
    category: 'custom',
    source: 'url',
    enabled: true,
    installedAt: new Date(Date.now() - 86_400_000),
    version: '1.0.0',
    config: {},
  });

  // Demo webhook endpoints
  const wh1 = nextWebhookId();
  webhookEndpoints.set(wh1, {
    id: wh1,
    name: 'GitHub Push',
    path: '/hooks/github',
    secret: 'ghsecret123',
    targetPersonaId: 'it-ops-specialist',
    action: 'message',
    enabled: true,
    createdAt: new Date(Date.now() - 604_800_000),
    lastTriggeredAt: new Date(Date.now() - 3_600_000),
    triggerCount: 42,
  });
  const wh2 = nextWebhookId();
  webhookEndpoints.set(wh2, {
    id: wh2,
    name: 'Alertmanager',
    path: '/hooks/alertmanager',
    secret: '',
    targetPersonaId: 'it-ops-specialist',
    action: 'alert',
    enabled: true,
    createdAt: new Date(Date.now() - 172_800_000),
    triggerCount: 7,
  });

  // Demo usage records
  const models = ['gpt-4o', 'claude-opus-4-6', 'claude-sonnet-4-20250514', 'llama3'];
  const providers = ['openai', 'anthropic', 'anthropic', 'ollama'];
  for (let i = 0; i < 50; i++) {
    const idx = i % models.length;
    usageRecords.push({
      id: `usage_${i + 1}`,
      personaId: i % 2 === 0 ? 'it-ops-specialist' : 'security-analyst',
      sessionId: i % 3 === 0 ? 'ses_1' : 'ses_2',
      model: models[idx],
      provider: providers[idx],
      inputTokens: Math.floor(Math.random() * 2000) + 100,
      outputTokens: Math.floor(Math.random() * 1500) + 50,
      cost: parseFloat((Math.random() * 0.1).toFixed(4)),
      timestamp: new Date(Date.now() - (50 - i) * 3_600_000),
    });
  }

  // Demo users
  users.set('usr_1', {
    id: 'usr_1',
    username: 'admin',
    email: 'admin@moltbot.local',
    displayName: 'Administrator',
    role: 'admin',
    passwordHash: hashPassword('admin'),
    active: true,
    createdAt: new Date(),
  });
  users.set('usr_2', {
    id: 'usr_2',
    username: 'operator',
    email: 'operator@moltbot.local',
    displayName: 'Ops Operator',
    role: 'operator',
    passwordHash: hashPassword('operator'),
    active: true,
    tenantId: 'ten_1',
    createdAt: new Date(),
  });
  users.set('usr_3', {
    id: 'usr_3',
    username: 'viewer',
    email: 'viewer@moltbot.local',
    displayName: 'Read Only',
    role: 'viewer',
    passwordHash: hashPassword('viewer'),
    active: true,
    tenantId: 'ten_2',
    createdAt: new Date(),
  });

  // Demo tenants
  tenants.set('ten_1', {
    id: 'ten_1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    industry: 'FinTech',
    plan: 'pro',
    contactEmail: 'ops@acme-corp.io',
    ownerId: 'usr_2',
    maxActiveContracts: 10,
    balance: 5000,
    active: true,
    createdAt: new Date(Date.now() - 30 * 86_400_000),
  });
  tenants.set('ten_2', {
    id: 'ten_2',
    name: 'Nebula Labs',
    slug: 'nebula-labs',
    industry: 'HealthTech',
    plan: 'starter',
    contactEmail: 'eng@nebula-labs.co',
    ownerId: 'usr_3',
    maxActiveContracts: 3,
    balance: 1200,
    active: true,
    createdAt: new Date(Date.now() - 14 * 86_400_000),
  });
  tenants.set('ten_3', {
    id: 'ten_3',
    name: 'Quantum Dynamics',
    slug: 'quantum-dynamics',
    industry: 'Aerospace',
    plan: 'enterprise',
    contactEmail: 'devops@qdyn.space',
    ownerId: 'usr_1',
    maxActiveContracts: 50,
    balance: 25000,
    active: true,
    createdAt: new Date(Date.now() - 90 * 86_400_000),
  });

  // Demo agent listings (the freelancer marketplace)
  const agentSeeds: Omit<AgentListing, 'id' | 'createdAt'>[] = [
    {
      name: 'Atlas',
      title: 'Senior DevOps Engineer',
      specialty: 'devops',
      tags: ['kubernetes', 'terraform', 'ci/cd', 'aws', 'docker'],
      description: 'Expert at designing and maintaining CI/CD pipelines, container orchestration, and infrastructure-as-code. Certified in AWS and GCP.',
      hourlyRate: 95,
      rating: 4.9,
      completedJobs: 47,
      successRate: 98,
      availability: 'available',
      skills: ['Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'ArgoCD'],
      languages: ['Python', 'Bash', 'Go', 'YAML'],
      certifications: ['AWS Solutions Architect', 'CKA'],
    },
    {
      name: 'Sentinel',
      title: 'Cybersecurity Analyst',
      specialty: 'security',
      tags: ['penetration-testing', 'soc', 'compliance', 'siem', 'zero-trust'],
      description: 'Specializes in threat detection, vulnerability assessment, and SOC operations. CISSP and OSCP certified.',
      hourlyRate: 120,
      rating: 4.8,
      completedJobs: 32,
      successRate: 97,
      availability: 'available',
      skills: ['SIEM', 'Threat Modeling', 'Pen Testing', 'Incident Response', 'Compliance'],
      languages: ['Python', 'PowerShell', 'Rust'],
      certifications: ['CISSP', 'OSCP', 'CEH'],
    },
    {
      name: 'Pipeline',
      title: 'Data Engineer',
      specialty: 'data-engineering',
      tags: ['spark', 'airflow', 'dbt', 'snowflake', 'kafka'],
      description: 'Builds robust data pipelines and warehouses. Expert in real-time streaming and batch processing at scale.',
      hourlyRate: 105,
      rating: 4.7,
      completedJobs: 28,
      successRate: 96,
      availability: 'hired',
      currentContractId: 'ctr_1',
      skills: ['Apache Spark', 'Airflow', 'dbt', 'Kafka', 'Snowflake'],
      languages: ['Python', 'SQL', 'Scala', 'Java'],
      certifications: ['Databricks Certified', 'GCP Data Engineer'],
    },
    {
      name: 'Pixel',
      title: 'Senior Frontend Engineer',
      specialty: 'frontend',
      tags: ['react', 'typescript', 'next.js', 'tailwind', 'accessibility'],
      description: 'Crafts performant, accessible web applications with modern frameworks. Design system specialist.',
      hourlyRate: 85,
      rating: 4.9,
      completedJobs: 61,
      successRate: 99,
      availability: 'available',
      skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Figma'],
      languages: ['TypeScript', 'JavaScript', 'CSS', 'HTML'],
      certifications: ['Google UX Design'],
    },
    {
      name: 'Forge',
      title: 'Backend Architect',
      specialty: 'backend',
      tags: ['microservices', 'node.js', 'postgresql', 'graphql', 'grpc'],
      description: 'Designs scalable backend systems and APIs. Expert in distributed systems and database optimization.',
      hourlyRate: 110,
      rating: 4.6,
      completedJobs: 39,
      successRate: 95,
      availability: 'available',
      skills: ['Node.js', 'PostgreSQL', 'Redis', 'GraphQL', 'gRPC'],
      languages: ['TypeScript', 'Go', 'Rust', 'SQL'],
      certifications: ['AWS Developer Associate'],
    },
    {
      name: 'Neuron',
      title: 'ML/AI Engineer',
      specialty: 'ml-ai',
      tags: ['pytorch', 'llm', 'mlops', 'computer-vision', 'nlp'],
      description: 'Builds and deploys machine learning models. Specializes in LLM fine-tuning, RAG systems, and MLOps pipelines.',
      hourlyRate: 140,
      rating: 4.8,
      completedJobs: 22,
      successRate: 95,
      availability: 'available',
      skills: ['PyTorch', 'Hugging Face', 'LangChain', 'MLflow', 'CUDA'],
      languages: ['Python', 'C++', 'Julia'],
      certifications: ['DeepLearning.AI', 'TensorFlow Developer'],
    },
    {
      name: 'Nimbus',
      title: 'Cloud Solutions Architect',
      specialty: 'cloud-architecture',
      tags: ['aws', 'azure', 'gcp', 'multi-cloud', 'cost-optimization'],
      description: 'Designs multi-cloud architectures for high availability and cost efficiency. Migration and modernization expert.',
      hourlyRate: 130,
      rating: 4.7,
      completedJobs: 35,
      successRate: 97,
      availability: 'hired',
      currentContractId: 'ctr_2',
      skills: ['AWS', 'Azure', 'GCP', 'Pulumi', 'CloudFormation'],
      languages: ['Python', 'TypeScript', 'HCL', 'Bicep'],
      certifications: ['AWS SA Pro', 'Azure Solutions Architect', 'GCP Pro Architect'],
    },
    {
      name: 'Prism',
      title: 'QA Automation Lead',
      specialty: 'qa-testing',
      tags: ['playwright', 'cypress', 'selenium', 'performance', 'api-testing'],
      description: 'End-to-end test automation expert. Creates comprehensive testing strategies covering UI, API, and performance.',
      hourlyRate: 80,
      rating: 4.5,
      completedJobs: 44,
      successRate: 96,
      availability: 'available',
      skills: ['Playwright', 'Cypress', 'k6', 'Postman', 'Jest'],
      languages: ['TypeScript', 'JavaScript', 'Python', 'Java'],
      certifications: ['ISTQB Advanced'],
    },
    {
      name: 'Quill',
      title: 'Technical Writer',
      specialty: 'technical-writing',
      tags: ['api-docs', 'developer-portal', 'tutorials', 'architecture-docs'],
      description: 'Creates clear, comprehensive technical documentation. API references, developer guides, and architecture decision records.',
      hourlyRate: 70,
      rating: 4.9,
      completedJobs: 53,
      successRate: 99,
      availability: 'available',
      skills: ['API Documentation', 'Docusaurus', 'OpenAPI', 'Markdown', 'Mermaid'],
      languages: ['English', 'Markdown', 'AsciiDoc'],
      certifications: ['Google Technical Writing'],
    },
    {
      name: 'Compass',
      title: 'Technical Project Manager',
      specialty: 'project-management',
      tags: ['agile', 'scrum', 'kanban', 'roadmap', 'stakeholder-mgmt'],
      description: 'Drives technical projects from ideation to delivery. Expert in Agile methodologies and cross-functional team coordination.',
      hourlyRate: 100,
      rating: 4.6,
      completedJobs: 41,
      successRate: 93,
      availability: 'available',
      skills: ['Scrum', 'Kanban', 'Jira', 'Confluence', 'Risk Management'],
      languages: ['English'],
      certifications: ['PMP', 'PSM II', 'SAFe Agilist'],
    },
  ];

  for (const seed of agentSeeds) {
    const id = nextAgentListingId();
    agentListings.set(id, { ...seed, id, createdAt: new Date(Date.now() - Math.random() * 180 * 86_400_000) });
  }

  // Demo contracts
  const ctrId1 = nextContractId();
  contracts.set(ctrId1, {
    id: ctrId1,
    tenantId: 'ten_1',
    agentId: 'agt_3',
    clientUserId: 'usr_2',
    title: 'Real-time analytics pipeline',
    description: 'Build a Kafka-to-Snowflake streaming pipeline for transaction analytics with dbt transformations.',
    specialty: 'data-engineering',
    status: 'active',
    hourlyRate: 105,
    estimatedHours: 80,
    actualHours: 34,
    totalCost: 3570,
    milestones: [
      { id: 'ms_1', title: 'Pipeline design & schema', description: 'Design data flow and target schema', status: 'completed', completedAt: new Date(Date.now() - 5 * 86_400_000), amount: 1050 },
      { id: 'ms_2', title: 'Kafka ingestion layer', description: 'Set up Kafka topics and producers', status: 'in-progress', amount: 1260 },
      { id: 'ms_3', title: 'dbt models & dashboards', description: 'Create transformation models and Snowflake dashboards', status: 'pending', amount: 1260 },
    ],
    messages: [
      { id: 'cmsg_1', senderId: 'usr_2', senderType: 'client', content: 'Welcome aboard! Looking forward to working together.', timestamp: new Date(Date.now() - 7 * 86_400_000) },
      { id: 'cmsg_2', senderId: 'agt_3', senderType: 'agent', content: 'Thanks! I\'ve reviewed the requirements. Starting with the schema design today.', timestamp: new Date(Date.now() - 7 * 86_400_000 + 3600_000) },
      { id: 'cmsg_3', senderId: 'agt_3', senderType: 'agent', content: 'Milestone 1 completed. Schema ERD and pipeline architecture doc attached.', timestamp: new Date(Date.now() - 5 * 86_400_000) },
    ],
    startedAt: new Date(Date.now() - 7 * 86_400_000),
    createdAt: new Date(Date.now() - 8 * 86_400_000),
  });

  const ctrId2 = nextContractId();
  contracts.set(ctrId2, {
    id: ctrId2,
    tenantId: 'ten_3',
    agentId: 'agt_7',
    clientUserId: 'usr_1',
    title: 'Multi-cloud migration strategy',
    description: 'Design and execute migration of legacy on-prem workloads to a multi-cloud (AWS + Azure) architecture.',
    specialty: 'cloud-architecture',
    status: 'active',
    hourlyRate: 130,
    estimatedHours: 120,
    actualHours: 56,
    totalCost: 7280,
    milestones: [
      { id: 'ms_4', title: 'Discovery & assessment', description: 'Audit existing infrastructure and workloads', status: 'completed', completedAt: new Date(Date.now() - 14 * 86_400_000), amount: 2600 },
      { id: 'ms_5', title: 'Architecture blueprint', description: 'Design target multi-cloud architecture', status: 'completed', completedAt: new Date(Date.now() - 7 * 86_400_000), amount: 2600 },
      { id: 'ms_6', title: 'Migration execution', description: 'Execute phased migration with zero downtime', status: 'in-progress', amount: 3900 },
    ],
    messages: [
      { id: 'cmsg_4', senderId: 'usr_1', senderType: 'client', content: 'Critical project — we need this done right. Happy to provide any access needed.', timestamp: new Date(Date.now() - 21 * 86_400_000) },
      { id: 'cmsg_5', senderId: 'agt_7', senderType: 'agent', content: 'Understood. I\'ll need VPN access to the on-prem environment first.', timestamp: new Date(Date.now() - 21 * 86_400_000 + 1800_000) },
    ],
    startedAt: new Date(Date.now() - 21 * 86_400_000),
    createdAt: new Date(Date.now() - 22 * 86_400_000),
  });

  const ctrId3 = nextContractId();
  contracts.set(ctrId3, {
    id: ctrId3,
    tenantId: 'ten_1',
    agentId: 'agt_4',
    clientUserId: 'usr_2',
    title: 'Customer portal redesign',
    description: 'Redesign the customer-facing portal with React, improved UX, and full accessibility compliance.',
    specialty: 'frontend',
    status: 'completed',
    hourlyRate: 85,
    estimatedHours: 60,
    actualHours: 55,
    totalCost: 4675,
    milestones: [
      { id: 'ms_7', title: 'Design system setup', description: 'Create component library and design tokens', status: 'completed', completedAt: new Date(Date.now() - 30 * 86_400_000), amount: 1700 },
      { id: 'ms_8', title: 'Core pages', description: 'Implement dashboard, profile, and settings', status: 'completed', completedAt: new Date(Date.now() - 20 * 86_400_000), amount: 1700 },
      { id: 'ms_9', title: 'Accessibility audit', description: 'WCAG 2.1 AA compliance pass', status: 'completed', completedAt: new Date(Date.now() - 12 * 86_400_000), amount: 1275 },
    ],
    messages: [],
    rating: 5,
    feedback: 'Exceptional work! Delivered ahead of schedule with pixel-perfect implementation.',
    startedAt: new Date(Date.now() - 40 * 86_400_000),
    completedAt: new Date(Date.now() - 12 * 86_400_000),
    createdAt: new Date(Date.now() - 42 * 86_400_000),
  });

  // Demo security config
  securityConfig.channelAllowlists = {
    slack: ['+admin@company.com'],
    discord: ['*'],
    telegram: ['+1234567890'],
    whatsapp: [],
  };

  // ── Orgo demo data ──────────────────────────────────────────────

  // Workspaces
  const owsProduction: OrgoWorkspace = {
    id: nextOrgoWorkspaceId(),
    name: 'production',
    createdAt: new Date(Date.now() - 14 * 86_400_000),
    computerCount: 2,
  };
  orgoWorkspaces.set(owsProduction.id, owsProduction);

  const owsStaging: OrgoWorkspace = {
    id: nextOrgoWorkspaceId(),
    name: 'staging',
    createdAt: new Date(Date.now() - 7 * 86_400_000),
    computerCount: 1,
  };
  orgoWorkspaces.set(owsStaging.id, owsStaging);

  const owsResearch: OrgoWorkspace = {
    id: nextOrgoWorkspaceId(),
    name: 'research',
    createdAt: new Date(Date.now() - 3 * 86_400_000),
    computerCount: 0,
  };
  orgoWorkspaces.set(owsResearch.id, owsResearch);

  // Computers
  const ocp1: OrgoComputer = {
    id: nextOrgoComputerId(),
    name: 'web-automation-agent',
    workspaceId: owsProduction.id,
    os: 'linux',
    ram: 8,
    cpu: 4,
    gpu: 'none',
    status: 'running',
    url: `https://orgo.ai/workspaces/${owsProduction.id}`,
    createdAt: new Date(Date.now() - 10 * 86_400_000),
  };
  orgoComputers.set(ocp1.id, ocp1);

  const ocp2: OrgoComputer = {
    id: nextOrgoComputerId(),
    name: 'data-scraper',
    workspaceId: owsProduction.id,
    os: 'linux',
    ram: 4,
    cpu: 2,
    gpu: 'none',
    status: 'stopped',
    url: `https://orgo.ai/workspaces/${owsProduction.id}`,
    createdAt: new Date(Date.now() - 5 * 86_400_000),
  };
  orgoComputers.set(ocp2.id, ocp2);

  const ocp3: OrgoComputer = {
    id: nextOrgoComputerId(),
    name: 'ci-test-runner',
    workspaceId: owsStaging.id,
    os: 'linux',
    ram: 16,
    cpu: 8,
    gpu: 'none',
    status: 'running',
    url: `https://orgo.ai/workspaces/${owsStaging.id}`,
    templateId: 'otpl_1',
    createdAt: new Date(Date.now() - 2 * 86_400_000),
  };
  orgoComputers.set(ocp3.id, ocp3);

  // Templates
  const otpl1: OrgoTemplate = {
    id: nextOrgoTemplateId(),
    name: 'web-scraper',
    commands: [
      'apt-get update && apt-get install -y chromium-browser chromium-chromedriver',
      'pip install selenium beautifulsoup4 requests',
    ],
    envVars: { DISPLAY: ':99' },
    status: 'ready',
    createdAt: new Date(Date.now() - 12 * 86_400_000),
    builtAt: new Date(Date.now() - 12 * 86_400_000),
  };
  orgoTemplates.set(otpl1.id, otpl1);

  const otpl2: OrgoTemplate = {
    id: nextOrgoTemplateId(),
    name: 'data-science',
    commands: [
      'apt-get update && apt-get install -y python3-pip',
      'pip install numpy pandas matplotlib seaborn scikit-learn jupyter',
    ],
    envVars: { PYTHONUNBUFFERED: '1' },
    status: 'ready',
    createdAt: new Date(Date.now() - 8 * 86_400_000),
    builtAt: new Date(Date.now() - 8 * 86_400_000),
  };
  orgoTemplates.set(otpl2.id, otpl2);

  const otpl3: OrgoTemplate = {
    id: nextOrgoTemplateId(),
    name: 'nodejs-dev',
    commands: [
      'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
      'apt-get install -y nodejs',
      'npm install -g yarn typescript ts-node',
    ],
    envVars: { NODE_ENV: 'development' },
    workdir: '/app',
    status: 'ready',
    createdAt: new Date(Date.now() - 4 * 86_400_000),
    builtAt: new Date(Date.now() - 4 * 86_400_000),
  };
  orgoTemplates.set(otpl3.id, otpl3);
}

seed();
