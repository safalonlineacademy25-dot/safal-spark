# Minimal LangGraph Admin Agent — Build Plan

A working end-to-end agent inside the existing admin dashboard. Runs on Gemini free tier + Supabase. Zero paid infra.

## What you'll be able to demo in an interview

1. Open **Admin → AI Agent** tab
2. Ask: *"Show me today's sales"* → agent classifies intent → calls `get_sales_summary` tool → replies with numbers
3. Ask: *"Look up order SOA20260704-1234"* → agent calls `get_order` tool → shows details
4. Ask: *"Refund order SOA20260704-1234"* → agent proposes the refund → **pauses** → UI shows Approve/Reject buttons → click Approve → agent resumes → calls `refund_order` tool → confirms
5. (Optional RAG) Ask: *"What's your refund policy?"* → agent calls `search_policy` tool → retrieves chunk from pgvector → answers grounded in docs

## Architecture

```text
Admin UI (React)
   │  POST /admin-agent  { thread_id, message, approval? }
   ▼
Edge Function: admin-agent (Deno + LangGraph.js)
   │
   ├── StateGraph nodes:
   │     classify → route → (tool | approval_gate) → execute_tool → respond
   │
   ├── LangChain Tools:
   │     get_order, get_sales_summary, refund_order (needs approval),
   │     search_policy (RAG, optional)
   │
   ├── LLM: ChatGoogleGenerativeAI (gemini-2.5-flash, direct API, free)
   │
   └── Checkpointer: Postgres table `agent_checkpoints` (LangGraph state)
                     Table `agent_pending_approvals` (what's waiting)
```

## Files to create / edit

**New edge function**
- `supabase/functions/admin-agent/index.ts` — LangGraph graph, tools, Gemini LLM, request handler with actions `chat`, `approve`, `reject`, `history`
- `supabase/functions/admin-agent/deno.json` — import map for `langchain`, `@langchain/langgraph`, `@langchain/google-genai` via `npm:` specifiers

**New database (migration)**
- `agent_threads (id, admin_user_id, title, created_at)`
- `agent_messages (id, thread_id, role, content, tool_calls jsonb, created_at)`
- `agent_pending_approvals (id, thread_id, tool_name, tool_args jsonb, summary, status, created_at)`
- `agent_checkpoints (thread_id, checkpoint jsonb, updated_at)` — LangGraph state snapshot
- (Optional RAG) `document_chunks (id, source, content, embedding vector(768))` + `pgvector` extension + `match_documents` RPC
- RLS: all tables restricted to `has_admin_access(auth.uid())`
- GRANTs to `authenticated` and `service_role`

**New frontend**
- `src/components/admin/AdminAgentTab.tsx` — chat UI using AI Elements (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Tool`, `Shimmer`), thread list, approval cards with Approve/Reject buttons
- `src/hooks/useAdminAgent.ts` — wraps calls to the edge function, manages thread state, polls for pending approvals

**Edits**
- `src/pages/admin/AdminDashboard.tsx` — add "AI Agent" tab entry
- `.lovable/plan.md` — record decision

## Technical details

**LangGraph state shape**
```ts
{ messages: BaseMessage[], intent: string, pending_tool?: {name, args}, approval?: 'approve'|'reject' }
```

**Graph flow**
- `classify` node: Gemini structured-output call → `{intent, needs_tool}`
- Conditional edge → `tool_call` node (LLM with tools bound) → `should_approve?` conditional edge
  - If tool is `refund_order` or `broadcast` → set `pending_tool`, write to `agent_pending_approvals`, `interrupt()` the graph
  - Else → `execute_tool` → `respond`
- On resume with `approval='approve'` → `execute_tool` → `respond`
- On resume with `approval='reject'` → `respond` with cancellation message

**Tools**
- `get_order({order_number})` → `SELECT * FROM orders WHERE order_number = $1`
- `get_sales_summary({days})` → aggregate query on `orders`
- `refund_order({order_id, reason})` → invokes existing `process-refund` edge function (needs approval)
- `search_policy({query})` [optional RAG] → embed query with `text-embedding-004`, `SELECT ... ORDER BY embedding <=> $1 LIMIT 3`

**Human-in-the-loop mechanism**
- Instead of native LangGraph `interrupt()` (which needs a persistent runtime), we implement a lightweight equivalent:
  1. Before running a "destructive" tool, insert row into `agent_pending_approvals` with `status='pending'`, save graph state to `agent_checkpoints`
  2. Return `{status: 'awaiting_approval', approval_id, summary}` to the UI
  3. UI shows approval card
  4. On click, UI POSTs `{action: 'approve'|'reject', approval_id}` → function loads checkpoint, sets `approval` flag, resumes graph

**LLM**
- `new ChatGoogleGenerativeAI({ model: 'gemini-2.5-flash', apiKey: settingsKey || Deno.env.get('GEMINI_API_KEY') })`
- Reuses the key from the Admin Settings → Gemini field you already added

**Free-tier costs**
- Gemini: within 15 req/min, 1M tokens/day
- Supabase: pgvector + Postgres already provisioned
- No external services

## Interview-ready talking points (baked into code comments)

Comment blocks in `admin-agent/index.ts` will explicitly label:
- "// LangGraph state graph — nodes = classify, route, execute_tool, respond"
- "// Human-in-the-loop: checkpoint + interrupt pattern"
- "// LangChain tool calling: LLM chooses which tool to invoke"
- "// (Optional) RAG: pgvector similarity search injects docs into prompt"

## Scope for this build

**Included**
- LangGraph graph + 3 tools (`get_order`, `get_sales_summary`, `refund_order`)
- Human-in-the-loop approval for `refund_order`
- Admin chat UI with approval cards
- Thread persistence in Supabase
- Uses Gemini key from existing settings

**Optional (ask before adding)**
- RAG with pgvector + `search_policy` tool — adds ~1 migration, 1 embedding function call per query. Say the word and I'll include it.

## Confirmation

Reply **"go"** to build everything above (LangGraph + 3 tools + human-in-loop + chat UI).
Reply **"go with RAG"** to also include the pgvector `search_policy` tool.
