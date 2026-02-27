import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageSquare, Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { RetrievalJourney } from './RetrievalJourney';
import {
  azureKnowledgeApi,
  transformRetrievalResponse,
  parseInlineCitations,
  mapCitationsToReferences,
} from '@/lib/azure-knowledge-api';
import type {
  AzureKnowledgeBase,
  KBRetrievalResponse,
  KBReference,
  ProcessedTrace,
} from '@/types/azure-knowledge';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  trace?: ProcessedTrace;
  citations?: Map<string, KBReference>;
  timestamp: Date;
}

interface QueryPlaygroundProps {
  knowledgeBases: AzureKnowledgeBase[];
}

export function QueryPlayground({ knowledgeBases }: QueryPlaygroundProps) {
  const [selectedKB, setSelectedKB] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTrace, setShowTrace] = useState<string | null>(null);
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  let msgCounter = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKB || !query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${++msgCounter.current}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const conversationMessages = [
        ...messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMsg.content },
      ];

      const response = await azureKnowledgeApi.retrieve(selectedKB, {
        messages: conversationMessages,
        queryParameters: { maxDocsPerSource: 5 },
      });

      const trace = transformRetrievalResponse(response);
      const citations = parseInlineCitations(trace.answerText);
      const citationMap = mapCitationsToReferences(citations, trace.references);

      const assistantMsg: ChatMessage = {
        id: `msg-${++msgCounter.current}`,
        role: 'assistant',
        content: trace.answerText || '(No answer returned)',
        trace,
        citations: citationMap.size > 0 ? citationMap : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${++msgCounter.current}`,
        role: 'assistant',
        content: `Error: ${err.message ?? 'Retrieval failed'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Azure KB Playground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-[2] space-y-1">
            <label className="text-xs text-muted">Knowledge Base</label>
            <Select value={selectedKB} onChange={(e) => setSelectedKB(e.target.value)}>
              <option value="">Select an Azure KB...</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.name} value={kb.name}>
                  {kb.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted">Reasoning Effort</label>
            <Select
              value={reasoningEffort}
              onChange={(e) => setReasoningEffort(e.target.value as typeof reasoningEffort)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([]);
                setShowTrace(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Chat area */}
        <div className="rounded-md border border-border bg-background min-h-[300px] max-h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bot className="h-8 w-8 text-muted mb-2" />
              <p className="text-sm text-muted">
                Select a knowledge base and ask a question to start.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-input/50 border border-border/50'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Citation badges */}
                  {msg.citations && msg.citations.size > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                      {[...msg.citations.entries()].map(([key, ref]) => (
                        <Badge key={key} variant="outline" className="text-[10px]">
                          {ref.title ?? ref.url ?? key}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Trace toggle */}
                  {msg.trace && (
                    <button
                      type="button"
                      className="flex items-center gap-1 mt-2 text-xs text-accent hover:underline"
                      onClick={() =>
                        setShowTrace((prev) => (prev === msg.id ? null : msg.id))
                      }
                    >
                      {showTrace === msg.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {showTrace === msg.id ? 'Hide' : 'Show'} retrieval trace
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="shrink-0 h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center">
                    <User className="h-4 w-4 text-muted" />
                  </div>
                )}
              </div>

              {/* Inline trace */}
              {msg.trace && showTrace === msg.id && (
                <div className="mt-2 ml-10">
                  <RetrievalJourney trace={msg.trace} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrieving...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder={selectedKB ? 'Ask a question...' : 'Select a knowledge base first'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!selectedKB || loading}
            className="flex-1"
          />
          <Button type="submit" disabled={!selectedKB || !query.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
