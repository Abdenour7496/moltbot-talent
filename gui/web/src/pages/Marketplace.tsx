import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { KnowledgeBasePanel } from '@/components/personas/KnowledgeBasePanel';
import {
  Search,
  Star,
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  ShoppingBag,
  TrendingUp,
  Users,
  Award,
  Code2,
  Shield,
  Database,
  Layout,
  Server,
  Brain,
  Cloud,
  TestTube2,
  FileText,
  Clipboard,
  Plus,
  Bot,
  Pencil,
  Save,
  X,
  Settings,
} from 'lucide-react';

interface AgentListing {
  id: string;
  name: string;
  title: string;
  specialty: string;
  tags: string[];
  description: string;
  hourlyRate: number;
  rating: number;
  completedJobs: number;
  successRate: number;
  availability: string;
  currentContractId?: string;
  skills: string[];
  languages: string[];
  certifications: string[];
}

interface Stats {
  totalAgents: number;
  availableAgents: number;
  hiredAgents: number;
  avgRating: number;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalRevenue: number;
}

const specialtyIcons: Record<string, typeof Code2> = {
  devops: Server,
  security: Shield,
  'data-engineering': Database,
  frontend: Layout,
  backend: Code2,
  'ml-ai': Brain,
  'cloud-architecture': Cloud,
  'qa-testing': TestTube2,
  'technical-writing': FileText,
  'project-management': Clipboard,
};

const specialtyLabels: Record<string, string> = {
  devops: 'DevOps',
  security: 'Security',
  'data-engineering': 'Data Engineering',
  frontend: 'Frontend',
  backend: 'Backend',
  'ml-ai': 'ML / AI',
  'cloud-architecture': 'Cloud Architecture',
  'qa-testing': 'QA & Testing',
  'technical-writing': 'Technical Writing',
  'project-management': 'Project Management',
};

const availabilityStyles: Record<string, string> = {
  available: 'text-success',
  hired: 'text-warning',
  busy: 'text-destructive',
  maintenance: 'text-muted',
};

export function MarketplacePage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentListing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [availability, setAvailability] = useState('');
  const [selected, setSelected] = useState<AgentListing | null>(null);
  const [showHire, setShowHire] = useState(false);
  const [hireForm, setHireForm] = useState({ title: '', description: '', estimatedHours: 40, tenantId: '' });
  const [tenants, setTenants] = useState<any[]>([]);

  // Knowledge base assignment inside hire modal
  const [hireKbMode, setHireKbMode] = useState<'none' | 'existing' | 'new'>('none');
  const [hireKbId, setHireKbId] = useState('');
  const [hireKbs, setHireKbs] = useState<any[]>([]);
  const [hireKbsLoading, setHireKbsLoading] = useState(false);
  const [hireNewKbName, setHireNewKbName] = useState('');
  const [hireNewKbDomain, setHireNewKbDomain] = useState('');
  const [hireCreatingKb, setHireCreatingKb] = useState(false);
  // ID of persona that was just hired (for post-hire KB linking)
  const [hiredPersonaId, setHiredPersonaId] = useState<string | null>(null);
  const [showAddFromPersona, setShowAddFromPersona] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);
  const [personaForm, setPersonaForm] = useState({ personaId: '', title: '', specialty: '', hourlyRate: 100, description: '' });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  // Hire state
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState('');
  const [hireKbError, setHireKbError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [successContractId, setSuccessContractId] = useState('');

  // Edit agent state
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [showEdit, setShowEdit] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentListing | null>(null);
  const [editForm, setEditForm] = useState({ title: '', specialty: '', hourlyRate: 0, description: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (specialty) params.specialty = specialty;
    if (availability) params.availability = availability;
    if (search) params.search = search;
    const qs = new URLSearchParams(params).toString();
    Promise.all([
      api.getMarketplace(qs ? `?${qs}` : ''),
      api.getMarketplaceStats(),
    ])
      .then(([a, s]) => { setAgents(a); setStats(s); })
      .finally(() => setLoading(false));
  }, [specialty, availability, search]);

  const openAddFromPersona = () => {
    setShowAddFromPersona(true);
    setPersonaForm({ personaId: '', title: '', specialty: '', hourlyRate: 100, description: '' });
    setAddError('');
    api.getPersonas().then(setPersonas).catch(() => {});
  };

  const handleAddFromPersona = async () => {
    if (!personaForm.personaId) return;
    setAdding(true);
    setAddError('');
    try {
      const payload: any = { personaId: personaForm.personaId };
      if (personaForm.title) payload.title = personaForm.title;
      if (personaForm.specialty) payload.specialty = personaForm.specialty;
      if (personaForm.hourlyRate) payload.hourlyRate = personaForm.hourlyRate;
      if (personaForm.description) payload.description = personaForm.description;
      await api.createAgentFromPersona(payload);
      setShowAddFromPersona(false);
      refresh();
    } catch (e: any) {
      setAddError(e.message || 'Failed to create agent');
    } finally {
      setAdding(false);
    }
  };

  const refresh = async () => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries({ specialty, availability, search }).filter(([, v]) => v)
      ),
    ).toString();
    const [a, s] = await Promise.all([
      api.getMarketplace(qs ? `?${qs}` : ''),
      api.getMarketplaceStats(),
    ]);
    setAgents(a);
    setStats(s);
  };

  const openEdit = (agent: AgentListing) => {
    setEditAgent(agent);
    setEditForm({
      title: agent.title,
      specialty: agent.specialty,
      hourlyRate: agent.hourlyRate,
      description: agent.description,
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editAgent) return;
    setSaving(true);
    setEditError('');
    try {
      await api.updateAgentListing(editAgent.id, editForm);
      setShowEdit(false);
      refresh();
    } catch (e: any) {
      setEditError(e.message || 'Failed to update agent');
    } finally {
      setSaving(false);
    }
  };

  const openHire = (agent: AgentListing) => {
    setSelected(agent);
    setShowHire(true);
    setHiredPersonaId(null);
    setHireError('');
    setHireKbError('');
    // Reset KB state
    setHireKbMode('none');
    setHireKbId('');
    setHireNewKbName('');
    setHireNewKbDomain('');
    // Auto-fill tenantId for org users
    const autoTenantId = currentUser?.tenantId ?? '';
    setHireForm({ title: '', description: '', estimatedHours: 40, tenantId: autoTenantId });
    // Load KBs for the picker and tenants for admins
    setHireKbsLoading(true);
    api.getKnowledgeBases().then(setHireKbs).catch(() => {}).finally(() => setHireKbsLoading(false));
    if (!currentUser?.tenantId) {
      api.getTenants().then(setTenants).catch(() => {});
    }
  };

  const handleHire = async () => {
    if (!selected || !hireForm.tenantId || !hireForm.title) return;
    setHiring(true);
    setHireError('');
    try {
      const result = await api.hireAgent(selected.id, hireForm);
      // If the hire result contains a personaId and the user picked a KB, link it
      const personaId: string | undefined = result?.personaId ?? selected.id;
      if (personaId && hireKbId) {
        await api.assignKnowledgeBase(personaId, hireKbId).catch(() => {});
      }
      setShowHire(false);
      setSuccessMsg(`${selected.name} hired successfully! Contract "${hireForm.title}" is now active.`);
      setSuccessContractId(result?.id ?? '');
      refresh();
    } catch (err: any) {
      setHireError(err.message ?? 'Failed to hire agent. Please try again.');
    } finally {
      setHiring(false);
    }
  };

  const handleHireCreateKb = async () => {
    if (!hireNewKbName || !hireNewKbDomain) return;
    setHireCreatingKb(true);
    setHireKbError('');
    try {
      const kb = await api.createKnowledgeBase({ name: hireNewKbName, domain: hireNewKbDomain });
      setHireKbs((prev) => [...prev, kb]);
      setHireKbId(kb.id);
      setHireKbMode('existing');
      setHireNewKbName('');
      setHireNewKbDomain('');
    } catch (err: any) {
      setHireKbError(err.message ?? 'Failed to create knowledge base');
    } finally {
      setHireCreatingKb(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hire success banner */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
          <span>{successMsg}</span>
          <div className="flex items-center gap-3">
            {successContractId && (
              <a
                href="/contracts"
                className="rounded-md bg-success/20 px-3 py-1 text-xs font-medium hover:bg-success/30 transition-colors"
              >
                View Contract
              </a>
            )}
            <button onClick={() => setSuccessMsg('')} className="text-success/70 hover:text-success">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Agents', value: stats.totalAgents, icon: Users, color: 'text-accent' },
            { label: 'Available', value: stats.availableAgents, icon: CheckCircle, color: 'text-success' },
            { label: 'Active Contracts', value: stats.activeContracts, icon: Briefcase, color: 'text-warning' },
            { label: 'Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-accent' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <div className="text-lg font-bold">{value}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">All Specialties</option>
          {Object.entries(specialtyLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="hired">Hired</option>
          <option value="busy">Busy</option>
        </select>
        <button
          onClick={openAddFromPersona}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" /> Add from Persona
        </button>
      </div>

      {/* Agent Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const SpecIcon = specialtyIcons[agent.specialty] ?? Code2;
          return (
            <div
              key={agent.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/40"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{agent.name}</h3>
                    <p className="text-xs text-muted">{agent.title}</p>
                  </div>
                </div>
                <span
                  className={`mt-1 flex items-center gap-1 text-xs font-medium ${availabilityStyles[agent.availability]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {agent.availability}
                </span>
              </div>

              {/* Specialty + rate */}
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                  <SpecIcon className="h-3 w-3" />
                  {specialtyLabels[agent.specialty] ?? agent.specialty}
                </span>
                <span className="ml-auto flex items-center gap-1 text-sm font-semibold">
                  <DollarSign className="h-3.5 w-3.5 text-muted" />
                  {agent.hourlyRate}/hr
                </span>
              </div>

              {/* Description */}
              <p className="mt-3 flex-1 text-xs text-muted line-clamp-3">
                {agent.description}
              </p>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-1">
                {agent.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-muted/10 px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    {t}
                  </span>
                ))}
                {agent.tags.length > 4 && (
                  <span className="text-[10px] text-muted">
                    +{agent.tags.length - 4}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="mt-3 flex items-center gap-4 border-t border-border/50 pt-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {agent.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {agent.completedJobs} jobs
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {agent.successRate}%
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate(`/marketplace/${agent.id}/configure`)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-accent/40"
                  title="Configure agent"
                >
                  <Settings className="h-4 w-4" />
                  Configure
                </button>
                {isAdmin && (
                  <button
                    onClick={() => openEdit(agent)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-accent/40"
                    title="Edit agent"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {agent.availability === 'available' && (
                  <button
                    onClick={() => openHire(agent)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Hire {agent.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {agents.length === 0 && (
        <div className="py-16 text-center text-sm text-muted">
          No agents match your filters.
        </div>
      )}

      {/* Hire modal */}
      {showHire && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card flex flex-col max-h-[90vh]">
            <div className="p-6 pb-3">
              <h2 className="text-lg font-semibold">Hire {selected.name}</h2>
              <p className="text-xs text-muted mt-0.5">
                {selected.title} &middot; ${selected.hourlyRate}/hr
              </p>
            </div>

            {hireError && (
              <div className="mx-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {hireError}
              </div>
            )}

            <div className="overflow-y-auto px-6 pb-2 space-y-3">
              {/* Org selector: only for admins without an org */}
              {!currentUser?.tenantId && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Organization</label>
                  <select
                    value={hireForm.tenantId}
                    onChange={(e) => setHireForm({ ...hireForm, tenantId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="">Select organization...</option>
                    {tenants.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.plan})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Contract Title</label>
                <input
                  placeholder="e.g. CI/CD Pipeline Setup"
                  value={hireForm.title}
                  onChange={(e) => setHireForm({ ...hireForm, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the work..."
                  value={hireForm.description}
                  onChange={(e) => setHireForm({ ...hireForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Estimated Hours</label>
                <input
                  type="number"
                  value={hireForm.estimatedHours}
                  onChange={(e) => setHireForm({ ...hireForm, estimatedHours: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <p className="text-xs text-muted">
                  Estimated cost: ${(hireForm.estimatedHours * selected.hourlyRate).toLocaleString()}
                </p>
              </div>

              {/* ── Knowledge Base assignment ── */}
              <div className="space-y-2 pt-1 border-t border-border">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  Knowledge Base
                  <span className="text-xs text-muted font-normal">(optional)</span>
                </label>
                <p className="text-xs text-muted">
                  Give this agent access to a knowledge base for domain context.
                </p>

                {/* Mode selector */}
                <div className="flex gap-2">
                  {(['none', 'existing', 'new'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setHireKbMode(v); if (v !== 'existing') setHireKbId(''); }}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                        hireKbMode === v
                          ? 'border-accent bg-accent/10 text-foreground'
                          : 'border-border text-muted hover:border-accent/40 hover:text-foreground'
                      }`}
                    >
                      {v === 'none' ? 'Skip' : v === 'existing' ? 'Use existing' : 'Create new'}
                    </button>
                  ))}
                </div>

                {/* Existing picker */}
                {hireKbMode === 'existing' && (
                  hireKbsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <select
                      value={hireKbId}
                      onChange={(e) => setHireKbId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      <option value="">— choose a knowledge base —</option>
                      {hireKbs.map((kb: any) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name} ({kb.domain}) — {kb.documentCount} docs
                        </option>
                      ))}
                    </select>
                  )
                )}

                {/* Create new inline */}
                {hireKbMode === 'new' && (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    {hireKbError && (
                      <p className="text-xs text-destructive">{hireKbError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="KB name"
                        value={hireNewKbName}
                        onChange={(e) => setHireNewKbName(e.target.value)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <input
                        placeholder="Domain"
                        value={hireNewKbDomain}
                        onChange={(e) => setHireNewKbDomain(e.target.value)}
                        className="rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleHireCreateKb}
                      disabled={!hireNewKbName || !hireNewKbDomain || hireCreatingKb}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover disabled:opacity-50"
                    >
                      {hireCreatingKb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {hireCreatingKb ? 'Creating…' : 'Create KB'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 pt-3 border-t border-border">
              <button
                onClick={handleHire}
                disabled={!hireForm.tenantId || !hireForm.title || hiring}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {hiring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                {hiring ? 'Hiring…' : 'Confirm Hire'}
              </button>
              <button
                onClick={() => setShowHire(false)}
                disabled={hiring}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit agent modal */}
      {showEdit && editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                <Pencil className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Edit Agent</h2>
                <p className="text-xs text-muted">{editAgent.name}</p>
              </div>
            </div>

            {editError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Specialty</label>
                <select
                  value={editForm.specialty}
                  onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {Object.entries(specialtyLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Hourly Rate ($)</label>
                <input
                  type="number"
                  min={1}
                  value={editForm.hourlyRate}
                  onChange={(e) => setEditForm({ ...editForm, hourlyRate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleEdit}
                disabled={!editForm.title || saving}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add from Persona modal */}
      {showAddFromPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                <Bot className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Add Agent from Persona</h2>
                <p className="text-xs text-muted">
                  Turn an existing persona into a marketplace agent listing
                </p>
              </div>
            </div>

            {addError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {addError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Persona</label>
                <select
                  value={personaForm.personaId}
                  onChange={(e) => setPersonaForm({ ...personaForm, personaId: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select a persona...</option>
                  {personas.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.active ? '(active)' : '(inactive)'}
                    </option>
                  ))}
                </select>
                {personas.length === 0 && (
                  <p className="text-xs text-muted">No personas found. Create one first in the Personas page.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Agent Title <span className="text-muted font-normal">(optional)</span></label>
                <input
                  placeholder="e.g. Senior DevOps Engineer"
                  value={personaForm.title}
                  onChange={(e) => setPersonaForm({ ...personaForm, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <p className="text-xs text-muted">Leave blank to auto-generate from persona name</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Specialty <span className="text-muted font-normal">(optional)</span></label>
                <select
                  value={personaForm.specialty}
                  onChange={(e) => setPersonaForm({ ...personaForm, specialty: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Auto-detect from persona</option>
                  {Object.entries(specialtyLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <p className="text-xs text-muted">Auto-detect analyzes the persona&apos;s expertise and tools</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Hourly Rate ($)</label>
                <input
                  type="number"
                  min={1}
                  value={personaForm.hourlyRate}
                  onChange={(e) => setPersonaForm({ ...personaForm, hourlyRate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description <span className="text-muted font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Leave blank to use persona's soul description"
                  value={personaForm.description}
                  onChange={(e) => setPersonaForm({ ...personaForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleAddFromPersona}
                disabled={!personaForm.personaId || adding}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {adding ? 'Creating...' : 'Add to Marketplace'}
              </button>
              <button
                onClick={() => setShowAddFromPersona(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
