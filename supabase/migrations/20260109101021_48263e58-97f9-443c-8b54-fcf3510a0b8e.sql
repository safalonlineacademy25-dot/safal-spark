-- Insert default value for admin_signup_enabled setting
INSERT INTO public.settings (key, value)
VALUES ('admin_signup_enabled', 'true')
ON CONFLICT (key) DO NOTHING;