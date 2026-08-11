-- ============================================================================
-- MediFlow AI — 0002_auth_store_security_definer.sql
-- Fixes RLS infinite recursion ("stack depth limit exceeded"):
--   the `profiles` RLS policy calls auth_store_id(), which queries `profiles`,
--   re-evaluating the policy. SECURITY DEFINER lets the helper read profiles
--   without triggering RLS (runs as the function owner, not the caller).
-- ============================================================================

create or replace function auth_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.profiles where id = auth.uid();
$$;
