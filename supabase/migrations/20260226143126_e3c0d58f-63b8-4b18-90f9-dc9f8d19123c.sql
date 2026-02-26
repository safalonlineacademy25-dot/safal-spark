-- Create a function to clean up expired download tokens
-- Only deletes tokens that expired more than 7 days ago (safe buffer)
CREATE OR REPLACE FUNCTION public.cleanup_expired_download_tokens(_days_after_expiry integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted_count integer;
BEGIN
  DELETE FROM public.download_tokens
  WHERE expires_at IS NOT NULL 
    AND expires_at < now() - (_days_after_expiry || ' days')::interval;
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- Schedule daily cleanup at 3:30 AM UTC (30 min after rate_limits cleanup)
SELECT cron.schedule(
  'daily-cleanup-expired-tokens',
  '30 3 * * *',
  $$SELECT public.cleanup_expired_download_tokens(7)$$
);