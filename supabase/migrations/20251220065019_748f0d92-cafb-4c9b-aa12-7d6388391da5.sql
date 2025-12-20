-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create permissive policies (default is permissive)
CREATE POLICY "Admins can manage all products" 
ON public.products 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active products" 
ON public.products 
FOR SELECT 
TO public
USING (is_active = true);