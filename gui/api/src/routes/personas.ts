import { Router } from 'express';
import { readFile, access, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import {
  personas,
  knowledgeBases,
  integrations,
  addAuditEntry,
  loadPersonaFromDir,
  discoverAndLoadPersonas,
  PERSONAS_DIR,
  type LoadedPersona,
  type PersonaConfig,
} from '../state.js';

const router = Router();

// List all personas
router.get('/', (_req, res) => {
  const list = Array.from(personas.values()).map((p) => ({
    id: p.config.id,
    name: p.config.name,
    path: p.config.path,
    active: p.active,
    loadedAt: p.loadedAt,
    integrations: p.config.integrations ?? [],
    skills: p.config.skills ?? [],
    knowledgeBaseId: p.config.knowledgeBaseId ?? null,
  }));
  res.json(list);
});

// Get single persona
router.get('/:id', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }
  res.json({
    id: persona.config.id,
    name: persona.config.name,
    path: persona.config.path,
    active: persona.active,
    loadedAt: persona.loadedAt,
    integrations: persona.config.integrations ?? [],
    skills: persona.config.skills ?? [],
    knowledgeBaseId: persona.config.knowledgeBaseId ?? null,
    identity: persona.identity,
    soul: persona.soul,
    expertise: persona.expertise,
    procedures: persona.procedures,
    tools: persona.tools,
  });
});

// Re-scan the personas/ directory and load any new ones
router.post('/discover', async (_req, res) => {
  const count = await discoverAndLoadPersonas();
  res.json({ discovered: count });
});

// Load persona from path
router.post('/load', async (req, res) => {
  const { id, name, path: personaPath, integrations: intg, skills } = req.body as PersonaConfig;

  if (!id || !name || !personaPath) {
    res.status(400).json({ error: 'id, name, and path are required' });
    return;
  }

  try {
    await access(personaPath, constants.R_OK);
  } catch {
    res.status(400).json({ error: `Directory not accessible: ${personaPath}` });
    return;
  }

  const [identity, soul, expertise, procedures, tools] = await Promise.all([
    readFile(join(personaPath, 'IDENTITY.md'), 'utf-8').catch(() => ''),
    readFile(join(personaPath, 'SOUL.md'), 'utf-8').catch(() => ''),
    readFile(join(personaPath, 'EXPERTISE.md'), 'utf-8').catch(() => ''),
    readFile(join(personaPath, 'PROCEDURES.md'), 'utf-8').catch(() => ''),
    readFile(join(personaPath, 'TOOLS.md'), 'utf-8').catch(() => ''),
  ]);

  const loaded: LoadedPersona = {
    config: { id, name, path: personaPath, integrations: intg, skills },
    identity,
    soul,
    expertise,
    procedures,
    tools,
    active: false,
    loadedAt: new Date(),
  };

  personas.set(id, loaded);

  addAuditEntry({
    persona: id,
    action: 'persona_loaded',
    outcome: 'success',
    details: { name },
  });

  res.json({ id, name, loaded: true });
});

// Create a new persona (writes files to disk + loads it)
router.post('/create', async (req, res) => {
  const { id, name, soul, expertise, procedures, tools, identity } = req.body as {
    id: string;
    name: string;
    identity: string;
    soul: string;
    expertise: string;
    procedures: string;
    tools: string;
  };

  if (!id || !name) {
    res.status(400).json({ error: 'id and name are required' });
    return;
  }

  // Validate id format: lowercase alphanumeric + hyphens only
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id) && !/^[a-z0-9]$/.test(id)) {
    res.status(400).json({ error: 'ID must be lowercase alphanumeric with hyphens (e.g. "cloud-architect")' });
    return;
  }

  const dirPath = join(PERSONAS_DIR, id);

  try {
    await mkdir(dirPath, { recursive: true });

    // Write the 5 persona files
    await Promise.all([
      writeFile(join(dirPath, 'IDENTITY.md'), identity ?? '', 'utf-8'),
      writeFile(join(dirPath, 'SOUL.md'), soul ?? '', 'utf-8'),
      writeFile(join(dirPath, 'EXPERTISE.md'), expertise ?? '', 'utf-8'),
      writeFile(join(dirPath, 'PROCEDURES.md'), procedures ?? '', 'utf-8'),
      writeFile(join(dirPath, 'TOOLS.md'), tools ?? '', 'utf-8'),
    ]);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to write persona files: ${err.message}` });
    return;
  }

  // Load into state
  const loaded: LoadedPersona = {
    config: { id, name, path: dirPath },
    identity: identity ?? '',
    soul: soul ?? '',
    expertise: expertise ?? '',
    procedures: procedures ?? '',
    tools: tools ?? '',
    active: false,
    loadedAt: new Date(),
  };
  personas.set(id, loaded);

  addAuditEntry({
    persona: id,
    action: 'persona_created',
    outcome: 'success',
    details: { name },
  });

  res.json({ id, name, path: dirPath, created: true });
});

// Activate persona
router.post('/:id/activate', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  // Deactivate all others
  for (const p of personas.values()) {
    p.active = false;
  }
  persona.active = true;

  addAuditEntry({
    persona: persona.config.id,
    action: 'persona_activated',
    outcome: 'success',
  });

  res.json({ id: persona.config.id, active: true });
});

// Update persona files (edit capabilities/skills)
router.put('/:id', async (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  const { identity, soul, expertise, procedures, tools, name, skills: newSkills, integrations: newIntegrations } = req.body;

  // Update in-memory state
  if (identity !== undefined) persona.identity = identity;
  if (soul !== undefined) persona.soul = soul;
  if (expertise !== undefined) persona.expertise = expertise;
  if (procedures !== undefined) persona.procedures = procedures;
  if (tools !== undefined) persona.tools = tools;
  if (name !== undefined) persona.config.name = name;
  if (newSkills !== undefined) persona.config.skills = newSkills;
  if (newIntegrations !== undefined) persona.config.integrations = newIntegrations;

  // Persist to disk
  const personaPath = persona.config.path;
  try {
    const writes: Promise<void>[] = [];
    if (identity !== undefined) writes.push(writeFile(join(personaPath, 'IDENTITY.md'), identity, 'utf-8'));
    if (soul !== undefined) writes.push(writeFile(join(personaPath, 'SOUL.md'), soul, 'utf-8'));
    if (expertise !== undefined) writes.push(writeFile(join(personaPath, 'EXPERTISE.md'), expertise, 'utf-8'));
    if (procedures !== undefined) writes.push(writeFile(join(personaPath, 'PROCEDURES.md'), procedures, 'utf-8'));
    if (tools !== undefined) writes.push(writeFile(join(personaPath, 'TOOLS.md'), tools, 'utf-8'));
    await Promise.all(writes);
  } catch (err: any) {
    // Still updated in memory even if disk write fails
    console.warn(`Failed to persist persona files: ${err.message}`);
  }

  addAuditEntry({
    persona: persona.config.id,
    action: 'persona_updated',
    outcome: 'success',
    details: { fields: Object.keys(req.body) },
  });

  res.json({
    id: persona.config.id,
    name: persona.config.name,
    updated: true,
  });
});

// Chat with a specific persona (simulated — in production, this hits the LLM via the orchestrator)
router.post('/:id/chat', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // Simulate persona-aware response (in production: orchestrator.buildContext + LLM call)
  const response = generatePersonaResponse(persona, message);

  addAuditEntry({
    persona: persona.config.id,
    action: 'persona_chat',
    outcome: 'success',
    details: { messageLength: message.length },
  });

  res.json({
    personaId: persona.config.id,
    personaName: persona.config.name,
    response,
    timestamp: new Date(),
  });
});

// Get persona progress / status summary
router.get('/:id/progress', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  // Build a progress summary from persona state
  const skillsList = persona.config.skills ?? [];
  const integrationsList = persona.config.integrations ?? [];

  // Extract capabilities from expertise content
  const capabilitySections = persona.expertise
    .split('\n')
    .filter((l) => l.startsWith('## ') || l.startsWith('- '))
    .slice(0, 20);

  res.json({
    id: persona.config.id,
    name: persona.config.name,
    active: persona.active,
    loadedAt: persona.loadedAt,
    skills: skillsList,
    integrations: integrationsList,
    hasIdentity: !!persona.identity,
    hasSoul: !!persona.soul,
    hasExpertise: !!persona.expertise,
    hasProcedures: !!persona.procedures,
    hasTools: !!persona.tools,
    capabilitySummary: capabilitySections,
  });
});

// ── Knowledge Base assignment ─────────────────────────────────────

// Get the knowledge base currently linked to a persona
router.get('/:id/knowledge', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  if (persona.config.azureKnowledgeBaseId) {
    const azureKb = {
      id: persona.config.azureKnowledgeBaseId,
      name: persona.config.azureKnowledgeBaseId,
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

  const kbId = persona.config.knowledgeBaseId;
  if (!kbId) {
    res.json({ knowledgeBase: null, kbType: null });
    return;
  }

  const kb = knowledgeBases.get(kbId);
  res.json({ knowledgeBase: kb ? { ...kb, type: 'local' } : null, kbType: kb ? 'local' : null });
});

// Assign (or replace) a knowledge base for a persona
router.post('/:id/knowledge', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  const { knowledgeBaseId, kbType } = req.body as { knowledgeBaseId: string; kbType?: string };
  if (!knowledgeBaseId) {
    res.status(400).json({ error: 'knowledgeBaseId is required' });
    return;
  }

  if (kbType === 'azure') {
    persona.config.azureKnowledgeBaseId = knowledgeBaseId;
    persona.config.knowledgeBaseId = undefined;

    addAuditEntry({
      persona: persona.config.id,
      action: 'knowledge_base_assigned',
      target: knowledgeBaseId,
      outcome: 'success',
      details: { kbType: 'azure' },
    });

    res.json({
      knowledgeBase: {
        id: knowledgeBaseId, name: knowledgeBaseId, domain: 'azure-search',
        provider: 'azure-search', embeddingModel: 'Azure AI',
        documentCount: 0, chunkCount: 0, type: 'azure',
      },
      kbType: 'azure',
    });
    return;
  }

  if (!knowledgeBases.has(knowledgeBaseId)) {
    res.status(404).json({ error: 'Knowledge base not found' });
    return;
  }

  persona.config.knowledgeBaseId = knowledgeBaseId;
  persona.config.azureKnowledgeBaseId = undefined;
  const kb = knowledgeBases.get(knowledgeBaseId)!;

  addAuditEntry({
    persona: persona.config.id,
    action: 'knowledge_base_assigned',
    target: knowledgeBaseId,
    outcome: 'success',
    details: { kbName: kb.name, kbDomain: kb.domain },
  });

  res.json({ knowledgeBase: { ...kb, type: 'local' }, kbType: 'local' });
});

// Remove the knowledge base link from a persona
router.delete('/:id/knowledge', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  const prev = persona.config.knowledgeBaseId ?? persona.config.azureKnowledgeBaseId;
  persona.config.knowledgeBaseId = undefined;
  persona.config.azureKnowledgeBaseId = undefined;

  addAuditEntry({
    persona: persona.config.id,
    action: 'knowledge_base_detached',
    target: prev ?? 'none',
    outcome: 'success',
  });

  res.json({ detached: true });
});

// ── Integration assignment ────────────────────────────────────────

// GET /api/personas/:id/integrations — list full IntegrationInfo for assigned integrations
router.get('/:id/integrations', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) { res.status(404).json({ error: 'Persona not found' }); return; }

  const ids = persona.config.integrations ?? [];
  const result = ids
    .map((iid) => integrations.get(iid))
    .filter(Boolean);
  res.json(result);
});

// POST /api/personas/:id/integrations — assign an integration
router.post('/:id/integrations', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) { res.status(404).json({ error: 'Persona not found' }); return; }

  const { integrationId } = req.body as { integrationId: string };
  if (!integrationId) { res.status(400).json({ error: 'integrationId is required' }); return; }

  const integration = integrations.get(integrationId);
  if (!integration) { res.status(404).json({ error: 'Integration not found' }); return; }

  const current = persona.config.integrations ?? [];
  if (!current.includes(integrationId)) {
    persona.config.integrations = [...current, integrationId];
  }

  addAuditEntry({
    persona: persona.config.id,
    action: 'persona_integration_assigned',
    target: integrationId,
    outcome: 'success',
    details: { integrationName: integration.name, integrationType: integration.type },
  });

  res.json(integration);
});

// DELETE /api/personas/:id/integrations/:integrationId — remove integration
router.delete('/:id/integrations/:integrationId', (req, res) => {
  const persona = personas.get(req.params.id);
  if (!persona) { res.status(404).json({ error: 'Persona not found' }); return; }

  persona.config.integrations = (persona.config.integrations ?? []).filter(
    (iid) => iid !== req.params.integrationId,
  );

  addAuditEntry({
    persona: persona.config.id,
    action: 'persona_integration_removed',
    target: req.params.integrationId,
    outcome: 'success',
  });

  res.json({ removed: true });
});

/**
 * Simple persona-aware response generator.
 * In production, this would go through TalentOrchestrator → LLM.
 */
function generatePersonaResponse(persona: LoadedPersona, message: string): string {
  const lower = message.toLowerCase();
  const name = persona.config.name;

  // Progress / status queries
  if (lower.includes('progress') || lower.includes('status') || lower.includes('how are') || lower.includes('update')) {
    const skills = persona.config.skills ?? [];
    const skillsStr = skills.length > 0 ? `\n\nCurrently equipped skills: ${skills.join(', ')}` : '';
    return `I'm ${name}, currently ${persona.active ? 'active and operational' : 'on standby'}. ` +
      `I was loaded at ${persona.loadedAt.toLocaleString()} and I'm ready to assist with tasks in my domain.${skillsStr}\n\n` +
      `In production, I would provide real-time progress on assigned workflows and tasks.`;
  }

  // Capability queries
  if (lower.includes('capability') || lower.includes('can you') || lower.includes('what do you') || lower.includes('skill')) {
    const expertisePreview = persona.expertise
      .split('\n')
      .filter((l) => l.startsWith('## ') || l.startsWith('- '))
      .slice(0, 8)
      .join('\n');
    return `As ${name}, here are my key capabilities:\n\n${expertisePreview || 'My expertise is defined in my configuration.'}\n\n` +
      `You can modify my skills and capabilities through the persona editor.`;
  }

  // Task assignment
  if (lower.includes('task') || lower.includes('assign') || lower.includes('work on') || lower.includes('help with')) {
    return `Understood. As ${name}, I can take on tasks within my domain. ` +
      `In production, this would create a workflow run tracked in the Workflow Dashboard. ` +
      `Shall I proceed with this task?`;
  }

  // Identity queries
  if (lower.includes('who are you') || lower.includes('introduce') || lower.includes('about you')) {
    const identity = persona.identity || persona.soul;
    const preview = identity.split('\n').slice(0, 10).join('\n');
    return preview || `I'm ${name}. My configuration defines my personality and expertise.`;
  }

  // Default
  return `[${name}]: I received your message. In production, this would be processed by the LLM with my full persona context (identity, soul, expertise, procedures, and tools). ` +
    `You can ask me about my progress, capabilities, or assign me tasks.`;
}

export default router;
