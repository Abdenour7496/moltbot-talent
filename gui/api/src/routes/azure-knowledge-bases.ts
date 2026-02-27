/**
 * Azure AI Search Knowledge Bases – Express proxy routes
 *
 * Proxies requests to the Azure AI Search Knowledge Bases API
 * (2025-11-01-preview) so the SPA never exposes credentials.
 *
 * Required env vars:
 *   AZURE_SEARCH_ENDPOINT   – e.g. https://my-search.search.windows.net
 *   AZURE_SEARCH_API_KEY    – admin / query key
 *   AZURE_SEARCH_API_VERSION – defaults to 2025-11-01-preview
 */

import { Router, type Request, type Response } from 'express';
import { settings } from '../state.js';

const router = Router();

const getEndpoint = () => settings.azureSearchEndpoint || process.env.AZURE_SEARCH_ENDPOINT || '';
const getApiKey = () => settings.azureSearchApiKey || process.env.AZURE_SEARCH_API_KEY || '';
const getApiVersion = () =>
  settings.azureSearchApiVersion || process.env.AZURE_SEARCH_API_VERSION || '2025-11-01-preview';

function azureHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'api-key': getApiKey(),
  };
}

function azureUrl(path: string): string {
  const base = getEndpoint().replace(/\/+$/, '');
  return `${base}${path}?api-version=${getApiVersion()}`;
}

// ── Health-check ────────────────────────────────────────────────────

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: Boolean(getEndpoint() && getApiKey()),
    endpoint: getEndpoint() ? getEndpoint().replace(/api-key.*/, '***') : null,
    apiVersion: getApiVersion(),
  });
});

// ── List knowledge bases ────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const url = azureUrl('/knowledgebases');
    const resp = await fetch(url, { headers: azureHeaders() });
    if (!resp.ok) {
      const body = await resp.text();
      res.status(resp.status).json({ error: body });
      return;
    }
    const data: any = await resp.json();
    res.json(data.value ?? data);
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Get single knowledge base ────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(`/knowledgebases/${req.params.id}`);
    const resp = await fetch(url, { headers: azureHeaders() });
    if (!resp.ok) {
      const body = await resp.text();
      res.status(resp.status).json({ error: body });
      return;
    }
    res.json(await resp.json());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Create knowledge base (PUT with name-as-key) ──────────────────

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, ...body } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    // Azure AI Search creates KBs via PUT /knowledgebases/{name}
    const url = azureUrl(`/knowledgebases/${encodeURIComponent(name)}`);
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        ...azureHeaders(),
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      res.status(resp.status).json({ error: errBody });
      return;
    }
    res.status(201).json(await resp.json());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Update knowledge base ────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(`/knowledgebases/${req.params.id}`);
    const headers: Record<string, string> = {
      ...azureHeaders(),
      'Prefer': 'return=representation',
    };
    // Forward If-Match for optimistic concurrency if the client supplies an etag
    if (req.headers['if-match']) {
      headers['If-Match'] = req.headers['if-match'] as string;
    }

    const resp = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(req.body),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      res.status(resp.status).json({ error: errBody });
      return;
    }
    res.json(await resp.json());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Delete knowledge base ────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(`/knowledgebases/${req.params.id}`);
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: azureHeaders(),
    });

    if (!resp.ok && resp.status !== 204) {
      const errBody = await resp.text();
      res.status(resp.status).json({ error: errBody });
      return;
    }
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Retrieve (agentic RAG) ──────────────────────────────────────────

router.post('/:id/retrieve', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(`/knowledgebases/${req.params.id}/retrieve`);
    const headers: Record<string, string> = { ...azureHeaders() };

    // Forward ACL/auth tokens from frontend if present
    const aclHeader = req.headers['x-ms-search-acl-token'];
    if (aclHeader) {
      headers['x-ms-search-acl-token'] = aclHeader as string;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      res.status(resp.status).json({ error: errBody });
      return;
    }
    res.json(await resp.json());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Simpler query endpoint (messages-only) ──────────────────────────

router.post('/:id/query', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(`/knowledgebases/${req.params.id}/retrieve`);
    const { query, topK } = req.body;

    const messages = [{ role: 'user', content: query }];
    const body: Record<string, unknown> = {
      messages,
      ...(topK != null && { queryParameters: { maxDocsPerSource: topK } }),
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: azureHeaders(),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      res.status(resp.status).json({ error: errBody });
      return;
    }
    res.json(await resp.json());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

export default router;
