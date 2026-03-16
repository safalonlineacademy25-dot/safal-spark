-- Restrict authenticated role to same safe columns (admins bypass via ALL policy)
REVOKE SELECT ON public.products FROM authenticated;

GRANT SELECT (
  id, name, description, price, original_price, category, badge,
  features, image_url, seo_title, seo_description, is_active,
  show_on_ui, download_count, created_at, updated_at
) ON public.products TO authenticated;

-- Update public SELECT policy to also require show_on_ui = true
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true AND show_on_ui = true);