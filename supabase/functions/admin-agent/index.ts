// ============================================================================
// ADMIN AGENT — LangGraph-style state graph over Gemini
// ----------------------------------------------------------------------------
// Concepts (interview cheatsheet):
//  * State graph: nodes + conditional edges, shared mutable `state` object.
//    Equivalent to `StateGraph` in @langchain/langgraph.
//  * Nodes: classify -> route -> plan_tool -> approval_gate -> execute_tool -> respond
//  * Tool calling: the LLM decides which tool to invoke (LangChain-style
//    `bindTools` — here done via JSON schema in the Gemini function-calling API).
//  * Human-in-the-loop: for "destructive" tools we `interrupt()` the graph,
//    persist state to Postgres (checkpointer), and resume on approve/reject.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://safalonlinesolutions.com',
  'https://safal-spark.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];
function corsFor(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com'))
    ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// ---------------------------------------------------------------------------
// Gemini client (free direct API — no Lovable AI Gateway, no cost)
// ---------------------------------------------------------------------------
async function getGeminiKey(admin: SupabaseClient): Promise<string> {
  try {
    const { data } = await admin.from('settings').select('value').eq('key', 'gemini_api_key').maybeSingle();
    if (data?.value) return String(data.value).trim();
  } catch { /* fall through */ }
  return Deno.env.get('GEMINI_API_KEY') || '';
}

async function callGemini(apiKey: string, system: string, contents: any[], tools?: any[]) {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: any = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
  };
  if (tools && tools.length) body.tools = [{ functionDeclarations: tools }];
  const resp = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// ---------------------------------------------------------------------------
// TOOLS — each is a typed function the LLM can invoke.
// (LangChain equivalent: `tool({ name, schema, func })` bound via `bindTools`.)
// ---------------------------------------------------------------------------
const toolSchemas = [
  {
    name: 'get_order',
    description: 'Look up a single order by its order number (e.g. SOA20260704-1234).',
    parameters: {
      type: 'object',
      properties: { order_number: { type: 'string', description: 'Order number' } },
      required: ['order_number'],
    },
  },
  {
    name: 'get_sales_summary',
    description: 'Aggregate sales metrics (orders count, revenue) for the last N days.',
    parameters: {
      type: 'object',
      properties: { days: { type: 'integer', description: 'Look-back window in days (1-90)', minimum: 1, maximum: 90 } },
      required: ['days'],
    },
  },
  {
    name: 'refund_order',
    description: 'Issue a refund for an order. DESTRUCTIVE — requires human approval.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['order_number', 'reason'],
    },
  },
];

const DESTRUCTIVE_TOOLS = new Set(['refund_order']);

async function execTool(admin: SupabaseClient, name: string, args: any): Promise<string> {
  if (name === 'get_order') {
    const { data, error } = await admin
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total_amount, status, created_at, razorpay_payment_id')
      .eq('order_number', args.order_number)
      .maybeSingle();
    if (error) return `Error: ${error.message}`;
    if (!data) return `No order found with number ${args.order_number}.`;
    return JSON.stringify(data);
  }
  if (name === 'get_sales_summary') {
    const days = Math.max(1, Math.min(90, Number(args.days) || 7));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await admin
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', since);
    if (error) return `Error: ${error.message}`;
    const paid = (data || []).filter((o: any) => o.status === 'paid');
    const revenue = paid.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    return JSON.stringify({
      window_days: days,
      total_orders: data?.length || 0,
      paid_orders: paid.length,
      revenue_inr: revenue,
    });
  }
  if (name === 'refund_order') {
    const { data: order, error: e1 } = await admin
      .from('orders').select('id, order_number, total_amount, status')
      .eq('order_number', args.order_number).maybeSingle();
    if (e1 || !order) return `Order not found: ${args.order_number}`;
    // Call existing process-refund edge function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const r = await fetch(`${supabaseUrl}/functions/v1/process-refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({ order_id: order.id, reason: args.reason || 'Agent-initiated refund' }),
    });
    const body = await r.text();
    return `Refund request sent for ${order.order_number} (₹${order.total_amount}). Response: ${body.slice(0, 300)}`;
  }
  return `Unknown tool: ${name}`;
}

// ---------------------------------------------------------------------------
// STATE GRAPH
// state shape: { messages, pending_tool?, tool_result?, final? }
// ---------------------------------------------------------------------------
type AgentState = {
  messages: any[];              // Gemini `contents` array
  pending_tool?: { name: string; args: any };
  tool_result?: string;
  final?: string;
  approval?: 'approve' | 'reject';
};

const SYSTEM_PROMPT = `You are the admin assistant for Safal Online Academy.
You can query live business data and trigger actions by calling the provided tools.

Guidelines:
- Prefer tool calls over guessing. Never invent order numbers, amounts, or customer data.
- For refunds and other destructive actions, call the tool — the platform will pause for human approval before executing.
- Answer concisely (2-4 sentences). Format numbers as ₹X,XXX.
- If a question is not answerable via tools, say so briefly.`;

// NODE 1: plan_or_respond — LLM chooses to call a tool OR reply directly
async function nodePlanOrRespond(state: AgentState, apiKey: string): Promise<AgentState> {
  const resp = await callGemini(apiKey, SYSTEM_PROMPT, state.messages, toolSchemas);
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  const fnPart = parts.find((p: any) => p.functionCall);
  if (fnPart?.functionCall) {
    return { ...state, pending_tool: { name: fnPart.functionCall.name, args: fnPart.functionCall.args || {} } };
  }
  const text = parts.map((p: any) => p.text).filter(Boolean).join('\n').trim()
    || "Sorry, I couldn't produce a response.";
  return { ...state, final: text };
}

// NODE 2: execute_tool
async function nodeExecuteTool(state: AgentState, admin: SupabaseClient): Promise<AgentState> {
  if (!state.pending_tool) return state;
  const result = await execTool(admin, state.pending_tool.name, state.pending_tool.args);
  return { ...state, tool_result: result };
}

// NODE 3: respond_with_tool_result — feed tool result back to LLM for final answer
async function nodeRespondWithToolResult(state: AgentState, apiKey: string): Promise<AgentState> {
  if (!state.pending_tool || state.tool_result == null) return state;
  const augmented = [
    ...state.messages,
    { role: 'model', parts: [{ functionCall: { name: state.pending_tool.name, args: state.pending_tool.args } }] },
    { role: 'user', parts: [{ functionResponse: { name: state.pending_tool.name, response: { result: state.tool_result } } }] },
  ];
  const resp = await callGemini(apiKey, SYSTEM_PROMPT, augmented, toolSchemas);
  const text = (resp?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p.text).filter(Boolean).join('\n').trim() || state.tool_result;
  return { ...state, final: text };
}

// GRAPH RUNNER — mirrors LangGraph's `graph.invoke(state)` with conditional edges.
async function runGraph(state: AgentState, apiKey: string, admin: SupabaseClient, threadId: string) {
  // Edge: START -> plan_or_respond
  state = await nodePlanOrRespond(state, apiKey);

  // Conditional edge
  if (!state.pending_tool) return state; // direct answer

  // Human-in-the-loop gate for destructive tools
  if (DESTRUCTIVE_TOOLS.has(state.pending_tool.name) && state.approval !== 'approve') {
    if (state.approval === 'reject') {
      state.final = `Action cancelled by admin. I did not run ${state.pending_tool.name}.`;
      return state;
    }
    // Persist checkpoint + create approval request, then interrupt
    await admin.from('agent_checkpoints').upsert({
      thread_id: threadId,
      checkpoint: state as any,
      updated_at: new Date().toISOString(),
    });
    const summary = summarizeApproval(state.pending_tool);
    const { data: appr } = await admin.from('agent_pending_approvals').insert({
      thread_id: threadId,
      tool_name: state.pending_tool.name,
      tool_args: state.pending_tool.args,
      summary,
      status: 'pending',
    }).select('id').single();
    return { ...state, final: `__AWAITING_APPROVAL__:${appr?.id}:${summary}` };
  }

  // Edge: -> execute_tool -> respond_with_tool_result
  state = await nodeExecuteTool(state, admin);
  state = await nodeRespondWithToolResult(state, apiKey);
  return state;
}

function summarizeApproval(t: { name: string; args: any }) {
  if (t.name === 'refund_order') {
    return `Refund order ${t.args.order_number}${t.args.reason ? ` — reason: ${t.args.reason}` : ''}`;
  }
  return `Execute ${t.name} with ${JSON.stringify(t.args)}`;
}

// ---------------------------------------------------------------------------
// PERSISTENCE HELPERS
// ---------------------------------------------------------------------------
async function loadThreadMessages(admin: SupabaseClient, threadId: string) {
  const { data } = await admin.from('agent_messages')
    .select('role, content, tool_calls').eq('thread_id', threadId).order('created_at');
  return (data || []).map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

async function saveMessage(admin: SupabaseClient, threadId: string, role: string, content: string, toolCalls?: any) {
  await admin.from('agent_messages').insert({ thread_id: threadId, role, content, tool_calls: toolCalls });
  await admin.from('agent_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
}

// ---------------------------------------------------------------------------
// HTTP HANDLER
// ---------------------------------------------------------------------------
serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsFor(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // AuthN + AuthZ: must be admin
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const { data: isAdmin } = await admin.rpc('has_admin_access', { _user_id: userId });
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const action = body.action || 'chat';

    // -------- list threads --------
    if (action === 'list_threads') {
      const { data } = await admin.from('agent_threads')
        .select('id, title, updated_at').eq('admin_user_id', userId)
        .order('updated_at', { ascending: false }).limit(50);
      return json({ threads: data || [] }, cors);
    }

    // -------- create thread --------
    if (action === 'create_thread') {
      const { data } = await admin.from('agent_threads')
        .insert({ admin_user_id: userId, title: body.title || 'New conversation' })
        .select('id, title, updated_at').single();
      return json({ thread: data }, cors);
    }

    // -------- delete thread --------
    if (action === 'delete_thread') {
      await admin.from('agent_threads').delete().eq('id', body.thread_id).eq('admin_user_id', userId);
      return json({ ok: true }, cors);
    }

    // -------- load history --------
    if (action === 'history') {
      const { data: msgs } = await admin.from('agent_messages')
        .select('id, role, content, tool_calls, created_at').eq('thread_id', body.thread_id).order('created_at');
      const { data: pending } = await admin.from('agent_pending_approvals')
        .select('id, tool_name, tool_args, summary, status, created_at')
        .eq('thread_id', body.thread_id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1);
      return json({ messages: msgs || [], pending: pending?.[0] || null }, cors);
    }

    const apiKey = await getGeminiKey(admin);
    if (!apiKey) return json({ error: 'Gemini API key not configured. Add it under Admin → Settings.' }, cors, 400);

    // -------- chat --------
    if (action === 'chat') {
      const threadId: string = body.thread_id;
      const userMsg: string = String(body.message || '').trim();
      if (!threadId || !userMsg) return json({ error: 'thread_id and message required' }, cors, 400);

      await saveMessage(admin, threadId, 'user', userMsg);
      const history = await loadThreadMessages(admin, threadId);
      const state: AgentState = { messages: history };
      const out = await runGraph(state, apiKey, admin, threadId);

      // Awaiting approval path
      if (out.final?.startsWith('__AWAITING_APPROVAL__:')) {
        const [, apprId, summary] = out.final.split(':');
        const proposalText = `I'm about to run **${out.pending_tool?.name}**. Please approve:\n\n${summary}`;
        await saveMessage(admin, threadId, 'assistant', proposalText, {
          pending_tool: out.pending_tool, approval_id: apprId, awaiting: true,
        });
        return json({ awaiting_approval: true, approval_id: apprId, summary, message: proposalText }, cors);
      }

      await saveMessage(admin, threadId, 'assistant', out.final || '', out.pending_tool
        ? { tool: out.pending_tool.name, args: out.pending_tool.args, result: out.tool_result }
        : null);
      return json({ message: out.final, tool: out.pending_tool?.name, tool_result: out.tool_result }, cors);
    }

    // -------- approve / reject --------
    if (action === 'approve' || action === 'reject') {
      const apprId = body.approval_id;
      const { data: appr } = await admin.from('agent_pending_approvals')
        .select('*').eq('id', apprId).single();
      if (!appr || appr.status !== 'pending') return json({ error: 'Approval not pending' }, cors, 400);
      await admin.from('agent_pending_approvals').update({
        status: action === 'approve' ? 'approved' : 'rejected',
        resolved_at: new Date().toISOString(),
      }).eq('id', apprId);

      const { data: ck } = await admin.from('agent_checkpoints').select('checkpoint').eq('thread_id', appr.thread_id).single();
      const savedState: AgentState = (ck?.checkpoint as AgentState) || { messages: [] };
      savedState.approval = action === 'approve' ? 'approve' : 'reject';
      const out = await runGraph(savedState, apiKey, admin, appr.thread_id);

      await saveMessage(admin, appr.thread_id, 'assistant', out.final || '', {
        tool: out.pending_tool?.name, result: out.tool_result, resumed_from_approval: apprId,
      });
      await admin.from('agent_checkpoints').delete().eq('thread_id', appr.thread_id);
      return json({ message: out.final, tool_result: out.tool_result }, cors);
    }

    return json({ error: 'Unknown action' }, cors, 400);
  } catch (e: any) {
    console.error('admin-agent error:', e);
    return json({ error: e?.message || 'Unknown error' }, cors, 500);
  }
});

function json(payload: any, cors: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
