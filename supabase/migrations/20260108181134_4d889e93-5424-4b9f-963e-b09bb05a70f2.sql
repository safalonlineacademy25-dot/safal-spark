-- Create broadcast_logs table to track broadcast history
CREATE TABLE public.broadcast_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  template_name TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage broadcast logs
CREATE POLICY "Admins can view broadcast logs"
ON public.broadcast_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert broadcast logs"
ON public.broadcast_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX idx_broadcast_logs_created_at ON public.broadcast_logs(created_at DESC);