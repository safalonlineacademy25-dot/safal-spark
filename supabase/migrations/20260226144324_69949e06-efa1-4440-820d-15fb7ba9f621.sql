-- Create function to get database size for admin dashboard
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT pg_database_size('postgres')::bigint;
$$;