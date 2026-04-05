
CREATE TABLE public.upi_approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_order_id uuid NOT NULL REFERENCES public.upi_orders(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  action text NOT NULL CHECK (action IN ('approve', 'reject')),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_upi_approval_tokens_token ON public.upi_approval_tokens(token);

ALTER TABLE public.upi_approval_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage approval tokens"
ON public.upi_approval_tokens
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));
