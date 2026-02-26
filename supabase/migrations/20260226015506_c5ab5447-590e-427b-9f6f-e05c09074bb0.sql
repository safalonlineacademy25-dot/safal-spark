
-- Fix RLS policies to include super_admin access using has_admin_access() function

-- PRODUCTS
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

-- BROADCAST_LOGS
DROP POLICY IF EXISTS "Admins can manage broadcast logs" ON public.broadcast_logs;
DROP POLICY IF EXISTS "Admins can view broadcast logs" ON public.broadcast_logs;
CREATE POLICY "Admins can manage broadcast logs" ON public.broadcast_logs FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view broadcast logs" ON public.broadcast_logs FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- CUSTOMERS
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Require authentication for customers" ON public.customers;
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view all customers" ON public.customers FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- DOWNLOAD_TOKENS
DROP POLICY IF EXISTS "Admins can manage download tokens" ON public.download_tokens;
DROP POLICY IF EXISTS "Admins can view download tokens" ON public.download_tokens;
DROP POLICY IF EXISTS "Require authentication for download_tokens" ON public.download_tokens;
CREATE POLICY "Admins can manage download tokens" ON public.download_tokens FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view download tokens" ON public.download_tokens FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- EMAIL_DELIVERY_LOGS
DROP POLICY IF EXISTS "Admins can manage email delivery logs" ON public.email_delivery_logs;
DROP POLICY IF EXISTS "Admins can view email delivery logs" ON public.email_delivery_logs;
DROP POLICY IF EXISTS "Require authentication for email_delivery_logs" ON public.email_delivery_logs;
CREATE POLICY "Admins can manage email delivery logs" ON public.email_delivery_logs FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view email delivery logs" ON public.email_delivery_logs FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Require authentication for order_items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- ORDERS
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Require authentication for orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- PRODUCT_AUDIO_FILES
DROP POLICY IF EXISTS "Admins can manage product audio files" ON public.product_audio_files;
CREATE POLICY "Admins can manage product audio files" ON public.product_audio_files FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

-- COMBO_PACK_FILES
DROP POLICY IF EXISTS "Admins can delete combo pack files" ON public.combo_pack_files;
DROP POLICY IF EXISTS "Admins can insert combo pack files" ON public.combo_pack_files;
DROP POLICY IF EXISTS "Admins can update combo pack files" ON public.combo_pack_files;
DROP POLICY IF EXISTS "Combo pack files are viewable by authenticated admins" ON public.combo_pack_files;
CREATE POLICY "Admins can manage combo pack files" ON public.combo_pack_files FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view combo pack files" ON public.combo_pack_files FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- PROMOTION_LOGS
DROP POLICY IF EXISTS "Admins can manage promotion logs" ON public.promotion_logs;
DROP POLICY IF EXISTS "Admins can view promotion logs" ON public.promotion_logs;
CREATE POLICY "Admins can manage promotion logs" ON public.promotion_logs FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view promotion logs" ON public.promotion_logs FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- REFUNDS
DROP POLICY IF EXISTS "Admins can manage refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can view refunds" ON public.refunds;
CREATE POLICY "Admins can manage refunds" ON public.refunds FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view refunds" ON public.refunds FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- SETTINGS
DROP POLICY IF EXISTS "Admins can delete settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can view settings" ON public.settings;
DROP POLICY IF EXISTS "Require authentication for settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can view settings" ON public.settings FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Require authentication for user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()) OR user_id = auth.uid());
