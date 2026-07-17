-- Closed-beta Storage baseline. Personal documents are private, capped at
-- 10 MiB, limited to PDF/JPEG/PNG, and scoped to <auth.uid()>/<generated-id>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg']),
  ('object-images', 'object-images', false, 10485760, array['image/png', 'image/jpeg']),
  ('receipts', 'receipts', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
  ('support-files', 'support-files', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all on storage.objects from anon;
grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "Anyone can read avatars" on storage.objects;
drop policy if exists "Users can upload own avatars" on storage.objects;
drop policy if exists "Users can update own avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;
drop policy if exists "Users can read own private files" on storage.objects;
drop policy if exists "Users can upload own private files" on storage.objects;
drop policy if exists "Users can update own private files" on storage.objects;
drop policy if exists "Users can delete own private files" on storage.objects;
drop policy if exists beta_avatar_insert on storage.objects;
drop policy if exists beta_avatar_update on storage.objects;
drop policy if exists beta_avatar_delete on storage.objects;
drop policy if exists beta_private_select on storage.objects;
drop policy if exists beta_private_insert on storage.objects;
drop policy if exists beta_private_update on storage.objects;
drop policy if exists beta_private_delete on storage.objects;
drop policy if exists beta_storage_active_subject on storage.objects;

create policy beta_storage_active_subject
on storage.objects as restrictive for all to authenticated
using (public.beta_auth_user_active())
with check (public.beta_auth_user_active());

-- Avatars are the only public bucket and contain no private documents. Public
-- retrieval does not grant object listing; writes remain owner/path scoped.
create policy beta_avatar_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

create policy beta_avatar_update
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

create policy beta_avatar_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

create policy beta_private_select
on storage.objects for select to authenticated
using (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

create policy beta_private_insert
on storage.objects for insert to authenticated
with check (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
  and storage.filename(name) ~ '^([0-9A-Fa-f]{32}|[0-9A-Fa-f-]{36})[.](pdf|png|jpg|jpeg)$'
);

create policy beta_private_update
on storage.objects for update to authenticated
using (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
  and storage.filename(name) ~ '^([0-9A-Fa-f]{32}|[0-9A-Fa-f-]{36})[.](pdf|png|jpg|jpeg)$'
);

create policy beta_private_delete
on storage.objects for delete to authenticated
using (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);
