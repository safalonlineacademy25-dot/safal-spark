-- Create email delivery logs table to track Resend API responses
CREATE TABLE public.email_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  resend_email_id TEXT,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'download', -- 'download', 'combo_part'
  part_number INTEGER, -- For combo packs
  total_parts INTEGER, -- For combo packs
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refunds table to track refund eligibility and processing
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_refund_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL, -- 'email_delivery_failed', 'customer_request', 'other'
  failed_email TEXT, -- The email that failed
  status TEXT NOT NULL DEFAULT 'eligible', -- 'eligible', 'processing', 'completed', 'failed'
  error_message TEXT,
  processed_by UUID,
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_delivery_logs
CREATE POLICY "Admins can view email delivery logs"
ON public.email_delivery_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email delivery logs"
ON public.email_delivery_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for refunds
CREATE POLICY "Admins can view refunds"
ON public.refunds
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage refunds"
ON public.refunds
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_email_delivery_logs_order_id ON public.email_delivery_logs(order_id);
CREATE INDEX idx_email_delivery_logs_status ON public.email_delivery_logs(delivery_status);
CREATE INDEX idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);

-- Add trigger for updated_at on email_delivery_logs
CREATE TRIGGER update_email_delivery_logs_updated_at
BEFORE UPDATE ON public.email_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();