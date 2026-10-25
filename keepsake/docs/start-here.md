# Start here (handoff, updated October 25, 2026)

Written for the next agent (for example the Claude desktop agent) picking this up. Read this first, then [`handoff-current.md`](handoff-current.md) (its October 25 section is the current status) and the dated [`handoff-2026-10-11.md`](handoff-2026-10-11.md).

## Where things are
- Repo `thec00k/git-clone`, app in `keepsake/`. Work branch: **`codex/foundations-and-seasons`** (from `codex/woodland-composition-proof`, which is now history). `main` is intentionally unchanged. Nothing is publicly deployed yet.
- Live rooms (`src/lib/roomThemes.ts`): Woodland (default, seasonal), Beachfront, Neon City (`cyberpunk`) and Sky Castle (`sky-castle`). Snowy Mountain is consolidated into Woodland (its fire, sound, deer and bear mounts and winter fur rug); the ids `classic`, `snowy-mountain` and `snowy` open as Woodland with memories intact. `codex/snowy-mountain-room` and `codex/sky-castle-room` are reference only; do not merge them.
- The only open code PR is [#29](https://github.com/thec00k/git-clone/pull/29) (draft, branch `claude/project-thread-yzri97`): room freezing, faster page turns, the device photo upload fix (in Chrome and Edge the picker was cleared before the files were read, so nothing imported), clock glass, one marker tray, manual save button removed. CI green; it merged cleanly onto this branch on October 25. Waiting on the owner's check on their PC.
- Scanner branch `codex/scanner-texture-pipeline` is on hold.
- Read in this order: `README.md`, `keepsake/README.md`, `docs/handoff-current.md`, `docs/code-map.md`, `CONTRIBUTING.md`, then `docs/handoff-2026-10-11.md`, `docs/backend-design.md`, `docs/safety-model.md`, `docs/roadmap-2026-10-10.md`, `licences/README.md`. Owner decisions are in the Project doc `claude/owner-decisions-2026-10-09.md`.

## Done since October 11 (all merged into this branch)
- Oct 17: Woodland furniture restyled in the approved CRT Illustrated Nostalgia style, lighting passes, room opens facing the desk, settings no longer freeze (shader warm-up), photos load on demand, audit fixes (#12), 3D leak checks, 21 agent skills (#16).
- Oct 18: Woodland cabin rebuilt with solid log walls and a beamed ceiling (#28).
- Oct 20: old Woodland model retired, cabin has its own asset manifest (#32); Snowy's mounts and fur rug in Woodland, holiday decor off the chimney, `blender-asset-qa` skill (#31).
- Oct 22: Neon City lighting calmed (#15), Sky Castle ported as a live room keeping its real-world map and glass furniture (#14), Neon/Sky Castle art review (#11), Beachfront furniture in whitewashed driftwood.
- Oct 25: Sky Castle furniture in crystal, marble and gold; Beachfront rug in driftwood greige, pumpkins clear of the mantel, deer/bear mounts in the Furniture tab, map page preloaded; sign-in and backup ([PR #10](https://github.com/thec00k/git-clone/pull/10)) after the live second-browser restore passed.

## Done in the October 10–11 stretch
- Fire and sound, free room swapping, stamps (30 to start, daily grant), seasons and holidays, room ageing, caption lettering, Beachfront seasonal grade.
- Supabase design (schema, row level security, teen rules, silent blocks, tag consent, rate limits, server-owned stamps, storage, trash), tested on every push (CI job "database"). Oct 11: live free project `keepsake` (us-east-1), most migrations applied, `moderate-photo` deployed with photo processing; sign-in, sync with an outbox, and bringing a room to a new device (`src/lib/sync/`, `check-sync`). See `backend-design.md` → The live project.
- Shared size limits (`src/lib/limits.ts`): 4 photos a page, 10 pages, 40 a book, 12 books, 100 pins, 500 photos, 25 MB, 2048 px. Page cap changed from 6 to 4.
- Photos, card art and 3D scans stored once by hash outside the room record. GPS/EXIF stripped from originals.
- Moderation decision logic (tested); the edge function is a stub.
- Images load on demand (Oct 11): photos, card art and scans are stored as Blobs and reach the app as `blob:` URLs, so a 500-photo archive opens in about 0.15 s instead of 0.75 s with almost nothing in memory (was about 195 MB). Older saves upgrade themselves on first open.
- Licence ledger covering all 270 files in `public/` and `art/`, enforced in CI. Prettier formatting enforced in CI. CI on every push with quick screenshots.

## Open work
Model guide: Opus 5.5 for database permissions, safety, data-loss and audits; Sonnet 5.5 for routine docs, ledger, CI, formatting, screenshots; Fable 5 only for the hardest design or security review (needs a separate session).

| Task | Model |
| --- | --- |
| Owner tests PR #29 on their PC (upload, page turns, clock, markers), then merge | Opus 5.5 |
| Accounts before launch: a custom email sender (the built-in one allows about 2 sign-in emails an hour), the site address in the sign-in redirect URLs once there is a domain, and setting `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` on the host. Sign-in and backup are merged (PR #10) | Opus 5.5 |
| Remaining audit findings (below) | Opus 5.5 |
| Moderation vendors, image processing, moderator screen, in-app safety links, Terms/Privacy, account deletion/export | Opus 5.5 (legal review by a lawyer) |
| Finish Woodland against the art bible before more room work: Phase 4 illustrated window layers (needs art, `docs/scenery-brief.md`), Phase 6 lighting comparisons across views, times and seasons, Phase 7 measurements on an ordinary laptop and a phone | Sonnet 5.5 (art by owner or commission) |
| Neon City furniture remodel in the same style as Beachfront and Sky Castle (the only room with no furniture remodel yet) | Sonnet 5.5 |
| Replace the paper-craft holiday placeholders with finished holiday art | Sonnet 5.5 |
| Remove Sky Castle from the "Coming later" list in `ShopRoomVariants.tsx`; it is already selectable above it | Sonnet 5.5 |
| Save proof copies of licence pages into `licences/proof/` (5 entries known but unproven) | Sonnet 5.5 |
| Enforce the 5-photo share minimum on the server too (the app enforces it since October 11; the database does not check it yet) | Opus 5.5 |

Audit findings still open: switch the CSP from report-only to enforcing after a hosted build has been exercised (the Spotify login stays in localStorage on purpose, so it is remembered; enforcing the CSP is the protection). Fixed Oct 11 in PR #12 (not yet checked in a real browser): restore vs. older autosave, unused originals deleted on load, room/furniture GLTF eviction, display-case scan leaks, camera stopping mid-turn, focus trap late content, arrow-key nudging of page elements, page-wide arrow keys, per-frame allocations, display-case camera clamp, flat room buttons in the accessibility tree, bounded scan receiver fetch.

## Decisions waiting on the owner
1. May adults send friend requests to teens? (Today yes, teen must accept; room stays invite-only. Stricter option available.)
2. Which vendors: moderation classifier, abuse-image hash matching, Supabase plan.
3. ~~Original Woodland model and texture provenance.~~ Resolved Oct 11: the owner confirmed the inherited objects were built in the owner's own Blender sessions (`docs/provenance-trace-2026-10-11.md`).
4. Teens and "open" rooms (recommendation: no; the database already forbids it).
5. Music policy, holiday regions, who handles abuse reports and how fast, budget for art and legal, whether Dec 22 becomes a private beta.

## Working notes
- Only GitHub is reachable from the cloud sandbox. CI is triggered by pushing files under `.github/requests/` (`ci`, `browser-checks`, `format`). CI logs are unreadable there; read failures via check-run annotations. Screenshots land on the `ci-shots` branch.
- The sandbox has Node 22 and incomplete node_modules, so scripts needing `three` can't run locally. Database tests run locally with Postgres: `PGHOST=localhost PGUSER=postgres keepsake/supabase/tests/run.sh`.
- Format with Prettier through the `format` workflow (needs two passes); add the commit to `.git-blame-ignore-revs`.
- Do not merge room branches blindly, do not build a migration flow for old room looks, preserve photo and scrapbook data, and update the handoff when status changes.
