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
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Types ─────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  personaId?: string;
  personaName?: string;
}

interface PersonaSummary {
  id: string;
  name: string;
  active: boolean;
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

/* ── Component ─────────────────────────────────────────────────── */

export function AgentChatPage() {
  const { data: personas, loading: personasLoading } = useApi<PersonaSummary[]>(
    () => api.getPersonas(),
    [],
  );

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first active persona
  useEffect(() => {
    if (personas && personas.length > 0 && !selectedPersonaId) {
      const active = personas.find((p) => p.active);
      if (active) setSelectedPersonaId(active.id);
      else setSelectedPersonaId(personas[0].id);
    }
  }, [personas, selectedPersonaId]);

  // Load progress when persona changes
  useEffect(() => {
    if (!selectedPersonaId) return;
    setProgressLoading(true);
    api
      .getPersonaProgress(selectedPersonaId)
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setProgressLoading(false));
  }, [selectedPersonaId]);

  // Welcome message when persona changes
  useEffect(() => {
    if (!selectedPersonaId) return;
    const name =
      personas?.find((p) => p.id === selectedPersonaId)?.name ?? selectedPersonaId;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm **${name}**. Ask me about my progress, current tasks, or capabilities. You can also modify my skill set from the sidebar.`,
        timestamp: new Date(),
        personaId: selectedPersonaId,
        personaName: name,
      },
    ]);
  }, [selectedPersonaId, personas]);

  // Auto-scroll
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
    if (!trimmed || !selectedPersonaId) return;

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
      const resp = await api.chatWithPersona(selectedPersonaId, trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: resp.response,
          timestamp: new Date(resp.timestamp),
          personaId: resp.personaId,
          personaName: resp.personaName,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Error: ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [input, selectedPersonaId]);

  /* Role styling */
  const roleBg = (role: string) =>
    role === 'user'
      ? 'bg-accent/10 border-accent/20'
      : role === 'assistant'
        ? 'bg-card border-border'
        : 'bg-amber-400/5 border-amber-400/20';

  const roleIcon = (role: string) =>
    role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;

  const selectedName =
    personas?.find((p) => p.id === selectedPersonaId)?.name ?? '—';

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* ── Chat panel (left) ──────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Persona selector + header */}
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="h-5 w-5 text-accent shrink-0" />
          <h2 className="text-lg font-semibold whitespace-nowrap">Agent Chat</h2>

          {personasLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="max-w-[220px]"
            >
              <option value="" disabled>
                Select a persona...
              </option>
              {personas?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.active ? '●' : ''}
                </option>
              ))}
            </Select>
          )}

          <Badge variant={progress?.active ? 'success' : 'outline'} className="ml-auto">
            {progress?.active ? 'Active' : 'Inactive'}
          </Badge>
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
                    {m.role === 'user'
                      ? 'You'
                      : m.role === 'assistant'
                        ? m.personaName ?? 'Agent'
                        : 'System'}
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
                <span className="text-xs">{selectedName} is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        {/* Input */}
        <div className="flex gap-2 mt-4">
          <Input
            placeholder={`Ask ${selectedName} about progress, tasks, or capabilities...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1"
            disabled={!selectedPersonaId}
          />
          <Button onClick={handleSend} disabled={!input.trim() || !selectedPersonaId}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>

      {/* ── Sidebar — progress + quick-actions ─────────────── */}
      <aside className="w-80 shrink-0 space-y-4 overflow-y-auto hidden lg:block">
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

                {/* File flags */}
                <div className="pt-1 border-t border-border mt-1">
                  <span className="text-muted">Configuration files</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(['Identity', 'Soul', 'Expertise', 'Procedures', 'Tools'] as const).map(
                      (f) => {
                        const key = `has${f}` as keyof ProgressData;
                        return (
                          <Badge
                            key={f}
                            variant={progress[key] ? 'success' : 'destructive'}
                            className="text-[10px]"
                          >
                            {f}
                          </Badge>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Skills */}
                {progress.skills.length > 0 && (
                  <div className="pt-1 border-t border-border mt-1">
                    <span className="text-muted">Skills</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {progress.skills.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Capabilities */}
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
            <Link to={`/personas`}>
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
      </aside>
    </div>
  );
}
