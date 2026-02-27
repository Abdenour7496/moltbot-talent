# Moltbot Talent GUI

Web-based management console for Moltbot Talent.

## Packages

| Package | Description | Default Port |
|---------|-------------|-------------|
| `gui-api` | Express REST API + WebSocket server | `3001` |
| `gui-web` | React SPA (Vite) | `5173` |

The Vite dev server proxies all `/api` requests to the Express backend automatically.

> **Port conflict:** Port `3001` may be occupied by Docker Desktop or WSL. Start the API on a different port with `PORT=3002 pnpm dev:api` and update `gui/web/vite.config.ts` → `server.proxy['/api'].target` to match.

## Quick Start

From the repository root:

```bash
pnpm install

# Start both servers together
pnpm dev:gui

# Or individually
pnpm dev:api   # → http://localhost:3001
pnpm dev:web   # → http://localhost:5173
```

Open **http://localhost:5173**. Default credentials: `admin / admin`.

## Authentication

All API routes except `POST /api/auth/login` and `POST /api/auth/register` require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from the login endpoint and stored in `localStorage` as `auth_token`. A 401 response from any protected endpoint redirects the browser to `/login`.

Set `JWT_SECRET` before running in any non-local environment:

```bash
JWT_SECRET=your-long-random-secret pnpm dev:api
```

### Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Full access including user management |
| `operator` | All operational actions; no user management |
| `viewer` | Read-only access |

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Stats overview, activity feed, recent workflows, pending approvals, system health |
| `/personas` | Personas | Load, create, edit, and activate personas; configure brain (LLM routing) |
| `/personas/:id/edit` | Persona Editor | Edit all five persona files (Identity, Soul, Expertise, Procedures, Tools) |
| `/knowledge` | Knowledge Base | Create knowledge bases, ingest documents, run queries, assign to personas |
| `/approvals` | Approvals | Approval queue — grant or deny pending requests |
| `/audit` | Audit Log | Filterable event log with expandable details |
| `/sessions` | Sessions | Chat session management; view message history |
| `/agent-chat` | Agent Chat | Interactive chat with a selected persona; live progress sidebar |
| `/webchat` | WebChat | End-user-facing chat widget |
| `/workflows` | Workflow Dashboard | Monitor and manage multi-agent workflow runs; cancel or remove runs |
| `/skills` | Skills | Install, configure, enable/disable capability modules |
| `/channels` | Channels | Configure inbound/outbound communication channels |
| `/hooks` | Hooks | Event-driven webhook triggers |
| `/webhooks` | Webhooks | Inbound webhook surface definitions |
| `/cron` | Scheduled Tasks | Cron-style recurring tasks per persona |
| `/integrations` | Integrations | Enterprise system connections (ServiceNow, Jira, etc.) |
| `/security` | Security | DM policy, auth mode, sandbox mode, pairing codes, channel allowlists |
| `/health` | Health | System component health and subsystem status |
| `/gateway` | Gateway | WebSocket gateway status and connected clients |
| `/usage` | Usage | Token and request usage metrics |
| `/marketplace` | Marketplace | Browse and hire AI agents; list personas as agents |
| `/contracts` | Contracts | Manage active/completed contracts, milestones, hours, messages |
| `/organizations` | Organizations | Tenant/organization management (admin only) |
| `/org/portal` | Org Portal | Organization-scoped dashboard for hired agents and contracts |
| `/org/agents` | Org Agents | Agents hired by the current organization |
| `/orgo` | Orgo Computers | Workspaces, cloud VMs, templates, and AI agent control panel |
| `/users` | Users | User management (admin only) — create, role assignment, activate/deactivate |
| `/settings` | Settings | System-wide configuration (vector DB, embedding model, Orgo keys, etc.) |
| `/help` | Help | Documentation and quick-reference |

## WebSocket Gateway

The API exposes a WebSocket endpoint at `ws://localhost:3001/ws` for real-time events.

### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `ping` | `{}` | Heartbeat; server replies with `pong` |
| `identify` | `{ clientType, sessionId?, personaId? }` | Register client type and session context |
| `typing.start` | `{ sessionId }` | Broadcast typing indicator to other clients |
| `typing.stop` | `{ sessionId }` | Stop typing indicator |

### Server → Client Events

| Type | Description |
|------|-------------|
| `presence.update` | Client connect/disconnect; includes `totalClients` count |
| `session.message` | New message in a session |
| `agent.thinking` | Agent is processing |
| `agent.streaming` | Agent is streaming a response |
| `agent.done` | Agent finished responding |
| `agent.error` | Agent encountered an error |
| `approval.requested` | New approval request created |
| `approval.resolved` | Approval granted or denied |
| `audit.entry` | New audit log entry |
| `health.update` | System health status changed |
| `skill.installed` | New skill installed |
| `usage.update` | Usage metrics updated |
| `pong` | Reply to client `ping` |

## API Reference

All endpoints require `Authorization: Bearer <token>` unless noted. Base path: `/api`.

---

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | Public | Login; returns `{ token, user }` |
| `POST` | `/auth/register` | Public | Register user (optionally with an org); returns `{ token, user, tenant? }` |
| `GET` | `/auth/me` | Required | Current user profile |
| `PUT` | `/auth/profile` | Required | Update display name, email, avatar |
| `PUT` | `/auth/password` | Required | Change password |

---

### Users *(admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user |
| `POST` | `/users` | Create user |
| `PUT` | `/users/:id` | Update role, active status, display name |
| `DELETE` | `/users/:id` | Delete user (cannot delete self) |
| `POST` | `/users/:id/reset-password` | Reset user password |

---

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard` | Aggregated stats (personas, sessions, approvals, workflows, contracts, etc.) |

---

### Personas

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/personas` | List all loaded personas |
| `GET` | `/personas/:id` | Get persona detail (includes all markdown file contents) |
| `POST` | `/personas/discover` | Scan personas directory and load any new ones |
| `POST` | `/personas/load` | Load a persona from a filesystem path |
| `POST` | `/personas/create` | Create a new persona (writes files to disk) |
| `PUT` | `/personas/:id` | Update persona files and/or config |
| `POST` | `/personas/:id/activate` | Set as the active persona (deactivates others) |
| `POST` | `/personas/:id/chat` | Send a message to a persona |
| `GET` | `/personas/:id/progress` | Get persona status and capability summary |
| `GET` | `/personas/:id/knowledge` | Get the knowledge base assigned to this persona |
| `POST` | `/personas/:id/knowledge` | Assign a knowledge base to this persona |
| `DELETE` | `/personas/:id/knowledge` | Detach the knowledge base from this persona |

---

### Brain (LLM Routing per Persona)

Base path: `/personas/:personaId/brain`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get brain config (routing strategy + LLM entries; API keys masked) |
| `PUT` | `/` | Update routing strategy or fallback LLM ID |
| `GET` | `/llms` | List LLM entries |
| `POST` | `/llms` | Add a new LLM entry |
| `PUT` | `/llms/reorder` | Bulk-update priority order by providing an ordered array of IDs |
| `PUT` | `/llms/:llmId` | Update an LLM entry |
| `DELETE` | `/llms/:llmId` | Remove an LLM entry |
| `POST` | `/llms/:llmId/test` | Test connectivity to an LLM (simulated) |

> **Note:** `PUT /llms/reorder` must be defined before `PUT /llms/:llmId` in the router to prevent Express matching `reorder` as the `:llmId` parameter.

---

### Knowledge Bases

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/knowledge` | List knowledge bases |
| `POST` | `/knowledge` | Create knowledge base |
| `GET` | `/knowledge/:id/stats` | Get stats (document count, chunk count, etc.) |
| `POST` | `/knowledge/:id/ingest` | Ingest documents from a source path |
| `POST` | `/knowledge/:id/query` | Query the knowledge base |
| `DELETE` | `/knowledge/:id` | Delete knowledge base |

---

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/approvals` | List approvals (optional `?status=pending\|granted\|denied`) |
| `GET` | `/approvals/:id` | Get a single approval |
| `POST` | `/approvals/:id/grant` | Grant an approval |
| `POST` | `/approvals/:id/deny` | Deny an approval (optional `reason` in body) |

---

### Audit Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/audit` | Audit log (filters: `action`, `persona`, `outcome`, `since`) |

---

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sessions` | List sessions (optional `?status=`) |
| `GET` | `/sessions/:id` | Get session with message history |
| `POST` | `/sessions` | Create session (`label`, `personaId`, `channelId?`) |
| `POST` | `/sessions/:id/message` | Add a message to a session |
| `DELETE` | `/sessions/:id` | Delete session |

---

### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/channels` | List channels |
| `POST` | `/channels` | Create channel |
| `PUT` | `/channels/:id` | Update channel config |
| `DELETE` | `/channels/:id` | Delete channel |
| `POST` | `/channels/:id/test` | Test channel connectivity |

---

### Hooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/hooks` | List hooks |
| `POST` | `/hooks` | Create hook |
| `PUT` | `/hooks/:id` | Update hook |
| `DELETE` | `/hooks/:id` | Delete hook |
| `POST` | `/hooks/:id/test` | Fire a test event through the hook |

---

### Webhooks (inbound surface)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/webhooks` | List webhook definitions |
| `POST` | `/webhooks` | Create webhook |
| `PUT` | `/webhooks/:id` | Update webhook |
| `DELETE` | `/webhooks/:id` | Delete webhook |
| `POST` | `/webhooks/:id/trigger` | Trigger a test invocation |

---

### Cross-Persona Communications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/comms` | List messages (optional `?persona=`) |
| `POST` | `/comms/send` | Send a message from one persona to another |

---

### Cron / Scheduled Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cron` | List scheduled tasks |
| `POST` | `/cron` | Create task (`name`, `personaId`, `schedule`, `action`) |
| `PUT` | `/cron/:id` | Update task |
| `DELETE` | `/cron/:id` | Delete task |
| `POST` | `/cron/:id/trigger` | Manually trigger a task immediately |

---

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/skills` | List installed skills |
| `GET` | `/skills/:id` | Get skill detail |
| `POST` | `/skills` | Install a skill |
| `PUT` | `/skills/:id` | Update skill (enable/disable, config, description) |
| `DELETE` | `/skills/:id` | Remove skill |

---

### Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/security` | Get security config |
| `PUT` | `/security` | Update security config |
| `GET` | `/security/pairing` | List pairing codes |
| `POST` | `/security/pairing` | Generate a new pairing code |
| `POST` | `/security/pairing/:id/approve` | Approve a pairing code (adds to channel allowlist) |
| `POST` | `/security/pairing/:id/deny` | Deny a pairing code |
| `GET` | `/security/allowlists` | Get all channel allowlists |
| `PUT` | `/security/allowlists/:channel` | Update a channel's allowlist |

---

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/integrations` | List integrations |
| `POST` | `/integrations` | Create integration |
| `PUT` | `/integrations/:id` | Update integration config |
| `DELETE` | `/integrations/:id` | Delete integration |

---

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | Public | Simple liveness check — `{ status: "ok", uptime }` |
| `GET` | `/health/details` | Required | Full system health report (components, subsystems) |

---

### Usage

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/usage` | Usage metrics (filters: `persona`, `from`, `to`, `granularity`) |

---

### Gateway

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/gateway` | WebSocket gateway status and connected client list |

---

### Workflow Runs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workflow-runs` | List workflow runs (optional `?status=`) |
| `GET` | `/workflow-runs/:id` | Get a single run with all step details |
| `POST` | `/workflow-runs` | Create a workflow run |
| `PUT` | `/workflow-runs/:runId/steps/:stepId` | Update a step status/output (used by the engine) |
| `POST` | `/workflow-runs/:id/cancel` | Cancel a pending or running workflow run |
| `DELETE` | `/workflow-runs/:id` | Delete a workflow run record |

**Workflow run statuses:** `pending` → `running` → `completed` / `failed` / `escalated` / `cancelled`

**Step statuses:** `pending` → `running` → `done` / `failed` / `escalated` / `retrying` / `cancelled`

---

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/marketplace` | List agent listings (filters: `specialty`, `availability`, `minRate`, `maxRate`, `search`) |
| `GET` | `/marketplace/specialties` | Agent counts grouped by specialty |
| `GET` | `/marketplace/stats` | Marketplace stats (total, available, avg rating, contracts) |
| `GET` | `/marketplace/:id` | Get agent listing detail |
| `POST` | `/marketplace` | Create a new agent listing |
| `POST` | `/marketplace/from-persona` | Auto-generate a listing from an existing persona |
| `PUT` | `/marketplace/:id` | Update a listing |
| `DELETE` | `/marketplace/:id` | Remove a listing |
| `POST` | `/marketplace/:id/hire` | Hire an agent — creates a contract |

---

### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/contracts` | List contracts (filters: `tenantId`, `agentId`, `status`) |
| `GET` | `/contracts/:id` | Get contract detail |
| `PUT` | `/contracts/:id` | Update contract (title, description, estimatedHours) |
| `POST` | `/contracts/:id/message` | Add a message to the contract thread |
| `POST` | `/contracts/:id/complete` | Complete contract (optional rating + feedback) |
| `POST` | `/contracts/:id/cancel` | Cancel contract and release the agent |
| `POST` | `/contracts/:id/pause` | Pause an active contract |
| `POST` | `/contracts/:id/resume` | Resume a paused contract |
| `PUT` | `/contracts/:id/hours` | Log hours worked |
| `POST` | `/contracts/:id/milestones` | Add a milestone |
| `PUT` | `/contracts/:id/milestones/:msId` | Update a milestone (status, title, amount) |

---

### Tenants / Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tenants` | List tenants |
| `GET` | `/tenants/:id` | Get tenant |
| `POST` | `/tenants` | Create tenant |
| `PUT` | `/tenants/:id` | Update tenant |
| `DELETE` | `/tenants/:id` | Delete tenant |
| `POST` | `/tenants/:id/members` | Add a user to a tenant |
| `DELETE` | `/tenants/:id/members/:userId` | Remove a user from a tenant |

---

### Org Portal *(org-scoped)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/org/portal` | Org dashboard summary |
| `GET` | `/org/agents` | Agents hired by the org |
| `GET` | `/org/available-agents` | Browse available agents (marketplace view) |
| `POST` | `/org/hire/:agentId` | Hire an agent for the org |
| `GET` | `/org/personas` | Personas belonging to the org |
| `GET` | `/org/contracts` | Contracts scoped to the org |
| `PUT` | `/org/profile` | Update org profile (name, industry, contact email) |

---

### Azure Knowledge Bases

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/azure/knowledge-bases` | List Azure Cognitive Search knowledge bases |
| `POST` | `/azure/knowledge-bases` | Create Azure knowledge base |
| `GET` | `/azure/knowledge-bases/:id` | Get knowledge base |
| `PUT` | `/azure/knowledge-bases/:id` | Update knowledge base |
| `DELETE` | `/azure/knowledge-bases/:id` | Delete knowledge base |
| `POST` | `/azure/knowledge-bases/:id/query` | Query an Azure knowledge base |
| `GET` | `/azure/knowledge-sources` | List Azure knowledge sources |
| `POST` | `/azure/knowledge-sources` | Create knowledge source |
| `DELETE` | `/azure/knowledge-sources/:id` | Delete knowledge source |

---

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/settings` | Get all settings |
| `PUT` | `/settings` | Replace all settings |
| `PATCH` | `/settings` | Merge partial settings update |

---

### Orgo

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/orgo` | Overview (config status, workspace/computer/template counts) |
| `GET` | `/orgo/workspaces` | List workspaces |
| `POST` | `/orgo/workspaces` | Create workspace |
| `GET` | `/orgo/workspaces/:id` | Get workspace |
| `DELETE` | `/orgo/workspaces/:id` | Delete workspace (cascades to computers) |
| `GET` | `/orgo/computers` | List computers (optional `?workspaceId=`) |
| `POST` | `/orgo/computers` | Create computer |
| `GET` | `/orgo/computers/:id` | Get computer |
| `DELETE` | `/orgo/computers/:id` | Destroy computer |
| `POST` | `/orgo/computers/:id/start` | Start a stopped computer |
| `POST` | `/orgo/computers/:id/stop` | Stop a running computer |
| `POST` | `/orgo/computers/:id/restart` | Restart computer |
| `GET` | `/orgo/computers/:id/screenshot` | Capture desktop screenshot |
| `POST` | `/orgo/computers/:id/click` | Mouse click at (x, y) |
| `POST` | `/orgo/computers/:id/drag` | Drag from one point to another |
| `POST` | `/orgo/computers/:id/type` | Type text |
| `POST` | `/orgo/computers/:id/key` | Press a key or key combo |
| `POST` | `/orgo/computers/:id/scroll` | Scroll in a direction |
| `POST` | `/orgo/computers/:id/wait` | Wait/pause for a duration |
| `POST` | `/orgo/computers/:id/bash` | Execute a bash command |
| `POST` | `/orgo/computers/:id/exec` | Execute Python code |
| `POST` | `/orgo/computers/:id/prompt` | Send high-level AI instruction (autonomous loop) |
| `GET` | `/orgo/computers/:id/actions` | Action history for a computer |
| `GET` | `/orgo/templates` | List templates |
| `POST` | `/orgo/templates` | Create template |
| `GET` | `/orgo/templates/:id` | Get template |
| `PUT` | `/orgo/templates/:id` | Update template |
| `POST` | `/orgo/templates/:id/build` | Build template |
| `DELETE` | `/orgo/templates/:id` | Delete template |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Icons | Lucide React |
| Backend framework | Express 5 |
| Language | TypeScript 5 |
| Dev runner | tsx (watch mode) |
| WebSocket | ws |
| Auth | JWT (jsonwebtoken) |
| Theme | Dark mode — zinc/slate palette |

## State Model

The API server uses **in-memory state** (JavaScript `Map` objects). All data resets when the server restarts. This is intentional for the current development phase. Production deployment will require a persistence layer (PostgreSQL, Redis, etc.).

Key state collections:
- `personas` — Loaded persona configs and markdown content
- `knowledgeBases` — Knowledge base metadata
- `sessions` / `auditLog` / `approvals` — Operational data
- `agentListings` / `contracts` — Marketplace and hiring data
- `users` / `tenants` — Auth and multi-tenancy
- `workflowRuns` — Multi-agent pipeline execution records
- `brainConfigs` — Per-persona LLM routing configuration
