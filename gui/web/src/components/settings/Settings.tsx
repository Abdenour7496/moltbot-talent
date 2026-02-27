import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Database, Brain, Timer, Image, Globe, Container, Eye, EyeOff, Key, Cloud, Search } from 'lucide-react';
import { api } from '@/lib/api';

interface AppSettings {
  vectorDbProvider: string;
  vectorDbUrl: string;
  embeddingModel: string;
  embeddingApiKey: string;
  chunkSize: number;
  chunkOverlap: number;
  defaultModel: string;
  defaultProvider: string;
  apiKey: string;
  apiBaseUrl: string;
  orgId: string;
  thinkingLevel: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  sessionIdleTimeout: number;
  sessionMaxAge: number;
  sessionPruneEnabled: boolean;
  mediaMaxSizeMb: number;
  mediaTranscriptionEnabled: boolean;
  mediaTranscriptionModel: string;
  browserEnabled: boolean;
  browserChromePath: string;
  browserHeadless: boolean;
  sandboxMode: string;
  sandboxImage: string;
  sandboxTimeout: number;
  azureSearchEndpoint: string;
  azureSearchApiKey: string;
  azureSearchApiVersion: string;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  if (!settings) return <p className="text-muted">Loading...</p>;

  const update = (key: keyof AppSettings, value: string | number | boolean) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    await api.updateSettings(settings);
    setSaved(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Agent Runtime */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" /> Agent Runtime
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Default Provider</label>
              <Select value={settings.defaultProvider} onChange={(e) => update('defaultProvider', e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama</option>
                <option value="azure">Azure OpenAI</option>
                <option value="google">Google AI</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Default Model</label>
              <Input
                value={settings.defaultModel}
                onChange={(e) => update('defaultModel', e.target.value)}
                placeholder="gpt-4o"
              />
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <label className="text-xs text-muted flex items-center gap-1"><Key className="h-3 w-3" /> API Key</label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => update('apiKey', e.target.value)}
                placeholder="sk-... or anthropic key"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)} title={showApiKey ? 'Hide' : 'Reveal'}>
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted">Required for cloud providers. Leave blank for local models (Ollama).</p>
          </div>

          {/* Base URL & Org ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">API Base URL</label>
              <Input
                value={settings.apiBaseUrl}
                onChange={(e) => update('apiBaseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-[10px] text-muted">Custom endpoint. Leave blank for provider default.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Organization / Project ID</label>
              <Input
                value={settings.orgId}
                onChange={(e) => update('orgId', e.target.value)}
                placeholder="org-... (optional)"
              />
            </div>
          </div>

          {/* Model params */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Thinking Level</label>
              <Select value={settings.thinkingLevel} onChange={(e) => update('thinkingLevel', e.target.value)}>
                <option value="off">Off</option>
                <option value="minimal">Minimal</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="xhigh">Max</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Max Tokens</label>
              <Input
                type="number"
                value={settings.maxTokens}
                onChange={(e) => update('maxTokens', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Temperature</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={settings.temperature}
                onChange={(e) => update('temperature', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Top P</label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.topP}
                onChange={(e) => update('topP', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Freq. Penalty</label>
              <Input
                type="number"
                step="0.1"
                min="-2"
                max="2"
                value={settings.frequencyPenalty}
                onChange={(e) => update('frequencyPenalty', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Presence Penalty</label>
              <Input
                type="number"
                step="0.1"
                min="-2"
                max="2"
                value={settings.presencePenalty}
                onChange={(e) => update('presencePenalty', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1">
            <label className="text-xs text-muted">Default System Prompt</label>
            <Textarea
              value={settings.systemPrompt}
              onChange={(e) => update('systemPrompt', e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={3}
            />
            <p className="text-[10px] text-muted">Prepended to every conversation unless overridden by a persona.</p>
          </div>
        </CardContent>
      </Card>

      {/* Session Pruning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4" /> Session Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Prune Sessions</p>
              <p className="text-xs text-muted">Automatically close idle and expired sessions</p>
            </div>
            <Button
              variant={settings.sessionPruneEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('sessionPruneEnabled', !settings.sessionPruneEnabled)}
            >
              {settings.sessionPruneEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Idle Timeout (minutes)</label>
              <Input
                type="number"
                value={settings.sessionIdleTimeout}
                onChange={(e) => update('sessionIdleTimeout', parseInt(e.target.value) || 0)}
                disabled={!settings.sessionPruneEnabled}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Max Session Age (hours)</label>
              <Input
                type="number"
                value={settings.sessionMaxAge}
                onChange={(e) => update('sessionMaxAge', parseInt(e.target.value) || 0)}
                disabled={!settings.sessionPruneEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vector Database */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Vector Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted">Provider</label>
            <Select value={settings.vectorDbProvider} onChange={(e) => update('vectorDbProvider', e.target.value)}>
              <option value="chroma">Chroma</option>
              <option value="qdrant">Qdrant</option>
              <option value="pinecone">Pinecone</option>
              <option value="pgvector">pgvector</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Connection URL</label>
            <Input
              value={settings.vectorDbUrl}
              onChange={(e) => update('vectorDbUrl', e.target.value)}
              placeholder="http://localhost:8000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Embeddings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embeddings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted">Model</label>
            <Select value={settings.embeddingModel} onChange={(e) => update('embeddingModel', e.target.value)}>
              <option value="text-embedding-3-small">text-embedding-3-small</option>
              <option value="text-embedding-3-large">text-embedding-3-large</option>
              <option value="text-embedding-ada-002">text-embedding-ada-002</option>
              <option value="voyage-large-2">voyage-large-2</option>
              <option value="voyage-code-2">voyage-code-2</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">API Key</label>
            <Input
              type="password"
              value={settings.embeddingApiKey}
              onChange={(e) => update('embeddingApiKey', e.target.value)}
              placeholder="sk-..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Chunking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chunking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Chunk Size (chars)</label>
              <Input
                type="number"
                value={settings.chunkSize}
                onChange={(e) => update('chunkSize', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Chunk Overlap (chars)</label>
              <Input
                type="number"
                value={settings.chunkOverlap}
                onChange={(e) => update('chunkOverlap', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4" /> Media Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Audio Transcription</p>
              <p className="text-xs text-muted">Automatically transcribe audio attachments</p>
            </div>
            <Button
              variant={settings.mediaTranscriptionEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('mediaTranscriptionEnabled', !settings.mediaTranscriptionEnabled)}
            >
              {settings.mediaTranscriptionEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Max Upload Size (MB)</label>
              <Input
                type="number"
                value={settings.mediaMaxSizeMb}
                onChange={(e) => update('mediaMaxSizeMb', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Transcription Model</label>
              <Input
                value={settings.mediaTranscriptionModel}
                onChange={(e) => update('mediaTranscriptionModel', e.target.value)}
                placeholder="whisper-1"
                disabled={!settings.mediaTranscriptionEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Browser Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Browser Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Browser Access</p>
              <p className="text-xs text-muted">Allow agents to browse the web</p>
            </div>
            <Button
              variant={settings.browserEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('browserEnabled', !settings.browserEnabled)}
            >
              {settings.browserEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Chrome Path</label>
              <Input
                value={settings.browserChromePath}
                onChange={(e) => update('browserChromePath', e.target.value)}
                placeholder="/usr/bin/chromium"
                disabled={!settings.browserEnabled}
              />
            </div>
            <div className="space-y-1 flex items-end">
              <Button
                variant={settings.browserHeadless ? 'default' : 'outline'}
                size="sm"
                onClick={() => update('browserHeadless', !settings.browserHeadless)}
                disabled={!settings.browserEnabled}
              >
                Headless: {settings.browserHeadless ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Azure AI Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Azure AI Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">Connect to Azure AI Search Knowledge Bases for agentic RAG retrieval.</p>
          <div className="space-y-1">
            <label className="text-xs text-muted">Search Endpoint</label>
            <Input
              value={settings.azureSearchEndpoint}
              onChange={(e) => update('azureSearchEndpoint', e.target.value)}
              placeholder="https://my-search.search.windows.net"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted flex items-center gap-1"><Key className="h-3 w-3" /> API Key</label>
            <div className="flex gap-2">
              <Input
                type={showAzureKey ? 'text' : 'password'}
                value={settings.azureSearchApiKey}
                onChange={(e) => update('azureSearchApiKey', e.target.value)}
                placeholder="Admin or query key"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setShowAzureKey(!showAzureKey)} title={showAzureKey ? 'Hide' : 'Reveal'}>
                {showAzureKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">API Version</label>
            <Input
              value={settings.azureSearchApiVersion}
              onChange={(e) => update('azureSearchApiVersion', e.target.value)}
              placeholder="2025-11-01-preview"
            />
            <p className="text-[10px] text-muted">Leave blank for the default (2025-11-01-preview).</p>
          </div>
        </CardContent>
      </Card>

      {/* Docker Sandbox */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Container className="h-4 w-4" /> Docker Sandbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted">Sandbox Mode</label>
            <Select value={settings.sandboxMode} onChange={(e) => update('sandboxMode', e.target.value)}>
              <option value="off">Off</option>
              <option value="non-main">Non-Main Personas Only</option>
              <option value="all">All Personas</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted">Docker Image</label>
              <Input
                value={settings.sandboxImage}
                onChange={(e) => update('sandboxImage', e.target.value)}
                placeholder="node:20-slim"
                disabled={settings.sandboxMode === 'off'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">Execution Timeout (seconds)</label>
              <Input
                type="number"
                value={settings.sandboxTimeout}
                onChange={(e) => update('sandboxTimeout', parseInt(e.target.value) || 0)}
                disabled={settings.sandboxMode === 'off'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave}>
        <Save className="h-4 w-4" />
        {saved ? 'Saved!' : 'Save Settings'}
      </Button>
    </div>
  );
}
