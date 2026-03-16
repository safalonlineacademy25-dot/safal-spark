
-- Fix security definer view - set to invoker so RLS of querying user applies
ALTER VIEW public.products_public SET (security_invoker = on);
