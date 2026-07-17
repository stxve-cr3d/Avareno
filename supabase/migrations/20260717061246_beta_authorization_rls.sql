-- Closed-beta authorization baseline.
-- Browser roles are denied by default; service_role remains server-only.

create table if not exists public."User" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "xp" integer not null default 0,
  "level" integer not null default 1,
  "onboardingStartedAt" timestamptz,
  "onboardingCompletedAt" timestamptz,
  "onboardingDismissedAt" timestamptz,
  "firstProductDetailOpenedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."PrivacyAuditEvent" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "eventType" text not null,
  "status" text not null,
  "message" text not null,
  "provider" text,
  "safeContext" jsonb,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."ConsentEvent" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "scope" text not null,
  "label" text not null,
  "status" text not null,
  "legalBasis" text,
  "source" text not null default 'app',
  "createdAt" timestamptz not null default now(),
  "revokedAt" timestamptz
);

create table if not exists public."Household" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "name" text not null,
  "type" text not null default 'HOME',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."HouseholdMember" (
  "id" text primary key,
  "householdId" text not null references public."Household"("id") on delete cascade,
  "userId" text references public."User"("id") on delete set null,
  "email" text not null,
  "name" text,
  "role" text not null default 'VIEWER',
  "status" text not null default 'INVITED',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Space" (
  "id" text primary key,
  "householdId" text not null references public."Household"("id") on delete cascade,
  "parentId" text references public."Space"("id") on delete set null,
  "name" text not null,
  "type" text not null default 'ROOM',
  "sortOrder" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."AffiliatePartner" (
  "id" text primary key,
  "name" text not null,
  "slug" text not null unique,
  "baseUrl" text,
  "commissionNote" text,
  "status" text not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."PlanSubscription" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "householdId" text references public."Household"("id") on delete set null,
  "provider" text not null default 'internal',
  "providerCustomerId" text,
  "providerSubscriptionId" text,
  "stripePriceId" text,
  "billingInterval" text,
  "planKey" text not null default 'free',
  "tier" text not null default 'FREE',
  "status" text not null default 'ACTIVE',
  "itemLimit" integer not null default 30,
  "storageLimitMb" integer not null default 100,
  "currentPeriodStart" timestamptz,
  "currentPeriodEnd" timestamptz,
  "cancelAtPeriodEnd" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."BillingEvent" (
  "id" text primary key,
  "provider" text not null,
  "eventId" text not null,
  "eventType" text not null,
  "receivedAt" timestamptz not null default now(),
  "processedAt" timestamptz,
  "status" text not null default 'RECEIVED',
  "safeError" text,
  unique ("provider", "eventId")
);

create table if not exists public."BillingInvoice" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "provider" text not null default 'stripe',
  "providerInvoiceId" text not null,
  "providerCustomerId" text,
  "providerSubscriptionId" text,
  "invoiceNumber" text,
  "status" text not null,
  "currency" text not null default 'eur',
  "amountDue" integer not null default 0,
  "amountPaid" integer not null default 0,
  "amountRemaining" integer not null default 0,
  "periodStart" timestamptz,
  "periodEnd" timestamptz,
  "hostedInvoiceUrl" text,
  "invoicePdfUrl" text,
  "invoiceCreatedAt" timestamptz,
  "finalizedAt" timestamptz,
  "paidAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("provider", "providerInvoiceId")
);

create table if not exists public."SmartHomeConnection" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "householdId" text references public."Household"("id") on delete set null,
  "provider" text not null,
  "status" text not null default 'AVAILABLE',
  "configJson" text,
  "lastSyncAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Item" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "householdId" text references public."Household"("id") on delete set null,
  "spaceId" text references public."Space"("id") on delete set null,
  "name" text not null,
  "itemType" text not null default 'THING',
  "category" text not null,
  "manufacturer" text,
  "model" text,
  "serialNumber" text,
  "barcode" text,
  "barcodeFormat" text,
  "purchaseDate" date,
  "merchant" text,
  "price" numeric,
  "currency" text not null default 'EUR',
  "imageUrl" text,
  "warrantyUntil" date,
  "location" text,
  "notes" text,
  "manualUrl" text,
  "driverUrl" text,
  "softwareUrl" text,
  "supportUrl" text,
  "supportContact" text,
  "reorderUrl" text,
  "affiliateUrl" text,
  "affiliateProvider" text,
  "visibility" text not null default 'PRIVATE',
  "completenessScore" integer not null default 0,
  "status" text not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Vault" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "name" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."VaultSecurity" (
  "userId" text primary key references public."User"("id") on delete cascade,
  "pinHash" text not null,
  "failedAttempts" integer not null default 0,
  "lockedUntil" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Document" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "itemId" text references public."Item"("id") on delete set null,
  "vaultId" text references public."Vault"("id") on delete set null,
  "type" text not null default 'OTHER',
  "fileName" text not null,
  "filePath" text not null,
  "mimeType" text not null check ("mimeType" in ('application/pdf', 'image/jpeg', 'image/png')),
  "fileSize" bigint check ("fileSize" is null or ("fileSize" > 0 and "fileSize" <= 10485760)),
  "extractedText" text,
  "extractedJson" jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."RepairLog" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "itemId" text not null references public."Item"("id") on delete cascade,
  "date" date not null,
  "problem" text not null,
  "resolution" text,
  "cost" numeric,
  "status" text not null default 'OPEN',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Loop" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "itemId" text references public."Item"("id") on delete set null,
  "title" text not null,
  "description" text,
  "sourceType" text not null default 'MANUAL',
  "priority" text not null default 'MEDIUM',
  "status" text not null default 'OPEN',
  "dueDate" timestamptz,
  "reminderAt" timestamptz,
  "xpReward" integer not null default 25,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Reminder" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "loopId" text references public."Loop"("id") on delete set null,
  "itemId" text references public."Item"("id") on delete set null,
  "title" text not null,
  "message" text not null,
  "remindAt" timestamptz not null,
  "status" text not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."DeviceToken" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "platform" text not null,
  "pushToken" text not null unique,
  "deviceName" text,
  "lastSeenAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."XpTransaction" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "loopId" text references public."Loop"("id") on delete set null,
  "itemId" text references public."Item"("id") on delete set null,
  "action" text not null,
  "points" integer not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."ItemActivity" (
  "id" text primary key,
  "itemId" text not null references public."Item"("id") on delete cascade,
  "userId" text not null references public."User"("id") on delete cascade,
  "type" text not null,
  "message" text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."AffiliateClick" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "itemId" text references public."Item"("id") on delete set null,
  "partnerSlug" text,
  "targetUrl" text not null,
  "source" text not null default 'ITEM_REORDER',
  "createdAt" timestamptz not null default now()
);

create table if not exists public."SmartHomeDevice" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "householdId" text references public."Household"("id") on delete set null,
  "connectionId" text references public."SmartHomeConnection"("id") on delete set null,
  "provider" text not null,
  "providerDeviceId" text not null,
  "itemId" text references public."Item"("id") on delete set null,
  "name" text not null,
  "roomName" text,
  "deviceType" text not null default 'device',
  "capabilities" jsonb,
  "status" text not null default 'ONLINE',
  "powerState" text,
  "rawJson" jsonb,
  "lastSeenAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."SmartHomeCommand" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "deviceId" text not null references public."SmartHomeDevice"("id") on delete cascade,
  "command" text not null,
  "payload" jsonb,
  "status" text not null default 'SIMULATED',
  "result" jsonb,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."UsageCounter" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "kind" text not null,
  "period" text not null,
  "count" integer not null default 0,
  "updatedAt" timestamptz not null default now(),
  unique ("userId", "kind", "period")
);

create table if not exists public."Friendship" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "friendUserId" text not null references public."User"("id") on delete cascade,
  "status" text not null default 'ACCEPTED',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId", "friendUserId")
);

create table if not exists public."FriendInviteCode" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "code" text not null unique,
  "status" text not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "expiresAt" timestamptz
);

create table if not exists public."MotivationPrivacy" (
  "userId" text primary key references public."User"("id") on delete cascade,
  "motivationEnabled" boolean not null default true,
  "leaderboardEnabled" boolean not null default false,
  "hideXpFromFriends" boolean not null default true,
  "hideStreakFromFriends" boolean not null default true,
  "allowFriendInvites" boolean not null default false,
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."FriendCircle" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade,
  "name" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."FriendCircleMember" (
  "id" text primary key,
  "circleId" text not null references public."FriendCircle"("id") on delete cascade,
  "friendUserId" text not null references public."User"("id") on delete cascade,
  "createdAt" timestamptz not null default now(),
  unique ("circleId", "friendUserId")
);

create index if not exists "Household_userId_idx" on public."Household"("userId");
create index if not exists "HouseholdMember_householdId_idx" on public."HouseholdMember"("householdId");
create index if not exists "Space_householdId_idx" on public."Space"("householdId");
create index if not exists "Item_userId_idx" on public."Item"("userId");
create index if not exists "Document_userId_idx" on public."Document"("userId");
create index if not exists "Loop_userId_idx" on public."Loop"("userId");

create or replace function public.beta_owns_household(resource_id text)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from public."Household" h where h."id" = resource_id and h."userId" = (select auth.uid())::text) $$;

create or replace function public.beta_owns_space(resource_id text, expected_household_id text default null)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public."Space" s
    join public."Household" h on h."id" = s."householdId"
    where s."id" = resource_id
      and h."userId" = (select auth.uid())::text
      and (expected_household_id is null or s."householdId" = expected_household_id)
  )
$$;

create or replace function public.beta_owns_item(resource_id text)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from public."Item" i where i."id" = resource_id and i."userId" = (select auth.uid())::text) $$;

create or replace function public.beta_owns_loop(resource_id text)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from public."Loop" l where l."id" = resource_id and l."userId" = (select auth.uid())::text) $$;

create or replace function public.beta_owns_vault(resource_id text)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from public."Vault" v where v."id" = resource_id and v."userId" = (select auth.uid())::text) $$;

-- Supabase access JWTs remain cryptographically valid until expiry after a
-- sign-out or admin deletion. This tightly scoped SECURITY DEFINER function
-- exposes only a boolean and prevents a deleted Auth subject from using an old
-- token against PostgREST or Storage. Fixed search_path; no dynamic SQL/args.
create or replace function public.beta_auth_user_active()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from auth.users u where u.id = (select auth.uid())) $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
grant usage on schema public to authenticated;
grant execute on function public.beta_owns_household(text) to authenticated;
grant execute on function public.beta_owns_space(text, text) to authenticated;
grant execute on function public.beta_owns_item(text) to authenticated;
grant execute on function public.beta_owns_loop(text) to authenticated;
grant execute on function public.beta_owns_vault(text) to authenticated;
grant execute on function public.beta_auth_user_active() to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'User','PrivacyAuditEvent','ConsentEvent','Household','HouseholdMember','Space',
    'AffiliatePartner','PlanSubscription','BillingEvent','BillingInvoice','SmartHomeConnection',
    'Item','Document','RepairLog','Loop','Reminder','DeviceToken','XpTransaction',
    'ItemActivity','AffiliateClick','SmartHomeDevice','SmartHomeCommand','Vault','VaultSecurity',
    'UsageCounter','Friendship','FriendInviteCode','MotivationPrivacy','FriendCircle','FriendCircleMember'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop policy if exists beta_active_auth_subject on public.%I', table_name);
    execute format(
      'create policy beta_active_auth_subject on public.%I as restrictive for all to authenticated using (public.beta_auth_user_active()) with check (public.beta_auth_user_active())',
      table_name
    );
  end loop;
end $$;

-- Profile: self-provisioning/update is allowed; direct account deletion is
-- denied so the Storage + database + Auth deletion orchestrator cannot be bypassed.
drop policy if exists beta_user_select on public."User";
drop policy if exists beta_user_insert on public."User";
drop policy if exists beta_user_update on public."User";
drop policy if exists beta_user_delete_denied on public."User";
create policy beta_user_select on public."User" for select to authenticated using ("id" = (select auth.uid())::text);
create policy beta_user_insert on public."User" for insert to authenticated with check ("id" = (select auth.uid())::text);
create policy beta_user_update on public."User" for update to authenticated using ("id" = (select auth.uid())::text) with check ("id" = (select auth.uid())::text);
create policy beta_user_delete_denied on public."User" for delete to authenticated using (false);

-- Simple owner tables with client CRUD in the beta.
do $$
declare table_name text;
begin
  foreach table_name in array array['Household','ConsentEvent','DeviceToken'] loop
    execute format('drop policy if exists beta_select_own on public.%I', table_name);
    execute format('drop policy if exists beta_insert_own on public.%I', table_name);
    execute format('drop policy if exists beta_update_own on public.%I', table_name);
    execute format('drop policy if exists beta_delete_own on public.%I', table_name);
    execute format('create policy beta_select_own on public.%I for select to authenticated using ("userId" = (select auth.uid())::text)', table_name);
    execute format('create policy beta_insert_own on public.%I for insert to authenticated with check ("userId" = (select auth.uid())::text)', table_name);
    execute format('create policy beta_update_own on public.%I for update to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text)', table_name);
    execute format('create policy beta_delete_own on public.%I for delete to authenticated using ("userId" = (select auth.uid())::text)', table_name);
  end loop;
end $$;

-- Household sharing is server-disabled for the invite beta. Owners may inspect
-- their household member rows, but browser clients cannot create/change them.
drop policy if exists beta_household_member_select on public."HouseholdMember";
drop policy if exists beta_household_member_insert_denied on public."HouseholdMember";
drop policy if exists beta_household_member_update_denied on public."HouseholdMember";
drop policy if exists beta_household_member_delete_denied on public."HouseholdMember";
create policy beta_household_member_select on public."HouseholdMember" for select to authenticated using (public.beta_owns_household("householdId"));
create policy beta_household_member_insert_denied on public."HouseholdMember" for insert to authenticated with check (false);
create policy beta_household_member_update_denied on public."HouseholdMember" for update to authenticated using (false) with check (false);
create policy beta_household_member_delete_denied on public."HouseholdMember" for delete to authenticated using (false);

drop policy if exists beta_space_select on public."Space";
drop policy if exists beta_space_insert on public."Space";
drop policy if exists beta_space_update on public."Space";
drop policy if exists beta_space_delete on public."Space";
create policy beta_space_select on public."Space" for select to authenticated using (public.beta_owns_household("householdId"));
create policy beta_space_insert on public."Space" for insert to authenticated with check (
  public.beta_owns_household("householdId") and ("parentId" is null or public.beta_owns_space("parentId", "householdId"))
);
create policy beta_space_update on public."Space" for update to authenticated using (public.beta_owns_household("householdId")) with check (
  public.beta_owns_household("householdId") and ("parentId" is null or public.beta_owns_space("parentId", "householdId"))
);
create policy beta_space_delete on public."Space" for delete to authenticated using (public.beta_owns_household("householdId"));

drop policy if exists beta_item_select on public."Item";
drop policy if exists beta_item_insert on public."Item";
drop policy if exists beta_item_update on public."Item";
drop policy if exists beta_item_delete on public."Item";
create policy beta_item_select on public."Item" for select to authenticated using ("userId" = (select auth.uid())::text);
create policy beta_item_insert on public."Item" for insert to authenticated with check (
  "userId" = (select auth.uid())::text
  and ("householdId" is null or public.beta_owns_household("householdId"))
  and ("spaceId" is null or public.beta_owns_space("spaceId", "householdId"))
);
create policy beta_item_update on public."Item" for update to authenticated using ("userId" = (select auth.uid())::text) with check (
  "userId" = (select auth.uid())::text
  and ("householdId" is null or public.beta_owns_household("householdId"))
  and ("spaceId" is null or public.beta_owns_space("spaceId", "householdId"))
);
create policy beta_item_delete on public."Item" for delete to authenticated using ("userId" = (select auth.uid())::text);

drop policy if exists beta_document_select on public."Document";
drop policy if exists beta_document_insert on public."Document";
drop policy if exists beta_document_update on public."Document";
drop policy if exists beta_document_delete on public."Document";
create policy beta_document_select on public."Document" for select to authenticated using ("userId" = (select auth.uid())::text);
create policy beta_document_insert on public."Document" for insert to authenticated with check (
  "userId" = (select auth.uid())::text
  and ("itemId" is null or public.beta_owns_item("itemId"))
  and ("vaultId" is null or public.beta_owns_vault("vaultId"))
);
create policy beta_document_update on public."Document" for update to authenticated using ("userId" = (select auth.uid())::text) with check (
  "userId" = (select auth.uid())::text
  and ("itemId" is null or public.beta_owns_item("itemId"))
  and ("vaultId" is null or public.beta_owns_vault("vaultId"))
);
create policy beta_document_delete on public."Document" for delete to authenticated using ("userId" = (select auth.uid())::text);

drop policy if exists beta_repair_select on public."RepairLog";
drop policy if exists beta_repair_insert on public."RepairLog";
drop policy if exists beta_repair_update on public."RepairLog";
drop policy if exists beta_repair_delete on public."RepairLog";
create policy beta_repair_select on public."RepairLog" for select to authenticated using ("userId" = (select auth.uid())::text);
create policy beta_repair_insert on public."RepairLog" for insert to authenticated with check ("userId" = (select auth.uid())::text and public.beta_owns_item("itemId"));
create policy beta_repair_update on public."RepairLog" for update to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text and public.beta_owns_item("itemId"));
create policy beta_repair_delete on public."RepairLog" for delete to authenticated using ("userId" = (select auth.uid())::text);

drop policy if exists beta_loop_select on public."Loop";
drop policy if exists beta_loop_insert on public."Loop";
drop policy if exists beta_loop_update on public."Loop";
drop policy if exists beta_loop_delete on public."Loop";
create policy beta_loop_select on public."Loop" for select to authenticated using ("userId" = (select auth.uid())::text);
create policy beta_loop_insert on public."Loop" for insert to authenticated with check ("userId" = (select auth.uid())::text and ("itemId" is null or public.beta_owns_item("itemId")));
create policy beta_loop_update on public."Loop" for update to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text and ("itemId" is null or public.beta_owns_item("itemId")));
create policy beta_loop_delete on public."Loop" for delete to authenticated using ("userId" = (select auth.uid())::text);

drop policy if exists beta_reminder_select on public."Reminder";
drop policy if exists beta_reminder_insert on public."Reminder";
drop policy if exists beta_reminder_update on public."Reminder";
drop policy if exists beta_reminder_delete on public."Reminder";
create policy beta_reminder_select on public."Reminder" for select to authenticated using ("userId" = (select auth.uid())::text);
create policy beta_reminder_insert on public."Reminder" for insert to authenticated with check (
  "userId" = (select auth.uid())::text
  and ("itemId" is null or public.beta_owns_item("itemId"))
  and ("loopId" is null or public.beta_owns_loop("loopId"))
);
create policy beta_reminder_update on public."Reminder" for update to authenticated using ("userId" = (select auth.uid())::text) with check (
  "userId" = (select auth.uid())::text
  and ("itemId" is null or public.beta_owns_item("itemId"))
  and ("loopId" is null or public.beta_owns_loop("loopId"))
);
create policy beta_reminder_delete on public."Reminder" for delete to authenticated using ("userId" = (select auth.uid())::text);

drop policy if exists beta_affiliate_click_select on public."AffiliateClick";
drop policy if exists beta_affiliate_click_insert on public."AffiliateClick";
drop policy if exists beta_affiliate_click_update on public."AffiliateClick";
drop policy if exists beta_affiliate_click_delete on public."AffiliateClick";
create policy beta_affiliate_click_select on public."AffiliateClick" for select to authenticated using ("userId" = (select auth.uid())::text);
create policy beta_affiliate_click_insert on public."AffiliateClick" for insert to authenticated with check ("userId" = (select auth.uid())::text and ("itemId" is null or public.beta_owns_item("itemId")));
create policy beta_affiliate_click_update on public."AffiliateClick" for update to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text and ("itemId" is null or public.beta_owns_item("itemId")));
create policy beta_affiliate_click_delete on public."AffiliateClick" for delete to authenticated using ("userId" = (select auth.uid())::text);

-- Server-generated/read-only tables: authenticated users may read their own
-- rows, while INSERT/UPDATE/DELETE are explicitly denied and ungranted.
do $$
declare table_name text;
begin
  foreach table_name in array array['PrivacyAuditEvent','PlanSubscription','BillingInvoice','XpTransaction','ItemActivity','UsageCounter'] loop
    execute format('drop policy if exists beta_select_own on public.%I', table_name);
    execute format('drop policy if exists beta_insert_denied on public.%I', table_name);
    execute format('drop policy if exists beta_update_denied on public.%I', table_name);
    execute format('drop policy if exists beta_delete_denied on public.%I', table_name);
    execute format('create policy beta_select_own on public.%I for select to authenticated using ("userId" = (select auth.uid())::text)', table_name);
    execute format('create policy beta_insert_denied on public.%I for insert to authenticated with check (false)', table_name);
    execute format('create policy beta_update_denied on public.%I for update to authenticated using (false) with check (false)', table_name);
    execute format('create policy beta_delete_denied on public.%I for delete to authenticated using (false)', table_name);
  end loop;
end $$;

drop policy if exists beta_affiliate_partner_select on public."AffiliatePartner";
drop policy if exists beta_affiliate_partner_insert_denied on public."AffiliatePartner";
drop policy if exists beta_affiliate_partner_update_denied on public."AffiliatePartner";
drop policy if exists beta_affiliate_partner_delete_denied on public."AffiliatePartner";
create policy beta_affiliate_partner_select on public."AffiliatePartner" for select to authenticated using (true);
create policy beta_affiliate_partner_insert_denied on public."AffiliatePartner" for insert to authenticated with check (false);
create policy beta_affiliate_partner_update_denied on public."AffiliatePartner" for update to authenticated using (false) with check (false);
create policy beta_affiliate_partner_delete_denied on public."AffiliatePartner" for delete to authenticated using (false);

-- Disabled beta domains have explicit deny policies and no client grants.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'BillingEvent','SmartHomeConnection','SmartHomeDevice','SmartHomeCommand',
    'Vault','VaultSecurity','Friendship','FriendInviteCode','MotivationPrivacy',
    'FriendCircle','FriendCircleMember'
  ] loop
    execute format('drop policy if exists beta_select_denied on public.%I', table_name);
    execute format('drop policy if exists beta_insert_denied on public.%I', table_name);
    execute format('drop policy if exists beta_update_denied on public.%I', table_name);
    execute format('drop policy if exists beta_delete_denied on public.%I', table_name);
    execute format('create policy beta_select_denied on public.%I for select to authenticated using (false)', table_name);
    execute format('create policy beta_insert_denied on public.%I for insert to authenticated with check (false)', table_name);
    execute format('create policy beta_update_denied on public.%I for update to authenticated using (false) with check (false)', table_name);
    execute format('create policy beta_delete_denied on public.%I for delete to authenticated using (false)', table_name);
  end loop;
end $$;

grant select, insert, update, delete on public."User", public."Household", public."ConsentEvent", public."DeviceToken", public."Space", public."Item", public."Document", public."RepairLog", public."Loop", public."Reminder", public."AffiliateClick" to authenticated;
grant select on public."HouseholdMember", public."AffiliatePartner", public."PrivacyAuditEvent", public."PlanSubscription", public."BillingInvoice", public."XpTransaction", public."ItemActivity", public."UsageCounter" to authenticated;

-- Existing views and RPCs are not implicitly exposed during the beta. Views
-- use invoker semantics and require a future explicit grant; all public
-- functions were revoked above except the RLS ownership helpers.
do $$
declare view_record record;
begin
  for view_record in select schemaname, viewname from pg_views where schemaname = 'public' loop
    execute format('alter view %I.%I set (security_invoker = true)', view_record.schemaname, view_record.viewname);
    execute format('revoke all on table %I.%I from anon, authenticated', view_record.schemaname, view_record.viewname);
  end loop;
end $$;
