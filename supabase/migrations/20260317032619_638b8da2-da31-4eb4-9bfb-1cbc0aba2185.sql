-- Fix: Restore full SELECT to authenticated role
-- RLS policies already handle access control (admins=ALL, public=active+show_on_ui only)
-- Column-level grants were blocking admin INSERT/UPDATE return values
REVOKE SELECT ON public.products FROM authenticated;
GRANT SELECT ON public.products TO authenticated;
