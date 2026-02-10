
-- Customers: replace permissive false-block with restrictive auth check
DROP POLICY IF EXISTS "Block anonymous access to customers" ON customers;
CREATE POLICY "Require authentication for customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Orders: replace permissive false-block with restrictive auth check
DROP POLICY IF EXISTS "Block anonymous access to orders" ON orders;
CREATE POLICY "Require authentication for orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
