
-- Threads
CREATE TABLE public.agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_threads TO authenticated;
GRANT ALL ON public.agent_threads TO service_role;
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent threads" ON public.agent_threads
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Messages
CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_messages_thread ON public.agent_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent messages" ON public.agent_messages
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Pending approvals (human-in-the-loop)
CREATE TABLE public.agent_pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_args JSONB NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_pending_approvals TO authenticated;
GRANT ALL ON public.agent_pending_approvals TO service_role;
ALTER TABLE public.agent_pending_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent approvals" ON public.agent_pending_approvals
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Checkpoints (LangGraph state snapshot)
CREATE TABLE public.agent_checkpoints (
  thread_id UUID PRIMARY KEY REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  checkpoint JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_checkpoints TO authenticated;
GRANT ALL ON public.agent_checkpoints TO service_role;
ALTER TABLE public.agent_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent checkpoints" ON public.agent_checkpoints
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_agent_threads_updated
  BEFORE UPDATE ON public.agent_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
