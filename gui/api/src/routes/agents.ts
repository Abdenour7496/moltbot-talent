import { Router } from 'express';
import { personas } from '../state.js';
import { prisma, logAudit } from '../db/index.js';

const router = Router();

// GET /api/agents
// Admins see all personas; org users see only personas assigned to their department.
router.get('/', async (req: any, res) => {
  const isAdmin = req.userRole === 'admin';

  let tenantId: string | null = null;
  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { tenantId: true },
    });
    tenantId = user?.tenantId ?? null;
  }

  let list = Array.from(personas.values());

  if (!isAdmin) {
    if (tenantId) {
      list = list.filter((p) => (p.config.departmentIds ?? []).includes(tenantId!));
    } else {
      list = [];
    }
  }

  res.json(
    list.map((p) => ({
      id: p.config.id,
      name: p.config.name,
      active: p.active,
      loadedAt: p.loadedAt,
      departmentIds: p.config.departmentIds ?? [],
      specialty: p.config.skills?.[0] ?? null,
      skills: p.config.skills ?? [],
      soul: p.soul?.slice(0, 120) ?? '',
      expertise: p.expertise?.slice(0, 120) ?? '',
    })),
  );
});

// POST /api/agents/:personaId/assign
// Assign a persona to a department (idempotent).
router.post('/:personaId/assign', async (req: any, res) => {
  const { personaId } = req.params;
  const { departmentId } = req.body;

  if (!departmentId || typeof departmentId !== 'string') {
    res.status(400).json({ error: 'departmentId is required' });
    return;
  }

  const persona = personas.get(personaId);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  const existing = persona.config.departmentIds ?? [];
  if (!existing.includes(departmentId)) {
    persona.config.departmentIds = [...existing, departmentId];
  }

  logAudit({
    persona: personaId,
    action: 'persona_assigned_to_department',
    outcome: 'success',
    details: { personaId, departmentId },
  });

  res.json({ id: personaId, departmentIds: persona.config.departmentIds });
});

// DELETE /api/agents/:personaId/assign/:departmentId
// Remove a persona from a department.
router.delete('/:personaId/assign/:departmentId', async (req: any, res) => {
  const { personaId, departmentId } = req.params;

  const persona = personas.get(personaId);
  if (!persona) {
    res.status(404).json({ error: 'Persona not found' });
    return;
  }

  persona.config.departmentIds = (persona.config.departmentIds ?? []).filter(
    (d) => d !== departmentId,
  );

  logAudit({
    persona: personaId,
    action: 'persona_unassigned_from_department',
    outcome: 'success',
    details: { personaId, departmentId },
  });

  res.json({ id: personaId, departmentIds: persona.config.departmentIds });
});

export default router;
