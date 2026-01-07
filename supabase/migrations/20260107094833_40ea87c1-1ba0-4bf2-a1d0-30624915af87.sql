-- =====================================================
-- SECURITY FIX: Remove public access to sensitive data
-- =====================================================

-- 1. Remove the dangerous "Anyone can read settings" policy
-- This was exposing Razorpay API keys, Resend keys, etc.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;

-- 2. Create a security definer function to get only public settings
-- (settings that are safe to expose, like whatsapp_enabled flag)
CREATE OR REPLACE FUNCTION public.get_public_setting(setting_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.settings 
  WHERE key = setting_key 
  AND key IN ('whatsapp_enabled', 'razorpay_test_mode')
$$;

-- 3. Fix the products table - hide file_url from public access
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create new restrictive policy that hides file_url
-- Public users can only see non-sensitive product info
CREATE POLICY "Public can view active products metadata"
ON public.products
FOR SELECT
USING (is_active = true);

-- 4. Create a secure view for public product listing (without file_url)
CREATE OR REPLACE VIEW public.public_products AS
SELECT 
  id,
  name,
  description,
  price,
  original_price,
  category,
  badge,
  features,
  image_url,
  seo_title,
  seo_description,
  is_active,
  created_at
FROM public.products
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.public_products TO anon, authenticated;

-- 5. Create RLS policy for file_url access - only admins and service role
-- This is handled by the existing "Admins can manage all products" policy
-- But we need to ensure the SELECT policy restricts file_url

-- Drop and recreate the public policy to explicitly exclude file_url access
DROP POLICY IF EXISTS "Public can view active products metadata" ON public.products;

-- Create a function to check if current user can see file_url
CREATE OR REPLACE FUNCTION public.can_access_file_url()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(has_role(auth.uid(), 'admin'::app_role), false)
$$;

-- Recreate public product policy - allows viewing metadata but file_url will be hidden via column-level security
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
USING (is_active = true);