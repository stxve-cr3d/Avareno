-- Private document bytes must pass the authenticated backend's extension,
-- MIME and magic-byte checks before they are persisted. Supabase Storage
-- bucket policies can constrain metadata but cannot inspect object bytes, so
-- browser clients must not write, replace or delete private document objects
-- directly. The service role remains server-only and bypasses RLS for the
-- reviewed account-deletion/storage orchestration paths.

drop policy if exists beta_private_insert on storage.objects;
drop policy if exists beta_private_update on storage.objects;
drop policy if exists beta_private_delete on storage.objects;
