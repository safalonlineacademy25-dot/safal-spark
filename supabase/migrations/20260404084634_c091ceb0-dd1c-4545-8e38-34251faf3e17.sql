CREATE OR REPLACE FUNCTION public.get_public_setting(setting_key text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT value FROM public.settings 
  WHERE key = setting_key 
  AND key IN ('whatsapp_enabled', 'razorpay_test_mode', 'admin_signup_enabled', 'upi_qr_image_url', 'upi_id')
$$;