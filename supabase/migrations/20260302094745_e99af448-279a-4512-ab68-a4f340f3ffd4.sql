
-- Create demo_files table for managing demo audio content
CREATE TABLE public.demo_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_files ENABLE ROW LEVEL SECURITY;

-- Public can view active demo files
CREATE POLICY "Public can view active demo files"
ON public.demo_files
FOR SELECT
USING (is_active = true);

-- Admins can manage all demo files
CREATE POLICY "Admins can manage demo files"
ON public.demo_files
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_demo_files_updated_at
BEFORE UPDATE ON public.demo_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
