-- Public-schema functions receive EXECUTE for PostgreSQL's PUBLIC role by
-- default. Keep the authorization helpers callable only by signed-in users;
-- the service role bypasses RLS and does not need these RPC grants.
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

grant execute on function public.beta_owns_household(text) to authenticated;
grant execute on function public.beta_owns_space(text, text) to authenticated;
grant execute on function public.beta_owns_item(text) to authenticated;
grant execute on function public.beta_owns_loop(text) to authenticated;
grant execute on function public.beta_owns_vault(text) to authenticated;
grant execute on function public.beta_auth_user_active() to authenticated;
