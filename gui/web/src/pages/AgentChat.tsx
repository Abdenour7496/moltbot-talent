import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import {
  Send,
  Bot,
  User,
  MessageCircle,
  Loader2,
  Activity,
  Shield,
  Brain,
  ChevronRight,
  RefreshCw,
  Pencil,
  ShoppingBag,
  Star,
  Briefcase,
  CheckCircle,
  DollarSign,
  Code2,
  Server,
  Database,
  Layout,
  Cloud,
  TestTube2,
  FileText,
  Clipboard,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Types ─────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  speakerName?: string;
}

interface PersonaSummary {
  id: string;
  name: string;
  active: boolean;
}

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

interface ProgressData {
  personaId: string;
  personaName: string;
  active: boolean;
  loadedAt: string | null;
  skills: string[];
  integrations: string[];
  hasSoul: boolean;
  hasExpertise: boolean;
  hasProcedures: boolean;
  hasTools: boolean;
  hasIdentity: boolean;
  capabilitySummary: string[];
}

type ChatMode = 'persona' | 'agent';

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

const availabilityVariant: Record<string, 'success' | 'outline' | 'destructive'> = {
  available: 'success',
  hired: 'outline',
  busy: 'destructive',
};

/* ── Component ─────────────────────────────────────────────────── */

export function AgentChatPage() {
  const [mode, setMode] = useState<ChatMode>('persona');

  /* ── Persona mode state ── */
  const { data: personas, loading: personasLoading } = useApi<PersonaSummary[]>(
    () => api.getPersonas(),
    [],
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  /* ── Agent mode state ── */
  const { data: agents, loading: agentsLoading } = useApi<AgentListing[]>(
    () => api.getMarketplace(''),
    [],
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [agentKb, setAgentKb] = useState<any>(null);

  /* ── Shared chat state ── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ── Auto-select first item when mode changes or data loads ── */
  useEffect(() => {
    if (mode === 'persona' && personas && personas.length > 0 && !selectedPersonaId) {
      const active = personas.find((p) => p.active);
      setSelectedPersonaId(active?.id ?? personas[0].id);
    }
  }, [personas, selectedPersonaId, mode]);

  useEffect(() => {
    if (mode === 'agent' && agents && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId, mode]);

  /* ── Load agent KB when agent changes ── */
  useEffect(() => {
    if (mode !== 'agent' || !selectedAgentId) { setAgentKb(null); return; }
    api.getAgentKnowledge(selectedAgentId)
      .then((r: any) => setAgentKb(r.knowledgeBase ?? null))
      .catch(() => setAgentKb(null));
  }, [selectedAgentId, mode]);

  /* ── Load progress when persona changes ── */
  useEffect(() => {
    if (mode !== 'persona' || !selectedPersonaId) return;
    setProgressLoading(true);
    api
      .getPersonaProgress(selectedPersonaId)
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setProgressLoading(false));
  }, [selectedPersonaId, mode]);

  /* ── Welcome message on selection change ── */
  useEffect(() => {
    if (mode === 'persona') {
      if (!selectedPersonaId) return;
      const name = personas?.find((p) => p.id === selectedPersonaId)?.name ?? selectedPersonaId;
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm **${name}**. Ask me about my progress, current tasks, or capabilities.`,
        timestamp: new Date(),
        speakerName: name,
      }]);
    } else {
      if (!selectedAgentId) return;
      const agent = agents?.find((a) => a.id === selectedAgentId);
      if (!agent) return;
      const statusNote = agent.availability === 'hired'
        ? ` I'm currently on an active contract, but happy to chat.`
        : agent.availability === 'available'
          ? ` I'm available and open to new projects.`
          : '';
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi there! I'm **${agent.name}**, ${agent.title} specializing in ${agent.specialty.replace(/-/g, ' ')}.${statusNote}\n\nAsk me about my skills, rate, availability, or what I can help you with.`,
        timestamp: new Date(),
        speakerName: agent.name,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonaId, selectedAgentId, mode]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshProgress = useCallback(() => {
    if (!selectedPersonaId) return;
    setProgressLoading(true);
    api
      .getPersonaProgress(selectedPersonaId)
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setProgressLoading(false));
  }, [selectedPersonaId]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (mode === 'persona' && !selectedPersonaId) return;
    if (mode === 'agent' && !selectedAgentId) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      let resp: any;
      if (mode === 'persona') {
        resp = await api.chatWithPersona(selectedPersonaId, trimmed);
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: resp.response,
          timestamp: new Date(resp.timestamp),
          speakerName: resp.personaName,
        }]);
      } else {
        resp = await api.chatWithAgent(selectedAgentId, trimmed);
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: resp.response,
          timestamp: new Date(resp.timestamp),
          speakerName: resp.agentName,
        }]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [input, mode, selectedPersonaId, selectedAgentId]);

  /* Role styling */
  const roleBg = (role: string) =>
    role === 'user'
      ? 'bg-accent/10 border-accent/20'
      : role === 'assistant'
        ? 'bg-card border-border'
        : 'bg-amber-400/5 border-amber-400/20';

  const roleIcon = (role: string) =>
    role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;

  const selectedPersonaName = personas?.find((p) => p.id === selectedPersonaId)?.name ?? '—';
  const selectedAgent = agents?.find((a) => a.id === selectedAgentId) ?? null;
  const currentSpeakerName = mode === 'persona' ? selectedPersonaName : (selectedAgent?.name ?? '—');

  const isLoading = mode === 'persona' ? personasLoading : agentsLoading;
  const canSend = mode === 'persona' ? !!selectedPersonaId : !!selectedAgentId;

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* ── Chat panel (left) ──────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mode toggle + selector + header */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <MessageCircle className="h-5 w-5 text-accent shrink-0" />
          <h2 className="text-lg font-semibold whitespace-nowrap">Agent Chat</h2>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setMode('persona')}
              className={cn(
                'px-3 py-1.5 transition-colors',
                mode === 'persona' ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              Personas
            </button>
            <button
              onClick={() => setMode('agent')}
              className={cn(
                'px-3 py-1.5 transition-colors',
                mode === 'agent' ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              Marketplace Agents
            </button>
          </div>

          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'persona' ? (
            <Select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="max-w-[220px]"
            >
              <option value="" disabled>Select a persona...</option>
              {personas?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.active ? '●' : ''}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="max-w-[220px]"
            >
              <option value="" disabled>Select an agent...</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.title} {a.availability === 'hired' ? '(hired)' : a.availability === 'available' ? '(available)' : `(${a.availability})`}
                </option>
              ))}
            </Select>
          )}

          {mode === 'persona' && (
            <Badge variant={progress?.active ? 'success' : 'outline'} className="ml-auto">
              {progress?.active ? 'Active' : 'Inactive'}
            </Badge>
          )}
          {mode === 'agent' && selectedAgent && (
            <Badge variant={availabilityVariant[selectedAgent.availability] ?? 'outline'} className="ml-auto">
              {selectedAgent.availability}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-md border p-3 max-w-[85%]',
                  roleBg(m.role),
                  m.role === 'user' ? 'ml-auto' : 'mr-auto',
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {roleIcon(m.role)}
                  <span className="text-[10px] text-muted">
                    {m.role === 'user' ? 'You' : m.role === 'assistant' ? (m.speakerName ?? 'Agent') : 'System'}
                  </span>
                  <span className="text-[10px] text-muted ml-auto">
                    {m.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">{currentSpeakerName} is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        {/* Input */}
        <div className="flex gap-2 mt-4">
          <Input
            placeholder={
              mode === 'persona'
                ? `Ask ${currentSpeakerName} about progress, tasks, or capabilities...`
                : `Ask ${currentSpeakerName} about skills, rate, availability...`
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1"
            disabled={!canSend}
          />
          <Button onClick={handleSend} disabled={!input.trim() || !canSend}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 space-y-4 overflow-y-auto hidden lg:block">
        {mode === 'persona' ? (
          <>
            {/* Progress card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Activity className="h-4 w-4" /> Progress
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={refreshProgress}>
                    <RefreshCw className={cn('h-3.5 w-3.5', progressLoading && 'animate-spin')} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                {progressLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : progress ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">Status</span>
                      <Badge variant={progress.active ? 'success' : 'outline'} className="text-[10px]">
                        {progress.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {progress.loadedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted">Loaded</span>
                        <span>{new Date(progress.loadedAt).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-border mt-1">
                      <span className="text-muted">Configuration files</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(['Identity', 'Soul', 'Expertise', 'Procedures', 'Tools'] as const).map((f) => {
                          const key = `has${f}` as keyof ProgressData;
                          return (
                            <Badge key={f} variant={progress[key] ? 'success' : 'destructive'} className="text-[10px]">
                              {f}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    {progress.skills.length > 0 && (
                      <div className="pt-1 border-t border-border mt-1">
                        <span className="text-muted">Skills</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {progress.skills.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {progress.capabilitySummary.length > 0 && (
                      <div className="pt-1 border-t border-border mt-1">
                        <span className="text-muted">Capabilities</span>
                        <ul className="mt-1 space-y-0.5 text-[11px]">
                          {progress.capabilitySummary.slice(0, 8).map((c, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <ChevronRight className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted">No progress data available.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Brain className="h-4 w-4" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/personas">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-3.5 w-3.5" /> Manage Personas
                  </Button>
                </Link>
                {selectedPersonaId && (
                  <Link to={`/personas/${selectedPersonaId}/edit`}>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Pencil className="h-3.5 w-3.5" /> Edit Skills &amp; Capabilities
                    </Button>
                  </Link>
                )}
                <Link to="/workflows">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Activity className="h-3.5 w-3.5" /> Workflow Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        ) : (
          /* ── Agent profile sidebar ── */
          selectedAgent ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {(() => {
                      const Icon = specialtyIcons[selectedAgent.specialty] ?? Code2;
                      return <Icon className="h-4 w-4 text-accent" />;
                    })()}
                    Agent Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  {/* Name + title */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent shrink-0">
                      {selectedAgent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{selectedAgent.name}</p>
                      <p className="text-muted">{selectedAgent.title}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                    <div className="flex flex-col items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="font-medium">{selectedAgent.rating}</span>
                      <span className="text-muted text-[10px]">Rating</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Briefcase className="h-3.5 w-3.5 text-accent" />
                      <span className="font-medium">{selectedAgent.completedJobs}</span>
                      <span className="text-muted text-[10px]">Jobs</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                      <span className="font-medium">{selectedAgent.successRate}%</span>
                      <span className="text-muted text-[10px]">Success</span>
                    </div>
                  </div>

                  {/* Rate + availability */}
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <span className="flex items-center gap-1 text-muted">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${selectedAgent.hourlyRate}/hr
                    </span>
                    <Badge variant={availabilityVariant[selectedAgent.availability] ?? 'outline'} className="text-[10px]">
                      {selectedAgent.availability}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-muted leading-relaxed pt-1 border-t border-border">
                    {selectedAgent.description}
                  </p>

                  {/* Skills */}
                  {selectedAgent.skills.length > 0 && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted mb-1">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAgent.skills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedAgent.tags.length > 0 && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAgent.tags.slice(0, 6).map((t) => (
                          <span key={t} className="rounded-md bg-muted/10 px-1.5 py-0.5 text-[10px] text-muted">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {selectedAgent.certifications.length > 0 && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted mb-1">Certifications</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAgent.certifications.map((c) => (
                          <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Knowledge Base */}
                  {agentKb && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-muted mb-1 flex items-center gap-1">
                        <Database className="h-3 w-3" /> Knowledge Base
                        {(agentKb.type === 'azure' || agentKb.provider === 'azure-search') && (
                          <span className="ml-1 rounded bg-blue-500/10 px-1 py-0.5 text-[9px] text-blue-500 font-medium">Azure</span>
                        )}
                      </p>
                      <div className="rounded-md bg-muted/10 px-2 py-1.5 text-[11px] space-y-0.5">
                        <p className="font-medium">{agentKb.name}</p>
                        {agentKb.type === 'azure' || agentKb.provider === 'azure-search'
                          ? <p className="text-muted">Azure AI Search · Foundry IQ</p>
                          : agentKb.domain && <p className="text-muted">Domain: {agentKb.domain}</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Brain className="h-4 w-4" /> Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/marketplace">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                      <ShoppingBag className="h-3.5 w-3.5" /> Go to Marketplace
                    </Button>
                  </Link>
                  {selectedAgent.currentContractId && (
                    <Link to="/contracts">
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                        <Briefcase className="h-3.5 w-3.5" /> View Active Contract
                      </Button>
                    </Link>
                  )}
                  {selectedAgent.availability === 'available' && (
                    <Link to="/marketplace">
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-success border-success/30 hover:bg-success/10">
                        <CheckCircle className="h-3.5 w-3.5" /> Hire This Agent
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted">
                Select an agent to view their profile.
              </CardContent>
            </Card>
          )
        )}
      </aside>
    </div>
  );
}
