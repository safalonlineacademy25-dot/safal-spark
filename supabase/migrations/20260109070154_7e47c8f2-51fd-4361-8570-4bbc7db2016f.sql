-- Create promotion_logs table for tracking promotional broadcasts
CREATE TABLE public.promotion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  promotion_title TEXT NOT NULL,
  promotion_message TEXT,
  cta_link TEXT,
  template_name TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.promotion_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view promotion logs" 
ON public.promotion_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert promotion logs" 
ON public.promotion_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));