# Moltbot Talent — AI Virtual Talent Platform

**Transform Moltbot into domain-expert digital employees**

[![Moltbot Compatible](https://img.shields.io/badge/Moltbot-Compatible-FF4500?style=for-the-badge)](https://github.com/moltbot/moltbot)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

## Overview

Moltbot Talent extends [Moltbot](https://github.com/moltbot/moltbot) to create **AI Virtual Talent** — specialized AI assistants that operate as domain experts across IT Operations, Cloud Architecture, Security, DevOps, and more.

Rather than generic chatbots, each Moltbot Talent instance:
- Is configured with domain-specific knowledge, workflows, and best practices
- Performs SME-level tasks with contextual understanding
- Integrates with enterprise systems (ServiceNow, Jira, Salesforce, etc.)
- Operates with full audit trails and approval workflows
- Can be hired out via the built-in Agent Marketplace

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOLTBOT GATEWAY                          │
│                 (existing infrastructure)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │               GUI — MANAGEMENT CONSOLE               │  │
│  │  React SPA (port 5173) + Express API (port 3001)     │  │
│  │  Dashboard │ Personas │ Workflows │ Marketplace       │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              TALENT ORCHESTRATOR                     │  │
│  │  • Persona router (IT Ops, Security, DevOps, etc.)   │  │
│  │  • Context assembler (RAG + session + tools)         │  │
│  │  • Approval gate manager                             │  │
│  │  • Multi-agent workflow engine                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ IT Ops    │  │ Security  │  │ Bug       │  ...         │
│  │ Specialist│  │ Auditor   │  │ Triager   │              │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘              │
│        │              │              │                     │
│  ┌─────▼──────────────▼──────────────▼─────┐              │
│  │         KNOWLEDGE LAYER                 │              │
│  │  • Vector DB (domain docs, runbooks)    │              │
│  │  • Procedure library                    │              │
│  │  • Policy documents                     │              │
│  └─────────────────────────────────────────┘              │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         ORGO — DESKTOP INFRASTRUCTURE               │  │
│  │  Workspaces │ Cloud VMs │ Templates │ AI Agents     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         ENTERPRISE INTEGRATIONS                     │  │
│  │  ServiceNow │ Jira │ Salesforce │ Confluence        │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm (`npm install -g pnpm`)

> **Port note:** The API defaults to port `3001`. If that port is occupied (e.g. by Docker Desktop), start it on a different port with `PORT=3002 pnpm dev:api` and update `gui/web/vite.config.ts` → `proxy.target` to match.

### Installation

```bash
git clone https://github.com/moltbot/moltbot-talent.git
cd moltbot-talent
pnpm install
```

### Start the GUI (development)

```bash
# Start both API and web dev servers
pnpm dev:gui

# Or start individually
pnpm dev:api   # API on http://localhost:3001
pnpm dev:web   # Web on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

**Default credentials:**

| Username   | Password   | Role       |
|------------|------------|------------|
| `admin`    | `admin`    | Admin      |
| `operator` | `operator` | Operator   |
| `viewer`   | `viewer`   | Viewer     |

### Ingest Knowledge (CLI)

```bash
# Ingest documents into a knowledge base
moltbot talent ingest --source ~/documents/runbooks --persona it-ops

# Query the knowledge base
moltbot talent query "How do I restart the payment service?"
```

## Project Structure

```
moltbot-talent/
├── gui/                         # Web management console
│   ├── api/                     # Express REST + WebSocket API
│   │   └── src/
│   │       ├── index.ts         # App entry, route mounts
│   │       ├── auth.ts          # JWT middleware
│   │       ├── state.ts         # In-memory state store
│   │       ├── gateway.ts       # WebSocket gateway (/ws)
│   │       └── routes/          # One file per resource
│   └── web/                     # React SPA (Vite)
│       └── src/
│           ├── App.tsx          # Router setup
│           ├── pages/           # One component per route
│           ├── components/      # Shared UI components
│           ├── lib/api.ts       # API client
│           └── lib/auth.tsx     # Auth context
│
├── packages/
│   └── knowledge/               # RAG pipeline + vector DB integration
│       └── src/
│           ├── ingestion/       # Document processors (PDF, DOCX, Confluence)
│           ├── vectordb/        # Vector store adapters (Chroma, Qdrant, Pinecone)
│           └── retrieval/       # RAG query engine
│
├── personas/                    # Domain expert configurations
│   ├── it-ops-specialist/       # IT infrastructure & incident response
│   │   ├── IDENTITY.md          # Who the persona is
│   │   ├── SOUL.md              # Personality + communication style
│   │   ├── EXPERTISE.md         # Domain knowledge boundaries
│   │   ├── PROCEDURES.md        # Standard operating procedures
│   │   └── TOOLS.md             # Allowed tools + integrations
│   ├── security-auditor/        # Security & compliance
│   ├── bug-triager/             # Bug classification & reproduction
│   └── code-reviewer/           # Code quality & review
│
├── skills/                      # Reusable capability modules
│   ├── it-ops/                  # IT operations patterns
│   ├── enterprise-common/       # Shared approval/audit/compliance patterns
│   └── workflow-orchestration/  # Multi-agent pipeline definitions
│
├── workflows/                   # Workflow YAML definitions
│   ├── incident-response.yml
│   ├── security-audit.yml
│   └── change-management.yml
│
├── extensions/                  # Enterprise integration connectors
│   ├── servicenow/
│   └── jira/
│
└── examples/                    # Sample knowledge documents
```

## Personas

Each persona is a complete configuration that transforms Moltbot into a domain expert. Personas are defined by five Markdown files that are loaded by the orchestrator at runtime.

| Persona | ID | Description | Key Capabilities |
|---------|-----|-------------|------------------|
| IT Ops Specialist | `it-ops-specialist` | Infrastructure & incident management | Incident triage, runbook execution, system monitoring |
| Security Auditor | `security-auditor` | Threat detection & compliance | Vulnerability assessment, incident response, audit prep |
| Bug Triager | `bug-triager` | Bug classification & investigation | Reproduce issues, root-cause analysis, severity classification |
| Code Reviewer | `code-reviewer` | Code quality & review | PR reviews, best practices enforcement, architecture guidance |

### Persona File Structure

| File | Purpose |
|------|---------|
| `IDENTITY.md` | Who the persona is — name, role, scope |
| `SOUL.md` | Communication style, personality, values |
| `EXPERTISE.md` | Domain knowledge and skill boundaries |
| `PROCEDURES.md` | Step-by-step standard operating procedures |
| `TOOLS.md` | Permitted tools, integrations, and access levels |

### Creating a Persona

Via the GUI (`/personas` → **New Persona**) or directly in the `personas/` directory. The GUI auto-discovers persona directories on disk.

## Multi-Agent Workflows

Workflows orchestrate multiple personas through deterministic pipelines. Each step assigns a persona, resolves template variables from prior step outputs, and expects a specific success string.

### Built-in Workflows

| Workflow | Steps | Personas |
|----------|-------|---------|
| `incident-response` | triage → investigate → fix → verify → review | it-ops-specialist, bug-triager, code-reviewer |
| `security-audit` | scan → prioritize → fix → verify → test → review | security-auditor, code-reviewer |
| `change-management` | plan → implement → security-scan → review → deploy | it-ops-specialist, security-auditor, code-reviewer |

See `skills/workflow-orchestration/SKILL.md` for the full workflow YAML format.

### Workflow Run Lifecycle

```
pending → running → completed
                 ↘ failed
                 ↘ escalated  (requires human intervention)
                 ↘ cancelled  (stopped before completion)
```

Runs can be cancelled at any time from the Workflow Dashboard. Escalated runs require manual resolution before they can proceed.

## Knowledge Layer

The knowledge layer enables domain expertise through:

1. **Document Ingestion** — Process PDFs, DOCX, Confluence pages, wikis
2. **Vector Embeddings** — Semantic search over domain knowledge
3. **RAG Pipeline** — Retrieve relevant context for every query
4. **Continuous Updates** — Sync with source systems automatically

### Supported Vector Databases

| Database | Mode | Best For |
|----------|------|---------|
| **Chroma** | Local | Development, POC |
| **Qdrant** | Self-hosted or cloud | Production, self-managed |
| **Pinecone** | Managed cloud | Production, fully managed |

### Assigning a Knowledge Base to a Persona

In the GUI: `Personas` → select persona → `Knowledge` tab → assign a knowledge base.

Via API:
```bash
curl -X POST http://localhost:3001/api/personas/it-ops-specialist/knowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"knowledgeBaseId": "kb_001"}'
```

## Agent Marketplace

Personas can be listed on the built-in marketplace and hired by organizations under time-bound contracts.

- **List an agent** — From the Personas page, publish a persona as a marketplace agent with a specialty and hourly rate
- **Hire an agent** — Organizations browse and hire agents; contracts track hours, milestones, and messages
- **Multi-tenant** — Each organization has its own isolated view of contracts and hired agents

## Orgo — Desktop Infrastructure for AI Agents

Moltbot Talent integrates [Orgo](https://docs.orgo.ai) to give AI personas direct control over headless cloud desktops. This enables agents to perform browser-based tasks, run scripts, scrape data, test UIs, and execute multi-step workflows autonomously.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Workspaces** | Logical groups that organize computers (e.g. production, staging, research) |
| **Computers** | Headless cloud VMs with configurable RAM, CPU, and optional GPU |
| **Templates** | Pre-configured environments with setup commands, env vars, and optional git repos |
| **Actions** | Mouse, keyboard, screenshot, bash, and Python operations on running computers |
| **AI Prompt** | High-level instruction loop — the agent Sees → Decides → Acts autonomously |

### Agent Loop

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   SEE       │────▶│   DECIDE     │────▶│   ACT       │
│ screenshot  │     │ AI model     │     │ click/type/ │
│ observe UI  │     │ plan next    │     │ bash/exec   │
└──────┬──────┘     └──────────────┘     └──────┬──────┘
       │                                        │
       └────────────────────────────────────────┘
                    repeat until done
```

### Available Computer Actions

| Action | Description |
|--------|-------------|
| `screenshot` | Capture the current desktop as a PNG image |
| `click` | Click at (x, y) coordinates with optional button and double-click |
| `drag` | Drag from (x1, y1) to (x2, y2) with configurable duration |
| `type` | Type a string of text |
| `key` | Press a key or key combo (`Return`, `ctrl+c`, `alt+Tab`) |
| `scroll` | Scroll up/down/left/right by a configurable amount |
| `wait` | Pause execution for a given duration |
| `bash` | Execute a bash command and return stdout/stderr |
| `exec` | Execute Python code with optional timeout |
| `prompt` | Send a high-level instruction for the AI agent to execute autonomously |

### Orgo Configuration

Add credentials in **Settings** (`/settings`) or directly via the API:

```json
{
  "orgoApiKey": "sk_live_your_api_key",
  "orgoBaseUrl": "https://www.orgo.ai/api"
}
```

## Security

### Authentication

The GUI uses JWT authentication. Set a strong secret before deploying:

```bash
JWT_SECRET=your-long-random-secret pnpm dev:api
```

Without `JWT_SECRET`, the server starts with an insecure default and logs a warning.

### DM Security Policy

Controls how the assistant handles direct messages from unknown senders:

| Policy | Behaviour |
|--------|-----------|
| `pairing` | Unknown senders must enter a pairing code |
| `open` | All senders can interact; use per-channel allowlists for control |
| `closed` | DMs disabled; only channel interactions allowed |

Pairing codes are generated with a cryptographically secure random source (`crypto.randomBytes`).

### Sandbox Mode

AI sessions can be isolated in Docker sandboxes to contain tool execution:

| Mode | Behaviour |
|------|-----------|
| `off` | No sandboxing |
| `non-main` | Sandbox all sessions except the primary |
| `all` | Sandbox every session |

## Enterprise Integrations

Connect to enterprise systems through Moltbot extensions:

| Integration | Capabilities |
|-------------|-------------|
| **ServiceNow** | Ticket creation, status updates, SLA tracking |
| **Jira** | Issue management, sprint operations |
| **Salesforce** | CRM queries, opportunity updates |
| **Confluence** | Knowledge base sync |
| **Azure Cognitive Search** | Azure-hosted knowledge bases and sources |
| **Slack/Teams** | Via Moltbot core channels |

## Roadmap

- [x] GUI management console (React + Express)
- [x] Persona management (load, create, edit, activate)
- [x] Knowledge base CRUD with document ingestion
- [x] Approval workflow engine with grant/deny
- [x] Audit logging with filtering
- [x] Multi-agent workflow orchestration
- [x] Workflow run lifecycle (pending → running → completed/failed/escalated/cancelled)
- [x] Orgo desktop infrastructure integration
- [x] Agent Marketplace with hiring and contracts
- [x] Multi-tenant organizations
- [x] Role-based access control (admin/operator/viewer)
- [x] WebSocket real-time gateway
- [x] Azure Cognitive Search integration
- [ ] RAG pipeline implementation (packages/knowledge)
- [ ] ServiceNow live integration
- [ ] Jira live integration
- [ ] Enterprise auth (SAML/OIDC)
- [ ] Persistent storage (replace in-memory state)
- [ ] Workflow YAML hot-reload
- [ ] Agent performance analytics

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE)

---

Built with by the Moltbot community
