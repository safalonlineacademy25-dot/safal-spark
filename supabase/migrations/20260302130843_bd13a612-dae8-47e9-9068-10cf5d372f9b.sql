-- Clean up stale pending orders (older than 1 hour) and their related records
-- This removes test/abandoned orders that were never paid

-- First remove related download_tokens
DELETE FROM public.download_tokens 
WHERE order_id IN (
  SELECT id FROM public.orders 
  WHERE status = 'pending' 
  AND created_at < now() - interval '1 hour'
);

-- Then remove related order_items
DELETE FROM public.order_items 
WHERE order_id IN (
  SELECT id FROM public.orders 
  WHERE status = 'pending' 
  AND created_at < now() - interval '1 hour'
);

-- Then remove related email_delivery_logs
DELETE FROM public.email_delivery_logs 
WHERE order_id IN (
  SELECT id FROM public.orders 
  WHERE status = 'pending' 
  AND created_at < now() - interval '1 hour'
);

-- Finally remove the pending orders themselves
DELETE FROM public.orders 
WHERE status = 'pending' 
AND created_at < now() - interval '1 hour';