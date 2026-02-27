import { Router } from 'express';
import {
  knowledgeBases,
  addAuditEntry,
  type KnowledgeBaseInfo,
} from '../state.js';

const router = Router();

let kbCounter = 0;

// List knowledge bases
router.get('/', (_req, res) => {
  res.json(Array.from(knowledgeBases.values()));
});

// Create knowledge base
router.post('/', (req, res) => {
  const { name, domain, provider, embeddingModel } = req.body;
  if (!name || !domain) {
    res.status(400).json({ error: 'name and domain are required' });
    return;
  }

  const id = `kb_${++kbCounter}`;
  const kb: KnowledgeBaseInfo = {
    id,
    name,
    domain,
    documentCount: 0,
    chunkCount: 0,
    provider: provider ?? 'chroma',
    embeddingModel: embeddingModel ?? 'text-embedding-3-small',
    createdAt: new Date(),
  };

  knowledgeBases.set(id, kb);

  addAuditEntry({
    persona: 'system',
    action: 'knowledge_base_created',
    target: id,
    outcome: 'success',
    details: { name, domain },
  });

  res.json(kb);
});

// Get KB stats
router.get('/:id/stats', (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) {
    res.status(404).json({ error: 'Knowledge base not found' });
    return;
  }
  res.json(kb);
});

// Ingest documents (simulated)
router.post('/:id/ingest', (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) {
    res.status(404).json({ error: 'Knowledge base not found' });
    return;
  }

  const { sourcePath, category, fileTypes } = req.body;
  if (!sourcePath) {
    res.status(400).json({ error: 'sourcePath is required' });
    return;
  }

  // Simulated ingestion
  const newDocs = Math.floor(Math.random() * 10) + 1;
  const newChunks = newDocs * (Math.floor(Math.random() * 8) + 3);
  kb.documentCount += newDocs;
  kb.chunkCount += newChunks;

  addAuditEntry({
    persona: 'system',
    action: 'knowledge_ingested',
    target: kb.id,
    outcome: 'success',
    details: { sourcePath, category, fileTypes, documents: newDocs, chunks: newChunks },
  });

  res.json({
    documents: newDocs,
    chunks: newChunks,
    totalDocuments: kb.documentCount,
    totalChunks: kb.chunkCount,
  });
});

// Query knowledge base (simulated)
router.post('/:id/query', (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) {
    res.status(404).json({ error: 'Knowledge base not found' });
    return;
  }

  const { query, topK = 5 } = req.body;
  if (!query) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  // Simulated retrieval results
  const results = Array.from({ length: Math.min(topK, 3) }, (_, i) => ({
    chunk: {
      id: `chunk_${i + 1}`,
      documentId: `doc_${i + 1}`,
      content: `Simulated result ${i + 1} for query: "${query}". This would contain relevant content from the knowledge base about ${kb.domain}.`,
      chunkIndex: i,
      totalChunks: 5,
      metadata: {
        source: `docs/${kb.domain}/document-${i + 1}.md`,
        contentType: 'text/markdown',
        domain: kb.domain,
        category: 'runbook',
      },
    },
    score: parseFloat((0.95 - i * 0.1).toFixed(2)),
  }));

  res.json({ query, results });
});

// Delete knowledge base
router.delete('/:id', (req, res) => {
  const kb = knowledgeBases.get(req.params.id);
  if (!kb) {
    res.status(404).json({ error: 'Knowledge base not found' });
    return;
  }

  knowledgeBases.delete(req.params.id);

  addAuditEntry({
    persona: 'system',
    action: 'knowledge_base_deleted',
    target: req.params.id,
    outcome: 'success',
    details: { name: kb.name },
  });

  res.json({ deleted: true });
});

export default router;
