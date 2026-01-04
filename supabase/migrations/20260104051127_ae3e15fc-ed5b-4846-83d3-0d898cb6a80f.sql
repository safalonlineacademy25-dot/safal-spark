-- Fix security issues: Add explicit policies to block anonymous access

-- ==================== CUSTOMERS TABLE ====================
-- Drop existing policies and recreate with proper protection
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Service role can manage customers" ON public.customers;

-- Block all access for anonymous users (no auth.uid())
CREATE POLICY "Block anonymous access to customers"
ON public.customers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow admins to view all customers
CREATE POLICY "Admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage customers
CREATE POLICY "Admins can manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ==================== ORDERS TABLE ====================
-- Drop existing policies and recreate with proper protection
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can manage orders" ON public.orders;

-- Block all access for anonymous users
CREATE POLICY "Block anonymous access to orders"
ON public.orders
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow admins to view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage orders
CREATE POLICY "Admins can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ==================== DOWNLOAD_TOKENS TABLE ====================
-- Drop existing policies and recreate with proper protection
DROP POLICY IF EXISTS "Service role can manage download tokens" ON public.download_tokens;

-- Block all access for anonymous users
CREATE POLICY "Block anonymous access to download_tokens"
ON public.download_tokens
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow admins to view all download tokens
CREATE POLICY "Admins can view download tokens"
ON public.download_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage download tokens
CREATE POLICY "Admins can manage download tokens"
ON public.download_tokens
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ==================== ORDER_ITEMS TABLE ====================
-- Also secure order_items which contains product purchase info
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Service role can manage order items" ON public.order_items;

-- Block all access for anonymous users
CREATE POLICY "Block anonymous access to order_items"
ON public.order_items
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow admins to view all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage order items
CREATE POLICY "Admins can manage order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));