
-- Schedule daily cleanup of email_delivery_logs at 4:00 AM UTC
SELECT cron.schedule('daily-cleanup-email-logs', '0 4 * * *', $$SELECT public.cleanup_old_email_delivery_logs(30)$$);

-- Schedule daily cleanup of broadcast_logs at 4:30 AM UTC
SELECT cron.schedule('daily-cleanup-broadcast-logs', '30 4 * * *', $$SELECT public.cleanup_old_broadcast_logs(30)$$);

-- Schedule daily cleanup of promotion_logs at 5:00 AM UTC
SELECT cron.schedule('daily-cleanup-promotion-logs', '0 5 * * *', $$SELECT public.cleanup_old_promotion_logs(30)$$);
