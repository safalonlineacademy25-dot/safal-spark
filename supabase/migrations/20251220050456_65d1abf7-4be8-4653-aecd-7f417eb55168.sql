INSERT INTO public.user_roles (user_id, role)
VALUES ('6312d10c-3c87-45d1-a8dc-57af102e703d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;