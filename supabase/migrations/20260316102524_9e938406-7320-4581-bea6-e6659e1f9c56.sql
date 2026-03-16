
-- Create a secure public view that excludes sensitive columns
CREATE OR REPLACE VIEW public.products_public AS
SELECT 
  id, name, description, price, original_price, category, badge, 
  features, image_url, seo_title, seo_description, is_active, 
  show_on_ui, download_count, created_at, updated_at
FROM public.products
WHERE is_active = true;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Create a restricted public policy using the anon role only through the view
-- Anon/public users can no longer SELECT directly from the products table
-- Admins retain full access via existing "Admins can manage all products" policy

-- Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.products_public TO anon, authenticated;
