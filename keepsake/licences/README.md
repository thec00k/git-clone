# Licence ledger

`ledger.json` lists every file under `public/` (what ships) and `art/` (sources). CI fails if a tracked file there is not covered, if an entry no longer matches any file, or if an entry lacks what its status requires. `docs/licence-report.md` is the readable summary, regenerated with `node scripts/check-licences.mjs --report`.

## Adding or changing an asset (same commit)
1. Put the file in `public/` or `art/`.
2. Add or extend an entry in `ledger.json`: `files` (glob patterns), `kind`, `status`, `origin`, `author`, `licence`, `commercialUse`, and `source` for third-party work.
3. Save proof in `licences/proof/<entry-id>/`: a dated PDF or screenshot of the licence and the item page, a purchase receipt, or a signed commission agreement. Then list it in `proof` and set the status to `verified`.
4. CC BY assets also need a credit in the app (`AssetCredits.tsx`) and `creditedInApp: true`.
5. Run `node scripts/check-licences.mjs --report`.

## Statuses
- **verified**: licence known and proof stored.
- **documented**: licence known, proof not saved yet.
- **original**: made for Keepsake; the source or script is in this repository.
- **ai-generated**: made with an image generator; check the tool's terms.
- **unverified**: origin unknown or contains such parts; replace or remodel before public launch.

## Remodel plan
Everything marked unverified traces back to one inherited room scene whose origin was never recorded. The fastest path to a clean room is: generate replacement wood normal maps (furniture), remodel the 13 inherited objects the Woodland build keeps, and replace the sample photos, legacy textures and world maps. `docs/licence-report.md` lists each item.
