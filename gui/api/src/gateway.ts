/**
 * WebSocket Gateway — real-time control plane
 *
 * Broadcasts events to connected clients (presence, typing, session updates, etc.)
 * Accepts inbound commands (chat commands, agent requests, etc.)
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { randomUUID } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────

export interface GatewayClient {
  id: string;
  ws: WebSocket;
  type: 'dashboard' | 'webchat' | 'node' | 'cli';
  sessionId?: string;
  personaId?: string;
  connectedAt: Date;
  lastPingAt: Date;
}

export type GatewayEventType =
  | 'presence.update'
  | 'typing.start'
  | 'typing.stop'
  | 'session.message'
  | 'session.created'
  | 'session.deleted'
  | 'session.status'
  | 'agent.thinking'
  | 'agent.streaming'
  | 'agent.done'
  | 'agent.error'
  | 'approval.requested'
  | 'approval.resolved'
  | 'audit.entry'
  | 'health.update'
  | 'channel.status'
  | 'skill.installed'
  | 'usage.update'
  | 'pong';

export interface GatewayEvent {
  type: GatewayEventType;
  data: unknown;
  timestamp: string;
  clientId?: string;
}

// ── Gateway state ─────────────────────────────────────────────────

const clients: Map<string, GatewayClient> = new Map();

let wss: WebSocketServer | null = null;

// ── Public API ────────────────────────────────────────────────────

/**
 * Attach the WebSocket server to an existing HTTP server.
 */
export function initGateway(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: GatewayClient = {
      id: randomUUID(),
      ws,
      type: 'dashboard',
      connectedAt: new Date(),
      lastPingAt: new Date(),
    };
    clients.set(client.id, client);

    // Send handshake
    send(ws, {
      type: 'presence.update',
      data: { clientId: client.id, connected: true, totalClients: clients.size },
      timestamp: new Date().toISOString(),
    });

    // Broadcast presence to all others
    broadcast(
      {
        type: 'presence.update',
        data: { totalClients: clients.size },
        timestamp: new Date().toISOString(),
      },
      client.id,
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(client, msg);
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(client.id);
      broadcast({
        type: 'presence.update',
        data: { totalClients: clients.size },
        timestamp: new Date().toISOString(),
      });
    });

    ws.on('pong', () => {
      client.lastPingAt = new Date();
    });
  });

  // Heartbeat — drop stale connections every 30 s
  setInterval(() => {
    const now = Date.now();
    for (const [id, c] of clients) {
      if (now - c.lastPingAt.getTime() > 60_000) {
        c.ws.terminate();
        clients.delete(id);
      } else {
        c.ws.ping();
      }
    }
  }, 30_000);

  console.log('WebSocket Gateway initialized on /ws');
  return wss;
}

/**
 * Broadcast a gateway event to all connected clients (optionally excluding one).
 */
export function broadcast(event: GatewayEvent, excludeId?: string): void {
  const payload = JSON.stringify(event);
  for (const [id, c] of clients) {
    if (id === excludeId) continue;
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  }
}

/**
 * Send an event to a specific client.
 */
export function sendToClient(clientId: string, event: GatewayEvent): void {
  const c = clients.get(clientId);
  if (c && c.ws.readyState === WebSocket.OPEN) {
    send(c.ws, event);
  }
}

/**
 * Get connected client count and list.
 */
export function getGatewayStatus() {
  return {
    totalClients: clients.size,
    clients: Array.from(clients.values()).map((c) => ({
      id: c.id,
      type: c.type,
      sessionId: c.sessionId,
      connectedAt: c.connectedAt,
    })),
  };
}

// ── Internal ──────────────────────────────────────────────────────

function send(ws: WebSocket, event: GatewayEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function handleClientMessage(client: GatewayClient, msg: any): void {
  switch (msg.type) {
    case 'ping':
      send(client.ws, {
        type: 'pong',
        data: {},
        timestamp: new Date().toISOString(),
      });
      break;
    case 'identify':
      if (msg.clientType) client.type = msg.clientType;
      if (msg.sessionId) client.sessionId = msg.sessionId;
      if (msg.personaId) client.personaId = msg.personaId;
      break;
    case 'typing.start':
    case 'typing.stop':
      broadcast(
        {
          type: msg.type,
          data: { clientId: client.id, sessionId: msg.sessionId },
          timestamp: new Date().toISOString(),
          clientId: client.id,
        },
        client.id,
      );
      break;
    default:
      break;
  }
}
