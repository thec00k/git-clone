-- Policy and rule tests. Each block acts as a specific person (role authenticated + JWT subject), as Supabase does.
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

-- People: ada (adult), ben (adult), tia (teen, 15), sam (stranger adult)
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-00000000000e');
\set ada '\'00000000-0000-0000-0000-00000000000a\''
\set ben '\'00000000-0000-0000-0000-00000000000b\''
\set tia '\'00000000-0000-0000-0000-00000000000c\''
\set sam '\'00000000-0000-0000-0000-00000000000d\''
\set kid '\'00000000-0000-0000-0000-00000000000e\''

select pg_temp.act_as(:ada); select complete_signup('ada', 'Ada', (current_date - interval '30 years')::date);
select pg_temp.act_as(:ben); select complete_signup('ben', 'Ben', (current_date - interval '25 years')::date);
select pg_temp.act_as(:tia); select complete_signup('tia', 'Tia', (current_date - interval '15 years')::date);
select pg_temp.act_as(:sam); select complete_signup('sam', 'Sam', (current_date - interval '40 years')::date);

-- 13+ only, and the refused birth date is not stored.
select pg_temp.act_as(:kid);
select pg_temp.expect_error($$select complete_signup('kid', 'Kid', (current_date - interval '12 years')::date)$$, 'aged 13');
select pg_temp.act_as(null);
select pg_temp.ok(not exists (select 1 from profile_private where id = '00000000-0000-0000-0000-00000000000e'), 'under-13 birth date not stored');

-- New rooms default to invite-only; teens can never open theirs.
select pg_temp.ok((select visibility from rooms where owner_id = :tia) = 'invite', 'teen room starts invite-only');
select pg_temp.act_as(:tia);
select pg_temp.expect_error($$update rooms set visibility = 'open' where owner_id = auth.uid()$$, 'under 18');
select pg_temp.act_as(:ada); update rooms set visibility = 'open' where owner_id = auth.uid();
select pg_temp.act_as(null); select pg_temp.ok((select visibility from rooms where owner_id = :ada) = 'open', 'adult may open their room');

-- Birth dates are private.
select pg_temp.act_as(:ben);
select pg_temp.ok((select count(*) from profile_private) = 1, 'only your own private profile is visible');

-- Exact-username lookup only; strangers are not listed in profiles.
select pg_temp.ok((select count(*) from find_profile('tia')) = 1, 'exact username finds');
select pg_temp.ok((select count(*) from find_profile('ti')) = 0, 'partial username finds nothing');
select pg_temp.ok(not exists (select 1 from profiles where username = 'sam'), 'strangers are not listed');

-- Friend request: only the other person can accept.
insert into friendships (user_low, user_high, requested_by) values (least(:ben::uuid, :tia::uuid), greatest(:ben::uuid, :tia::uuid), :ben);
select pg_temp.expect_error($$update friendships set state = 'accepted'$$, 'other person');
select pg_temp.act_as(:tia); update friendships set state = 'accepted';
select pg_temp.act_as(null); select pg_temp.ok(are_friends(:ben, :tia), 'friendship accepted');

-- Nobody can probe other people's friendships.
select pg_temp.act_as(:sam); select pg_temp.ok(not are_friends(:ben, :tia), 'third parties get no answer');

-- Invite-only room: a friend cannot visit until invited; strangers never.
select pg_temp.act_as(:ben); select pg_temp.ok(not can_view_room(:tia), 'friend not yet invited');
select pg_temp.act_as(:tia); insert into room_invites (owner_id, guest_id) values (auth.uid(), :ben);
select pg_temp.expect_error($$insert into room_invites (owner_id, guest_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000d')$$, 'row-level security');
select pg_temp.act_as(:ben); select pg_temp.ok(can_view_room(:tia), 'invited friend may visit');
select pg_temp.act_as(:sam); select pg_temp.ok(not can_view_room(:tia), 'stranger may not visit');
select pg_temp.ok(can_view_room(:ada), 'open adult room is visitable');

-- Photos: owner sees their own pending photo; friends only after moderation approves, and only through a shared book.
select pg_temp.act_as(null);
insert into photos (id, owner_id, storage_path, width, height, bytes, sha256) values
  ('10000000-0000-0000-0000-000000000001', :tia, :tia || '/p1.webp', 2048, 1536, 400000, repeat('a', 64));
select pg_temp.expect_error($$insert into photos (owner_id, storage_path, width, height, bytes, sha256) values ('00000000-0000-0000-0000-00000000000c', 'x', 4000, 10, 10, repeat('b', 64))$$, 'check constraint');
select pg_temp.act_as(:tia);
insert into books (id, owner_id, title, visibility) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'Summer', 'friends');
insert into pages (id, book_id, position) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 0);
insert into page_photos (page_id, photo_id, slot) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 0);
select pg_temp.ok((select count(*) from photos) = 1, 'owner sees own pending photo');
select pg_temp.expect_error($$update photos set moderation = 'approved'$$, 'permission denied');
select pg_temp.act_as(:ben);
select pg_temp.ok((select count(*) from books) = 1, 'invited friend sees friends-only book');
select pg_temp.ok((select count(*) from photos) = 0, 'pending photo hidden from friends');
select pg_temp.act_as(null); update photos set moderation = 'approved';
select pg_temp.act_as(:ben); select pg_temp.ok((select count(*) from photos) = 1, 'approved photo visible to friend');
select pg_temp.act_as(:sam); select pg_temp.ok((select count(*) from photos) = 0 and (select count(*) from books) = 0, 'stranger sees no books or photos');

-- Someone else's photo cannot be put in your book.
select pg_temp.act_as(:ben);
insert into books (id, owner_id, title) values ('20000000-0000-0000-0000-000000000002', auth.uid(), 'Mine');
insert into pages (id, book_id, position) values ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 0);
select pg_temp.expect_error($$insert into page_photos (page_id, photo_id, slot) values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 0)$$, 'own photos');

-- Pages: 10 per book, 4 photo slots per page.
select pg_temp.expect_error($$insert into pages (book_id, position) values ('20000000-0000-0000-0000-000000000002', 10)$$, 'check constraint');
select pg_temp.act_as(null);
insert into photos (id, owner_id, storage_path, width, height, bytes, sha256) values
  ('10000000-0000-0000-0000-000000000002', :ben, :ben || '/p2.webp', 800, 600, 90000, repeat('c', 64));
select pg_temp.act_as(:ben);
select pg_temp.expect_error($$insert into page_photos (page_id, photo_id, slot) values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 4)$$, 'check constraint');

-- Guestbook: notes start pending; visitors see only what the owner shows.
select pg_temp.act_as(:ben); insert into guestbook_notes (room_owner, author, body) values (:tia, auth.uid(), 'Lovely room!');
select pg_temp.act_as(:sam);
select pg_temp.expect_error($$insert into guestbook_notes (room_owner, author, body) values ('00000000-0000-0000-0000-00000000000c', auth.uid(), 'hi')$$, 'cannot leave a note');
select pg_temp.act_as(:tia); select pg_temp.ok((select state from guestbook_notes) = 'pending', 'note waits for the owner');
update guestbook_notes set state = 'shown';

-- Tags need consent; only the tagged person answers.
insert into photo_tags (photo_id, tagged_user, tagged_by) values ('10000000-0000-0000-0000-000000000001', :ben, auth.uid());
update photo_tags set state = 'accepted'; -- matches no rows for the tagger
select pg_temp.ok((select state from photo_tags) = 'pending', 'only the tagged person can accept');
select pg_temp.act_as(:ben); update photo_tags set state = 'accepted';
select pg_temp.expect_error($$insert into photo_tags (photo_id, tagged_user, tagged_by) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', auth.uid())$$, 'only tag friends');

-- Silent block: ends the friendship, invite and tags; the blocked person cannot see the block or the room.
select pg_temp.act_as(:tia); insert into blocks (blocker, blocked) values (auth.uid(), :ben);
select pg_temp.act_as(:ben);
select pg_temp.ok(not can_view_room(:tia), 'blocked person cannot visit');
select pg_temp.ok((select count(*) from blocks) = 0, 'blocked person cannot see the block');
select pg_temp.ok((select count(*) from friendships) = 0 and (select count(*) from photo_tags) = 0, 'block removes friendship and tags');
select pg_temp.ok((select count(*) from find_profile('tia')) = 0, 'blocked person cannot look the blocker up');
select pg_temp.ok(not exists (select 1 from photos where owner_id = :tia), 'blocked person loses photo access');

-- Reports: anyone can file; only the reporter sees theirs; nobody can resolve their own.
select pg_temp.act_as(:sam);
insert into reports (reporter, target_type, target_id, reason) values (auth.uid(), 'room', :ada, 'spam');
select pg_temp.expect_error($$update reports set state = 'dismissed'$$, 'permission denied');
select pg_temp.act_as(:ada); select pg_temp.ok((select count(*) from reports) = 0, 'reported person cannot see reports');

-- Rate limits: the 21st note in a day is refused.
select pg_temp.act_as(:sam);
do $$ begin for i in 1..20 loop insert into guestbook_notes (room_owner, author, body) values ('00000000-0000-0000-0000-00000000000a', auth.uid(), 'note ' || i); end loop; end $$;
select pg_temp.expect_error($$insert into guestbook_notes (room_owner, author, body) values ('00000000-0000-0000-0000-00000000000a', auth.uid(), 'one more')$$, 'rate limit');

-- Stamps: 30 to start, one daily grant per day, cap at 100, prices from the server, no negative balance.
select pg_temp.act_as(null); insert into shop_items (id, price) values ('fern-stamp', 2), ('big-thing', 100);
select pg_temp.act_as(:ada);
select pg_temp.ok(claim_daily_stamps('Europe/London') = 33, 'start + daily');
select pg_temp.ok(claim_daily_stamps('Europe/London') = 33, 'daily only once');
select pg_temp.ok(buy_item('fern-stamp') = 31, 'buying spends the server price');
select pg_temp.ok(buy_item('fern-stamp') = 31, 'buying twice is free and harmless');
select pg_temp.expect_error($$select buy_item('big-thing')$$, 'not enough stamps');
select pg_temp.expect_error($$insert into stamp_events (user_id, kind, amount) values (auth.uid(), 'start', 1000)$$, 'permission denied');
select pg_temp.act_as(null); insert into stamp_events (user_id, kind, amount, day) values (:sam, 'daily', 68, current_date - 5);
select pg_temp.act_as(:sam); select pg_temp.ok(claim_daily_stamps('Not/AZone') = 100, 'balance is capped at 100; bad time zone falls back to UTC');

-- Storage: raw uploads only into your own folder; processed photos follow the photo's visibility.
select pg_temp.act_as(:tia);
insert into storage.objects (bucket_id, name) values ('uploads', :tia || '/raw-1.jpg');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('uploads', '00000000-0000-0000-0000-00000000000a/x.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('photos', '00000000-0000-0000-0000-00000000000c/forged.webp')$$, 'row-level security');
select pg_temp.act_as(null); insert into storage.objects (bucket_id, name) values ('photos', :tia || '/p1.webp');
select pg_temp.act_as(:tia); select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'photos') = 1, 'owner reads own photo file');
select pg_temp.act_as(:sam); select pg_temp.ok((select count(*) from storage.objects) = 0, 'stranger reads no files');

-- Signed-out visitors get nothing.
select pg_temp.act_as(null); set role anon;
select pg_temp.expect_error($$select * from profiles$$, 'permission denied');
reset role;
\echo policy tests passed
