import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import {
  Save,
  ArrowLeft,
  Plus,
  X,
  Loader2,
  FileText,
  Brain,
  Wrench,
  BookOpen,
  ScrollText,
  Fingerprint,
  Check,
  Plug,
  User,
  Cpu,
  Database,
} from 'lucide-react';
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel';
import { BrainOverview } from '@/components/brains/BrainOverview';
import { KnowledgeBasePanel } from '@/components/personas/KnowledgeBasePanel';

/* ── Types ─────────────────────────────────────────────────────── */

interface PersonaDetail {
  id: string;
  name: string;
  active: boolean;
  soul: string;
  expertise: string;
  procedures: string;
  tools: string;
  identity: string;
  skills: string[];
  integrations: string[];
  knowledgeBaseId?: string;
}

type SectionKey = 'identity' | 'soul' | 'expertise' | 'procedures' | 'tools';
type ActiveTab = 'profile' | SectionKey | 'brain' | 'knowledge' | 'integrations';

/* ── Helpers ───────────────────────────────────────────────────── */

const SECTIONS: { key: SectionKey; label: string; icon: typeof FileText }[] = [
  { key: 'identity', label: 'Identity', icon: Fingerprint },
  { key: 'soul', label: 'Soul', icon: Brain },
  { key: 'expertise', label: 'Expertise', icon: BookOpen },
  { key: 'procedures', label: 'Procedures', icon: ScrollText },
  { key: 'tools', label: 'Tools', icon: Wrench },
];

/* ── Component ─────────────────────────────────────────────────── */

export function PersonaEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: persona, loading, error, refetch } = useApi<PersonaDetail>(
    () => api.getPersona(id!),
    [id],
  );

  /* Local editable state */
  const [sections, setSections] = useState<Record<SectionKey, string>>({
    identity: '',
    soul: '',
    expertise: '',
    procedures: '',
    tools: '',
  });
  const [profileDraft, setProfileDraft] = useState({ name: '' });
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [activeSection, setActiveSection] = useState<ActiveTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'ok' | 'err' | null>(null);
  const [dirty, setDirty] = useState(false);

  /* Sync from fetched data */
  useEffect(() => {
    if (!persona) return;
    setSections({
      identity: persona.identity ?? '',
      soul: persona.soul ?? '',
      expertise: persona.expertise ?? '',
      procedures: persona.procedures ?? '',
      tools: persona.tools ?? '',
    });
    setProfileDraft({ name: persona.name ?? '' });
    setSkills(persona.skills ?? []);
    setDirty(false);
  }, [persona]);

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleSectionChange = useCallback(
    (key: SectionKey, value: string) => {
      setSections((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const handleProfileChange = useCallback((field: string, value: string) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const addSkill = useCallback(() => {
    const trimmed = newSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setNewSkill('');
    setDirty(true);
  }, [newSkill, skills]);

  const removeSkill = useCallback((skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    setSaveResult(null);
    try {
      if (activeSection === 'profile') {
        await api.updatePersona(id, { name: profileDraft.name, skills });
      } else {
        await api.updatePersona(id, {
          [activeSection as SectionKey]: sections[activeSection as SectionKey],
        });
      }
      setSaveResult('ok');
      setDirty(false);
      setTimeout(() => setSaveResult(null), 3000);
      refetch();
    } catch {
      setSaveResult('err');
    } finally {
      setSaving(false);
    }
  }, [id, activeSection, profileDraft, sections, skills, refetch]);

  /* ── Render ────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-destructive">{error ?? 'Persona not found.'}</p>
        <Button variant="outline" onClick={() => navigate('/personas')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Personas
        </Button>
      </div>
    );
  }

  const activeMarkdownSection = SECTIONS.find((s) => s.key === activeSection);
  const showSaveButton =
    activeSection !== 'brain' &&
    activeSection !== 'knowledge' &&
    activeSection !== 'integrations';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Edit: {persona.name}</h2>
          <p className="text-xs text-muted">
            Modify persona files, skills, and capabilities
          </p>
        </div>
        <Badge variant={persona.active ? 'success' : 'outline'}>
          {persona.active ? 'Active' : 'Inactive'}
        </Badge>
        {showSaveButton && (
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : saveResult === 'ok' ? (
              <Check className="h-4 w-4 mr-1 text-green-400" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saveResult === 'ok' ? 'Saved' : saveResult === 'err' ? 'Error — Retry' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        {/* Section tabs (vertical) */}
        <div className="w-44 shrink-0 space-y-1">
          {/* Profile tab */}
          <button
            onClick={() => setActiveSection('profile')}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
              activeSection === 'profile'
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-muted hover:bg-card hover:text-foreground',
            )}
          >
            <User className="h-4 w-4 shrink-0" />
            Profile
          </button>

          {/* Markdown section tabs */}
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
                activeSection === key
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:bg-card hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {sections[key] ? (
                <span className="ml-auto text-[10px] text-green-400">●</span>
              ) : (
                <span className="ml-auto text-[10px] text-red-400">○</span>
              )}
            </button>
          ))}

          {/* Brain tab */}
          <button
            onClick={() => setActiveSection('brain')}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
              activeSection === 'brain'
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-muted hover:bg-card hover:text-foreground',
            )}
          >
            <Cpu className="h-4 w-4 shrink-0" />
            Brain
          </button>

          {/* Knowledge tab */}
          <button
            onClick={() => setActiveSection('knowledge')}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
              activeSection === 'knowledge'
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-muted hover:bg-card hover:text-foreground',
            )}
          >
            <Database className="h-4 w-4 shrink-0" />
            Knowledge
            {persona.knowledgeBaseId && (
              <span className="ml-auto text-[10px] text-green-400">●</span>
            )}
          </button>

          {/* Integrations tab */}
          <button
            onClick={() => setActiveSection('integrations')}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors',
              activeSection === 'integrations'
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-muted hover:bg-card hover:text-foreground',
            )}
          >
            <Plug className="h-4 w-4 shrink-0" />
            Integrations
          </button>
        </div>

        {/* Editor pane */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Profile tab */}
          {activeSection === 'profile' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted">Name</label>
                  <Input
                    value={profileDraft.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    placeholder="Persona name"
                  />
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <label className="text-xs text-muted">Skills &amp; Capabilities</label>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="flex items-center gap-1 pr-1"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {skills.length === 0 && (
                      <p className="text-xs text-muted">No skills assigned yet.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g. kubernetes, python, security-audit)..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addSkill}
                      disabled={!newSkill.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Markdown editor */}
          {activeMarkdownSection && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <activeMarkdownSection.icon className="h-4 w-4" />{' '}
                  {activeMarkdownSection.label}.md
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={sections[activeSection as SectionKey]}
                  onChange={(e) => handleSectionChange(activeSection as SectionKey, e.target.value)}
                  rows={22}
                  className={cn(
                    'w-full rounded-md border border-border bg-input p-3 text-sm text-foreground font-mono',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    'resize-y min-h-[200px]',
                  )}
                  placeholder={`Enter ${activeMarkdownSection.label} content in Markdown...`}
                />
              </CardContent>
            </Card>
          )}

          {/* Brain tab */}
          {activeSection === 'brain' && (
            <BrainOverview
              personaId={id!}
              personaName={persona.name}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {/* Knowledge tab */}
          {activeSection === 'knowledge' && (
            <KnowledgeBasePanel personaId={id!} personaName={persona.name} />
          )}

          {/* Integrations tab */}
          {activeSection === 'integrations' && (
            <IntegrationsPanel entityType="persona" entityId={id!} entityName={persona.name} />
          )}
        </div>
      </div>
    </div>
  );
}
