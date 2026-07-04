import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Check, X, Plus, Trash2, MessageSquare, Wrench, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Thread = { id: string; title: string; updated_at: string };
type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any;
  created_at?: string;
};
type Pending = { id: string; tool_name: string; tool_args: any; summary: string } | null;

async function callAgent(action: string, payload: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-agent', {
    body: { action, ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

const SUGGESTIONS = [
  "Show me sales for the last 7 days",
  "Look up order SOA20260704-1234",
  "How many orders were paid today?",
];

export default function AdminAgentTab() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load threads on mount
  useEffect(() => {
    (async () => {
      try {
        const { threads } = await callAgent('list_threads');
        setThreads(threads);
        if (threads.length > 0) setActiveThread(threads[0].id);
        else await newThread();
      } catch (e: any) {
        toast.error(e.message || 'Failed to load conversations');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load history when active thread changes
  useEffect(() => {
    if (!activeThread) return;
    (async () => {
      try {
        const { messages, pending } = await callAgent('history', { thread_id: activeThread });
        setMessages(messages);
        setPending(pending);
        setTimeout(() => textareaRef.current?.focus(), 50);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load messages');
      }
    })();
  }, [activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending, sending]);

  async function newThread() {
    try {
      const { thread } = await callAgent('create_thread', { title: 'New conversation' });
      setThreads((prev) => [thread, ...prev]);
      setActiveThread(thread.id);
      setMessages([]);
      setPending(null);
    } catch (e: any) {
      toast.error(e.message || 'Could not start thread');
    }
  }

  async function deleteThread(id: string) {
    if (!confirm('Delete this conversation?')) return;
    try {
      await callAgent('delete_thread', { thread_id: id });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThread === id) {
        const remaining = threads.filter((t) => t.id !== id);
        if (remaining.length) setActiveThread(remaining[0].id);
        else await newThread();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || !activeThread || sending) return;
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    try {
      const res = await callAgent('chat', { thread_id: activeThread, message: msg });
      if (res.awaiting_approval) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.message, tool_calls: { awaiting: true } }]);
        setPending({ id: res.approval_id, tool_name: '', tool_args: {}, summary: res.summary });
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: res.message || '',
          tool_calls: res.tool ? { tool: res.tool, result: res.tool_result } : null,
        }]);
      }
    } catch (e: any) {
      toast.error(e.message || 'Agent error');
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  async function resolveApproval(action: 'approve' | 'reject') {
    if (!pending) return;
    setApproving(true);
    try {
      const res = await callAgent(action, { approval_id: pending.id });
      setPending(null);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: res.message || (action === 'approve' ? 'Done.' : 'Cancelled.'),
        tool_calls: res.tool_result ? { result: res.tool_result } : null,
      }]);
      // refresh thread list order
      const { threads } = await callAgent('list_threads');
      setThreads(threads);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
      {/* Thread sidebar */}
      <Card className="p-3 flex flex-col overflow-hidden">
        <Button onClick={newThread} size="sm" className="mb-3 w-full gap-2">
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <ScrollArea className="flex-1 -mx-1">
          <div className="space-y-1 px-1">
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-muted',
                  activeThread === t.id && 'bg-muted font-medium'
                )}
                onClick={() => setActiveThread(t.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{t.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {threads.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No conversations yet.</p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat panel */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b p-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Admin Agent</h2>
            <p className="text-xs text-muted-foreground">
              LangGraph-style agent · Gemini · with tool calling + human approval
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && !sending && (
              <div className="text-center py-12 space-y-4">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <h3 className="font-medium">Ask the admin agent</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    It can query orders, summarize sales, and issue refunds (with your approval).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageRow key={i} msg={m} />
            ))}

            {sending && (
              <div className="flex gap-3 items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}

            {pending && (
              <Card className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Human approval required</p>
                    <p className="text-sm text-muted-foreground mt-1">{pending.summary}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" disabled={approving} onClick={() => resolveApproval('reject')}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" disabled={approving} onClick={() => resolveApproval('approve')}>
                    {approving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                </div>
              </Card>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t p-3">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about orders, sales, refunds…"
              rows={1}
              className="resize-none min-h-[40px] max-h-[160px]"
              disabled={sending || !!pending}
            />
            <Button size="icon" onClick={() => send()} disabled={sending || !input.trim() || !!pending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {pending && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Resolve the pending approval above to continue.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MessageRow({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'justify-end')}>
      {!isUser && (
        <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[80%] space-y-2', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {msg.content}
        </div>
        {msg.tool_calls?.tool && (
          <details className="text-xs bg-muted/50 rounded-md px-2 py-1 max-w-full">
            <summary className="cursor-pointer flex items-center gap-1.5 text-muted-foreground">
              <Wrench className="h-3 w-3" />
              <Badge variant="secondary" className="text-[10px] py-0">{msg.tool_calls.tool}</Badge>
              <span>tool call</span>
            </summary>
            <pre className="mt-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
              {typeof msg.tool_calls.result === 'string'
                ? msg.tool_calls.result
                : JSON.stringify(msg.tool_calls, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
