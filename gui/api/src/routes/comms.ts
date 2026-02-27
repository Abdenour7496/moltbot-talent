import { Router } from 'express';
import {
  personaMessages,
  personas,
  nextCommsId,
  addAuditEntry,
  type PersonaMessage,
} from '../state.js';

const router = Router();

// List all cross-persona messages
router.get('/', (req, res) => {
  const persona = req.query.persona as string | undefined;
  let list = [...personaMessages];
  if (persona) {
    list = list.filter(
      (m) => m.fromPersona === persona || m.toPersona === persona,
    );
  }
  list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  res.json(list);
});

// Send a cross-persona message
router.post('/send', (req, res) => {
  const { fromPersona, toPersona, content } = req.body;
  if (!fromPersona || !toPersona || !content) {
    res.status(400).json({ error: 'fromPersona, toPersona, and content are required' });
    return;
  }

  const fromExists = personas.has(fromPersona);
  const toExists = personas.has(toPersona);

  const msg: PersonaMessage = {
    id: nextCommsId(),
    fromPersona,
    toPersona,
    content,
    timestamp: new Date(),
    status: fromExists && toExists ? 'delivered' : toExists ? 'pending' : 'failed',
  };
  personaMessages.push(msg);

  addAuditEntry({
    persona: fromPersona,
    action: 'persona_message_sent',
    target: toPersona,
    outcome: msg.status === 'failed' ? 'failure' : 'success',
    details: { messageId: msg.id },
  });

  res.status(201).json(msg);
});

export default router;
