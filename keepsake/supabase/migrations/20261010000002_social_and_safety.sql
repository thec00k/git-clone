-- Friends, blocks, guestbook notes, photo tags, reports, rate limits, account caps.
-- Rules (owner decisions, October 2026): 13+ only; teens get invite-only rooms by default and can never
-- open their room to everyone; friends are found by exact username only; blocks are silent; tags need
-- consent; the room owner decides which notes stay; uploads are moderated before anyone else sees them.

-- ---------------------------------------------------------------- tables
create type public.friend_state as enum ('pending', 'accepted');
create table public.friendships (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  state public.friend_state not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high))
);

-- Silent: the blocked person is never told, and simply stops seeing the blocker and their room.
create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create type public.note_state as enum ('pending', 'shown', 'hidden');
create table public.guestbook_notes (
  id uuid primary key default gen_random_uuid(),
  room_owner uuid not null references public.profiles (id) on delete cascade,
  author uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 160),
  state public.note_state not null default 'pending', -- the owner decides what stays
  created_at timestamptz not null default now(),
  check (room_owner <> author)
);
create index guestbook_room on public.guestbook_notes (room_owner);

create type public.tag_state as enum ('pending', 'accepted', 'declined');
create table public.photo_tags (
  photo_id uuid not null references public.photos (id) on delete cascade,
  tagged_user uuid not null references public.profiles (id) on delete cascade,
  tagged_by uuid not null references public.profiles (id) on delete cascade,
  state public.tag_state not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (photo_id, tagged_user)
);

create type public.report_reason as enum ('bullying', 'sexual_content', 'child_safety', 'self_harm', 'violence', 'spam', 'impersonation', 'other');
create type public.report_state as enum ('open', 'actioned', 'dismissed');
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('photo', 'book', 'note', 'profile', 'room')),
  target_id uuid not null,
  reason public.report_reason not null,
  details text not null default '' check (char_length(details) <= 1000),
  state public.report_state not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_open on public.reports (created_at) where state = 'open';

-- Moderator actions, kept for accountability. Written only by the service role.
create table public.moderation_log (
  id bigint generated always as identity primary key,
  actor text not null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.rate_events (
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  at timestamptz not null default now()
);
create index rate_events_lookup on public.rate_events (user_id, action, at);

alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.guestbook_notes enable row level security;
alter table public.photo_tags enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_log enable row level security;
alter table public.rate_events enable row level security;

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so policies can ask these questions without exposing the underlying tables.
create function public.is_teen(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select born_on > (current_date - interval '18 years')::date from profile_private where id = uid), true)
$$;

-- is_blocked and are_friends only answer about pairs that include the caller, so nobody can probe other people's
-- relationships. (auth.uid() is null for the service role and inside migrations.)
create function public.is_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select (auth.uid() is null or auth.uid() in (a, b))
    and exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;

create function public.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select (auth.uid() is null or auth.uid() in (a, b)) and exists (select 1 from friendships where user_low = least(a, b) and user_high = greatest(a, b) and state = 'accepted')
$$;

create function public.can_view_room(owner uuid) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when auth.uid() = owner then true
    when is_blocked(auth.uid(), owner) then false
    else coalesce((select case r.visibility
        when 'private' then false
        when 'invite' then exists (select 1 from room_invites i where i.owner_id = owner and i.guest_id = auth.uid())
        when 'friends' then are_friends(auth.uid(), owner)
        when 'open' then true end
      from rooms r where r.owner_id = owner), false)
  end
$$;

create function public.can_view_book(book_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from books b where b.id = book_id and b.deleted_at is null and (
    b.owner_id = auth.uid() or (b.visibility = 'friends' and can_view_room(b.owner_id) and are_friends(auth.uid(), b.owner_id))))
$$;

-- Someone else's photo is visible only once approved by moderation, and only through a book they may see.
create function public.can_view_photo(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from photos p where p.id = pid and (
    p.owner_id = auth.uid() or (p.deleted_at is null and p.moderation = 'approved' and exists (
      select 1 from page_photos pp join pages pg on pg.id = pp.page_id where pp.photo_id = pid and can_view_book(pg.book_id)))))
$$;

create function public.rate_limit(action text, max_count int, per interval) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if; -- service role and migrations are not limited
  if (select count(*) from rate_events where user_id = auth.uid() and rate_events.action = rate_limit.action and at > now() - per) >= max_count then
    raise exception 'rate limit: % (try again later)', action using errcode = 'P0001';
  end if;
  insert into rate_events (user_id, action) values (auth.uid(), rate_limit.action);
end $$;

-- ---------------------------------------------------------------- caps and rules (triggers)
create function public.enforce_caps() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if tg_table_name = 'photos' then
    perform rate_limit('upload', 200, interval '1 day');
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
create trigger photos_caps before insert on public.photos for each row execute function public.enforce_caps();
create trigger books_caps before insert on public.books for each row execute function public.enforce_caps();
create trigger pins_caps before insert on public.pins for each row execute function public.enforce_caps();
create trigger page_photos_caps before insert on public.page_photos for each row execute function public.enforce_caps();
create trigger notes_caps before insert on public.guestbook_notes for each row execute function public.enforce_caps();
create trigger reports_caps before insert on public.reports for each row execute function public.enforce_caps();
create trigger friendships_caps before insert on public.friendships for each row execute function public.enforce_caps();
create trigger tags_caps before insert on public.photo_tags for each row execute function public.enforce_caps();

-- Teens can never open their room to everyone.
create function public.enforce_room_rules() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility = 'open' and is_teen(new.owner_id) then
    raise exception 'rooms of people under 18 cannot be open to everyone';
  end if;
  return new;
end $$;
create trigger rooms_rules before insert or update on public.rooms for each row execute function public.enforce_room_rules();

-- Blocking ends any friendship, invites and pending tags between the two people.
create function public.after_block() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from friendships where user_low = least(new.blocker, new.blocked) and user_high = greatest(new.blocker, new.blocked);
  delete from room_invites where (owner_id = new.blocker and guest_id = new.blocked) or (owner_id = new.blocked and guest_id = new.blocker);
  delete from photo_tags t using photos p where t.photo_id = p.id and
    ((p.owner_id = new.blocker and t.tagged_user = new.blocked) or (p.owner_id = new.blocked and t.tagged_user = new.blocker));
  return new;
end $$;
create trigger blocks_after after insert on public.blocks for each row execute function public.after_block();

-- A visitor's note can be written only into a room they may visit, and never across a block.
create function public.check_note() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author <> auth.uid() or not can_view_room(new.room_owner) then raise exception 'cannot leave a note here'; end if;
  new.state := 'pending';
  return new;
end $$;
create trigger notes_check before insert on public.guestbook_notes for each row execute function public.check_note();

-- Tags: only the photo's owner tags, only friends can be tagged, and they start pending.
create function public.check_tag() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.tagged_by <> auth.uid() or not exists (select 1 from photos where id = new.photo_id and owner_id = auth.uid())
       or not are_friends(auth.uid(), new.tagged_user) then raise exception 'you can only tag friends in your own photos'; end if;
    new.state := 'pending';
  elsif new.state <> old.state and auth.uid() <> old.tagged_user then
    raise exception 'only the tagged person can accept or decline a tag';
  end if;
  return new;
end $$;
create trigger tags_check before insert or update on public.photo_tags for each row execute function public.check_tag();

-- Friend requests: the requester is the caller, and accepting is done only by the other person.
create function public.check_friendship() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.requested_by <> auth.uid() or is_blocked(new.user_low, new.user_high) then raise exception 'cannot send this request'; end if;
    new.state := 'pending';
  elsif new.state = 'accepted' and old.state = 'pending' and auth.uid() = old.requested_by then
    raise exception 'the other person must accept';
  end if;
  return new;
end $$;
create trigger friendships_check before insert or update on public.friendships for each row execute function public.check_friendship();

-- ---------------------------------------------------------------- functions people call
-- Sign-up finishes here: 13+ only (an under-13 birth date is refused and not stored), teen defaults applied.
create function public.complete_signup(p_username text, p_display_name text, p_born_on date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_born_on > (current_date - interval '13 years')::date then raise exception 'Keepsake is for people aged 13 and over'; end if;
  if p_born_on < date '1900-01-01' then raise exception 'check the birth date'; end if;
  insert into profiles (id, username, display_name) values (auth.uid(), p_username, p_display_name);
  insert into profile_private (id, born_on) values (auth.uid(), p_born_on);
  insert into rooms (owner_id, visibility) values (auth.uid(), 'invite');
end $$;

-- Exact-username lookup only: no search, no suggestions, nothing returned across a block.
create function public.find_profile(p_username text) returns table (id uuid, username citext, display_name text)
language plpgsql security definer set search_path = public as $$
begin
  perform rate_limit('lookup', 60, interval '1 hour');
  return query select p.id, p.username, p.display_name from profiles p
    where p.username = p_username::citext and p.id <> auth.uid() and not is_blocked(auth.uid(), p.id);
end $$;

revoke all on function public.complete_signup(text, text, date) from public, anon;
revoke all on function public.find_profile(text) from public, anon;
grant execute on function public.complete_signup(text, text, date), public.find_profile(text) to authenticated;
