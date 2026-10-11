# Working on Keepsake

Rules that keep the code reviewable and future audits quick. CI enforces the ones marked **(CI)**.

## Branches and commits
- One active workstream per branch. Start short-lived branches from the current work branch (`codex/<topic>`), and never have two sessions committing to the same branch from the same folder at once.
- `main` changes only by reviewed merge.
- Keep commits about one thing. Formatting-only changes go in their own commit and are listed in `.git-blame-ignore-revs`.
- Every push runs build, lint, formatting, acceptance checks and the database tests **(CI)**, plus quick screenshots when app or room files change. Ask for the full screenshot set by changing `.github/requests/browser-checks`.

## Code style
- Prettier formats TypeScript and JavaScript **(CI)**: `npm run format`. Don't hand-pack several statements onto one line.
- Keep files under about 400 lines and functions short; split a component when it gains a second job.
- Put pure logic (rules, limits, dates, validation) in `src/lib/` with a `scripts/check-*.mjs` test, and keep components about rendering and wiring.
- Name the owner decision a rule comes from in a short comment (for example `// Owner decision: 4 photos per page`).
- Size limits live only in `src/lib/limits.ts` (app) and the migrations/`UPLOAD_LIMITS` (server); `check-limits` keeps them equal **(CI)**.

## Data and safety
- Never store file data inside the room record; file fields are stored by hash (`src/lib/storage.ts`) **(CI: check-storage)**.
- Every new backup field gets validation in `src/lib/roomBackup.ts` and a round-trip test.
- Every new table gets row level security and a policy test in `supabase/tests/` **(CI: database)**.
- Strip photo metadata before anything is stored or sent (`src/lib/stripMetadata.ts`).

## Assets
- Every file added under `public/` or `art/` needs a `licences/ledger.json` entry in the same commit **(CI: check-licences)**. See `licences/README.md`.

## Audits
Start from [docs/code-map.md](docs/code-map.md): what each area does, where its tests are, and the checklist used for audits.
