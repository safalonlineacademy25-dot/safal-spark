
-- Drop existing refunds policies
DROP POLICY IF EXISTS "Admins can manage refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can view refunds" ON public.refunds;
DROP POLICY IF EXISTS "Require authentication for refunds" ON public.refunds;

-- Recreate with explicit TO authenticated
CREATE POLICY "Admins can view refunds"
ON public.refunds FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage refunds"
ON public.refunds FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
