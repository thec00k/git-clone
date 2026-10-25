-- Owner decision (Oct 25 2026): six photos a page, up from four. Keep in step with src/lib/limits.ts.
alter table public.page_photos drop constraint page_photos_slot_check;
alter table public.page_photos add constraint page_photos_slot_check check (slot between 0 and 5);
