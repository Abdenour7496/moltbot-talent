/**
 * Azure AI Search Knowledge Sources – Express proxy routes
 *
 * Manages knowledge sources (search indexes, blob, web, SharePoint, OneLake)
 * attached to Azure AI Search Knowledge Bases.
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

// ── List knowledge sources ──────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const url = azureUrl('/knowledgesources');
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

// ── Create / update a knowledge source (PUT) ────────────────────────

router.put('/', async (req: Request, res: Response) => {
  try {
    const { name, ...body } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const url = azureUrl(`/knowledgesources/${encodeURIComponent(name)}`);
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
    res.json(await resp.json());
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Azure request failed' });
  }
});

// ── Get knowledge source status ─────────────────────────────────────

router.get('/:sourceName/status', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(
      `/knowledgesources/${encodeURIComponent(req.params.sourceName as string)}/status`,
    );
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

// ── Delete a knowledge source ───────────────────────────────────────

router.delete('/:sourceName', async (req: Request, res: Response) => {
  try {
    const url = azureUrl(
      `/knowledgesources/${encodeURIComponent(req.params.sourceName as string)}`,
    );
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

export default router;
