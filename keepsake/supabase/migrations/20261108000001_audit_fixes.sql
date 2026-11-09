-- Fixes from the November 6, 2026 security audit (keepsake/security-audit-2026-11-06 in the shared folder).

-- 1. Ending a friendship also ends room invites between the two people, as blocking already does.
--    Before this, an unfriended person kept seeing an invite-only room (the default for teens).
create function public.after_unfriend() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (old.state <> 'accepted' or new.state = 'accepted') then return new; end if;
  delete from room_invites where (owner_id = old.user_low and guest_id = old.user_high)
                              or (owner_id = old.user_high and guest_id = old.user_low);
  return coalesce(new, old);
end $$;
create trigger friendships_after_unfriend after delete or update of state on public.friendships
  for each row execute function public.after_unfriend();
-- Invites left behind by friendships that already ended.
delete from public.room_invites i where not exists (select 1 from public.friendships f
  where f.user_low = least(i.owner_id, i.guest_id) and f.user_high = greatest(i.owner_id, i.guest_id) and f.state = 'accepted');

-- And an invite counts only while the two are still friends.
create or replace function public.can_view_room(owner uuid) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when auth.uid() = owner then true
    when is_blocked(auth.uid(), owner) then false
    else coalesce((select case r.visibility
        when 'private' then false
        when 'invite' then exists (select 1 from room_invites i where i.owner_id = owner and i.guest_id = auth.uid())
                           and are_friends(auth.uid(), owner)
        when 'friends' then are_friends(auth.uid(), owner)
        when 'open' then true end
      from rooms r where r.owner_id = owner), false)
  end
$$;

-- 2. The 200 uploads a day limit is charged to the photo's owner. Photos are inserted by the upload pipeline
--    (service role, no signed-in caller), which rate_limit skips, so the limit never applied.
create function public.rate_limit_for(uid uuid, action text, max_count int, per interval) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from rate_events where user_id = uid and rate_events.action = rate_limit_for.action and at > now() - per) >= max_count then
    raise exception 'rate limit: % (try again later)', action using errcode = 'P0001';
  end if;
  insert into rate_events (user_id, action) values (uid, rate_limit_for.action);
end $$;
revoke all on function public.rate_limit_for(uuid, text, int, interval) from public, anon, authenticated;

create or replace function public.enforce_caps() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if tg_table_name = 'photos' then
    perform rate_limit_for(new.owner_id, 'upload', 200, interval '1 day');
    select count(*) into n from photos where owner_id = new.owner_id and deleted_at is null;
    if n >= 500 then raise exception 'photo limit reached (500)'; end if;
  elsif tg_table_name = 'books' then
    select count(*) into n from books where owner_id = new.owner_id and deleted_at is null;
    if n >= 12 then raise exception 'book limit reached (12)'; end if;
  elsif tg_table_name = 'pins' then
    select count(*) into n from pins where owner_id = new.owner_id;
    if n >= 100 then raise exception 'pin limit reached (100)'; end if;
  elsif tg_table_name = 'page_photos' then
    select count(*) into n from page_photos pp join pages p on p.id = pp.page_id
      where p.book_id = (select book_id from pages where id = new.page_id);
    if n >= 40 then raise exception 'a book holds at most 40 photos'; end if;
    if not exists (select 1 from photos ph join pages p on p.id = new.page_id join books b on b.id = p.book_id
                   where ph.id = new.photo_id and ph.owner_id = b.owner_id) then
      raise exception 'only your own photos can go in your books';
    end if;
  elsif tg_table_name = 'guestbook_notes' then
    perform rate_limit('note', 20, interval '1 day');
  elsif tg_table_name = 'reports' then
    perform rate_limit('report', 30, interval '1 day');
  elsif tg_table_name = 'friendships' then
    perform rate_limit('friend_request', 30, interval '1 day');
  elsif tg_table_name = 'photo_tags' then
    perform rate_limit('tag', 60, interval '1 day');
  end if;
  return new;
end $$;

-- 3. Taking a book or photo out of the trash counts against the same caps as adding one, and the server sets
--    the trash time (so a trashed row cannot be dated into the future to dodge the 30-day purge).
create function public.check_trash() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.deleted_at is not null then
    new.deleted_at := case when old.deleted_at is null then now() else old.deleted_at end;
  elsif old.deleted_at is not null then
    if tg_table_name = 'books' then
      select count(*) into n from books where owner_id = new.owner_id and deleted_at is null;
      if n >= 12 then raise exception 'book limit reached (12)'; end if;
    else
      select count(*) into n from photos where owner_id = new.owner_id and deleted_at is null;
      if n >= 500 then raise exception 'photo limit reached (500)'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger books_trash before update of deleted_at on public.books for each row execute function public.check_trash();
create trigger photos_trash before update of deleted_at on public.photos for each row execute function public.check_trash();
-- Rows already dated into the future go back to now.
update public.books set deleted_at = now() where deleted_at > now();
update public.photos set deleted_at = now() where deleted_at > now();

-- 4. Daily stamps: the time zone only picks the local date. A new grant also needs the last one to be at least
--    20 hours old, so switching time zones cannot claim two dates at once. The lock stops two calls racing.
create or replace function public.claim_daily_stamps(p_time_zone text default 'UTC') returns int
language plpgsql security definer set search_path = public as $$
declare tz text := coalesce((select name from pg_timezone_names where name = p_time_zone), 'UTC');
        today date := (now() at time zone tz)::date;
        bal int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if exists (select 1 from stamp_events where user_id = auth.uid() and kind = 'daily' and created_at > now() - interval '20 hours') then
    return stamp_balance(auth.uid());
  end if;
  bal := stamp_balance(auth.uid());
  insert into stamp_events (user_id, kind, amount, day) values (auth.uid(), 'daily', least(3, greatest(0, 100 - bal)), today)
    on conflict (user_id, day) where kind = 'daily' do nothing;
  return stamp_balance(auth.uid());
end $$;

revoke all on function public.after_unfriend(), public.check_trash() from public, anon, authenticated;
