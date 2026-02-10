
-- ============================================================
-- FIX: Re-scope all remaining {public} role policies to {authenticated}
-- This is defense-in-depth: even though has_role() checks protect data,
-- scoping to authenticated prevents any anonymous access entirely.
-- ============================================================

-- 1. broadcast_logs: Fix public-scoped policies
DROP POLICY IF EXISTS "Admins can view broadcast logs" ON broadcast_logs;
CREATE POLICY "Admins can view broadcast logs"
  ON broadcast_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert broadcast logs" ON broadcast_logs;
CREATE POLICY "Admins can insert broadcast logs"
  ON broadcast_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. email_delivery_logs: Fix public-scoped policies
DROP POLICY IF EXISTS "Admins can view email delivery logs" ON email_delivery_logs;
CREATE POLICY "Admins can view email delivery logs"
  ON email_delivery_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage email delivery logs" ON email_delivery_logs;
CREATE POLICY "Admins can manage email delivery logs"
  ON email_delivery_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. promotion_logs: Fix public-scoped policies
DROP POLICY IF EXISTS "Admins can view promotion logs" ON promotion_logs;
CREATE POLICY "Admins can view promotion logs"
  ON promotion_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert promotion logs" ON promotion_logs;
CREATE POLICY "Admins can insert promotion logs"
  ON promotion_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. refunds: Fix public-scoped policies
DROP POLICY IF EXISTS "Admins can view refunds" ON refunds;
CREATE POLICY "Admins can view refunds"
  ON refunds FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage refunds" ON refunds;
CREATE POLICY "Admins can manage refunds"
  ON refunds FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. settings: Fix public-scoped policies
DROP POLICY IF EXISTS "Admins can view settings" ON settings;
CREATE POLICY "Admins can view settings"
  ON settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update settings" ON settings;
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete settings" ON settings;
CREATE POLICY "Admins can delete settings"
  ON settings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. visitor_stats: Fix public-scoped policies
DROP POLICY IF EXISTS "Admins can view visitor stats" ON visitor_stats;
CREATE POLICY "Admins can view visitor stats"
  ON visitor_stats FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage visitor stats" ON visitor_stats;
CREATE POLICY "Admins can manage visitor stats"
  ON visitor_stats FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- 7. product_audio_files: CRITICAL FIX - "Service role can read" with USING(true) 
-- for {public} role allows ANYONE to read all audio files!
DROP POLICY IF EXISTS "Service role can read product audio files" ON product_audio_files;
-- Service role bypasses RLS anyway, so this policy is unnecessary.
-- Keep admin-only access:
DROP POLICY IF EXISTS "Admins can manage product audio files" ON product_audio_files;
CREATE POLICY "Admins can manage product audio files"
  ON product_audio_files FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. combo_pack_files: Fix public-scoped policies
DROP POLICY IF EXISTS "Combo pack files are viewable by authenticated admins" ON combo_pack_files;
CREATE POLICY "Combo pack files are viewable by authenticated admins"
  ON combo_pack_files FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert combo pack files" ON combo_pack_files;
CREATE POLICY "Admins can insert combo pack files"
  ON combo_pack_files FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update combo pack files" ON combo_pack_files;
CREATE POLICY "Admins can update combo pack files"
  ON combo_pack_files FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete combo pack files" ON combo_pack_files;
CREATE POLICY "Admins can delete combo pack files"
  ON combo_pack_files FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
