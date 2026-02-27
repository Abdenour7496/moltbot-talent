import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Send,
  Bot,
  User,
  Minimize2,
  Maximize2,
  MessageCircle,
  X,
  Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function WebChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'identify', clientType: 'webchat' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'session.message' && data.data?.role === 'persona') {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: data.data.content,
              timestamp: new Date(),
            },
          ]);
          setIsThinking(false);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return () => ws.close();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Handle chat commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      let systemMsg = '';

      switch (cmd) {
        case '/status':
          systemMsg = `Connected: ${isConnected ? 'Yes' : 'No'}\nMessages: ${messages.length}\nSession: webchat`;
          break;
        case '/new':
        case '/reset':
          setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Session reset. How can I help you?',
            timestamp: new Date(),
          }]);
          setInput('');
          return;
        case '/compact':
          systemMsg = 'Session context compacted.';
          break;
        case '/think':
          systemMsg = `Thinking level set to: ${parts[1] ?? 'medium'}`;
          break;
        case '/verbose':
          systemMsg = `Verbose mode: ${parts[1] ?? 'on'}`;
          break;
        case '/usage':
          systemMsg = `Usage display: ${parts[1] ?? 'tokens'}`;
          break;
        case '/help':
          systemMsg = 'Available commands:\n/status — session status\n/new or /reset — reset session\n/compact — compact context\n/think <level> — set thinking level\n/verbose on|off — toggle verbose\n/usage off|tokens|full — usage display\n/help — show this help';
          break;
        default:
          systemMsg = `Unknown command: ${cmd}. Type /help for available commands.`;
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() },
        { id: (Date.now() + 1).toString(), role: 'system', content: systemMsg, timestamp: new Date() },
      ]);
      setInput('');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate agent response (in production, this goes through the WS gateway)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: generateResponse(trimmed),
          timestamp: new Date(),
        },
      ]);
      setIsThinking(false);
    }, 1000 + Math.random() * 2000);
  }, [input, isConnected, messages.length]);

  const roleBg = (role: string) =>
    role === 'user'
      ? 'bg-accent/10 border-accent/20'
      : role === 'assistant'
        ? 'bg-card border-border'
        : 'bg-amber-400/5 border-amber-400/20';

  const roleIcon = (role: string) =>
    role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">WebChat</h2>
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <p className="text-xs text-muted">Type /help for available commands</p>
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
                  {m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'System'}
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
              <span className="text-xs">Assistant is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <Input
          placeholder="Type a message or /command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!input.trim()}>
          <Send className="h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}

// Simple response generator (placeholder for real agent integration)
function generateResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi'))
    return 'Hello! How can I assist you today?';
  if (lower.includes('help'))
    return 'I can help with:\n• System monitoring and health checks\n• Running IT operations procedures\n• Knowledge base queries\n• Incident triage and escalation\n\nWhat would you like to do?';
  if (lower.includes('status'))
    return 'All systems are operational. No active incidents detected.';
  if (lower.includes('deploy'))
    return 'To initiate a deployment, I\'ll need:\n1. Service name\n2. Target environment\n3. Version/branch\n\nThis will require approval for production environments.';
  return `I received your message: "${input}". In production, this would be processed by the agent runtime with your configured LLM. You can use /help to see available chat commands.`;
}
