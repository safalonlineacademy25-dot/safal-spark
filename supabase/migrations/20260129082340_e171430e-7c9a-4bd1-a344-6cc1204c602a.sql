-- Add RLS policies for rate_limits table
-- The check_rate_limit function is SECURITY DEFINER so it bypasses RLS
-- These policies block direct table access while allowing admin monitoring

-- Block all anonymous/public access
CREATE POLICY "Block anonymous access to rate_limits"
ON public.rate_limits
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow admins to view rate limits for monitoring
CREATE POLICY "Admins can view rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Allow admins to manage rate limits (e.g., clear old entries)
CREATE POLICY "Admins can manage rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));