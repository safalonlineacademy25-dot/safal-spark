
-- Fix products RLS: need PERMISSIVE policies, not RESTRICTIVE
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Recreate as PERMISSIVE
CREATE POLICY "Admins can manage all products"
ON public.products
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);
