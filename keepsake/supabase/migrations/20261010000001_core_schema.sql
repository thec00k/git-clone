-- Keepsake core schema: people, rooms, photos, books, pins.
-- Design notes: docs/backend-design.md. Safety rules: docs/safety-model.md.
-- Every table has row level security on; nothing is readable unless a policy below says so.

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- people
create type public.room_visibility as enum ('private', 'invite', 'friends', 'open');
create type public.book_visibility as enum ('private', 'friends');
create type public.moderation_state as enum ('pending', 'approved', 'rejected', 'removed');

-- What other people may learn about someone: a handle and a display name. Nothing else.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

-- Private to the owner: birth date (for the 13+ rule and teen defaults) and preferences.
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  born_on date not null,
  monthly_email boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- rooms
create table public.rooms (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'woodland' check (theme in ('woodland', 'beachfront', 'cyberpunk', 'sky-castle')),
  visibility public.room_visibility not null default 'invite',
  -- Lights, season settings, decor choices: the non-file parts of the local room state.
  settings jsonb not null default '{}'::jsonb check (octet_length(settings::text) <= 262144),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- People the owner has invited into an invite-only room.
create table public.room_invites (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, guest_id),
  check (owner_id <> guest_id)
);

-- ---------------------------------------------------------------- photos
-- Bytes live in Storage (bucket 'photos', path '<owner>/<id>.webp'); this row is the reference.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  width int not null check (width between 1 and 2048),
  height int not null check (height between 1 and 2048),
  bytes int not null check (bytes between 1 and 26214400),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  caption text check (char_length(caption) <= 280),
  moderation public.moderation_state not null default 'pending',
  created_at timestamptz not null default now(),
  deleted_at timestamptz, -- in the trash; purged after 30 days
  unique (owner_id, sha256)
);
create index photos_owner on public.photos (owner_id) where deleted_at is null;

-- ---------------------------------------------------------------- books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  subtitle text not null default '' check (char_length(subtitle) <= 120),
  visibility public.book_visibility not null default 'private',
  cover jsonb not null default '{}'::jsonb check (octet_length(cover::text) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index books_owner on public.books (owner_id) where deleted_at is null;

-- A page: up to 4 photos (page_photos) plus captions, stickers and ink (elements, no file data).
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  position int not null check (position between 0 and 9),
  elements jsonb not null default '[]'::jsonb check (jsonb_typeof(elements) = 'array' and octet_length(elements::text) <= 131072),
  paper jsonb not null default '{}'::jsonb,
  unique (book_id, position)
);

create table public.page_photos (
  page_id uuid not null references public.pages (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  slot int not null check (slot between 0 and 3),
  layout jsonb not null default '{}'::jsonb, -- x, y, w, rotation, frame
  primary key (page_id, slot)
);
create index page_photos_photo on public.page_photos (photo_id);

-- ---------------------------------------------------------------- map pins (cities only, never coordinates from a device)
create table public.pins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  city_id text not null check (city_id ~ '^geonames:[0-9]{1,10}$'),
  label text not null check (char_length(label) between 1 and 80),
  caption text not null default '' check (char_length(caption) <= 140),
  photo_id uuid references public.photos (id) on delete set null,
  created_at timestamptz not null default now()
);
create index pins_owner on public.pins (owner_id);

-- ---------------------------------------------------------------- updated_at
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();
create trigger rooms_touch before update on public.rooms for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.rooms enable row level security;
alter table public.room_invites enable row level security;
alter table public.photos enable row level security;
alter table public.books enable row level security;
alter table public.pages enable row level security;
alter table public.page_photos enable row level security;
alter table public.pins enable row level security;
