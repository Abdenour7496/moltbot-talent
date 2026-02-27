import { Router } from 'express';
import {
  skills,
  nextSkillId,
  addAuditEntry,
  type Skill,
} from '../state.js';

const router = Router();

// List all skills
router.get('/', (_req, res) => {
  res.json(Array.from(skills.values()));
});

// Get single skill
router.get('/:id', (req, res) => {
  const skill = skills.get(req.params.id);
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }
  res.json(skill);
});

// Install / create skill
router.post('/', (req, res) => {
  const { name, description, category, source, enabled } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = nextSkillId();
  const skill: Skill = {
    id,
    name,
    description: description ?? '',
    category: category ?? 'custom',
    source: source ?? 'workspace',
    enabled: enabled ?? true,
    installedAt: new Date(),
    version: '1.0.0',
    config: {},
  };
  skills.set(id, skill);

  addAuditEntry({
    persona: 'system',
    action: 'skill_installed',
    target: id,
    outcome: 'success',
    details: { name, source: skill.source },
  });

  res.status(201).json(skill);
});

// Update skill
router.put('/:id', (req, res) => {
  const skill = skills.get(req.params.id);
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  const { enabled, config, description } = req.body;
  if (typeof enabled === 'boolean') skill.enabled = enabled;
  if (config) skill.config = { ...skill.config, ...config };
  if (description !== undefined) skill.description = description;

  res.json(skill);
});

// Delete skill
router.delete('/:id', (req, res) => {
  const skill = skills.get(req.params.id);
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  skills.delete(req.params.id);

  addAuditEntry({
    persona: 'system',
    action: 'skill_removed',
    target: skill.id,
    outcome: 'success',
    details: { name: skill.name },
  });

  res.json({ ok: true });
});

export default router;
