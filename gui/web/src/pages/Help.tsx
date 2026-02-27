import {
  Store,
  FileSignature,
  Building2,
  LayoutDashboard,
  Users,
  MessageSquare,
  MessageCircle,
  Radio,
  Webhook,
  Clock,
  BookOpen,
  Puzzle,
  ShieldCheck,
  FileText,
  Plug,
  Globe,
  Shield,
  BarChart3,
  HeartPulse,
  Settings,
  UserCog,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  ArrowRight,
  Bot,
  Briefcase,
  Star,
  DollarSign,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Section {
  id: string;
  title: string;
  icon: typeof Store;
  color: string;
  description: string;
  path: string;
  steps: string[];
  tips?: string[];
}

const quickStart: { title: string; description: string; icon: typeof Zap }[] = [
  {
    title: 'Browse the Marketplace',
    description: 'Explore available AI agents by specialty, rating, and hourly rate. Use filters to find the perfect match for your project.',
    icon: Store,
  },
  {
    title: 'Hire an Agent',
    description: 'Select an available agent, choose your organization, define the contract scope, and confirm the hire. The agent is exclusively yours for the duration.',
    icon: Briefcase,
  },
  {
    title: 'Manage the Contract',
    description: 'Track progress with milestones, log hours, exchange messages, and complete the contract with a rating when the work is done.',
    icon: FileSignature,
  },
  {
    title: 'Agent Released',
    description: 'Once the contract is completed or cancelled, the agent becomes available again in the marketplace for the next engagement.',
    icon: Star,
  },
];

const sections: Section[] = [
  {
    id: 'marketplace',
    title: 'Agent Marketplace',
    icon: Store,
    color: 'text-accent',
    description: 'Browse and hire specialist AI agents as freelancers. Each agent has a unique specialty, skill set, and track record.',
    path: '/marketplace',
    steps: [
      'Navigate to the Marketplace page from the sidebar',
      'Use the search bar to find agents by name, skill, or tag',
      'Filter by specialty (DevOps, Security, Frontend, etc.) or availability status',
      'Review agent cards — each shows rating, completed jobs, success rate, and hourly rate',
      'Click "Hire" on an available agent to open the hiring form',
      'Select your organization, provide a contract title and description, set estimated hours',
      'Confirm the hire — a contract is created and the agent status changes to "hired"',
    ],
    tips: [
      'Agents marked "hired" are currently engaged on another contract',
      'The estimated cost is calculated from hourly rate × estimated hours',
      'Stats at the top give you a quick overview of marketplace health',
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts',
    icon: FileSignature,
    color: 'text-green-500',
    description: 'Manage the full lifecycle of agent engagements — from active work to completion and review.',
    path: '/contracts',
    steps: [
      'View all contracts with status filter pills (active, pending, paused, completed, etc.)',
      'Click a contract row to expand and see full details',
      'Log hours worked using the hours input and "Log Hours" button',
      'Track milestones — each shows status, amount, and due date',
      'Exchange messages with the agent through the inline chat',
      'Use "Pause" to temporarily halt work, "Resume" to restart',
      'Click "Complete" to finish the contract — provide a rating (1-5 stars) and feedback',
      'Completed contracts release the agent back to the marketplace',
    ],
    tips: [
      'Cancelling a contract also releases the agent immediately',
      'The total cost updates automatically when you log hours',
      'Completed contracts show the rating and feedback in the expanded view',
    ],
  },
  {
    id: 'organizations',
    title: 'Organizations',
    icon: Building2,
    color: 'text-yellow-500',
    description: 'Manage tenant organizations that hire agents. Each org has a plan, balance, and team members.',
    path: '/organizations',
    steps: [
      'View all organizations with plan badges, member counts, and balances',
      'Click "New Organization" to create one — set name, industry, plan, and contact email',
      'Expand an organization to see detailed info, members, and associated contracts',
      'Add team members by user ID using the member input',
      'Remove members with the remove button next to each member',
      'Edit organization details (name, industry, plan, email) with the pencil icon',
      'Delete an organization with the trash icon (members are unlinked)',
    ],
    tips: [
      'Plans: Free (1 contract), Starter (3), Pro (10), Enterprise (unlimited)',
      'Each plan comes with a default balance — Pro: $5,000, Enterprise: $25,000',
      'The max active contracts limit is enforced when hiring agents',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-accent',
    description: 'Get a bird\'s-eye view of system activity, stats, and health at a glance.',
    path: '/',
    steps: [
      'View key metrics: active personas, sessions, integrations, and more',
      'Check recent activity feed for the latest events',
      'Monitor system health status in real time',
    ],
  },
  {
    id: 'personas',
    title: 'Personas',
    icon: Users,
    color: 'text-purple-500',
    description: 'Create and manage AI personas — each with its own soul, expertise, procedures, and tools.',
    path: '/personas',
    steps: [
      'Discover personas from the file system or create new ones manually',
      'Each persona has SOUL, EXPERTISE, PROCEDURES, and TOOLS definitions',
      'Activate a persona to make it available for sessions and channels',
      'Configure the persona\'s Brain (LLM routing) for intelligent model selection',
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions',
    icon: MessageSquare,
    color: 'text-blue-500',
    description: 'Interactive conversations with AI personas. Create, manage, and review chat sessions.',
    path: '/sessions',
    steps: [
      'Create a new session by selecting a persona and providing a label',
      'Send messages and receive AI responses in real time',
      'Filter sessions by status (active, archived)',
      'Delete sessions you no longer need',
    ],
  },
  {
    id: 'webchat',
    title: 'WebChat',
    icon: MessageCircle,
    color: 'text-teal-500',
    description: 'Embedded web chat interface for direct conversations with the AI system.',
    path: '/webchat',
    steps: [
      'Open the WebChat page for a full-screen chat experience',
      'Type messages and interact with the configured persona',
      'View conversation history within the session',
    ],
  },
  {
    id: 'channels',
    title: 'Channels',
    icon: Radio,
    color: 'text-orange-500',
    description: 'Connect personas to external communication platforms (Slack, Teams, Discord, etc.).',
    path: '/channels',
    steps: [
      'Create a channel by selecting type, persona, and providing config details',
      'Test the channel connection with the test button',
      'Edit channel configuration or delete channels as needed',
    ],
  },
  {
    id: 'hooks',
    title: 'Hooks',
    icon: Webhook,
    color: 'text-rose-500',
    description: 'Event-driven hooks that trigger actions when specific events occur in the system.',
    path: '/hooks',
    steps: [
      'Create hooks for specific events (message received, session created, etc.)',
      'Configure the hook type (webhook URL, script, etc.) and target',
      'Enable/disable hooks without deleting them',
      'Test hooks to verify they fire correctly',
    ],
  },
  {
    id: 'cron',
    title: 'Scheduled Tasks',
    icon: Clock,
    color: 'text-indigo-500',
    description: 'Schedule recurring tasks using cron expressions — automated persona actions on a timer.',
    path: '/cron',
    steps: [
      'Create a task with a cron schedule (e.g., "0 9 * * 1-5" for weekday mornings)',
      'Assign a persona and define the action to perform',
      'Enable/disable tasks or trigger them manually for testing',
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge Base',
    icon: BookOpen,
    color: 'text-emerald-500',
    description: 'Ingest documents into vector-backed knowledge bases for RAG (retrieval-augmented generation).',
    path: '/knowledge',
    steps: [
      'Create a knowledge base with a name and domain',
      'Ingest documents from a source path into the knowledge base',
      'Query the knowledge base to test retrieval quality',
      'View ingestion stats and document counts',
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    icon: Puzzle,
    color: 'text-cyan-500',
    description: 'Manage callable skills (tools/functions) that personas can invoke during conversations.',
    path: '/skills',
    steps: [
      'View all registered skills with their categories and status',
      'Create new skills with a name, description, category, and source',
      'Enable or disable skills to control availability',
    ],
  },
  {
    id: 'approvals',
    title: 'Approvals',
    icon: ShieldCheck,
    color: 'text-amber-500',
    description: 'Review and approve/deny actions that require human authorization before execution.',
    path: '/approvals',
    steps: [
      'View pending approvals in the queue',
      'Review the action details and context',
      'Grant or deny each approval with an optional reason',
      'Filter by status to see historical approvals',
    ],
  },
  {
    id: 'audit',
    title: 'Audit Log',
    icon: FileText,
    color: 'text-slate-500',
    description: 'Comprehensive audit trail of all system actions for compliance and debugging.',
    path: '/audit',
    steps: [
      'Browse the chronological audit log of all system events',
      'Filter by actor, action type, or date range',
      'Review detailed event payloads for investigation',
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Plug,
    color: 'text-violet-500',
    description: 'Connect to external services and APIs — ServiceNow, Jira, PagerDuty, and more.',
    path: '/integrations',
    steps: [
      'Add integrations by selecting type and providing configuration',
      'Test the connection to verify credentials',
      'Edit or remove integrations as needed',
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: Globe,
    color: 'text-pink-500',
    description: 'Inbound webhook endpoints that allow external services to push events into the system.',
    path: '/webhooks',
    steps: [
      'Create webhook endpoints with a unique path and optional secret',
      'Assign a target persona to handle incoming payloads',
      'Test webhooks by triggering them manually',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    color: 'text-red-500',
    description: 'Manage security settings, pairing codes, and channel allowlists.',
    path: '/security',
    steps: [
      'Configure global security settings',
      'Generate and manage pairing codes for device/channel auth',
      'Set up allowlists per channel to restrict access',
    ],
  },
  {
    id: 'usage',
    title: 'Usage & Billing',
    icon: BarChart3,
    color: 'text-lime-500',
    description: 'Monitor API usage, token consumption, and cost tracking across the system.',
    path: '/usage',
    steps: [
      'View usage metrics by time period, persona, or model',
      'Track token consumption and estimated costs',
      'Export usage data for billing and reporting',
    ],
  },
  {
    id: 'users',
    title: 'Users',
    icon: UserCog,
    color: 'text-sky-500',
    description: 'Admin-only user management — create accounts, assign roles, reset passwords.',
    path: '/users',
    steps: [
      'View all system users with their roles and status',
      'Create new users with username, email, and role (admin, operator, viewer)',
      'Reset passwords or delete user accounts',
      'Edit user details and role assignments',
    ],
    tips: [
      'Only admin users can access the Users page',
      'Roles: admin (full access), operator (manage resources), viewer (read-only)',
    ],
  },
  {
    id: 'health',
    title: 'Health',
    icon: HeartPulse,
    color: 'text-emerald-400',
    description: 'Monitor system component health, uptime, and service status.',
    path: '/health',
    steps: [
      'View overall system health status',
      'Check individual component health (API, WebSocket, integrations)',
      'Monitor uptime and response times',
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    color: 'text-muted',
    description: 'Configure agent runtime, API keys, vector database, embeddings, and other system parameters.',
    path: '/settings',
    steps: [
      'Set your LLM API key, base URL, and organization ID in Agent Runtime',
      'Configure advanced model parameters (temperature, max tokens, top-p)',
      'Set up the vector database connection for knowledge bases',
      'Configure embedding model settings',
      'Adjust chunking, media processing, browser, and sandbox options',
    ],
  },
];

export function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.steps.some((st) => st.toLowerCase().includes(search.toLowerCase())),
      )
    : sections;

  const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Bot className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-2xl font-bold">Moltbot Talent Help Center</h1>
        <p className="mt-2 text-sm text-muted max-w-lg mx-auto">
          A multi-tenant SaaS platform where companies hire specialist AI agents as freelancers.
          Browse the marketplace, hire an agent, manage contracts, and release them when the job is done.
        </p>
      </div>

      {/* Quick Start */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Start</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickStart.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="relative rounded-xl border border-border bg-card p-4">
                <div className="absolute -top-2.5 left-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {i + 1}
                </div>
                <Icon className="mb-2 h-5 w-5 text-accent" />
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs text-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Concepts */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Key Concepts</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold">Agents</h3>
            </div>
            <p className="text-xs text-muted">
              Specialist AI agents listed on the marketplace. Each has a unique specialty
              (DevOps, Security, ML/AI, etc.), skills, certifications, hourly rate, and availability status.
              When hired, they&apos;re exclusively assigned to your contract.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-semibold">Contracts</h3>
            </div>
            <p className="text-xs text-muted">
              A contract binds an agent to an organization for a defined scope of work.
              Contracts go through stages: pending → active → completed/cancelled.
              Track milestones, log hours, and communicate via messages.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-semibold">Organizations</h3>
            </div>
            <p className="text-xs text-muted">
              Tenant organizations (companies) that hire agents. Each has a plan tier
              (Free, Starter, Pro, Enterprise) determining how many agents they can hire simultaneously,
              plus a balance, team members, and contract history.
            </p>
          </div>
        </div>
      </div>

      {/* Agent Lifecycle */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Agent Hiring Lifecycle</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { label: 'Available', color: 'bg-green-500/10 text-green-500' },
            { label: '→', color: 'text-muted' },
            { label: 'Hired', color: 'bg-yellow-500/10 text-yellow-500' },
            { label: '→', color: 'text-muted' },
            { label: 'Working (Active Contract)', color: 'bg-blue-500/10 text-blue-500' },
            { label: '→', color: 'text-muted' },
            { label: 'Contract Completed', color: 'bg-accent/10 text-accent' },
            { label: '→', color: 'text-muted' },
            { label: 'Released → Available', color: 'bg-green-500/10 text-green-500' },
          ].map((step, i) =>
            step.label === '→' ? (
              <ArrowRight key={i} className="h-3 w-3 text-muted shrink-0" />
            ) : (
              <span key={i} className={`rounded-full px-2.5 py-1 font-medium ${step.color}`}>
                {step.label}
              </span>
            ),
          )}
        </div>
        <p className="text-xs text-muted">
          After a contract is completed (with rating and feedback) or cancelled, the agent is automatically
          released back to the marketplace and becomes available for the next engagement.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          placeholder="Search help topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {/* Feature Sections */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Feature Guide</h2>
        {filtered.map((section) => {
          const Icon = section.icon;
          const isOpen = openSection === section.id;

          return (
            <div
              key={section.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => toggle(section.id)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/5 transition-colors"
              >
                <Icon className={`h-4 w-4 shrink-0 ${section.color}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <p className="text-xs text-muted truncate">{section.description}</p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border p-4 space-y-3">
                  <p className="text-sm text-muted">{section.description}</p>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      How to use
                    </h4>
                    <ol className="space-y-1 text-xs">
                      {section.steps.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[9px] font-bold text-accent">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {section.tips && (
                    <div className="rounded-lg bg-accent/5 p-3 space-y-1">
                      <h4 className="text-xs font-semibold text-accent">Tips</h4>
                      <ul className="space-y-0.5 text-xs text-muted">
                        {section.tips.map((tip, i) => (
                          <li key={i} className="flex gap-1.5">
                            <Zap className="h-3 w-3 shrink-0 text-accent mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link
                    to={section.path}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                  >
                    Go to {section.title} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted">
          No help topics match your search.
        </div>
      )}

      {/* Keyboard shortcuts & misc */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Good to Know</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Authentication</h3>
            <ul className="space-y-1 text-muted">
              <li>• All pages require login except the login and register screens</li>
              <li>• Sessions expire after 24 hours — you'll be redirected to login</li>
              <li>• Three roles: <strong>admin</strong> (full access), <strong>operator</strong> (manage resources), <strong>viewer</strong> (read-only)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Theme</h3>
            <ul className="space-y-1 text-muted">
              <li>• Click the theme toggle in the header to cycle: Light → Dark → System</li>
              <li>• System mode follows your OS preference automatically</li>
              <li>• Your preference is saved in local storage</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Demo Credentials</h3>
            <ul className="space-y-1 text-muted">
              <li>• Admin: <code className="rounded bg-muted/20 px-1">admin</code> / <code className="rounded bg-muted/20 px-1">admin</code></li>
              <li>• Operator: <code className="rounded bg-muted/20 px-1">operator</code> / <code className="rounded bg-muted/20 px-1">operator</code></li>
              <li>• Viewer: <code className="rounded bg-muted/20 px-1">viewer</code> / <code className="rounded bg-muted/20 px-1">viewer</code></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Agent Specialties</h3>
            <ul className="space-y-1 text-muted">
              <li>• DevOps, Security, Data Engineering, Frontend, Backend</li>
              <li>• ML/AI, Cloud Architecture, QA & Testing</li>
              <li>• Technical Writing, Project Management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
