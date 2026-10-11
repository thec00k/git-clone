-- The app's own key for a photo (SHA-256 of the file as it was on the device), written by the upload pipeline
-- from the upload's file name. It lets a new device put each downloaded photo back where it belongs.
alter table public.photos add column source_key text check (source_key ~ '^[0-9a-f]{64}$');
create index photos_source_key on public.photos (owner_id, source_key);
