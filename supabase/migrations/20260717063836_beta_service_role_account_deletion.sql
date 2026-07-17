-- Account deletion is a server-only operation. Earlier deny-by-default grants
-- intentionally narrowed browser roles, but the deletion orchestrator also
-- needs explicit table privileges in addition to service_role's RLS bypass.
-- Keep this grant minimal: child rows are removed by reviewed FK cascades.
grant usage on schema public to service_role;
grant select, delete on table public."User", public."HouseholdMember" to service_role;
