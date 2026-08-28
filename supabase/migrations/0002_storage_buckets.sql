-- 0002_storage_buckets.sql
-- Buckets de stockage : 'avatars' et 'post-media' (publics).
-- Policies storage.objects : ecriture/modification/suppression dans SON dossier
-- (auth.uid() en premiere partie du chemin), lecture publique.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true),
       ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- ============================================================
-- avatars
-- ============================================================
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- ============================================================
-- post-media
-- ============================================================
drop policy if exists "post_media_insert_own" on storage.objects;
create policy "post_media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post_media_update_own" on storage.objects;
create policy "post_media_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post_media_delete_own" on storage.objects;
create policy "post_media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post_media_select_public" on storage.objects;
create policy "post_media_select_public" on storage.objects
  for select
  using (bucket_id = 'post-media');