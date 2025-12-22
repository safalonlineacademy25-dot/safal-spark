-- Add policy for admins to view all customers
CREATE POLICY "Admins can view all customers" 
ON public.customers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));