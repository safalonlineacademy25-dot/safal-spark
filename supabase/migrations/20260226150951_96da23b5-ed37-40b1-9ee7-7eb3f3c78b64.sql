
-- Cleanup function for email_delivery_logs older than N days
CREATE OR REPLACE FUNCTION public.cleanup_old_email_delivery_logs(_older_than_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted_count integer;
BEGIN
  DELETE FROM public.email_delivery_logs
  WHERE created_at < now() - (_older_than_days || ' days')::interval;
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- Cleanup function for broadcast_logs older than N days
CREATE OR REPLACE FUNCTION public.cleanup_old_broadcast_logs(_older_than_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted_count integer;
BEGIN
  DELETE FROM public.broadcast_logs
  WHERE created_at < now() - (_older_than_days || ' days')::interval;
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- Cleanup function for promotion_logs older than N days
CREATE OR REPLACE FUNCTION public.cleanup_old_promotion_logs(_older_than_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted_count integer;
BEGIN
  DELETE FROM public.promotion_logs
  WHERE created_at < now() - (_older_than_days || ' days')::interval;
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- Update get_cron_jobs to include the new jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(job_name text, schedule text, description text, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    jobname::text AS job_name,
    schedule::text AS schedule,
    CASE jobname
      WHEN 'daily-cleanup-rate-limits' THEN 'Cleans up rate limit entries older than 24 hours'
      WHEN 'daily-cleanup-expired-tokens' THEN 'Removes download tokens expired more than 7 days ago'
      WHEN 'daily-visit-summary-telegram' THEN 'Sends daily visitor & order summary to Telegram'
      WHEN 'daily-cleanup-email-logs' THEN 'Removes email delivery logs older than 30 days'
      WHEN 'daily-cleanup-broadcast-logs' THEN 'Removes broadcast logs older than 30 days'
      WHEN 'daily-cleanup-promotion-logs' THEN 'Removes promotion logs older than 30 days'
      ELSE 'Scheduled maintenance task'
    END AS description,
    active AS is_active
  FROM cron.job
  ORDER BY jobname;
$$;
