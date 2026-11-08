-- Regression tests for the November 6, 2026 security audit fixes (migration 20261108000001_audit_fixes.sql).
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

-- People: owl (adult), pip (teen, 15).
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1'), ('00000000-0000-0000-0000-0000000000b2');
\set owl '\'00000000-0000-0000-0000-0000000000b1\''
\set pip '\'00000000-0000-0000-0000-0000000000b2\''
select pg_temp.act_as(:owl); select complete_signup('owl', 'Owl', (current_date - interval '30 years')::date);
select pg_temp.act_as(:pip); select complete_signup('pip', 'Pip', (current_date - interval '15 years')::date);

-- Unfriending ends the invite: the ex-friend can no longer see the invite-only room.
select pg_temp.act_as(:owl);
insert into friendships (user_low, user_high, requested_by) values (least(:owl::uuid, :pip::uuid), greatest(:owl::uuid, :pip::uuid), :owl);
select pg_temp.act_as(:pip); update friendships set state = 'accepted';
insert into room_invites (owner_id, guest_id) values (auth.uid(), :owl);
select pg_temp.act_as(:owl); select pg_temp.ok(can_view_room(:pip), 'invited friend may visit');
select pg_temp.act_as(:pip); delete from friendships;
select pg_temp.act_as(null); select pg_temp.ok(not exists (select 1 from room_invites where owner_id = :pip), 'unfriending removes the invite');
select pg_temp.act_as(:owl); select pg_temp.ok(not can_view_room(:pip), 'ex-friend cannot visit');
select pg_temp.expect_error($$insert into guestbook_notes (room_owner, author, body) values ('00000000-0000-0000-0000-0000000000b2', auth.uid(), 'hi')$$, 'cannot leave a note');
-- Moving an accepted friendship back to pending ends it too.
insert into friendships (user_low, user_high, requested_by) values (least(:owl::uuid, :pip::uuid), greatest(:owl::uuid, :pip::uuid), :owl);
select pg_temp.act_as(:pip); update friendships set state = 'accepted';
insert into room_invites (owner_id, guest_id) values (auth.uid(), :owl);
update friendships set state = 'pending';
select pg_temp.act_as(:owl); select pg_temp.ok(not can_view_room(:pip), 'friendship back to pending ends the invite');
-- Defense in depth: an invite row alone, without a friendship, opens nothing.
select pg_temp.act_as(null); delete from friendships; insert into room_invites (owner_id, guest_id) values (:pip, :owl);
select pg_temp.act_as(:owl); select pg_temp.ok(not can_view_room(:pip), 'an invite without a friendship opens nothing');

-- The 200 uploads a day limit applies to photos added by the upload pipeline (no signed-in caller).
select pg_temp.act_as(null);
insert into photos (owner_id, storage_path, width, height, bytes, sha256)
  select :owl, 'p' || g, 10, 10, 10, md5(g::text) || md5(g::text) from generate_series(1, 200) g;
select pg_temp.expect_error($$insert into photos (owner_id, storage_path, width, height, bytes, sha256) values ('00000000-0000-0000-0000-0000000000b1', 'p201', 10, 10, 10, repeat('f', 64))$$, 'rate limit');
select pg_temp.act_as(:owl); select pg_temp.expect_error($$select rate_limit_for(auth.uid(), 'upload', 1, interval '1 day')$$, 'permission denied');

-- Trash: the server sets the trash time, and restoring counts against the cap.
select pg_temp.act_as(:owl);
insert into books (owner_id, title) select :owl, 'Book ' || g from generate_series(1, 12) g;
update books set deleted_at = now() + interval '10 years' where title = 'Book 1';
select pg_temp.ok((select deleted_at <= now() from books where title = 'Book 1'), 'trash time cannot be dated into the future');
insert into books (owner_id, title) values (:owl, 'Book 13');
select pg_temp.expect_error($$update books set deleted_at = null where title = 'Book 1'$$, 'book limit');
select pg_temp.expect_error($$select save_book((select id from books where title = 'Book 1'), 'Book 1', null, 'private', '{}', '[]')$$, 'book limit');
update books set deleted_at = now() where title = 'Book 13';
update books set deleted_at = null where title = 'Book 1';
select pg_temp.ok((select count(*) from books where deleted_at is null) = 12, 'restore works under the cap');

-- Daily stamps: changing the time zone does not give a second grant.
select pg_temp.act_as(:owl);
select pg_temp.ok(claim_daily_stamps('Etc/GMT+12') = 33, 'first daily grant');
select pg_temp.ok(claim_daily_stamps('UTC') = 33, 'no second grant from UTC');
select pg_temp.ok(claim_daily_stamps('Pacific/Kiritimati') = 33, 'no second grant from UTC+14');
\echo audit fix tests passed
