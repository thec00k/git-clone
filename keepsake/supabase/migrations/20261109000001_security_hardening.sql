-- Follow-up hardening from the November 6, 2026 security audit (see the audit-fixes migration of Nov 8).

-- 1. Size caps on the last two user-written JSON columns, in line with the others (elements 128 KiB, cover
--    16 KiB). Not validated against existing rows, so nothing already saved can block this migration.
alter table public.pages add constraint pages_paper_size check (octet_length(paper::text) <= 32768) not valid;
alter table public.page_photos add constraint page_photos_layout_size check (octet_length(layout::text) <= 8192) not valid;

-- 2. Reports: people choose what they report, never its dates or state, so the moderators' queue (ordered by
--    created_at) cannot be reordered by backdating.
revoke insert on public.reports from authenticated;
grant insert (reporter, target_type, target_id, reason, details) on public.reports to authenticated;

-- 3. Limits and caps hold under simultaneous requests: checks for one person (or one book) run one at a time.
create or replace function public.rate_limit(action text, max_count int, per interval) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if; -- service role and migrations are not limited
  perform pg_advisory_xact_lock(hashtext('rate:' || auth.uid()::text || ':' || action));
  if (select count(*) from rate_events where user_id = auth.uid() and rate_events.action = rate_limit.action and at > now() - per) >= max_count then
    raise exception 'rate limit: % (try again later)', action using errcode = 'P0001';
  end if;
  insert into rate_events (user_id, action) values (auth.uid(), rate_limit.action);
end $$;

create or replace function public.rate_limit_for(uid uuid, action text, max_count int, per interval) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('rate:' || uid::text || ':' || action));
  if (select count(*) from rate_events where user_id = uid and rate_events.action = rate_limit_for.action and at > now() - per) >= max_count then
    raise exception 'rate limit: % (try again later)', action using errcode = 'P0001';
  end if;
  insert into rate_events (user_id, action) values (uid, rate_limit_for.action);
end $$;

create or replace function public.enforce_caps() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; book uuid;
begin
  if tg_table_name in ('photos', 'books', 'pins') then
    perform pg_advisory_xact_lock(hashtext('caps:' || tg_table_name || ':' || new.owner_id::text));
  end if;
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
    select book_id into book from pages where id = new.page_id;
    perform pg_advisory_xact_lock(hashtext('caps:book:' || coalesce(book::text, '')));
    select count(*) into n from page_photos pp join pages p on p.id = pp.page_id where p.book_id = book;
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

create or replace function public.check_trash() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.deleted_at is not null then
    new.deleted_at := case when old.deleted_at is null then now() else old.deleted_at end;
  elsif old.deleted_at is not null then
    perform pg_advisory_xact_lock(hashtext('caps:' || tg_table_name || ':' || new.owner_id::text));
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

-- 4. Raw uploads: at most 50 waiting per person at once. They are normally processed and deleted within
--    seconds, and the app uploads one at a time, so this only stops someone filling the bucket.
--    The count runs in a function: a policy on storage.objects cannot query storage.objects itself.
create function public.my_pending_uploads() returns int language sql stable security definer set search_path = public, storage as $$
  select count(*)::int from storage.objects where bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text
$$;
revoke all on function public.my_pending_uploads() from public, anon;
grant execute on function public.my_pending_uploads() to authenticated;
drop policy uploads_own_insert on storage.objects;
create policy uploads_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text and public.my_pending_uploads() < 50);

-- 5. Files of purged photos, and raw uploads that were never processed, are removed from Storage by the
--    purge-trash edge function (Storage files can only be deleted through the Storage API). These list them.
create function public.purgeable_photo_files() returns setof text language sql stable security definer set search_path = public as $$
  select storage_path from photos where deleted_at < now() - interval '30 days'
$$;
create function public.stale_uploads() returns setof text language sql stable security definer set search_path = public, storage as $$
  select name from storage.objects where bucket_id = 'uploads' and created_at < now() - interval '1 day'
$$;
revoke all on function public.purgeable_photo_files(), public.stale_uploads() from public, anon, authenticated;
grant execute on function public.purgeable_photo_files(), public.stale_uploads(), public.purge_trash() to service_role;
