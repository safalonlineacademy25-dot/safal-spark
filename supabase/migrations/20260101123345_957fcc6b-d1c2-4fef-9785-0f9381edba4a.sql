-- Ensure we can upsert customers by email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_email_key'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_email_key UNIQUE (email);
  END IF;
END $$;

-- Keep customers table in sync whenever an order is created/updated
CREATE OR REPLACE FUNCTION public.sync_customer_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync when we have basic customer identifiers
  IF NEW.customer_email IS NULL OR NEW.customer_phone IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customers (email, phone, name, whatsapp_optin)
  VALUES (
    NEW.customer_email,
    NEW.customer_phone,
    NEW.customer_name,
    COALESCE(NEW.whatsapp_optin, false)
  )
  ON CONFLICT (email)
  DO UPDATE SET
    phone = EXCLUDED.phone,
    name = COALESCE(EXCLUDED.name, public.customers.name),
    whatsapp_optin = (public.customers.whatsapp_optin OR EXCLUDED.whatsapp_optin),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_from_order ON public.orders;
CREATE TRIGGER trg_sync_customer_from_order
AFTER INSERT OR UPDATE OF customer_email, customer_phone, customer_name, whatsapp_optin
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_from_order();

-- Backfill customers from existing orders
INSERT INTO public.customers (email, phone, name, whatsapp_optin)
SELECT DISTINCT ON (o.customer_email)
  o.customer_email,
  o.customer_phone,
  o.customer_name,
  COALESCE(o.whatsapp_optin, false)
FROM public.orders o
WHERE o.customer_email IS NOT NULL
  AND o.customer_phone IS NOT NULL
ORDER BY o.customer_email, o.created_at DESC
ON CONFLICT (email)
DO UPDATE SET
  phone = EXCLUDED.phone,
  name = COALESCE(EXCLUDED.name, public.customers.name),
  whatsapp_optin = (public.customers.whatsapp_optin OR EXCLUDED.whatsapp_optin),
  updated_at = now();
