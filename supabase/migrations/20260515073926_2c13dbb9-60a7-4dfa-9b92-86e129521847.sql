-- Hard copy products (books / physical notes)
CREATE TABLE public.hard_copy_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  original_price numeric,
  image_url text,
  badge text,
  category text NOT NULL DEFAULT 'Books',
  features text[] DEFAULT '{}',
  weight_grams integer,
  is_active boolean DEFAULT true,
  show_on_ui boolean DEFAULT true,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hard_copy_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hard copy products"
  ON public.hard_copy_products FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Public can view active hard copy products"
  ON public.hard_copy_products FOR SELECT TO anon, authenticated
  USING (is_active = true AND show_on_ui = true);

CREATE TRIGGER update_hard_copy_products_updated_at
  BEFORE UPDATE ON public.hard_copy_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hard copy orders (with shipping address)
CREATE TABLE public.hard_copy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  product_id uuid,
  product_name text NOT NULL,
  product_price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL,
  currency text DEFAULT 'INR',

  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  whatsapp_optin boolean DEFAULT true,

  -- Shipping address
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  landmark text,

  -- Payment
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  payment_status text NOT NULL DEFAULT 'pending', -- pending, paid, failed

  -- Fulfilment
  status text NOT NULL DEFAULT 'pending', -- pending, paid, processing, shipped, delivered, cancelled
  courier_name text,
  tracking_id text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  admin_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hard_copy_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hard copy orders"
  ON public.hard_copy_orders FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Public can create hard copy orders"
  ON public.hard_copy_orders FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to update only their own pending order's payment fields by razorpay_order_id (used from verify edge function via service role anyway)
CREATE TRIGGER update_hard_copy_orders_updated_at
  BEFORE UPDATE ON public.hard_copy_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hard_copy_orders_status ON public.hard_copy_orders(status);
CREATE INDEX idx_hard_copy_orders_payment_status ON public.hard_copy_orders(payment_status);
CREATE INDEX idx_hard_copy_orders_razorpay_order_id ON public.hard_copy_orders(razorpay_order_id);