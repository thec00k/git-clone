-- Photo files. Two private buckets:
--   uploads/<user>/<anything>   raw uploads, readable and writable only by their owner, deleted after processing
--   photos/<owner>/<photo id>.webp   processed copies (max 2048 px, metadata stripped), written only by the
--                                    upload pipeline (service role); readable when can_view_photo() allows it
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']),
  ('photos', 'photos', false, 8388608, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy uploads_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy uploads_own_read on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy uploads_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy photos_viewable on storage.objects for select to authenticated using (
  bucket_id = 'photos' and exists (select 1 from public.photos p where p.storage_path = name and public.can_view_photo(p.id)));
