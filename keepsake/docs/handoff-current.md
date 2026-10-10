# Keepsake project handoff

> **Update, October 10, 2026 — branch [`codex/foundations-and-seasons`](https://github.com/thec00k/git-clone/tree/codex/foundations-and-seasons)** (branched from `codex/woodland-composition-proof`; `main` untouched). This branch is now the place to continue. What changed:
> - **Season engine** (`src/lib/seasons.ts`, `useSeasonal`, Room settings > Season): automatic by date and hemisphere (guessed from the time zone, never geolocation), manual override or freeze, per-holiday opt-out. Four seasons plus Valentine's, Easter, 4th of July, Halloween, Christmas (the engine reports the holiday; holiday dressing art is not built yet). Tidy up keeps the chosen season. Backups round-trip the new fields. Tests: `scripts/check-seasons.mjs`.
> - **Woodland promoted**: the "Woodland Retreat 2.0" model is the default Woodland room; `?study=woodland` is now only a review mode (view/phase/season switcher). The provisional layered exterior has four seasonal palettes, the hearth light shows in autumn and winter, and walking keeps out of the hearth. The old `woodland.glb`, `WoodlandScenery` and the `classic` room are still in the tree and **not yet removed**; Snowy Mountain is not ported (its flame shader, flicker and fireplace audio are candidates).
> - **Foundations**: GitHub Actions CI (build, lint, acceptance); self-hosted fonts; report-only CSP and permissions headers (`public/_headers`); Solana wallet import removed; licence ledger (`docs/asset-licenses.md`) with open provenance risks (original Woodland model/textures, `public/textures/*`, AI-generated assets, map data); a screenshot job (`browser-checks` workflow, push-triggered by `.github/requests/browser-checks`, output on branch `ci-shots`).
> - **Fire and sound** (`HearthFire.tsx`, `lib/fireplaceAudio.ts`, ported from the Snowy branch): flame shader, flickering light and spatial crackle in the Woodland hearth in autumn and winter; steady under reduced motion; sound starts on first click/key, follows the room-sounds volume, and has its own toggle in Settings > Music. Positions were set from the study model's hearth but **not yet checked visually** (the screenshot job has no camera facing the hearth).
> - **Free room swapping**: no ownership; `ownsRoomTheme` always true; retired ids (`classic`, `snowy-mountain`, `snowy`, `sky-castle`) become Woodland on load and in backups; classic theme code removed (`public/room/keepsake.glb` is still referenced by `roomHotspots.ts`, so the file stays).
> - **Stamps** (`lib/stamps.ts`, `check-stamps.mjs`): 30 to start, 3 per calendar day the room is opened, cap 100, no streak state, never reduced, private. Local-only: a server must own the grant once accounts exist.
> - **Y2K caption lettering** (`src/lettering.css`, `CAPTION_LOOKS`, toolbar swatches on a selected caption): chrome, glow, rhinestone, bubble, fire, ice. Pure CSS, ignores ink colour, shimmer off for reduced motion, stored as `look` on the caption and validated in backups. Reference render: `lettering-sheet.html` / the CI screenshot `lettering.png`. Not yet checked inside the book view, print view or 3D workbench book. Ideas deferred: warp/arch text, ransom-note fonts, cursor-reactive effects.
> - Owner decisions are in the Project doc `owner-decisions-2026-10-09`. Scanner work is on hold (`codex/scanner-texture-pipeline`).
> - **Open**: holiday dressing; commissioned exterior art; remove classic/old Woodland; room swapping must not require `ownedRoomThemes`; stamps and daily login (small fixed amount, no streaks, balance cap, nothing public); other Playwright checks are not yet adapted to CI; the lab.gfx.world effects idea awaits the owner's reference.

**Reviewed October 7, 2026.** Start from branch [`codex/woodland-composition-proof`](https://github.com/thec00k/git-clone/tree/codex/woodland-composition-proof), not `main`. Handoff commit `e237fe1` adds the current scrapbook/paper work and documentation to the shared branch. It follows `6d38081` (`Save Woodland art-direction study, quality pass, and archive UI`). Do not assume `main` contains these updates.

## Where work lives

- This branch contains the Woodland art-direction composition proof and quality pass, shared interactions, and the October scrapbook waiting-photo stack and paper materials work.
- `origin/main` is the earlier common base. This handoff intentionally advances the existing work branch; it does not merge into or push to `main`.
- Snowy Mountain and Sky Castle were separately published for room exploration and were not merged into this branch at this review. See [`codex/snowy-mountain-room`](https://github.com/thec00k/git-clone/tree/codex/snowy-mountain-room) (latest observed commit `7037e85`, September 14) and [`codex/sky-castle-room`](https://github.com/thec00k/git-clone/tree/codex/sky-castle-room) (latest observed commit `847b754`, September 22). Review their scenes and user memories carefully before integrating. Woodland and Snowy Mountain are intended to consolidate into one seasonal Woodland direction.
- [`codex/keepsake-rebuild`](https://github.com/thec00k/git-clone/tree/codex/keepsake-rebuild) contains an earlier shared WebGL context fix (`9bb1ce9`); that commit is already an ancestor of the current branch.

## Approved art direction

Read [`Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`](Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf) first. The owner's clarification is that the current rooms are unfinished, may be changed to follow this direction, and are a framework to improve—not protected legacy rooms to preserve. Do not design an opt-in migration product around preserving the old room looks. See [`docs/art-direction/README.md`](art-direction/README.md) for Figma boards and the Woodland composition proof. The older [`Keepsake_Updated_Bible_v4.pdf`](Keepsake_Updated_Bible_v4.pdf) remains useful for product context; [`v4-decisions.md`](v4-decisions.md) records later choices that supersede conflicting v4 proposals.

## Latest product work

- The upload review uses a swipeable photo stack, visible arrow controls, keyboard support, batch grid and scrapbook destination choices. Every upload is first saved in the archive.
- Photos chosen for a scrapbook are saved as archive references in that book's waiting pile. The pile appears beside the open book next time, and a photo leaves it only after placement. Placement and removal are undoable together. The implementation and current check record are in [`photo-review-stack.md`](photo-review-stack.md).
- Paper options and texture provenance are summarized in [`art/paper-studies/README.md`](../art/paper-studies/README.md); the local comparison is `material-study.html`.
- The original art-direction PDF and the earlier v4/product PDFs are checked into `docs/`; see [`README.md`](../README.md) for the full curated index.

## Local verification already completed

On the October 3 photo-stack change, the production build passed, targeted Oxlint on the new photo-stack modules passed, and `check-photo-inbox.mjs` covered queue deduplication, page constraints, placement, undo snapshot and backup round-trip. The existing `check-memory-features.mjs` passed. A browser preview verified archive selection, review, queueing, placement, undo, closing/reloading, and finding the queued photo after reopening. Existing full-project lint warnings and the large 3D bundle warning remain. Desktop visuals were reviewed; full mobile acceptance and target-device performance are not certified here.

The handoff update only adds documentation, copies the approved PDF into the repo, and records existing branch commits. No memory data or credentials belong in Git. Local IndexedDB photos/books, unsaved Blender state, personal credentials, and this chat are not in the repository.

## Next steps for the receiving AI

1. Confirm the exact remote branch head and open `keepsake/README.md` plus this file before editing.
2. Compare the Snowy Mountain and Sky Castle branches with the approved art direction and the current Woodland work. Preserve personal data and choose the Woodland/Snowy consolidation intentionally; do not blindly merge room branches.
3. Review the paper material changes and the waiting-photo stack in the app; resolve any design issues before broadening scope.
4. Recheck the implementation against the production Bible's ordered phases and progress record. Keep a small, reviewable branch and update this README/index when the active branch or task changes.
