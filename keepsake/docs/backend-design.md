# Backend design (Supabase + Cloudflare)

Status, October 10, 2026: **designed and tested, not deployed.** The schema and every permission rule exist as SQL migrations in `supabase/migrations/`, and `supabase/tests/run.sh` applies them to a scratch Postgres and checks the rules (CI job "database"). No Supabase project exists yet and the app does not talk to a server.

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
| Rooms | `rooms` (theme, visibility, settings JSON, revision), `room_invites` | Visibility: private / invite (default) / friends / open (adults only) |
| Photos | `photos` (storage path, size, hash, caption, moderation state, trash date) | Max 2048 px, 500 per person, 30-day trash |
| Books | `books`, `pages` (elements JSON: captions, stickers, ink), `page_photos` (slots 0-3) | 12 books, 10 pages, 4 photos a page, 40 a book; only your own photos |
| Map | `pins` (GeoNames city id, label, caption, optional photo) | 100 pins |
| Social | `friendships`, `blocks`, `guestbook_notes`, `photo_tags` | See safety model |
| Safety | `reports`, `moderation_log`, `rate_events` | Reports are write-only for people |
| Stamps | `stamp_events`, `shop_items`, `owned_items` | `claim_daily_stamps()`, `buy_item()` |

Storage buckets: `uploads/<user>/…` (raw, owner-only, deleted after processing) and `photos/<owner>/<id>.webp` (processed, written only by the pipeline, readable when `can_view_photo()` allows).

## Who can see what
- **Room:** owner always. Others never across a block. Invite rooms: invited friends. Friends rooms: friends. Open rooms (adults only): any signed-in person. Signed-out visitors: nothing.
- **Book:** owner, or friends who can see the room when the book is set to friends. A book needs 5 photos on its pages before it is shared (`canShareBook`/`canSetVisibility`, enforced in the app's store and bookshelf). The database does not check this yet; add it when the sync client lands.
- **Photo:** owner, or someone who can see a book it is in, and only after moderation approved it.
- **Profile:** yourself, friends, people with a pending request with you, owners of rooms you may visit.

## Sync plan (next build step)
1. Sign-in with Supabase Auth (email magic link, Turnstile on sign-up), then `complete_signup(username, display name, birth date)`.
2. **First sync uploads the local room:** each archive photo goes through the upload pipeline (raw → `uploads`, processed → `photos`, metadata stripped, moderated); books, pages, pins and room settings are written as rows. Local ids map to server ids in a small table kept in IndexedDB.
3. **Afterwards:** changes are queued locally (an outbox in IndexedDB) and sent when online. Room settings use `rooms.revision` for optimistic concurrency, the same rule the local save uses across tabs. Conflicts keep both versions and ask, never silently drop memories.
4. **Visiting a friend** reads their rows and signed photo URLs directly; nothing of theirs is stored on the visitor's device beyond the browser cache.
5. Stamps move to `claim_daily_stamps()`; the local stamp code becomes a display of the server balance.

## Local storage changes (done and next)
- Done: photos, card art and 3D scans (`src`, `photoSrc`, `coverSrc`, `backSrc`, `modelSrc`) are stored once by hash in the `images` store, so an edit no longer rewrites every model; the hash cache no longer grows for the whole session.
- Next: **load images on demand.** `loadState` still reads every image into memory at start. Plan: keep `keepsake-asset:<hash>` references in state and resolve them through a small cache that returns `blob:` URLs when an image is about to be shown (archive grid, page, map). This is needed before archives approach the 500-photo limit, and it is the same shape the server sync needs (references, not data).

## Deployment (when you are ready)
1. Create a Supabase project (EU or US region close to most users). Apply migrations with the Supabase CLI: `supabase link` then `supabase db push`.
2. Seed `shop_items` with the drawer catalogue prices.
3. Deploy `supabase/functions/moderate-photo` once a moderation provider and hash-matching service are chosen (it currently holds every upload for review).
4. Schedule `purge_trash()` daily with pg_cron (command in `supabase/migrations/*_trash.sql`).
5. Cloudflare Pages for the site; set the `_headers` CSP to allow the Supabase URL, then switch the CSP from report-only to enforcing.

## Running the tests locally
Needs Postgres 15+ and `psql`: `PGHOST=localhost PGUSER=postgres keepsake/supabase/tests/run.sh`. It creates and drops its own database.
