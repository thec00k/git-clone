-- Stamps, owned by the server: 30 to start, 3 per calendar day the room is opened, balance capped at 100,
-- no streaks, nothing lost for missing days, never shown to anyone else. Prices come from the server's catalogue.

create type public.stamp_kind as enum ('start', 'daily', 'spend');
create table public.stamp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.stamp_kind not null,
  amount int not null,
  day date,               -- the user's local calendar day, for daily grants
  item_id text,           -- for spending
  created_at timestamptz not null default now(),
  check ((kind = 'spend') = (amount < 0)),
  check (kind <> 'daily' or day is not null)
);
create unique index stamp_daily_once on public.stamp_events (user_id, day) where kind = 'daily';
create unique index stamp_start_once on public.stamp_events (user_id) where kind = 'start';
create unique index stamp_item_once on public.stamp_events (user_id, item_id) where kind = 'spend';

create table public.shop_items (
  id text primary key,
  price int not null check (price between 0 and 100),
  active boolean not null default true
);

create table public.owned_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.shop_items (id),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.stamp_events enable row level security;
alter table public.shop_items enable row level security;
alter table public.owned_items enable row level security;

create function public.stamp_balance(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from stamp_events where user_id = uid
$$;

-- Starting stamps arrive with the profile.
create function public.grant_start_stamps() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into stamp_events (user_id, kind, amount) values (new.id, 'start', 30); return new; end $$;
create trigger profiles_start_stamps after insert on public.profiles for each row execute function public.grant_start_stamps();

-- The client says which time zone it is in; the server decides the date from its own clock, so changing the
-- device clock does nothing. Returns the new balance.
create function public.claim_daily_stamps(p_time_zone text default 'UTC') returns int
language plpgsql security definer set search_path = public as $$
declare tz text := coalesce((select name from pg_timezone_names where name = p_time_zone), 'UTC');
        today date := (now() at time zone tz)::date;
        bal int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  bal := stamp_balance(auth.uid());
  insert into stamp_events (user_id, kind, amount, day) values (auth.uid(), 'daily', least(3, greatest(0, 100 - bal)), today)
    on conflict (user_id, day) where kind = 'daily' do nothing;
  return stamp_balance(auth.uid());
end $$;

create function public.buy_item(p_item text) returns int language plpgsql security definer set search_path = public as $$
declare cost int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select price into cost from shop_items where id = p_item and active;
  if cost is null then raise exception 'no such item'; end if;
  if exists (select 1 from owned_items where user_id = auth.uid() and item_id = p_item) then return stamp_balance(auth.uid()); end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if stamp_balance(auth.uid()) < cost then raise exception 'not enough stamps'; end if;
  if cost > 0 then insert into stamp_events (user_id, kind, amount, item_id) values (auth.uid(), 'spend', -cost, p_item); end if;
  insert into owned_items (user_id, item_id) values (auth.uid(), p_item);
  return stamp_balance(auth.uid());
end $$;

revoke all on function public.claim_daily_stamps(text), public.buy_item(text), public.stamp_balance(uuid) from public, anon;
grant execute on function public.claim_daily_stamps(text), public.buy_item(text) to authenticated;
