import { Router } from 'express';
import {
  agentListings,
  contracts,
  integrations,
  knowledgeBases,
  personas,
  users,
  nextAgentListingId,
  nextContractId,
  nextMilestoneId,
  addAuditEntry,
  type AgentListing,
  type AgentSpecialty,
  type Contract,
  type LoadedPersona,
} from '../state.js';

const router = Router();

// ── GET /api/marketplace ────────────────────────────────────────────
// Public-ish listing of available agents (filtered)

router.get('/', (req, res) => {
  const { specialty, availability, minRate, maxRate, search } = req.query;

  let agents = [...agentListings.values()];

  if (specialty) agents = agents.filter((a) => a.specialty === specialty);
  if (availability) agents = agents.filter((a) => a.availability === availability);
  if (minRate) agents = agents.filter((a) => a.hourlyRate >= Number(minRate));
  if (maxRate) agents = agents.filter((a) => a.hourlyRate <= Number(maxRate));
  if (search) {
    const q = String(search).toLowerCase();
    agents = agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q)),
    );
  }

  // Sort: available first, then by rating
  agents.sort((a, b) => {
    const avail = (x: AgentListing) => (x.availability === 'available' ? 0 : 1);
    return avail(a) - avail(b) || b.rating - a.rating;
  });

  res.json(agents);
});

// ── GET /api/marketplace/specialties ────────────────────────────────

router.get('/specialties', (_req, res) => {
  const counts: Record<string, { total: number; available: number }> = {};
  for (const a of agentListings.values()) {
    if (!counts[a.specialty]) counts[a.specialty] = { total: 0, available: 0 };
    counts[a.specialty].total++;
    if (a.availability === 'available') counts[a.specialty].available++;
  }
  res.json(counts);
});

// ── GET /api/marketplace/stats ──────────────────────────────────────

router.get('/stats', (req, res) => {
  const caller = users.get((req as any).userId);
  const orgTenantId = caller?.tenantId;
  const all = [...agentListings.values()];
  let scopedContracts = [...contracts.values()];

  // Org users only see stats for their own org
  if (orgTenantId) {
    scopedContracts = scopedContracts.filter((c) => c.tenantId === orgTenantId);
  }

  res.json({
    totalAgents: all.length,
    availableAgents: all.filter((a) => a.availability === 'available').length,
    hiredAgents: orgTenantId
      ? scopedContracts.filter((c) => c.status === 'active').length
      : all.filter((a) => a.availability === 'hired').length,
    avgRating: +(all.reduce((s, a) => s + a.rating, 0) / (all.length || 1)).toFixed(1),
    totalContracts: scopedContracts.length,
    activeContracts: scopedContracts.filter((c) => c.status === 'active').length,
    completedContracts: scopedContracts.filter((c) => c.status === 'completed').length,
    totalRevenue: scopedContracts.reduce((s, c) => s + c.totalCost, 0),
  });
});

// ── POST /api/marketplace/from-persona ──────────────────────────────
// Create an agent listing from an existing persona

const specialtyKeywords: Record<AgentSpecialty, string[]> = {
  devops: ['devops', 'ci/cd', 'infrastructure', 'deployment', 'kubernetes', 'docker', 'terraform', 'ansible'],
  security: ['security', 'vulnerability', 'penetration', 'firewall', 'compliance', 'soc', 'siem'],
  'data-engineering': ['data', 'pipeline', 'etl', 'warehouse', 'spark', 'kafka', 'airflow', 'sql'],
  frontend: ['frontend', 'react', 'vue', 'angular', 'css', 'ui', 'ux', 'web'],
  backend: ['backend', 'api', 'server', 'node', 'python', 'java', 'go', 'rest', 'graphql'],
  'ml-ai': ['machine learning', 'ml', 'ai', 'deep learning', 'neural', 'nlp', 'model', 'training'],
  'cloud-architecture': ['cloud', 'aws', 'azure', 'gcp', 'architecture', 'scalab', 'microservice'],
  'qa-testing': ['testing', 'qa', 'quality', 'automation', 'selenium', 'jest', 'cypress'],
  'technical-writing': ['writing', 'documentation', 'docs', 'technical writer', 'content'],
  'project-management': ['project', 'management', 'agile', 'scrum', 'jira', 'planning', 'stakeholder'],
};

function inferSpecialty(text: string): AgentSpecialty {
  const lower = text.toLowerCase();
  let best: AgentSpecialty = 'backend';
  let bestScore = 0;
  for (const [spec, keywords] of Object.entries(specialtyKeywords)) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = spec as AgentSpecialty;
    }
  }
  return best;
}

function extractTags(text: string): string[] {
  const allKeywords = Object.values(specialtyKeywords).flat();
  const lower = text.toLowerCase();
  return allKeywords.filter((k) => lower.includes(k)).slice(0, 8);
}

router.post('/from-persona', (req, res) => {
  const { personaId, title, specialty, hourlyRate, description } = req.body;
  if (!personaId) {
    res.status(400).json({ error: 'personaId is required' });
    return;
  }

  const persona = personas.get(personaId);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  // Check if persona is already listed
  const existing = [...agentListings.values()].find((a) => a.personaId === personaId);
  if (existing) {
    res.status(409).json({ error: `Persona "${persona.config.name}" is already listed as agent "${existing.name}" (${existing.id})` });
    return;
  }

  // Build full text corpus for inference
  const corpus = [persona.soul, persona.expertise, persona.procedures, persona.tools].join(' ');
  const inferredSpecialty = specialty ?? inferSpecialty(corpus);
  const tags = extractTags(corpus);
  const skills = (persona.config.skills ?? []).slice();
  if (skills.length === 0) {
    // Extract some from expertise
    const expertiseLines = persona.expertise.split('\n').filter((l) => l.trim().startsWith('-') || l.trim().startsWith('*'));
    for (const line of expertiseLines.slice(0, 6)) {
      const clean = line.replace(/^[\s\-\*]+/, '').trim();
      if (clean.length > 2 && clean.length < 50) skills.push(clean);
    }
  }

  const id = nextAgentListingId();
  const agent: AgentListing = {
    id,
    name: persona.config.name,
    title: title ?? `${persona.config.name} Specialist`,
    specialty: inferredSpecialty,
    tags,
    description: description ?? persona.soul.slice(0, 300).replace(/\n/g, ' ').trim(),
    hourlyRate: hourlyRate ?? 100,
    rating: 5.0,
    completedJobs: 0,
    successRate: 100,
    availability: 'available',
    personaId: persona.config.id,
    skills,
    languages: ['English'],
    certifications: [],
    createdAt: new Date(),
  };

  agentListings.set(id, agent);

  addAuditEntry({
    persona: 'system',
    action: 'agent_listed_from_persona',
    outcome: 'success',
    details: { agentId: id, personaId, name: agent.name, specialty: agent.specialty },
  });

  res.status(201).json(agent);
});

// ── GET /api/marketplace/:id ────────────────────────────────────────

router.get('/:id', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
  res.json(agent);
});

// ── PUT /api/marketplace/:id/config ─────────────────────────────────
// Update soul/expertise/procedures/tools and profile fields

router.put('/:id/config', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  const { soul, expertise, procedures, tools, name, title, specialty, hourlyRate, description, skills, languages, certifications, tags } = req.body;
  if (soul !== undefined) agent.soul = soul;
  if (expertise !== undefined) agent.expertise = expertise;
  if (procedures !== undefined) agent.procedures = procedures;
  if (tools !== undefined) agent.tools = tools;
  if (name !== undefined) agent.name = name;
  if (title !== undefined) agent.title = title;
  if (specialty !== undefined) agent.specialty = specialty;
  if (hourlyRate !== undefined) agent.hourlyRate = hourlyRate;
  if (description !== undefined) agent.description = description;
  if (skills !== undefined) agent.skills = skills;
  if (languages !== undefined) agent.languages = languages;
  if (certifications !== undefined) agent.certifications = certifications;
  if (tags !== undefined) agent.tags = tags;

  addAuditEntry({
    persona: agent.personaId ?? 'marketplace',
    action: 'agent_config_updated',
    outcome: 'success',
    details: { agentId: agent.id, agentName: agent.name },
  });

  res.json(agent);
});

// ── GET /api/marketplace/:id/knowledge ──────────────────────────────

router.get('/:id/knowledge', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  if (agent.azureKnowledgeBaseId) {
    const azureKb = {
      id: agent.azureKnowledgeBaseId,
      name: agent.azureKnowledgeBaseId,
      domain: 'azure-search',
      provider: 'azure-search',
      embeddingModel: 'Azure AI',
      documentCount: 0,
      chunkCount: 0,
      type: 'azure',
    };
    res.json({ knowledgeBase: azureKb, kbType: 'azure' });
    return;
  }

  const kb = agent.knowledgeBaseId ? (knowledgeBases.get(agent.knowledgeBaseId) ?? null) : null;
  res.json({ knowledgeBase: kb ? { ...kb, type: 'local' } : null, kbType: kb ? 'local' : null });
});

// ── POST /api/marketplace/:id/knowledge ─────────────────────────────

router.post('/:id/knowledge', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  const { kbId, kbType } = req.body;
  if (!kbId) { res.status(400).json({ error: 'kbId is required' }); return; }

  if (kbType === 'azure') {
    agent.azureKnowledgeBaseId = kbId;
    agent.knowledgeBaseId = undefined;

    addAuditEntry({
      persona: agent.personaId ?? 'marketplace',
      action: 'agent_knowledge_assigned',
      outcome: 'success',
      details: { agentId: agent.id, kbId, kbType: 'azure' },
    });

    res.json({
      knowledgeBase: {
        id: kbId, name: kbId, domain: 'azure-search',
        provider: 'azure-search', embeddingModel: 'Azure AI',
        documentCount: 0, chunkCount: 0, type: 'azure',
      },
      kbType: 'azure',
    });
    return;
  }

  const kb = knowledgeBases.get(kbId);
  if (!kb) { res.status(404).json({ error: 'Knowledge base not found' }); return; }

  agent.knowledgeBaseId = kbId;
  agent.azureKnowledgeBaseId = undefined;

  addAuditEntry({
    persona: agent.personaId ?? 'marketplace',
    action: 'agent_knowledge_assigned',
    outcome: 'success',
    details: { agentId: agent.id, kbId, kbName: kb.name },
  });

  res.json({ knowledgeBase: { ...kb, type: 'local' }, kbType: 'local' });
});

// ── DELETE /api/marketplace/:id/knowledge ───────────────────────────

router.delete('/:id/knowledge', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  agent.knowledgeBaseId = undefined;
  agent.azureKnowledgeBaseId = undefined;

  addAuditEntry({
    persona: agent.personaId ?? 'marketplace',
    action: 'agent_knowledge_detached',
    outcome: 'success',
    details: { agentId: agent.id },
  });

  res.json({ detached: true });
});

// ── GET /api/marketplace/:id/integrations ───────────────────────────

router.get('/:id/integrations', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  const ids = agent.integrations ?? [];
  const result = ids.map((iid) => integrations.get(iid)).filter(Boolean);
  res.json(result);
});

// ── POST /api/marketplace/:id/integrations ──────────────────────────

router.post('/:id/integrations', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  const { integrationId } = req.body as { integrationId: string };
  if (!integrationId) { res.status(400).json({ error: 'integrationId is required' }); return; }

  const integration = integrations.get(integrationId);
  if (!integration) { res.status(404).json({ error: 'Integration not found' }); return; }

  const current = agent.integrations ?? [];
  if (!current.includes(integrationId)) {
    agent.integrations = [...current, integrationId];
  }

  addAuditEntry({
    persona: agent.personaId ?? 'marketplace',
    action: 'agent_integration_assigned',
    target: integrationId,
    outcome: 'success',
    details: { agentId: agent.id, integrationName: integration.name, integrationType: integration.type },
  });

  res.json(integration);
});

// ── DELETE /api/marketplace/:id/integrations/:integrationId ─────────

router.delete('/:id/integrations/:integrationId', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  agent.integrations = (agent.integrations ?? []).filter(
    (iid) => iid !== req.params.integrationId,
  );

  addAuditEntry({
    persona: agent.personaId ?? 'marketplace',
    action: 'agent_integration_removed',
    target: req.params.integrationId,
    outcome: 'success',
    details: { agentId: agent.id },
  });

  res.json({ removed: true });
});

// ── POST /api/marketplace/:id/chat ──────────────────────────────────
// Chat with a marketplace agent. If the agent has a backing persona, the
// response is persona-aware; otherwise a profile-aware response is generated.

router.post('/:id/chat', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  const { message } = req.body;
  if (!message) { res.status(400).json({ error: 'message is required' }); return; }

  // If the agent has a backing persona, delegate to the persona response generator
  let response: string;
  if (agent.personaId) {
    const persona = personas.get(agent.personaId);
    if (persona) {
      response = generatePersonaAwareResponse(persona, agent, message);
    } else {
      response = generateAgentResponse(agent, message);
    }
  } else {
    response = generateAgentResponse(agent, message);
  }

  addAuditEntry({
    persona: agent.personaId ?? 'marketplace',
    action: 'agent_chat',
    outcome: 'success',
    details: { agentId: agent.id, agentName: agent.name, messageLength: message.length },
  });

  res.json({
    agentId: agent.id,
    agentName: agent.name,
    response,
    timestamp: new Date(),
  });
});

// ── POST /api/marketplace/:id/hire ──────────────────────────────────
// Initiate hiring — creates a new contract

router.post('/:id/hire', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
  if (agent.availability !== 'available') {
    res.status(409).json({ error: `Agent is currently ${agent.availability}` });
    return;
  }

  // Auto-resolve tenantId from the caller's org if they are an org user
  const caller = users.get((req as any).userId);
  const callerTenantId = caller?.tenantId;

  const {
    tenantId: requestedTenantId,
    title,
    description,
    estimatedHours,
    milestones: milestonesRaw,
  } = req.body;

  // Org users must use their own tenantId
  const tenantId = callerTenantId ?? requestedTenantId;
  if (callerTenantId && requestedTenantId && requestedTenantId !== callerTenantId) {
    res.status(403).json({ error: 'You can only hire agents for your own organization' });
    return;
  }

  if (!tenantId || !title || !estimatedHours) {
    res.status(400).json({ error: 'tenantId, title, and estimatedHours are required' });
    return;
  }

  const contractId = nextContractId();
  const milestones = (milestonesRaw ?? []).map((m: any) => ({
    id: nextMilestoneId(),
    title: m.title ?? 'Milestone',
    description: m.description ?? '',
    dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
    status: 'pending' as const,
    amount: m.amount ?? 0,
  }));

  const contract: Contract = {
    id: contractId,
    tenantId,
    agentId: agent.id,
    clientUserId: (req as any).userId,
    title,
    description: description ?? '',
    specialty: agent.specialty,
    status: 'active',
    hourlyRate: agent.hourlyRate,
    estimatedHours: Number(estimatedHours),
    actualHours: 0,
    totalCost: 0,
    milestones,
    messages: [
      {
        id: `cmsg_${Date.now()}`,
        senderId: 'system',
        senderType: 'system' as const,
        content: `Contract created. ${agent.name} has been hired for "${title}".`,
        timestamp: new Date(),
      },
    ],
    startedAt: new Date(),
    createdAt: new Date(),
  };

  contracts.set(contractId, contract);

  // Mark agent as hired
  agent.availability = 'hired';
  agent.currentContractId = contractId;

  addAuditEntry({
    persona: 'system',
    action: 'agent_hired',
    outcome: 'success',
    details: {
      contractId,
      agentId: agent.id,
      agentName: agent.name,
      tenantId,
      title,
    },
  });

  res.status(201).json(contract);
});

// ── POST /api/marketplace  (admin: create new agent listing) ────────

router.post('/', (req, res) => {
  const { name, title, specialty, description, hourlyRate, tags, skills, languages, certifications } = req.body;
  if (!name || !title || !specialty) {
    res.status(400).json({ error: 'name, title, and specialty are required' });
    return;
  }

  const id = nextAgentListingId();
  const agent: AgentListing = {
    id,
    name,
    title,
    specialty,
    tags: tags ?? [],
    description: description ?? '',
    hourlyRate: hourlyRate ?? 100,
    rating: 5.0,
    completedJobs: 0,
    successRate: 100,
    availability: 'available',
    skills: skills ?? [],
    languages: languages ?? [],
    certifications: certifications ?? [],
    createdAt: new Date(),
  };

  agentListings.set(id, agent);
  res.status(201).json(agent);
});

// ── PUT /api/marketplace/:id ────────────────────────────────────────

router.put('/:id', (req, res) => {
  const agent = agentListings.get(req.params.id);
  if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }

  const safe = { ...req.body };
  delete safe.id;
  delete safe.createdAt;
  Object.assign(agent, safe);
  res.json(agent);
});

// ── DELETE /api/marketplace/:id ─────────────────────────────────────

router.delete('/:id', (req, res) => {
  if (!agentListings.has(req.params.id)) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  agentListings.delete(req.params.id);
  res.json({ message: 'Agent listing deleted' });
});

// ── Response generators ──────────────────────────────────────────────

function generateAgentResponse(agent: AgentListing, message: string): string {
  const lower = message.toLowerCase();
  const name = agent.name;

  if (lower.includes('who are you') || lower.includes('introduce') || lower.includes('about you')) {
    return `I'm **${name}**, a ${agent.title} specializing in ${agent.specialty.replace('-', ' ')}.\n\n` +
      `${agent.description}\n\n` +
      `**Rate:** $${agent.hourlyRate}/hr · **Rating:** ${agent.rating}/5 · **Jobs completed:** ${agent.completedJobs} · **Success rate:** ${agent.successRate}%`;
  }

  if (lower.includes('skill') || lower.includes('capability') || lower.includes('can you') || lower.includes('what do you')) {
    const skillsList = agent.skills.length > 0 ? agent.skills.join(', ') : 'various technologies';
    const certList = agent.certifications.length > 0 ? `\n\n**Certifications:** ${agent.certifications.join(', ')}` : '';
    return `As ${name}, here are my key skills:\n\n**${skillsList}**\n\nI primarily work with ${agent.languages.join(', ')}.${certList}`;
  }

  if (lower.includes('rate') || lower.includes('price') || lower.includes('cost') || lower.includes('hour')) {
    return `My hourly rate is **$${agent.hourlyRate}/hr**. I've completed ${agent.completedJobs} jobs with a ${agent.successRate}% success rate and a rating of ${agent.rating}/5.`;
  }

  if (lower.includes('available') || lower.includes('status') || lower.includes('hire') || lower.includes('free')) {
    const statusMsg = agent.availability === 'available'
      ? 'I\'m currently **available** and ready to take on new work.'
      : agent.availability === 'hired'
        ? 'I\'m currently **on an active contract**, but feel free to discuss potential future work.'
        : `My current status is **${agent.availability}**.`;
    return statusMsg;
  }

  if (lower.includes('tag') || lower.includes('speciali') || lower.includes('domain') || lower.includes('area')) {
    const tags = agent.tags.length > 0 ? agent.tags.join(', ') : 'various areas';
    return `My specialty is **${agent.specialty.replace(/-/g, ' ')}**. Key areas I work in: ${tags}.`;
  }

  if (lower.includes('task') || lower.includes('assign') || lower.includes('work on') || lower.includes('help with')) {
    return `Understood. As ${name} (${agent.title}), I can handle tasks in ${agent.specialty.replace(/-/g, ' ')}. ` +
      `In a live setup, assigning me a task would create a workflow or contract scoped to your organization. ` +
      `What specifically do you need help with?`;
  }

  return `[${name}]: I received your message: "${message}". ` +
    `I'm a ${agent.title} with expertise in ${agent.specialty.replace(/-/g, ' ')}. ` +
    `In production, this would connect to the LLM runtime with my full capability context. ` +
    `Try asking about my skills, rate, availability, or areas of expertise.`;
}

function generatePersonaAwareResponse(persona: LoadedPersona, agent: AgentListing, message: string): string {
  const lower = message.toLowerCase();
  const name = agent.name;

  if (lower.includes('who are you') || lower.includes('introduce') || lower.includes('about you')) {
    const identity = persona.identity || persona.soul;
    const preview = identity.split('\n').slice(0, 8).join('\n').trim();
    return preview
      ? `${preview}\n\n*(Marketplace profile: ${agent.title} · $${agent.hourlyRate}/hr)*`
      : `I'm **${name}**, a ${agent.title}. ${agent.description}`;
  }

  if (lower.includes('skill') || lower.includes('capability') || lower.includes('can you') || lower.includes('what do you')) {
    const expertisePreview = persona.expertise
      .split('\n')
      .filter((l) => l.startsWith('## ') || l.startsWith('- '))
      .slice(0, 8)
      .join('\n');
    return `As ${name}, here are my key capabilities:\n\n${expertisePreview || agent.skills.join(', ')}`;
  }

  if (lower.includes('status') || lower.includes('progress') || lower.includes('how are')) {
    return `I'm ${name}, currently ${persona.active ? 'active and operational' : 'on standby'}. ` +
      `Available for hire at $${agent.hourlyRate}/hr · ${agent.completedJobs} completed jobs · ${agent.successRate}% success rate.`;
  }

  return generateAgentResponse(agent, message);
}

export default router;
