-- Avareno Supabase Storage policies.
-- Apply after the Storage buckets exist.
--
-- Buckets expected by the app:
-- - avatars        public object URLs, no public listing policy
-- - object-images  private user files
-- - receipts       private user files
-- - documents      private user files
-- - support-files  private user files
--
-- Client upload paths must start with the authenticated user id:
-- <auth.uid()>/<filename-or-subfolder>

update storage.buckets
set public = case
  when id = 'avatars' then true
  when id in ('object-images', 'receipts', 'documents', 'support-files') then false
  else public
end
where id in ('avatars', 'object-images', 'receipts', 'documents', 'support-files');

drop policy if exists "Anyone can read avatars" on storage.objects;
drop policy if exists "Users can upload own avatars" on storage.objects;
drop policy if exists "Users can update own avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;
drop policy if exists "Users can read own private files" on storage.objects;
drop policy if exists "Users can upload own private files" on storage.objects;
drop policy if exists "Users can update own private files" on storage.objects;
drop policy if exists "Users can delete own private files" on storage.objects;

-- Avatars stay public for direct avatar URLs, but without a public SELECT
-- policy so clients cannot list all avatar objects.
create policy "Users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Private buckets: users can only access files in their own first-level
-- folder. Do not add public read policies to these buckets.
create policy "Users can read own private files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can upload own private files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can update own private files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can delete own private files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('object-images', 'receipts', 'documents', 'support-files')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
