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
  ArrowLeft,
  Loader2,
  Save,
  Check,
  Brain,
  BookOpen,
  ScrollText,
  Wrench,
  Database,
  User,
  Plus,
  X,
  Cpu,
  Plug,
} from 'lucide-react';
import { AgentKnowledgePanel } from '@/components/marketplace/AgentKnowledgePanel';
import { AgentBrainOverview } from '@/components/marketplace/AgentBrainOverview';
import { IntegrationsPanel } from '@/components/integrations/IntegrationsPanel';

/* ── Types ─────────────────────────────────────────────────────── */

interface AgentDetail {
  id: string;
  name: string;
  title: string;
  specialty: string;
  hourlyRate: number;
  description: string;
  tags: string[];
  skills: string[];
  languages: string[];
  certifications: string[];
  soul?: string;
  expertise?: string;
  procedures?: string;
  tools?: string;
  knowledgeBaseId?: string;
}

type ContentSectionKey = 'soul' | 'expertise' | 'procedures' | 'tools';
type SectionKey = 'profile' | ContentSectionKey | 'brain' | 'knowledge' | 'integrations';

/* ── Sidebar nav items ─────────────────────────────────────────── */

const CONTENT_SECTIONS: { key: ContentSectionKey; label: string; icon: typeof Brain }[] = [
  { key: 'soul', label: 'Soul', icon: Brain },
  { key: 'expertise', label: 'Expertise', icon: BookOpen },
  { key: 'procedures', label: 'Procedures', icon: ScrollText },
  { key: 'tools', label: 'Tools', icon: Wrench },
];

const specialtyOptions = [
  { value: 'devops', label: 'DevOps' },
  { value: 'security', label: 'Security' },
  { value: 'data-engineering', label: 'Data Engineering' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'ml-ai', label: 'ML / AI' },
  { value: 'cloud-architecture', label: 'Cloud Architecture' },
  { value: 'qa-testing', label: 'QA & Testing' },
  { value: 'technical-writing', label: 'Technical Writing' },
  { value: 'project-management', label: 'Project Management' },
];

/* ── Component ─────────────────────────────────────────────────── */

export function AgentConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, loading, error, refetch } = useApi<AgentDetail>(
    () => api.getAgent(id!),
    [id],
  );

  /* Content section drafts */
  const [contentDraft, setContentDraft] = useState<Record<ContentSectionKey, string>>({
    soul: '',
    expertise: '',
    procedures: '',
    tools: '',
  });

  /* Profile form state */
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    title: '',
    specialty: '',
    hourlyRate: 100,
    description: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState('');

  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'ok' | 'err' | null>(null);
  const [dirty, setDirty] = useState(false);

  /* Sync from fetched data */
  useEffect(() => {
    if (!agent) return;
    setContentDraft({
      soul: agent.soul ?? '',
      expertise: agent.expertise ?? '',
      procedures: agent.procedures ?? '',
      tools: agent.tools ?? '',
    });
    setProfileDraft({
      name: agent.name ?? '',
      title: agent.title ?? '',
      specialty: agent.specialty ?? '',
      hourlyRate: agent.hourlyRate ?? 100,
      description: agent.description ?? '',
    });
    setTags(agent.tags ?? []);
    setSkills(agent.skills ?? []);
    setLanguages(agent.languages ?? []);
    setCertifications(agent.certifications ?? []);
    setDirty(false);
  }, [agent]);

  /* ── Handlers ──────────────────────────────────────────────── */

  const handleContentChange = useCallback((key: ContentSectionKey, value: string) => {
    setContentDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleProfileChange = useCallback((field: string, value: string | number) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const addTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setNewTag('');
    setDirty(true);
  }, [newTag, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
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

  const addLanguage = useCallback(() => {
    const trimmed = newLanguage.trim();
    if (!trimmed || languages.includes(trimmed)) return;
    setLanguages((prev) => [...prev, trimmed]);
    setNewLanguage('');
    setDirty(true);
  }, [newLanguage, languages]);

  const removeLanguage = useCallback((lang: string) => {
    setLanguages((prev) => prev.filter((l) => l !== lang));
    setDirty(true);
  }, []);

  const addCertification = useCallback(() => {
    const trimmed = newCertification.trim();
    if (!trimmed || certifications.includes(trimmed)) return;
    setCertifications((prev) => [...prev, trimmed]);
    setNewCertification('');
    setDirty(true);
  }, [newCertification, certifications]);

  const removeCertification = useCallback((cert: string) => {
    setCertifications((prev) => prev.filter((c) => c !== cert));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    setSaveResult(null);
    try {
      if (activeSection === 'profile') {
        await api.updateAgentConfig(id, { ...profileDraft, tags, skills, languages, certifications });
      } else if (activeSection in contentDraft) {
        await api.updateAgentConfig(id, { [activeSection]: contentDraft[activeSection as ContentSectionKey] });
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
  }, [id, activeSection, profileDraft, contentDraft, tags, skills, languages, certifications, refetch]);

  /* ── Render ────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-destructive">{error ?? 'Agent not found.'}</p>
        <Button variant="outline" onClick={() => navigate('/agents')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Agents
        </Button>
      </div>
    );
  }

  const showSaveButton = activeSection !== 'brain' && activeSection !== 'knowledge' && activeSection !== 'integrations';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{agent.name}</h2>
          <p className="text-xs text-muted">Configure agent</p>
        </div>
        <Badge variant="outline">Configure</Badge>
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
        {/* Left sidebar */}
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

          {/* Content section tabs */}
          {CONTENT_SECTIONS.map(({ key, label, icon: Icon }) => (
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
              {contentDraft[key] ? (
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
            {agent.knowledgeBaseId && (
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

        {/* Right content pane */}
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Name</label>
                    <Input
                      value={profileDraft.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      placeholder="Agent name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Title</label>
                    <Input
                      value={profileDraft.title}
                      onChange={(e) => handleProfileChange('title', e.target.value)}
                      placeholder="e.g. Senior DevOps Engineer"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Specialty</label>
                    <select
                      value={profileDraft.specialty}
                      onChange={(e) => handleProfileChange('specialty', e.target.value)}
                      className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {specialtyOptions.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted">Hourly Rate ($)</label>
                    <Input
                      type="number"
                      min={1}
                      value={profileDraft.hourlyRate}
                      onChange={(e) => handleProfileChange('hourlyRate', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted">Description</label>
                  <textarea
                    value={profileDraft.description}
                    onChange={(e) => handleProfileChange('description', e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-border bg-input p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-y"
                    placeholder="Describe this agent's role and capabilities..."
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs text-muted">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-1 pr-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && <p className="text-xs text-muted">No tags assigned.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <label className="text-xs text-muted">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="flex items-center gap-1 pr-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {skills.length === 0 && <p className="text-xs text-muted">No skills assigned.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g. kubernetes, python)..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addSkill} disabled={!newSkill.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <label className="text-xs text-muted">Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="flex items-center gap-1 pr-1">
                        {lang}
                        <button onClick={() => removeLanguage(lang)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {languages.length === 0 && <p className="text-xs text-muted">No languages assigned.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a language (e.g. English, French)..."
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addLanguage} disabled={!newLanguage.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-2">
                  <label className="text-xs text-muted">Certifications</label>
                  <div className="flex flex-wrap gap-2">
                    {certifications.map((cert) => (
                      <Badge key={cert} variant="outline" className="flex items-center gap-1 pr-1">
                        {cert}
                        <button onClick={() => removeCertification(cert)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {certifications.length === 0 && <p className="text-xs text-muted">No certifications assigned.</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a certification (e.g. AWS-SAA, CKA)..."
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCertification()}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addCertification} disabled={!newCertification.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content section tabs (soul/expertise/procedures/tools) */}
          {(activeSection === 'soul' || activeSection === 'expertise' || activeSection === 'procedures' || activeSection === 'tools') && (
            <>
              {CONTENT_SECTIONS.filter((s) => s.key === activeSection).map(({ key, label, icon: SectionIcon }) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <SectionIcon className="h-4 w-4" /> {label}.md
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={contentDraft[key]}
                      onChange={(e) => handleContentChange(key, e.target.value)}
                      rows={18}
                      className={cn(
                        'w-full rounded-md border border-border bg-input p-3 text-sm text-foreground font-mono',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        'resize-y min-h-[200px]',
                      )}
                      placeholder={`Enter ${label} content in Markdown...`}
                    />
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Brain tab */}
          {activeSection === 'brain' && (
            <AgentBrainOverview
              agentId={id!}
              agentName={agent.name}
              onBack={() => setActiveSection('profile')}
            />
          )}

          {/* Knowledge tab */}
          {activeSection === 'knowledge' && (
            <AgentKnowledgePanel agentId={id!} agentName={agent.name} />
          )}

          {/* Integrations tab */}
          {activeSection === 'integrations' && (
            <IntegrationsPanel entityType="agent" entityId={id!} entityName={agent.name} />
          )}
        </div>
      </div>
    </div>
  );
}
