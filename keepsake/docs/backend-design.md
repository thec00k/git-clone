# Backend design (Supabase + Cloudflare)

Status, October 11, 2026: **designed, tested and wired into the app, not deployed.** The schema and every permission rule exist as SQL migrations in `supabase/migrations/`, and `supabase/tests/run.sh` applies them to a scratch Postgres and checks the rules (CI job "database"). The app now has sign-in and a sync client (`src/lib/sync/`, checked by `scripts/check-sync.mjs`), but both stay hidden until a Supabase project is configured. No Supabase project exists yet.

Safety rules are in [safety-model.md](safety-model.md). Size limits shared by app and server are in `src/lib/limits.ts`.

## Principles
1. **Local-first stays.** The IndexedDB room is the working copy; the app keeps working offline, and backup/restore keeps working. The server is where a room is *synced to*, and the only place other people can see anything.
2. **Files are files.** Photos and scans are objects in Storage, referenced by id. Rows never hold image data.
3. **Deny by default.** Row level security on every table (a test fails if one is missing). People can only do what a policy allows; moderators and the upload pipeline use the service role.
4. **The server owns anything worth cheating:** stamps, limits, moderation state, who can see what.
5. **Collect little.** Birth date (for 13+ and teen defaults) is the only personal fact, visible only to its owner. Map pins are cities from a list, never device location.

## Tables
| Area | Tables | Notes |
| --- | --- | --- |
| People | `profiles` (username, display name), `profile_private` (birth date, email preference) | Strangers can't list profiles; exact-username lookup via `find_profile()` |
| Rooms | `rooms` (theme, visibility, settings JSON, revision), `room_private` (owner-only JSON), `room_invites` | Visibility: private / invite (default) / friends / open (adults only). `settings` is only what visitors see |
| Photos | `photos` (storage path, size, hash, caption, moderation state, trash date) | Max 2048 px, 500 per person, 30-day trash |
| Books | `books`, `pages` (elements JSON: captions, stickers, ink; position 0 is the title page), `page_photos` (slots 0-3) | 12 books, 10 pages, 4 photos a page, 40 a book; only your own photos |
| Map | `pins` (GeoNames city id, label, caption, optional photo) | 100 pins |
| Social | `friendships`, `blocks`, `guestbook_notes`, `photo_tags` | See safety model |
| Safety | `reports`, `moderation_log`, `rate_events` | Reports are write-only for people |
| Stamps | `stamp_events`, `shop_items`, `owned_items` | `claim_daily_stamps()`, `buy_item()` |

Storage buckets: `uploads/<user>/…` (raw, owner-only, deleted after processing) and `photos/<owner>/<id>.webp` (processed, written only by the pipeline, readable when `can_view_photo()` allows).

## Who can see what
- **Room:** owner always. Others never across a block. Invite rooms: invited friends. Friends rooms: friends. Open rooms (adults only): any signed-in person. Signed-out visitors: nothing.
- **Book:** owner, or friends who can see the room when the book is set to friends. A book needs 5 photos before it is shared (`canShareBook`, enforced in the app).
- **Photo:** owner, or someone who can see a book it is in, and only after moderation approved it.
- **Profile:** yourself, friends, people with a pending request with you, owners of rooms you may visit.

## Sync (built October 11; first half of the plan)
How it works today (`src/lib/sync/`):
1. **Sign-in** with an emailed link (Supabase Auth, implicit flow so a link opened in any browser works and never clashes with Spotify's `?code=`), then `complete_signup(username, display name, birth date)`. The panel is "Back up to your account" under Room settings → Saving, and only appears when the site has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. **Linking** happens once per device: an empty account is linked to this device's room. An account that already holds a room from elsewhere, or a second account on the same device, **pauses** backup and nothing is sent.
3. **The outbox.** After every successful local save, `record()` compares the room with the last queued copy and queues what changed: photos, the room, each book, and trash moves. `flush()` sends them when online, oldest kind first (photos, room, books, trash). Failures wait (5 s doubling to 10 min) and retry; a change made while an older one is being sent is never dropped (each queued change has a sequence number). Its bookkeeping lives in its own IndexedDB database (`keepsake-sync`), so the sync code cannot write to the room.
4. **What goes where.** `rooms.settings` holds only what visitors see (lights, season, decor). Everything else that is not a book or a file (archive details, pins, notes, time capsules, preferences) goes to the new owner-only `room_private` table. Books go through `save_book()`, one transaction per book; the title page is position 0. Photos go to `uploads/<user>/<hash>` and then through the `moderate-photo` function, which now takes the owner from the sign-in token and reuses an existing copy of the same picture. Rows never hold file data; files are referred to by the same SHA-256 keys the local `images` store uses.
5. **Safety of local data.** Nothing in sync writes to the room on this device. Deleting a book or photo here moves the server copy to its 30-day trash. `save_room()` only writes when the server revision matches, so another device's save is never overwritten; if it does not match, backup pauses. A book marked Public is sent as Friends at most, and only once it has 5 photos.

Still to build (next steps, in order):
- **Image processing in `moderate-photo`** (decode, resize to 2048 px, WebP). Until then uploads fail on the server, stay queued and retry; books are saved without their photos and get them when uploads succeed.
- **Bringing a room down to a new device, and the "changed elsewhere" choice.** Today a paused device keeps its room and says so; the next step is a screen that shows both versions and lets the person keep one or merge, never dropping memories silently.
- Card art and 3D scans are not uploaded yet (their keys are kept in the private part). Pins are kept in the private part; the `pins` table (city ids) is for the shared map later.
- Stamps move to `claim_daily_stamps()`; Turnstile on sign-up; visiting a friend (reads rows and signed photo URLs).

## Local storage changes (done and next)
- Done: photos, card art and 3D scans (`src`, `photoSrc`, `coverSrc`, `backSrc`, `modelSrc`) are stored once by hash in the `images` store, so an edit no longer rewrites every model; the hash cache no longer grows for the whole session.
- Next: **load images on demand.** `loadState` still reads every image into memory at start. Plan: keep `keepsake-asset:<hash>` references in state and resolve them through a small cache that returns `blob:` URLs when an image is about to be shown (archive grid, page, map). This is needed before archives approach the 500-photo limit, and it is the same shape the server sync needs (references, not data).

## Deployment (when you are ready)
1. Create a Supabase project (EU or US region close to most users). Apply migrations with the Supabase CLI: `supabase link` then `supabase db push` (or apply each file in `supabase/migrations/` in order).
2. In Authentication → URL configuration, set the Site URL and add the app's address(es) as redirect URLs, so the emailed sign-in link comes back to the app. Set up a custom SMTP sender before real users (the built-in one is rate-limited).
3. Put the project URL and publishable key in `.env.local` (development) or the host's environment as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never the service role key.
4. Seed `shop_items` with the drawer catalogue prices.
5. Deploy `supabase/functions/moderate-photo` once image processing is in and a moderation provider and hash-matching service are chosen (it currently holds every upload for review).
6. Schedule `purge_trash()` daily with pg_cron (command in `supabase/migrations/*_trash.sql`).
7. Cloudflare Pages for the site; the `_headers` CSP already allows `*.supabase.co`; switch the CSP from report-only to enforcing.

## Running the tests locally
Needs Postgres 15+ and `psql`: `PGHOST=localhost PGUSER=postgres keepsake/supabase/tests/run.sh`. It creates and drops its own database.
