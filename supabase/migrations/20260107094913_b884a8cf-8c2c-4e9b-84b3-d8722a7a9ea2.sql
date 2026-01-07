-- Fix security definer view issue by dropping it
-- We'll handle column filtering in the application code instead
DROP VIEW IF EXISTS public.public_products;

-- Drop unused function
DROP FUNCTION IF EXISTS public.can_access_file_url();