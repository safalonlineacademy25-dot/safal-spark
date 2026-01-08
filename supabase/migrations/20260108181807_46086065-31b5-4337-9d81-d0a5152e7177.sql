-- Add product_link column to broadcast_logs for tracking the QR code link sent
ALTER TABLE public.broadcast_logs ADD COLUMN product_link TEXT;