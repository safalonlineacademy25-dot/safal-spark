-- Schedule daily cleanup of stale rate limit records at 3 AM UTC
-- Deletes entries older than 24 hours; active rate limiting windows are preserved
SELECT cron.schedule(
  'daily-cleanup-rate-limits',
  '0 3 * * *',
  $$SELECT public.cleanup_rate_limits(24)$$
);