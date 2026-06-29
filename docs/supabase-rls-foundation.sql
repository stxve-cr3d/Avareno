-- Avareno Supabase RLS foundation.
-- Apply after the public tables have been created in Supabase Postgres.
-- Keep service-role keys server-side only; browser clients use the publishable key.

alter table public."User" enable row level security;
alter table public."AdminMembership" enable row level security;
alter table public."AdminAuditLog" enable row level security;
alter table public."Household" enable row level security;
alter table public."HouseholdMember" enable row level security;
alter table public."Space" enable row level security;
alter table public."AffiliatePartner" enable row level security;
alter table public."PlanSubscription" enable row level security;
alter table public."BillingEvent" enable row level security;
alter table public."SmartHomeConnection" enable row level security;
alter table public."Item" enable row level security;
alter table public."Document" enable row level security;
alter table public."RepairLog" enable row level security;
alter table public."Loop" enable row level security;
alter table public."Reminder" enable row level security;
alter table public."DeviceToken" enable row level security;
alter table public."XpTransaction" enable row level security;
alter table public."ItemActivity" enable row level security;
alter table public."AffiliateClick" enable row level security;
alter table public."SmartHomeDevice" enable row level security;
alter table public."SmartHomeCommand" enable row level security;

create index if not exists "User_auth_uid_idx" on public."User" ("id");
create index if not exists "AdminMembership_userId_idx" on public."AdminMembership" ("userId");
create index if not exists "AdminMembership_email_idx" on public."AdminMembership" ("email");
create index if not exists "AdminAuditLog_createdAt_idx" on public."AdminAuditLog" ("createdAt");
create index if not exists "Household_userId_idx" on public."Household" ("userId");
create index if not exists "HouseholdMember_userId_idx" on public."HouseholdMember" ("userId");
create index if not exists "HouseholdMember_householdId_idx" on public."HouseholdMember" ("householdId");
create index if not exists "Space_householdId_idx" on public."Space" ("householdId");
create index if not exists "PlanSubscription_userId_idx" on public."PlanSubscription" ("userId");
create index if not exists "BillingEvent_provider_eventId_idx" on public."BillingEvent" ("provider", "eventId");
create index if not exists "SmartHomeConnection_userId_idx" on public."SmartHomeConnection" ("userId");
create index if not exists "Item_userId_idx" on public."Item" ("userId");
create index if not exists "Document_userId_idx" on public."Document" ("userId");
create index if not exists "RepairLog_userId_idx" on public."RepairLog" ("userId");
create index if not exists "Loop_userId_idx" on public."Loop" ("userId");
create index if not exists "Reminder_userId_idx" on public."Reminder" ("userId");
create index if not exists "DeviceToken_userId_idx" on public."DeviceToken" ("userId");
create index if not exists "XpTransaction_userId_idx" on public."XpTransaction" ("userId");
create index if not exists "ItemActivity_userId_idx" on public."ItemActivity" ("userId");
create index if not exists "AffiliateClick_userId_idx" on public."AffiliateClick" ("userId");
create index if not exists "SmartHomeDevice_userId_idx" on public."SmartHomeDevice" ("userId");
create index if not exists "SmartHomeCommand_userId_idx" on public."SmartHomeCommand" ("userId");

grant select, insert, update, delete on public."User" to authenticated;
revoke all on public."AdminMembership" from anon, authenticated;
revoke all on public."AdminAuditLog" from anon, authenticated;
grant select, insert, update, delete on public."Household" to authenticated;
grant select, insert, update, delete on public."HouseholdMember" to authenticated;
grant select, insert, update, delete on public."Space" to authenticated;
grant select on public."AffiliatePartner" to authenticated;
grant select on public."PlanSubscription" to authenticated;
revoke all on public."BillingEvent" from anon, authenticated;
grant select, insert, update, delete on public."SmartHomeConnection" to authenticated;
grant select, insert, update, delete on public."Item" to authenticated;
grant select, insert, update, delete on public."Document" to authenticated;
grant select, insert, update, delete on public."RepairLog" to authenticated;
grant select, insert, update, delete on public."Loop" to authenticated;
grant select, insert, update, delete on public."Reminder" to authenticated;
grant select, insert, update, delete on public."DeviceToken" to authenticated;
grant select, insert, update, delete on public."XpTransaction" to authenticated;
grant select, insert, update, delete on public."ItemActivity" to authenticated;
grant select, insert, update, delete on public."AffiliateClick" to authenticated;
grant select, insert, update, delete on public."SmartHomeDevice" to authenticated;
grant select, insert, update, delete on public."SmartHomeCommand" to authenticated;

drop policy if exists "Users can select own profile" on public."User";
create policy "Users can select own profile"
on public."User" for select
to authenticated
using ((select auth.uid())::text = "id");

drop policy if exists "Users can insert own profile" on public."User";
create policy "Users can insert own profile"
on public."User" for insert
to authenticated
with check ((select auth.uid())::text = "id");

drop policy if exists "Users can update own profile" on public."User";
create policy "Users can update own profile"
on public."User" for update
to authenticated
using ((select auth.uid())::text = "id")
with check ((select auth.uid())::text = "id");

-- AdminMembership and AdminAuditLog intentionally have no authenticated
-- browser-client policies. Admin role reads/writes must go through a trusted
-- backend or Edge Function using server-side credentials, with minimized
-- responses and safe audit entries. Do not add broad authenticated policies
-- for these tables. If JWT admin claims are used, keep them in app_metadata,
-- never user_metadata.

drop policy if exists "Users can manage own households" on public."Household";
create policy "Users can manage own households"
on public."Household" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own household memberships" on public."HouseholdMember";
create policy "Users can manage own household memberships"
on public."HouseholdMember" for all
to authenticated
using (
  "userId" = (select auth.uid())::text
  or exists (
    select 1 from public."Household" h
    where h."id" = "householdId" and h."userId" = (select auth.uid())::text
  )
)
with check (
  "userId" = (select auth.uid())::text
  or exists (
    select 1 from public."Household" h
    where h."id" = "householdId" and h."userId" = (select auth.uid())::text
  )
);

drop policy if exists "Users can manage spaces in own households" on public."Space";
create policy "Users can manage spaces in own households"
on public."Space" for all
to authenticated
using (
  exists (
    select 1 from public."Household" h
    where h."id" = "householdId" and h."userId" = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public."Household" h
    where h."id" = "householdId" and h."userId" = (select auth.uid())::text
  )
);

drop policy if exists "Authenticated users can read affiliate partners" on public."AffiliatePartner";
create policy "Authenticated users can read affiliate partners"
on public."AffiliatePartner" for select
to authenticated
using (true);

drop policy if exists "Users can manage own plan subscriptions" on public."PlanSubscription";
drop policy if exists "Users can read own plan subscriptions" on public."PlanSubscription";
create policy "Users can read own plan subscriptions"
on public."PlanSubscription" for select
to authenticated
using ((select auth.uid())::text = "userId");

-- BillingEvent intentionally has no authenticated user policies.
-- It is written only by server-side webhook processing with service-role privileges.

drop policy if exists "Users can manage own smart home connections" on public."SmartHomeConnection";
create policy "Users can manage own smart home connections"
on public."SmartHomeConnection" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own items" on public."Item";
create policy "Users can manage own items"
on public."Item" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own documents" on public."Document";
create policy "Users can manage own documents"
on public."Document" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own repair logs" on public."RepairLog";
create policy "Users can manage own repair logs"
on public."RepairLog" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own loops" on public."Loop";
create policy "Users can manage own loops"
on public."Loop" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own reminders" on public."Reminder";
create policy "Users can manage own reminders"
on public."Reminder" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own device tokens" on public."DeviceToken";
create policy "Users can manage own device tokens"
on public."DeviceToken" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can read own XP transactions" on public."XpTransaction";
create policy "Users can read own XP transactions"
on public."XpTransaction" for select
to authenticated
using ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own item activity" on public."ItemActivity";
create policy "Users can manage own item activity"
on public."ItemActivity" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own affiliate clicks" on public."AffiliateClick";
create policy "Users can manage own affiliate clicks"
on public."AffiliateClick" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own smart home devices" on public."SmartHomeDevice";
create policy "Users can manage own smart home devices"
on public."SmartHomeDevice" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");

drop policy if exists "Users can manage own smart home commands" on public."SmartHomeCommand";
create policy "Users can manage own smart home commands"
on public."SmartHomeCommand" for all
to authenticated
using ((select auth.uid())::text = "userId")
with check ((select auth.uid())::text = "userId");
