-- Sync functions: save_room (no overwriting another device's save) and save_book (whole book, own photos only).
\set QUIET on
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  perform set_config('role', case when uid is null then 'postgres' else 'authenticated' end, false);
end $$;
create or replace function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if position(lower(needle) in lower(sqlerrm)) = 0 then raise exception 'expected error containing "%", got "%"', needle, sqlerrm; end if;
    return;
  end;
  raise exception 'expected an error containing "%" from: %', needle, sql;
end $$;
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- Two people of their own: una and vic.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2');
\set una '\'00000000-0000-0000-0000-0000000000a1\''
\set vic '\'00000000-0000-0000-0000-0000000000a2\''
select pg_temp.act_as(:una); select complete_signup('una', 'Una', (current_date - interval '30 years')::date);
select pg_temp.act_as(:vic); select complete_signup('vic', 'Vic', (current_date - interval '30 years')::date);
select pg_temp.act_as(null);
insert into photos (id, owner_id, storage_path, width, height, bytes, sha256) values
  ('40000000-0000-0000-0000-000000000001', :una, :una || '/a.webp', 800, 600, 90000, repeat('d', 64)),
  ('40000000-0000-0000-0000-000000000002', :una, :una || '/b.webp', 800, 600, 90000, repeat('e', 64)),
  ('40000000-0000-0000-0000-000000000003', :vic, :vic || '/c.webp', 800, 600, 90000, repeat('f', 64));

-- save_room: the expected revision must match; a stale device writes nothing.
select pg_temp.act_as(:una);
select pg_temp.ok(save_room('woodland', '{"lampOn": true}', '{"notes": ["secret"]}', 0) = 1, 'first save moves the room to revision 1');
select pg_temp.ok(save_room('beachfront', '{"lampOn": false}', '{}', 0) is null, 'a stale revision is refused');
select pg_temp.ok((select settings->>'lampOn' from rooms where owner_id = auth.uid()) = 'true', 'refused save changed nothing');
select pg_temp.ok(save_room('beachfront', '{"lampOn": false}', '{"notes": ["kept"]}', 1) = 2, 'save from the current revision works');
select pg_temp.act_as(:vic);
select pg_temp.ok(save_room('woodland', '{"x": 1}', '{}', 2) is null, 'nobody can save into someone else''s room');
select pg_temp.act_as(null);
select pg_temp.ok((select theme from rooms where owner_id = :una) = 'beachfront', 'una''s room kept her save');
select pg_temp.expect_error($$select save_room('woodland', '{}', '{}', 0)$$, 'sign in');
select pg_temp.ok((select data->'notes'->>0 from room_private where owner_id = :una) = 'kept', 'private part saved with the room');

-- The private part is the owner's alone, even for a friend who may visit the room.
select pg_temp.act_as(:una); update rooms set visibility = 'open' where owner_id = auth.uid();
select pg_temp.act_as(:vic);
select pg_temp.ok((select count(*) from rooms where owner_id = :una) = 1, 'vic may visit una''s open room');
select pg_temp.ok((select count(*) from room_private) = 0, 'but cannot read its private part');
select pg_temp.expect_error($$insert into room_private (owner_id, data) values ('00000000-0000-0000-0000-0000000000a1', '{}')$$, 'row-level security');
update room_private set data = '{}';
select pg_temp.act_as(null);
select pg_temp.ok((select data->'notes'->>0 from room_private where owner_id = :una) = 'kept', 'vic could not change it');

-- save_book: create, then save again with reordered pages; old pages are replaced, never duplicated.
select pg_temp.act_as(:una);
select save_book('50000000-0000-0000-0000-000000000001', 'Summer', '', 'private', '{}',
  '[{"elements": []}, {"id": "60000000-0000-0000-0000-000000000001", "elements": [{"type": "caption", "text": "hi"}],
    "photos": [{"photo_id": "40000000-0000-0000-0000-000000000001", "slot": 0, "layout": {"x": 50}}]},
    {"id": "60000000-0000-0000-0000-000000000002", "photos": [{"photo_id": "40000000-0000-0000-0000-000000000002", "slot": 0}]}]');
select pg_temp.ok((select count(*) from pages where book_id = '50000000-0000-0000-0000-000000000001') = 3, 'title page and two pages saved');
select save_book('50000000-0000-0000-0000-000000000001', 'Summer 2026', 'by the lake', 'friends', '{"style": "forest"}',
  '[{"elements": []}, {"id": "60000000-0000-0000-0000-000000000002", "photos": [{"photo_id": "40000000-0000-0000-0000-000000000002", "slot": 0}]},
    {"id": "60000000-0000-0000-0000-000000000001", "photos": [{"photo_id": "40000000-0000-0000-0000-000000000001", "slot": 0}]}]');
select pg_temp.ok((select position from pages where id = '60000000-0000-0000-0000-000000000002') = 1, 'pages reordered');
select pg_temp.ok((select count(*) from pages where book_id = '50000000-0000-0000-0000-000000000001') = 3, 'no duplicate pages');
select pg_temp.ok((select count(*) from page_photos) = 2, 'page photos replaced, not duplicated');
select pg_temp.ok((select title from books where id = '50000000-0000-0000-0000-000000000001') = 'Summer 2026', 'book fields updated');

-- Saving an existing book never trips the 12-book cap.
select pg_temp.act_as(null);
insert into books (owner_id, title) select :una, 'Filler ' || g from generate_series(1, 11) g;
select pg_temp.act_as(:una);
select save_book('50000000-0000-0000-0000-000000000001', 'Summer 2026', '', 'private', '{}', '[{"elements": []}]');
select pg_temp.expect_error($$select save_book(gen_random_uuid(), 'Thirteenth', '', 'private', '{}', '[]')$$, 'book limit');

-- Too many pages, someone else's photo, someone else's book: all refused, and nothing half-written.
select pg_temp.expect_error($$select save_book('50000000-0000-0000-0000-000000000001', 'x', '', 'private', '{}',
  (select jsonb_agg('{}'::jsonb) from generate_series(1, 12)))$$, 'at most 10 pages');
select pg_temp.expect_error($$select save_book('50000000-0000-0000-0000-000000000001', 'x', '', 'private', '{}',
  '[{"photos": [{"photo_id": "40000000-0000-0000-0000-000000000003", "slot": 0}]}]')$$, 'own photos');
select pg_temp.ok((select title from books where id = '50000000-0000-0000-0000-000000000001') = 'Summer 2026', 'failed save rolled back');
select pg_temp.act_as(:vic);
select pg_temp.expect_error($$select save_book('50000000-0000-0000-0000-000000000001', 'Mine now', '', 'private', '{}', '[]')$$, 'duplicate key');
select pg_temp.act_as(null);
select pg_temp.ok((select owner_id from books where id = '50000000-0000-0000-0000-000000000001') = :una, 'book still una''s');

-- The own-photo rule also holds when a page photo is changed after it was added.
select pg_temp.act_as(:una);
select save_book('50000000-0000-0000-0000-000000000001', 'Summer 2026', '', 'private', '{}',
  '[{"photos": [{"photo_id": "40000000-0000-0000-0000-000000000001", "slot": 0}]}]');
select pg_temp.expect_error($$update page_photos set photo_id = '40000000-0000-0000-0000-000000000003'$$, 'own photos');
select pg_temp.act_as(null);
\echo sync tests passed
