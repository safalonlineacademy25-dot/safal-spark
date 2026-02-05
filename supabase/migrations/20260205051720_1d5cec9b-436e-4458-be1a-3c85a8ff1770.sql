-- Drop existing restrictive policies on products table
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Create PERMISSIVE policies (default behavior)
-- Policy for public to view active products
CREATE POLICY "Public can view active products" 
ON public.products 
FOR SELECT 
TO public
USING (is_active = true);

-- Policy for admins to manage all products (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all products" 
ON public.products 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));