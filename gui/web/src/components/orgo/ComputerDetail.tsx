import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  ArrowLeft,
  Camera,
  MousePointer,
  Keyboard,
  Terminal,
  Code2,
  ArrowUpDown,
  Move,
  Timer,
  Sparkles,
  Play,
  Square,
  RotateCw,
  Cpu,
  MemoryStick,
  History,
  Loader2,
  Monitor,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Computer {
  id: string;
  workspaceId: string;
  name: string;
  status: string;
  ram: number;
  cpu: number;
  gpu?: string;
  templateId?: string;
  createdAt: string;
}

interface ActionRecord {
  id: string;
  computerId: string;
  action: string;
  params: any;
  result: any;
  performedAt: string;
}

interface ComputerDetailProps {
  computer: Computer;
  actions: ActionRecord[];
  onBack: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onScreenshot: () => Promise<any>;
  onClick: (data: { x: number; y: number; button?: string; double?: boolean }) => Promise<any>;
  onType: (data: { text: string }) => Promise<any>;
  onKey: (data: { key: string }) => Promise<any>;
  onBash: (data: { command: string }) => Promise<any>;
  onExec: (data: { code: string; timeout?: number }) => Promise<any>;
  onScroll: (data: { direction: string; amount?: number }) => Promise<any>;
  onDrag: (data: { start_x: number; start_y: number; end_x: number; end_y: number }) => Promise<any>;
  onWait: (data: { duration: number }) => Promise<any>;
  onPrompt: (data: { instruction: string; model?: string; provider?: string; maxIterations?: number }) => Promise<any>;
  onRefreshActions: () => void;
}

const statusBadge = (status: string) => {
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
    running: 'success',
    booting: 'warning',
    stopped: 'outline',
    error: 'destructive',
  };
  return map[status] ?? 'outline';
};

type ActionTab = 'interact' | 'execute' | 'prompt' | 'history';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ComputerDetail({
  computer,
  actions,
  onBack,
  onStart,
  onStop,
  onRestart,
  onScreenshot,
  onClick,
  onType,
  onKey,
  onBash,
  onExec,
  onScroll,
  onDrag,
  onWait,
  onPrompt,
  onRefreshActions,
}: ComputerDetailProps) {
  const [tab, setTab] = useState<ActionTab>('interact');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // field state
  const [clickX, setClickX] = useState('');
  const [clickY, setClickY] = useState('');
  const [typeText, setTypeText] = useState('');
  const [keyVal, setKeyVal] = useState('');
  const [scrollDir, setScrollDir] = useState('down');
  const [scrollAmt, setScrollAmt] = useState('3');
  const [bashCmd, setBashCmd] = useState('');
  const [execCode, setExecCode] = useState('');
  const [promptText, setPromptText] = useState('');

  const isRunning = computer.status === 'running';

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setOutput(null);
    try {
      const res = await fn();
      setOutput(JSON.stringify(res, null, 2));
      onRefreshActions();
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleScreenshot = async () => {
    setBusy(true);
    setOutput(null);
    try {
      const res = await onScreenshot();
      if (res?.screenshot) {
        setScreenshotUrl(res.screenshot);
      }
      setOutput(JSON.stringify(res, null, 2));
      onRefreshActions();
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const tabs: { key: ActionTab; label: string; icon: typeof Terminal }[] = [
    { key: 'interact', label: 'Interact', icon: MousePointer },
    { key: 'execute', label: 'Execute', icon: Terminal },
    { key: 'prompt', label: 'AI Prompt', icon: Sparkles },
    { key: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold flex-1">{computer.name}</h2>
        <Badge variant={statusBadge(computer.status)}>{computer.status}</Badge>
      </div>

      {/* ── Info & Lifecycle ──────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1 text-sm text-muted">
            <MemoryStick className="h-3.5 w-3.5" /> {computer.ram / 1024}GB RAM
          </span>
          <span className="flex items-center gap-1 text-sm text-muted">
            <Cpu className="h-3.5 w-3.5" /> {computer.cpu} vCPU
          </span>
          {computer.gpu && (
            <span className="text-sm text-muted">GPU: {computer.gpu}</span>
          )}
          <span className="text-xs text-muted ml-auto">
            Created {new Date(computer.createdAt).toLocaleDateString()}
          </span>
          <div className="flex gap-2">
            {computer.status === 'stopped' && (
              <Button size="sm" onClick={onStart}>
                <Play className="h-3.5 w-3.5" /> Start
              </Button>
            )}
            {isRunning && (
              <>
                <Button size="sm" variant="outline" onClick={onStop}>
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
                <Button size="sm" variant="outline" onClick={onRestart}>
                  <RotateCw className="h-3.5 w-3.5" /> Restart
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Screenshot ────────────────────────────────────────── */}
      {isRunning && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Screen</h3>
              <Button size="sm" variant="outline" onClick={handleScreenshot} disabled={busy}>
                <Camera className="h-3.5 w-3.5" /> Screenshot
              </Button>
            </div>
            {screenshotUrl ? (
              <div className="rounded-md border border-border overflow-hidden bg-black">
                <img
                  src={screenshotUrl}
                  alt="Desktop screenshot"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="rounded-md border border-border bg-muted/10 flex items-center justify-center h-48 text-sm text-muted">
                Take a screenshot to view the desktop
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Action Tabs ───────────────────────────────────────── */}
      {isRunning && (
        <Card>
          <CardContent className="p-0">
            {/* tab bar */}
            <div className="flex border-b border-border">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    tab === key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                  onClick={() => setTab(key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* ── Interact ─────────────────────────────────── */}
              {tab === 'interact' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Click */}
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <MousePointer className="h-3.5 w-3.5" /> Click
                    </h4>
                    <div className="flex gap-2">
                      <Input placeholder="X" value={clickX} onChange={(e) => setClickX(e.target.value)} />
                      <Input placeholder="Y" value={clickY} onChange={(e) => setClickY(e.target.value)} />
                    </div>
                    <Button
                      size="sm"
                      disabled={busy || !clickX || !clickY}
                      onClick={() => run(() => onClick({ x: +clickX, y: +clickY }))}
                    >
                      Click
                    </Button>
                  </div>

                  {/* Type */}
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Keyboard className="h-3.5 w-3.5" /> Type Text
                    </h4>
                    <Input placeholder="Text to type..." value={typeText} onChange={(e) => setTypeText(e.target.value)} />
                    <Button size="sm" disabled={busy || !typeText} onClick={() => run(() => onType({ text: typeText }))}>
                      Type
                    </Button>
                  </div>

                  {/* Key */}
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Keyboard className="h-3.5 w-3.5" /> Key Press
                    </h4>
                    <Input
                      placeholder="e.g. Return, ctrl+c, alt+Tab"
                      value={keyVal}
                      onChange={(e) => setKeyVal(e.target.value)}
                    />
                    <Button size="sm" disabled={busy || !keyVal} onClick={() => run(() => onKey({ key: keyVal }))}>
                      Send Key
                    </Button>
                  </div>

                  {/* Scroll */}
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5" /> Scroll
                    </h4>
                    <div className="flex gap-2">
                      <select
                        className="flex h-9 rounded-md border border-border bg-input px-3 py-1 text-sm text-foreground"
                        value={scrollDir}
                        onChange={(e) => setScrollDir(e.target.value)}
                      >
                        <option value="up">Up</option>
                        <option value="down">Down</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                      <Input placeholder="Amount" value={scrollAmt} onChange={(e) => setScrollAmt(e.target.value)} />
                    </div>
                    <Button size="sm" disabled={busy} onClick={() => run(() => onScroll({ direction: scrollDir, amount: +scrollAmt }))}>
                      Scroll
                    </Button>
                  </div>

                  {/* Drag */}
                  <div className="rounded-md border border-border p-4 space-y-2 sm:col-span-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Move className="h-3.5 w-3.5" /> Drag
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      <Input className="w-20" placeholder="X1" id="drag-x1" />
                      <Input className="w-20" placeholder="Y1" id="drag-y1" />
                      <span className="self-center text-muted">→</span>
                      <Input className="w-20" placeholder="X2" id="drag-x2" />
                      <Input className="w-20" placeholder="Y2" id="drag-y2" />
                    </div>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        const x1 = +(document.getElementById('drag-x1') as HTMLInputElement)?.value || 0;
                        const y1 = +(document.getElementById('drag-y1') as HTMLInputElement)?.value || 0;
                        const x2 = +(document.getElementById('drag-x2') as HTMLInputElement)?.value || 0;
                        const y2 = +(document.getElementById('drag-y2') as HTMLInputElement)?.value || 0;
                        run(() => onDrag({ start_x: x1, start_y: y1, end_x: x2, end_y: y2 }));
                      }}
                    >
                      Drag
                    </Button>
                  </div>

                  {/* Wait */}
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5" /> Wait
                    </h4>
                    <Input placeholder="Seconds" type="number" id="wait-duration" defaultValue="2" />
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        const d = +(document.getElementById('wait-duration') as HTMLInputElement)?.value || 2;
                        run(() => onWait({ duration: d }));
                      }}
                    >
                      Wait
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Execute ──────────────────────────────────── */}
              {tab === 'execute' && (
                <div className="space-y-4">
                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" /> Bash Command
                    </h4>
                    <Input
                      placeholder="ls -la /home"
                      value={bashCmd}
                      onChange={(e) => setBashCmd(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && bashCmd) run(() => onBash({ command: bashCmd }));
                      }}
                    />
                    <Button size="sm" disabled={busy || !bashCmd} onClick={() => run(() => onBash({ command: bashCmd }))}>
                      Run
                    </Button>
                  </div>

                  <div className="rounded-md border border-border p-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5" /> Python Execute
                    </h4>
                    <Textarea
                      placeholder="print('Hello from Orgo!')"
                      value={execCode}
                      onChange={(e) => setExecCode(e.target.value)}
                      rows={4}
                    />
                    <Button size="sm" disabled={busy || !execCode} onClick={() => run(() => onExec({ code: execCode }))}>
                      Execute
                    </Button>
                  </div>
                </div>
              )}

              {/* ── AI Prompt ────────────────────────────────── */}
              {tab === 'prompt' && (
                <div className="rounded-md border border-border p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Autonomous AI Agent
                  </h4>
                  <p className="text-xs text-muted">
                    Give an instruction and an AI model will control this computer using the See → Decide → Act loop.
                  </p>
                  <Textarea
                    placeholder="e.g. Open the browser, navigate to example.com, and take a screenshot"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    disabled={busy || !promptText}
                    onClick={() => run(() => onPrompt({ instruction: promptText }))}
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Run Agent
                  </Button>
                </div>
              )}

              {/* ── History ──────────────────────────────────── */}
              {tab === 'history' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Action History</h4>
                    <Button size="sm" variant="ghost" onClick={onRefreshActions}>
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>
                  {actions.length === 0 ? (
                    <p className="text-sm text-muted text-center py-6">No actions recorded yet.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {[...actions].reverse().map((a) => (
                        <div key={a.id} className="rounded-md border border-border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{a.action}</Badge>
                            <span className="text-xs text-muted">
                              {new Date(a.performedAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                            {JSON.stringify(a.params, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Output panel ─────────────────────────────── */}
              {output && (
                <div className="mt-4 rounded-md border border-border bg-muted/5 p-4">
                  <h4 className="text-xs font-semibold text-muted mb-2">Output</h4>
                  <pre className="text-xs whitespace-pre-wrap font-mono max-h-60 overflow-y-auto text-foreground">
                    {output}
                  </pre>
                </div>
              )}

              {busy && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isRunning && computer.status !== 'booting' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Monitor className="h-10 w-10 text-muted mb-3" />
            <p className="text-sm text-muted">Computer is {computer.status}. Start it to interact.</p>
            <Button size="sm" className="mt-4" onClick={onStart}>
              <Play className="h-3.5 w-3.5" /> Start Computer
            </Button>
          </CardContent>
        </Card>
      )}

      {computer.status === 'booting' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-10 w-10 text-accent animate-spin mb-3" />
            <p className="text-sm text-muted">Computer is booting up...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
