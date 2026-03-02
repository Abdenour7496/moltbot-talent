const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && !path.startsWith('/auth')) {
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

export const api = {
  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Personas
  getPersonas: () => request<any[]>('/personas'),
  getPersona: (id: string) => request<any>(`/personas/${id}`),
  loadPersona: (data: { id: string; name: string; path: string }) =>
    request<any>('/personas/load', { method: 'POST', body: JSON.stringify(data) }),
  createPersona: (data: {
    id: string;
    name: string;
    soul: string;
    expertise: string;
    procedures: string;
    tools: string;
  }) => request<any>('/personas/create', { method: 'POST', body: JSON.stringify(data) }),
  discoverPersonas: () =>
    request<{ discovered: number }>('/personas/discover', { method: 'POST' }),
  activatePersona: (id: string) =>
    request<any>(`/personas/${id}/activate`, { method: 'POST' }),
  updatePersona: (id: string, data: Record<string, any>) =>
    request<any>(`/personas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  chatWithPersona: (id: string, message: string) =>
    request<any>(`/personas/${id}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),
  getPersonaProgress: (id: string) =>
    request<any>(`/personas/${id}/progress`),
  // Knowledge base assignment on a persona
  getPersonaKnowledge: (personaId: string) =>
    request<{ knowledgeBase: any | null; kbType: 'local' | 'azure' | null }>(`/personas/${personaId}/knowledge`),
  assignKnowledgeBase: (personaId: string, knowledgeBaseId: string, kbType: 'local' | 'azure' = 'local') =>
    request<{ knowledgeBase: any; kbType: string }>(`/personas/${personaId}/knowledge`, {
      method: 'POST',
      body: JSON.stringify({ knowledgeBaseId, kbType }),
    }),
  detachKnowledgeBase: (personaId: string) =>
    request<{ detached: boolean }>(`/personas/${personaId}/knowledge`, { method: 'DELETE' }),

  // Knowledge
  getKnowledgeBases: () => request<any[]>('/knowledge'),
  getAzureKnowledgeBases: () => request<any[]>('/azure/knowledge-bases'),
  getAzureStatus: () => request<{ configured: boolean; endpoint: string | null; apiVersion: string }>('/azure/knowledge-bases/status'),
  createKnowledgeBase: (data: { name: string; domain: string }) =>
    request<any>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  getKBStats: (id: string) => request<any>(`/knowledge/${id}/stats`),
  ingestDocuments: (id: string, data: { sourcePath: string; category?: string }) =>
    request<any>(`/knowledge/${id}/ingest`, { method: 'POST', body: JSON.stringify(data) }),
  queryKnowledgeBase: (id: string, data: { query: string; topK?: number }) =>
    request<any>(`/knowledge/${id}/query`, { method: 'POST', body: JSON.stringify(data) }),
  deleteKnowledgeBase: (id: string) =>
    request<any>(`/knowledge/${id}`, { method: 'DELETE' }),

  // Persona integrations
  getPersonaIntegrations: (personaId: string) =>
    request<any[]>(`/personas/${personaId}/integrations`),
  addPersonaIntegration: (personaId: string, integrationId: string) =>
    request<any>(`/personas/${personaId}/integrations`, { method: 'POST', body: JSON.stringify({ integrationId }) }),
  removePersonaIntegration: (personaId: string, integrationId: string) =>
    request<{ removed: boolean }>(`/personas/${personaId}/integrations/${integrationId}`, { method: 'DELETE' }),

  // Approvals
  getApprovals: (status?: string) =>
    request<any[]>(`/approvals${status ? `?status=${status}` : ''}`),
  grantApproval: (id: string) =>
    request<any>(`/approvals/${id}/grant`, { method: 'POST', body: '{}' }),
  denyApproval: (id: string, reason?: string) =>
    request<any>(`/approvals/${id}/deny`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Audit
  getAuditLog: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/audit${qs}`);
  },

  // Integrations
  getIntegrations: () => request<any[]>('/integrations'),
  createIntegration: (data: { name: string; type: string; description?: string; config?: Record<string, string> }) =>
    request<any>('/integrations', { method: 'POST', body: JSON.stringify(data) }),
  updateIntegration: (id: string, data: any) =>
    request<any>(`/integrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIntegration: (id: string) =>
    request<any>(`/integrations/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Sessions
  getSessions: (status?: string) =>
    request<any[]>(`/sessions${status ? `?status=${status}` : ''}`),
  getSession: (id: string) => request<any>(`/sessions/${id}`),
  createSession: (data: { label: string; personaId: string; channelId?: string }) =>
    request<any>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  sendSessionMessage: (id: string, data: { role: string; content: string }) =>
    request<any>(`/sessions/${id}/message`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSession: (id: string) =>
    request<any>(`/sessions/${id}`, { method: 'DELETE' }),

  // Channels
  getChannels: () => request<any[]>('/channels'),
  createChannel: (data: { name: string; type: string; personaId: string; config?: Record<string, string> }) =>
    request<any>('/channels', { method: 'POST', body: JSON.stringify(data) }),
  updateChannel: (id: string, data: any) =>
    request<any>(`/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChannel: (id: string) =>
    request<any>(`/channels/${id}`, { method: 'DELETE' }),
  testChannel: (id: string) =>
    request<any>(`/channels/${id}/test`, { method: 'POST', body: '{}' }),

  // Hooks
  getHooks: () => request<any[]>('/hooks'),
  createHook: (data: { name: string; event: string; type: string; config?: any; enabled?: boolean }) =>
    request<any>('/hooks', { method: 'POST', body: JSON.stringify(data) }),
  updateHook: (id: string, data: any) =>
    request<any>(`/hooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHook: (id: string) =>
    request<any>(`/hooks/${id}`, { method: 'DELETE' }),
  testHook: (id: string) =>
    request<any>(`/hooks/${id}/test`, { method: 'POST', body: '{}' }),

  // Cross-persona comms
  getComms: (persona?: string) =>
    request<any[]>(`/comms${persona ? `?persona=${persona}` : ''}`),
  sendComm: (data: { fromPersona: string; toPersona: string; content: string }) =>
    request<any>('/comms/send', { method: 'POST', body: JSON.stringify(data) }),

  // Health
  getHealth: () => request<any>('/health/details'),

  // Brain
  getBrain: (personaId: string) =>
    request<any>(`/personas/${personaId}/brain`),
  updateBrain: (personaId: string, data: { routingStrategy?: string; fallbackLlmId?: string }) =>
    request<any>(`/personas/${personaId}/brain`, { method: 'PUT', body: JSON.stringify(data) }),
  getBrainLlms: (personaId: string) =>
    request<any[]>(`/personas/${personaId}/brain/llms`),
  addBrainLlm: (personaId: string, data: any) =>
    request<any>(`/personas/${personaId}/brain/llms`, { method: 'POST', body: JSON.stringify(data) }),
  updateBrainLlm: (personaId: string, llmId: string, data: any) =>
    request<any>(`/personas/${personaId}/brain/llms/${llmId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBrainLlm: (personaId: string, llmId: string) =>
    request<any>(`/personas/${personaId}/brain/llms/${llmId}`, { method: 'DELETE' }),
  testBrainLlm: (personaId: string, llmId: string) =>
    request<any>(`/personas/${personaId}/brain/llms/${llmId}/test`, { method: 'POST', body: '{}' }),
  reorderBrainLlms: (personaId: string, orderedIds: string[]) =>
    request<any[]>(`/personas/${personaId}/brain/llms/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) }),

  // Cron
  getCronTasks: () => request<any[]>('/cron'),
  createCronTask: (data: { name: string; personaId: string; schedule: string; action: string; enabled?: boolean }) =>
    request<any>('/cron', { method: 'POST', body: JSON.stringify(data) }),
  updateCronTask: (id: string, data: any) =>
    request<any>(`/cron/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCronTask: (id: string) =>
    request<any>(`/cron/${id}`, { method: 'DELETE' }),
  triggerCronTask: (id: string) =>
    request<any>(`/cron/${id}/trigger`, { method: 'POST', body: '{}' }),

  // Skills
  getSkills: () => request<any[]>('/skills'),
  getSkill: (id: string) => request<any>(`/skills/${id}`),
  createSkill: (data: { name: string; description?: string; category?: string; source?: string; enabled?: boolean }) =>
    request<any>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  updateSkill: (id: string, data: any) =>
    request<any>(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: string) =>
    request<any>(`/skills/${id}`, { method: 'DELETE' }),

  // Security
  getSecurityConfig: () => request<any>('/security'),
  updateSecurityConfig: (data: any) =>
    request<any>('/security', { method: 'PUT', body: JSON.stringify(data) }),
  getPairingCodes: () => request<any[]>('/security/pairing'),
  generatePairingCode: (data: { channel: string; description?: string }) =>
    request<any>('/security/pairing', { method: 'POST', body: JSON.stringify(data) }),
  approvePairing: (id: string) =>
    request<any>(`/security/pairing/${id}/approve`, { method: 'POST', body: '{}' }),
  denyPairing: (id: string) =>
    request<any>(`/security/pairing/${id}/deny`, { method: 'POST', body: '{}' }),
  getAllowlists: () => request<any>('/security/allowlists'),
  updateAllowlist: (channel: string, allowFrom: string[]) =>
    request<any>(`/security/allowlists/${channel}`, { method: 'PUT', body: JSON.stringify({ allowFrom }) }),

  // Usage tracking
  getUsage: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/usage${qs}`);
  },

  // Webhooks (inbound surface)
  getWebhooks: () => request<any[]>('/webhooks'),
  createWebhook: (data: { name: string; path: string; secret?: string; targetPersonaId?: string; action?: string }) =>
    request<any>('/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  updateWebhook: (id: string, data: any) =>
    request<any>(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWebhook: (id: string) =>
    request<any>(`/webhooks/${id}`, { method: 'DELETE' }),
  triggerWebhook: (id: string) =>
    request<any>(`/webhooks/${id}/trigger`, { method: 'POST', body: '{}' }),

  // Gateway
  getGatewayStatus: () => request<any>('/gateway'),

  // Auth
  login: (data: { username: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: { username: string; email: string; displayName: string; password: string }) =>
    request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (data: any) =>
    request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<any>('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),

  // Users (admin)
  getUsers: () => request<any[]>('/users'),
  getUser: (id: string) => request<any>(`/users/${id}`),
  createUser: (data: { username: string; email: string; displayName?: string; password: string; role?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<any>(`/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: (id: string, newPassword: string) =>
    request<any>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),

  // Agents (internal roster)
  getAgents: (qs?: string) => request<any[]>(`/agents${qs || ''}`),
  assignAgentToDept: (personaId: string, departmentId: string) =>
    request<any>(`/agents/${personaId}/assign`, { method: 'POST', body: JSON.stringify({ departmentId }) }),
  unassignAgentFromDept: (personaId: string, departmentId: string) =>
    request<any>(`/agents/${personaId}/assign/${departmentId}`, { method: 'DELETE' }),

  // Marketplace
  getMarketplace: (qs?: string) => request<any[]>(`/marketplace${qs || ''}`),
  getMarketplaceStats: () => request<any>('/marketplace/stats'),
  getMarketplaceSpecialties: () => request<any[]>('/marketplace/specialties'),
  getAgent: (id: string) => request<any>(`/marketplace/${id}`),
  hireAgent: (id: string, data: { tenantId: string; title: string; description?: string; estimatedHours?: number }) =>
    request<any>(`/marketplace/${id}/hire`, { method: 'POST', body: JSON.stringify(data) }),
  createAgentListing: (data: any) =>
    request<any>('/marketplace', { method: 'POST', body: JSON.stringify(data) }),
  createAgentFromPersona: (data: { personaId: string; title?: string; specialty?: string; hourlyRate?: number; description?: string }) =>
    request<any>('/marketplace/from-persona', { method: 'POST', body: JSON.stringify(data) }),
  updateAgentListing: (id: string, data: any) =>
    request<any>(`/marketplace/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgentListing: (id: string) =>
    request<any>(`/marketplace/${id}`, { method: 'DELETE' }),
  chatWithAgent: (id: string, message: string) =>
    request<any>(`/marketplace/${id}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),

  // Agent config (soul/expertise/procedures/tools + profile fields)
  updateAgentConfig: (id: string, data: Record<string, any>) =>
    request<any>(`/marketplace/${id}/config`, { method: 'PUT', body: JSON.stringify(data) }),

  // Agent integrations
  getAgentIntegrations: (id: string) =>
    request<any[]>(`/marketplace/${id}/integrations`),
  addAgentIntegration: (id: string, integrationId: string) =>
    request<any>(`/marketplace/${id}/integrations`, { method: 'POST', body: JSON.stringify({ integrationId }) }),
  removeAgentIntegration: (id: string, integrationId: string) =>
    request<{ removed: boolean }>(`/marketplace/${id}/integrations/${integrationId}`, { method: 'DELETE' }),

  // Agent knowledge base
  getAgentKnowledge: (id: string) =>
    request<{ knowledgeBase: any; kbType: 'local' | 'azure' | null }>(`/marketplace/${id}/knowledge`),
  assignAgentKnowledge: (id: string, kbId: string, kbType: 'local' | 'azure' = 'local') =>
    request<{ knowledgeBase: any; kbType: string }>(`/marketplace/${id}/knowledge`, { method: 'POST', body: JSON.stringify({ kbId, kbType }) }),
  detachAgentKnowledge: (id: string) =>
    request<{ detached: boolean }>(`/marketplace/${id}/knowledge`, { method: 'DELETE' }),

  // Agent brain
  getAgentBrain: (id: string) => request<any>(`/agents/${id}/brain`),
  updateAgentBrain: (id: string, data: { routingStrategy?: string; fallbackLlmId?: string }) =>
    request<any>(`/agents/${id}/brain`, { method: 'PUT', body: JSON.stringify(data) }),
  getAgentBrainLlms: (id: string) => request<any[]>(`/agents/${id}/brain/llms`),
  addAgentBrainLlm: (id: string, data: any) =>
    request<any>(`/agents/${id}/brain/llms`, { method: 'POST', body: JSON.stringify(data) }),
  updateAgentBrainLlm: (id: string, llmId: string, data: any) =>
    request<any>(`/agents/${id}/brain/llms/${llmId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgentBrainLlm: (id: string, llmId: string) =>
    request<any>(`/agents/${id}/brain/llms/${llmId}`, { method: 'DELETE' }),
  testAgentBrainLlm: (id: string, llmId: string) =>
    request<any>(`/agents/${id}/brain/llms/${llmId}/test`, { method: 'POST', body: '{}' }),
  reorderAgentBrainLlms: (id: string, orderedIds: string[]) =>
    request<any[]>(`/agents/${id}/brain/llms/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) }),

  // Contracts
  getContracts: (qs?: string) => request<any[]>(`/contracts${qs || ''}`),
  getContract: (id: string) => request<any>(`/contracts/${id}`),
  updateContract: (id: string, data: any) =>
    request<any>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  completeContract: (id: string, data: { rating?: number; feedback?: string }) =>
    request<any>(`/contracts/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  cancelContract: (id: string) =>
    request<any>(`/contracts/${id}/cancel`, { method: 'POST', body: '{}' }),
  pauseContract: (id: string) =>
    request<any>(`/contracts/${id}/pause`, { method: 'POST', body: '{}' }),
  resumeContract: (id: string) =>
    request<any>(`/contracts/${id}/resume`, { method: 'POST', body: '{}' }),
  logContractHours: (id: string, data: { hours: number }) =>
    request<any>(`/contracts/${id}/hours`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMilestone: (contractId: string, msId: string, data: any) =>
    request<any>(`/contracts/${contractId}/milestones/${msId}`, { method: 'PUT', body: JSON.stringify(data) }),
  addMilestone: (contractId: string, data: any) =>
    request<any>(`/contracts/${contractId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  sendContractMessage: (id: string, data: { content: string }) =>
    request<any>(`/contracts/${id}/message`, { method: 'POST', body: JSON.stringify(data) }),

  // Tenants / Organizations
  getTenants: () => request<any[]>('/tenants'),
  getTenant: (id: string) => request<any>(`/tenants/${id}`),
  createTenant: (data: { name: string; industry?: string; plan?: string; contactEmail?: string }) =>
    request<any>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (id: string, data: any) =>
    request<any>(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTenant: (id: string) =>
    request<any>(`/tenants/${id}`, { method: 'DELETE' }),
  addTenantMember: (tenantId: string, data: { userId: string }) =>
    request<any>(`/tenants/${tenantId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeTenantMember: (tenantId: string, userId: string) =>
    request<any>(`/tenants/${tenantId}/members/${userId}`, { method: 'DELETE' }),

  // ── Organization Portal (org-scoped) ──────────────────────────

  getOrgPortal: () => request<any>('/org/portal'),
  getOrgAgents: () => request<any[]>('/org/agents'),
  getOrgAvailableAgents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/org/available-agents${qs}`);
  },
  orgHireAgent: (agentId: string, data: { title: string; description?: string; durationWeeks?: number; estimatedHours?: number }) =>
    request<any>(`/org/hire/${agentId}`, { method: 'POST', body: JSON.stringify(data) }),
  getOrgPersonas: () => request<any[]>('/org/personas'),
  getOrgContracts: (qs?: string) => request<any[]>(`/org/contracts${qs || ''}`),
  updateOrgProfile: (data: { name?: string; industry?: string; contactEmail?: string }) =>
    request<any>('/org/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // ── Orgo — Desktop Infrastructure for AI Agents ───────────────

  // Overview
  getOrgoStatus: () => request<any>('/orgo'),

  // Workspaces
  getOrgoWorkspaces: () => request<any[]>('/orgo/workspaces'),
  getOrgoWorkspace: (id: string) => request<any>(`/orgo/workspaces/${id}`),
  createOrgoWorkspace: (data: { name: string }) =>
    request<any>('/orgo/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  deleteOrgoWorkspace: (id: string) =>
    request<any>(`/orgo/workspaces/${id}`, { method: 'DELETE' }),

  // Computers
  getOrgoComputers: (workspaceId?: string) =>
    request<any[]>(`/orgo/computers${workspaceId ? `?workspaceId=${workspaceId}` : ''}`),
  getOrgoComputer: (id: string) => request<any>(`/orgo/computers/${id}`),
  createOrgoComputer: (data: { workspaceId: string; name: string; ram?: number; cpu?: number; gpu?: string; templateId?: string }) =>
    request<any>('/orgo/computers', { method: 'POST', body: JSON.stringify(data) }),
  deleteOrgoComputer: (id: string) =>
    request<any>(`/orgo/computers/${id}`, { method: 'DELETE' }),
  restartOrgoComputer: (id: string) =>
    request<any>(`/orgo/computers/${id}/restart`, { method: 'POST', body: '{}' }),
  stopOrgoComputer: (id: string) =>
    request<any>(`/orgo/computers/${id}/stop`, { method: 'POST', body: '{}' }),
  startOrgoComputer: (id: string) =>
    request<any>(`/orgo/computers/${id}/start`, { method: 'POST', body: '{}' }),

  // Computer Actions
  orgoScreenshot: (id: string) => request<any>(`/orgo/computers/${id}/screenshot`),
  orgoClick: (id: string, data: { x: number; y: number; button?: string; double?: boolean }) =>
    request<any>(`/orgo/computers/${id}/click`, { method: 'POST', body: JSON.stringify(data) }),
  orgoDrag: (id: string, data: { start_x: number; start_y: number; end_x: number; end_y: number; button?: string; duration?: number }) =>
    request<any>(`/orgo/computers/${id}/drag`, { method: 'POST', body: JSON.stringify(data) }),
  orgoType: (id: string, data: { text: string }) =>
    request<any>(`/orgo/computers/${id}/type`, { method: 'POST', body: JSON.stringify(data) }),
  orgoKey: (id: string, data: { key: string }) =>
    request<any>(`/orgo/computers/${id}/key`, { method: 'POST', body: JSON.stringify(data) }),
  orgoScroll: (id: string, data: { direction: string; amount?: number }) =>
    request<any>(`/orgo/computers/${id}/scroll`, { method: 'POST', body: JSON.stringify(data) }),
  orgoWait: (id: string, data: { duration: number }) =>
    request<any>(`/orgo/computers/${id}/wait`, { method: 'POST', body: JSON.stringify(data) }),
  orgoBash: (id: string, data: { command: string }) =>
    request<any>(`/orgo/computers/${id}/bash`, { method: 'POST', body: JSON.stringify(data) }),
  orgoExec: (id: string, data: { code: string; timeout?: number }) =>
    request<any>(`/orgo/computers/${id}/exec`, { method: 'POST', body: JSON.stringify(data) }),
  orgoPrompt: (id: string, data: { instruction: string; model?: string; provider?: string; maxIterations?: number }) =>
    request<any>(`/orgo/computers/${id}/prompt`, { method: 'POST', body: JSON.stringify(data) }),
  getOrgoActions: (id: string) => request<any[]>(`/orgo/computers/${id}/actions`),

  // Templates
  getOrgoTemplates: () => request<any[]>('/orgo/templates'),
  getOrgoTemplate: (id: string) => request<any>(`/orgo/templates/${id}`),
  createOrgoTemplate: (data: { name: string; workspaceId?: string; commands?: string[]; envVars?: Record<string, string>; workdir?: string; cloneUrl?: string }) =>
    request<any>('/orgo/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateOrgoTemplate: (id: string, data: any) =>
    request<any>(`/orgo/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  buildOrgoTemplate: (id: string) =>
    request<any>(`/orgo/templates/${id}/build`, { method: 'POST', body: '{}' }),
  deleteOrgoTemplate: (id: string) =>
    request<any>(`/orgo/templates/${id}`, { method: 'DELETE' }),

  // ── Workflow Runs ─────────────────────────────────────────────

  getWorkflowRuns: (status?: string) =>
    request<any[]>(`/workflow-runs${status ? `?status=${status}` : ''}`),
  getWorkflowRun: (id: string) => request<any>(`/workflow-runs/${id}`),
  createWorkflowRun: (data: { workflowId: string; workflowName?: string; task: string; steps?: { stepId: string; agentId: string }[] }) =>
    request<any>('/workflow-runs', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkflowStep: (runId: string, stepId: string, data: { status?: string; output?: string; error?: string }) =>
    request<any>(`/workflow-runs/${runId}/steps/${stepId}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelWorkflowRun: (id: string) =>
    request<any>(`/workflow-runs/${id}/cancel`, { method: 'POST', body: '{}' }),
  deleteWorkflowRun: (id: string) =>
    request<any>(`/workflow-runs/${id}`, { method: 'DELETE' }),
};
