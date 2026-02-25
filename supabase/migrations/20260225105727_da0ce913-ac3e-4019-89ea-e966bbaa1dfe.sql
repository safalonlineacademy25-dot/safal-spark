
-- Fix broadcast_logs policies
DROP POLICY IF EXISTS "Admins can insert broadcast logs" ON public.broadcast_logs;
DROP POLICY IF EXISTS "Admins can view broadcast logs" ON public.broadcast_logs;
DROP POLICY IF EXISTS "Require authentication for broadcast_logs" ON public.broadcast_logs;

CREATE POLICY "Admins can view broadcast logs"
ON public.broadcast_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage broadcast logs"
ON public.broadcast_logs FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix promotion_logs policies
DROP POLICY IF EXISTS "Admins can insert promotion logs" ON public.promotion_logs;
DROP POLICY IF EXISTS "Admins can view promotion logs" ON public.promotion_logs;
DROP POLICY IF EXISTS "Require authentication for promotion_logs" ON public.promotion_logs;

CREATE POLICY "Admins can view promotion logs"
ON public.promotion_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage promotion logs"
ON public.promotion_logs FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
