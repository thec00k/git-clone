# Blender task handoff (October 11, 2026)

Paste-ready brief for a Claude Code session on the owner's computer, where Blender runs. Cloud sessions cannot reach Blender. Everything else in the open-work list ([handoff-2026-10-11.md](handoff-2026-10-11.md)) can be done from the cloud.

## Goal
Polish the 14 furniture objects in the default Woodland cabin so they fit the **Illustrated Nostalgia** art direction. Since PR #8 this is art work only: the owner confirmed these objects were built in their own Blender sessions, so they are not a licensing problem ([provenance-trace-2026-10-11.md](provenance-trace-2026-10-11.md)). The Beachfront remodel comes after.

## Repo and branch
`thec00k/git-clone`, app in `keepsake/`. Work from `codex/foundations-and-seasons` and open a PR into it, not `main`.

## Read first
`keepsake/docs/start-here.md`, `docs/handoff-current.md`, `docs/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`, `docs/art-direction/README.md`, `docs/blender-asset-workflow.md`, `art/woodland-study/README.md`, `licences/README.md` and `docs/licence-report.md`.

## The 14 objects
From the `woodland-study-room` entry in [licence-report.md](licence-report.md) (checked October 11):

Desk, ks_book, ks_crt, ks_archive, ks_guestbook, ks_map, ks_shelf, ks_chair, ks_lamp, ks_door, ks_clock, ks_ceiling_switch, ks_window, Beanbag.

The Beanbag has a known CC BY licence (`sketchfab-beanbag` entry), so it needs attribution kept or a replacement, not a provenance search.

## Where they live
- The default cabin ("Woodland Retreat 2.0") is built by `art/woodland-study/build.py` on top of the earlier `art/woodland/woodland.blend`, and ships as `public/room/woodland-study/woodland-study.glb`. That build keeps these 14 objects from that scene; walls, hearth, floor, materials and textures are already original.
- `art/woodland/woodland.blend` and `public/room/woodland/*.glb` stay until nothing loads from them (`legacy-woodland` entry).

## Rules
- Keep the object names, origins and pivots above: they are the app's interaction anchors (also `Desk_Drawer`). Do not join moving parts (drawer, chair parts, window panes) into static geometry. Keep the authored camera poses, furniture placement, window size and the 20-degree chair heading.
- Use Blender 5.1 or newer. Do not overwrite the unpolished study source or the live session file; follow `art/woodland-study/README.md` on which file each pass runs on.
- Every new or replaced file in `public/` or `art/` needs an entry in `licences/ledger.json` (CI enforces it). Regenerate `docs/licence-report.md` with `node scripts/check-licences.mjs --report`.
- Stay within the model budgets in `blender-asset-workflow.md`, then run `npm run check:acceptance` and `npm run build`.
- Never touch personal photo or scrapbook data, and never replace room data with test fixtures.

## Setup first
Confirm Blender MCP is connected to Blender 5.1 (it was last seen attached to an older 3.4.1 window) before modeling.

## Report back
Which objects are done, which licence entries were added or changed, and anything that still needs an owner decision.
