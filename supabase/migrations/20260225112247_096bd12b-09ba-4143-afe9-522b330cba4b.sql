-- Schedule daily visit summary at 9 PM IST (15:30 UTC)
SELECT cron.schedule(
  'daily-visit-summary-telegram',
  '30 15 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hujuqkhbdptsdnbnkslo.supabase.co/functions/v1/daily-visit-summary',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1anVxa2hiZHB0c2RuYm5rc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODQzMjQsImV4cCI6MjA4MTU2MDMyNH0.6kUP37Zm9UtUmpPdn2s5Y01DOJ8V7QdW45LbVCpVZok"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);