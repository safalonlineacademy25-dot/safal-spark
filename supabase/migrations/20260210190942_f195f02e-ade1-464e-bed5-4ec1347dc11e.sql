
-- ============================================================
-- COMPREHENSIVE SECURITY HARDENING: Scope all sensitive tables
-- to 'authenticated' role only, replacing old Block anonymous
-- patterns and ensuring proper TO authenticated scoping.
-- ============================================================

-- 1. download_tokens: Replace Block anonymous access
DROP POLICY IF EXISTS "Block anonymous access to download_tokens" ON download_tokens;
CREATE POLICY "Require authentication for download_tokens"
  ON download_tokens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. order_items: Replace Block anonymous access
DROP POLICY IF EXISTS "Block anonymous access to order_items" ON order_items;
CREATE POLICY "Require authentication for order_items"
  ON order_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. refunds: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for refunds" ON refunds;
CREATE POLICY "Require authentication for refunds"
  ON refunds FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. email_delivery_logs: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for email_delivery_logs" ON email_delivery_logs;
CREATE POLICY "Require authentication for email_delivery_logs"
  ON email_delivery_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. settings: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for settings" ON settings;
CREATE POLICY "Require authentication for settings"
  ON settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. broadcast_logs: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for broadcast_logs" ON broadcast_logs;
CREATE POLICY "Require authentication for broadcast_logs"
  ON broadcast_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. promotion_logs: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for promotion_logs" ON promotion_logs;
CREATE POLICY "Require authentication for promotion_logs"
  ON promotion_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. rate_limits: Replace Block anonymous access
DROP POLICY IF EXISTS "Block anonymous access to rate_limits" ON rate_limits;
CREATE POLICY "Require authentication for rate_limits"
  ON rate_limits FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- 9. visitor_stats: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for visitor_stats" ON visitor_stats;
CREATE POLICY "Require authentication for visitor_stats"
  ON visitor_stats FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- 10. user_roles: Add authenticated scope policy
DROP POLICY IF EXISTS "Require authentication for user_roles" ON user_roles;
CREATE POLICY "Require authentication for user_roles"
  ON user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
