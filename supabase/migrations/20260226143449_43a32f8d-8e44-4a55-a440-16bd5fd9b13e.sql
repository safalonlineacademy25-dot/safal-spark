-- Create a function to list cron jobs for admin dashboard display
-- Only returns safe metadata (no auth tokens from command text)
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(
  job_name text,
  schedule text,
  description text,
  is_active boolean
)
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
      ELSE 'Scheduled maintenance task'
    END AS description,
    active AS is_active
  FROM cron.job
  ORDER BY jobname;
$$;