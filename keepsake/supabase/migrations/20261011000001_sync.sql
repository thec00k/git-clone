-- What the app's sync client calls (docs/backend-design.md, "Sync plan"; client in src/lib/sync/).
-- 1. save_room: room settings with optimistic concurrency, so another device's save is never overwritten.
--    rooms.settings holds only what visitors see (lights, season, decor); everything else in the room record
--    that is not a book or a file (archive details, notes, time capsules, preferences) goes in room_private,
--    which only its owner can read.
-- 2. save_book: a whole book (fields, pages, page photos) in one transaction, so a retry, a reorder or a
--    lost connection never leaves half a book. Runs as the caller: every row level security rule applies.
-- 3. The title page is stored as position 0, so a book has positions 0-10 (10 content pages).
-- 4. The own-photo rule for page photos now also covers updates (it only checked inserts before).

alter table public.pages drop constraint pages_position_check;
alter table public.pages add constraint pages_position_check check (position between 0 and 10);

create function public.check_page_photo_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from photos ph join pages p on p.id = new.page_id join books b on b.id = p.book_id
                 where ph.id = new.photo_id and ph.owner_id = b.owner_id) then
    raise exception 'only your own photos can go in your books';
  end if;
  return new;
end $$;
create trigger page_photos_owner_update before update on public.page_photos
  for each row execute function public.check_page_photo_owner();

create table public.room_private (
  owner_id uuid primary key references public.rooms (owner_id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 1048576),
  updated_at timestamptz not null default now()
);
alter table public.room_private enable row level security;
grant select, insert, update (data) on public.room_private to authenticated;
create policy room_private_read on public.room_private for select to authenticated using (owner_id = auth.uid());
create policy room_private_insert on public.room_private for insert to authenticated with check (owner_id = auth.uid());
create policy room_private_update on public.room_private for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger room_private_touch before update on public.room_private for each row execute function public.touch_updated_at();

-- Returns the new revision, or null when the room changed on another device since p_expected (nothing written).
create function public.save_room(p_theme text, p_settings jsonb, p_private jsonb, p_expected bigint) returns bigint
language plpgsql security invoker set search_path = public as $$
declare rev bigint;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update rooms set theme = p_theme, settings = p_settings, revision = revision + 1
    where owner_id = auth.uid() and revision = p_expected
    returning revision into rev;
  if rev is null then return null; end if;
  insert into room_private (owner_id, data) values (auth.uid(), p_private)
    on conflict (owner_id) do update set data = excluded.data;
  return rev;
end $$;

-- p_pages: [{id, elements, paper, photos: [{photo_id, slot, layout}]}], in order; index 0 is the title page.
create function public.save_book(p_id uuid, p_title text, p_subtitle text, p_visibility public.book_visibility,
  p_cover jsonb, p_pages jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare pg jsonb; ph jsonb; i int := 0; page uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(p_pages) <> 'array' or jsonb_array_length(p_pages) > 11 then
    raise exception 'a book holds at most 10 pages';
  end if;
  -- Update first: an insert attempt would trip the 12-book cap for a book that already exists.
  update books set title = p_title, subtitle = p_subtitle, visibility = p_visibility, cover = p_cover, deleted_at = null
    where id = p_id and owner_id = auth.uid();
  if not found then
    insert into books (id, owner_id, title, subtitle, visibility, cover)
      values (p_id, auth.uid(), p_title, p_subtitle, p_visibility, p_cover);
  end if;
  delete from pages where book_id = p_id;
  for pg in select * from jsonb_array_elements(p_pages) loop
    page := coalesce((pg->>'id')::uuid, gen_random_uuid());
    insert into pages (id, book_id, position, elements, paper)
      values (page, p_id, i, coalesce(pg->'elements', '[]'::jsonb), coalesce(pg->'paper', '{}'::jsonb));
    for ph in select * from jsonb_array_elements(coalesce(pg->'photos', '[]'::jsonb)) loop
      insert into page_photos (page_id, photo_id, slot, layout)
        values (page, (ph->>'photo_id')::uuid, (ph->>'slot')::int, coalesce(ph->'layout', '{}'::jsonb));
    end loop;
    i := i + 1;
  end loop;
end $$;

revoke all on function public.check_page_photo_owner() from public, anon, authenticated;
revoke all on function public.save_room(text, jsonb, jsonb, bigint), public.save_book(uuid, text, text, public.book_visibility, jsonb, jsonb) from public, anon;
grant execute on function public.save_room(text, jsonb, jsonb, bigint), public.save_book(uuid, text, text, public.book_visibility, jsonb, jsonb) to authenticated;
