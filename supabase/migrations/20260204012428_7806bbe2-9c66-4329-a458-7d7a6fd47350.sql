-- Create visitor_stats table to track daily and total visits
CREATE TABLE public.visitor_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date date NOT NULL UNIQUE,
  visit_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;

-- Only admins can view visitor stats
CREATE POLICY "Admins can view visitor stats"
ON public.visitor_stats
FOR SELECT
USING (has_admin_access(auth.uid()));

-- Only admins can manage visitor stats (for cleanup purposes)
CREATE POLICY "Admins can manage visitor stats"
ON public.visitor_stats
FOR ALL
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Create index on visit_date for fast lookups
CREATE INDEX idx_visitor_stats_visit_date ON public.visitor_stats(visit_date);

-- Create a function to increment visitor count (called by edge function with service role)
CREATE OR REPLACE FUNCTION public.increment_visitor_count()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := CURRENT_DATE;
  daily_count integer;
  total_count integer;
BEGIN
  -- Upsert today's record
  INSERT INTO public.visitor_stats (visit_date, visit_count)
  VALUES (today, 1)
  ON CONFLICT (visit_date)
  DO UPDATE SET 
    visit_count = visitor_stats.visit_count + 1,
    updated_at = now();
  
  -- Get today's count
  SELECT visit_count INTO daily_count
  FROM public.visitor_stats
  WHERE visit_date = today;
  
  -- Get total count (sum of all days)
  SELECT COALESCE(SUM(visit_count), 0) INTO total_count
  FROM public.visitor_stats;
  
  RETURN json_build_object(
    'daily_count', daily_count,
    'total_count', total_count,
    'date', today
  );
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_visitor_stats_updated_at
BEFORE UPDATE ON public.visitor_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();