# Start here (handoff, October 11, 2026)

Written for the next agent (for example the Claude desktop agent) picking this up. Read this first, then `handoff-current.md`.

## Where things are
- Repo `thec00k/git-clone`, app in `keepsake/`. Work branch: **`codex/foundations-and-seasons`** (from `codex/woodland-composition-proof`). Latest commit when this was written: `82afe07` plus this note. CI was green. `main` is intentionally unchanged. Scanner branch `codex/scanner-texture-pipeline` is on hold. Snowy Mountain and Sky Castle branches are not integrated.
- Read in this order: `README.md`, `keepsake/README.md`, `docs/handoff-current.md`, `docs/code-map.md`, `CONTRIBUTING.md`, then `docs/backend-design.md`, `docs/safety-model.md`, `docs/roadmap-2026-10-10.md`, `licences/README.md`. Owner decisions are in the Project doc `claude/owner-decisions-2026-10-09.md`.

## Done in this stretch
- Fire and sound, free room swapping, stamps (30 to start, daily grant), seasons and holidays, room ageing, caption lettering, Beachfront seasonal grade.
- Supabase design (schema, row level security, teen rules, silent blocks, tag consent, rate limits, server-owned stamps, storage, trash), tested on every push (CI job "database"). Not deployed; the app does not talk to a server.
- Shared size limits (`src/lib/limits.ts`): 4 photos a page, 10 pages, 40 a book, 12 books, 100 pins, 500 photos, 25 MB, 2048 px. Page cap changed from 6 to 4.
- Photos, card art and 3D scans stored once by hash outside the room record. GPS/EXIF stripped from originals.
- Moderation decision logic (tested); the edge function is a stub.
- Licence ledger covering all 270 files in `public/` and `art/`, enforced in CI. Prettier formatting enforced in CI. CI on every push with quick screenshots.

## Open work
Model guide: Opus 5.5 for database permissions, safety, data-loss and audits; Sonnet 5.5 for routine docs, ledger, CI, formatting, screenshots; Fable 5 only for the hardest design or security review (needs a separate session).

| Task | Model |
| --- | --- |
| Connect the app to Supabase (project, auth, sync client with outbox) | Opus 5.5 |
| Load images on demand (blob URLs) before archives near 500 photos | Opus 5.5 |
| Remaining audit findings (below) | Opus 5.5 |
| Moderation vendors, image processing, moderator screen, in-app safety links, Terms/Privacy, account deletion/export | Opus 5.5 (legal review by a lawyer) |
| Remodel the 14 inherited Woodland objects, replace unverified assets, Beachfront remodel (needs Blender on the owner's computer) | Sonnet 5.5 |
| Save proof copies of licence pages into `licences/proof/` (5 entries known but unproven) | Sonnet 5.5 |
| Enforce the 5-photo minimum before sharing a book (`canShareBook` exists, not enforced) | Sonnet 5.5 |
| Neon City and Sky Castle review against the art direction | Opus 5.5 |

Audit findings still open: restore can be overwritten by an older autosave; originals in `keepsake-originals` never deleted; GPU caches for room/furniture GLTFs never evicted; display-case scan models leak; camera stops mid-turn on click; focus trap misses late content; no keyboard moving of page elements; per-frame allocations (WorkbenchBook, DiscoveryObject); arrow keys captured page-wide; display-case camera pose clamped; all images loaded into memory at startup; flat room buttons hidden from the accessibility tree; CardBinders scan URL fetch unbounded; Spotify refresh token in localStorage while CSP is report-only.

## Decisions waiting on the owner
1. May adults send friend requests to teens? (Today yes, teen must accept; room stays invite-only. Stricter option available.)
2. Which vendors: moderation classifier, abuse-image hash matching, Supabase plan.
3. Original Woodland model and texture provenance.
4. Teens and "open" rooms (recommendation: no; the database already forbids it).
5. Music policy, holiday regions, who handles abuse reports and how fast, budget for art and legal, whether Dec 22 becomes a private beta.

## Working notes
- Only GitHub is reachable from the cloud sandbox. CI is triggered by pushing files under `.github/requests/` (`ci`, `browser-checks`, `format`). CI logs are unreadable there; read failures via check-run annotations. Screenshots land on the `ci-shots` branch.
- The sandbox has Node 22 and incomplete node_modules, so scripts needing `three` can't run locally. Database tests run locally with Postgres: `PGHOST=localhost PGUSER=postgres keepsake/supabase/tests/run.sh`.
- Format with Prettier through the `format` workflow (needs two passes); add the commit to `.git-blame-ignore-revs`.
- Do not merge room branches blindly, do not build a migration flow for old room looks, preserve photo and scrapbook data, and update the handoff when status changes.
