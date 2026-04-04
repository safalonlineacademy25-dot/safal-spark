
-- Create upi_orders table for manual UPI scanner payments
CREATE TABLE public.upi_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID,
  whatsapp_optin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upi_orders ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage upi orders"
ON public.upi_orders
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- Anonymous users can insert (from public payment page)
CREATE POLICY "Public can create upi orders"
ON public.upi_orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Service role bypass for edge functions (implicit, but explicit for clarity)
CREATE POLICY "Service role full access"
ON public.upi_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_upi_orders_updated_at
BEFORE UPDATE ON public.upi_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
