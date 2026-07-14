
-- Lock down SECURITY DEFINER functions per Supabase linter 0028/0029.

-- has_role: needed by RLS policies executed as authenticated users. Not needed for anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- tg_set_updated_at: only ever invoked as a row-level trigger by the database.
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_set_updated_at() TO service_role;

-- rls_auto_enable: event trigger, invoked by the database itself.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
