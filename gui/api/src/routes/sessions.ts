import { Router } from 'express';
import {
  sessions,
  nextSessionId,
  nextMessageId,
  addAuditEntry,
  type Session,
  type SessionMessage,
} from '../state.js';

const router = Router();

// List all sessions
router.get('/', (req, res) => {
  const status = req.query.status as string | undefined;
  let list = Array.from(sessions.values());
  if (status) {
    list = list.filter((s) => s.status === status);
  }
  list.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  res.json(list);
});

// Get single session
router.get('/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

// Create session
router.post('/', (req, res) => {
  const { label, personaId, channelId } = req.body;
  if (!label || !personaId) {
    res.status(400).json({ error: 'label and personaId are required' });
    return;
  }

  const now = new Date();
  const session: Session = {
    id: nextSessionId(),
    label,
    personaId,
    channelId,
    status: 'active',
    messages: [],
    createdAt: now,
    lastActivityAt: now,
  };
  sessions.set(session.id, session);

  addAuditEntry({
    persona: personaId,
    action: 'session_created',
    target: session.id,
    outcome: 'success',
    details: { label },
  });

  res.status(201).json(session);
});

// Post message to session
router.post('/:id/message', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const { role, content } = req.body;
  if (!role || !content) {
    res.status(400).json({ error: 'role and content are required' });
    return;
  }

  const message: SessionMessage = {
    id: nextMessageId(),
    role,
    content,
    timestamp: new Date(),
  };
  session.messages.push(message);
  session.lastActivityAt = new Date();
  if (session.status === 'idle') session.status = 'active';

  res.status(201).json(message);
});

// Delete session
router.delete('/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  sessions.delete(req.params.id);

  addAuditEntry({
    persona: session.personaId,
    action: 'session_deleted',
    target: session.id,
    outcome: 'success',
  });

  res.json({ ok: true });
});

export default router;
