-- Update get_public_setting to include admin_signup_enabled
CREATE OR REPLACE FUNCTION public.get_public_setting(setting_key text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT value FROM public.settings 
  WHERE key = setting_key 
  AND key IN ('whatsapp_enabled', 'razorpay_test_mode', 'admin_signup_enabled')
$function$;