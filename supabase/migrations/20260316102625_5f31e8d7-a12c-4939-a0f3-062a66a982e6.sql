
-- Re-add public SELECT policy (needed for public product browsing)
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Revoke all column-level SELECT from anon on products first
REVOKE SELECT ON public.products FROM anon;

-- Grant SELECT only on non-sensitive columns to anon
GRANT SELECT (
  id, name, description, price, original_price, category, badge, 
  features, image_url, seo_title, seo_description, is_active, 
  show_on_ui, download_count, created_at, updated_at
) ON public.products TO anon;

-- Drop the view since we're using column-level grants instead
DROP VIEW IF EXISTS public.products_public;
