# Keepsake

A calm digital scrapbook in a handcrafted 3D room. React/TypeScript/Vite application in this folder; desktop is the first target.

## Current build

Status, October 25, 2026: four rooms are playable and freely swappable, with memories kept on every switch: **Woodland** (the default log cabin, restyled in the Illustrated Nostalgia direction, with Snowy Mountain's fire, mounts and fur rug folded in), **Beachfront** (driftwood furniture), **Neon City** and **Sky Castle** (crystal, marble and gold furniture, real-world map). Woodland follows the real date: spring, summer, autumn and winter automatically, plus five holidays (Room settings > Season to override or freeze). Optional sign-in and backup to Supabase are built and tested but stay off until the host is configured. Nothing is publicly deployed yet. See the [current handoff](docs/handoff-current.md) for what is open. The app includes a scrapbook editor, interactive shelf books, photo archive and printer, visible memory map, guestbook/discoveries, day/night and weather, CRT music, and a drawer shop.

For a clean handoff, start with [start here](docs/start-here.md) and the [current handoff status](docs/handoff-current.md), then the dated [October 11 handoff](docs/handoff-2026-10-11.md), then use this index to find the product direction and implementation records. The [September project checklist](docs/project-status.md) is a dated acceptance snapshot, not the latest branch/room status. [Prototype notes](docs/woodland-prototype.md) retain historical implementation details; [asset provenance](art/woodland/asset-ledger.json) tracks room sources.

## Handoff reading order

1. [Current handoff status and branch map](docs/handoff-current.md) — what is on this branch, what remains on separate room branches, and how to continue without overwriting work.
2. [New Art Direction and Room Production Bible](docs/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf) — the approved **Illustrated Nostalgia** direction and production contract. This supersedes conflicting earlier visual proposals.
3. [Updated Bible v4](docs/Keepsake_Updated_Bible_v4.pdf) and [decisions that resolve v4 proposals](docs/v4-decisions.md) — product goals and later owner choices.
4. [Art direction package](docs/art-direction/README.md) — Figma direction matrix, Woodland camera/composition study, framework audit, production phases, and proof results.
5. [Current project status snapshot](docs/project-status.md) — detailed acceptance inventory, dated September 9, 2026; verify claims against the current branch before treating them as current.

### Current implementation records

- [Batch photo review and scrapbook waiting stack](docs/photo-review-stack.md) — swipeable upload review, archive-backed photo references, saved per-book waiting pile, placement and undo.
- [Paper material studies](art/paper-studies/README.md) and [interactive comparison page](material-study.html) — source renders, included paper textures, shader settings and page/sticker previews.
- [Blender asset workflow](docs/blender-asset-workflow.md), [woodland room notes](docs/woodland-prototype.md), [Beachfront notes](docs/beachfront-prototype.md), and [room performance review](docs/three-room-quality-pass.md).
- [UI design system](docs/ui-design-system.md), [artifact and card binders](docs/artifacts-and-card-binders.md), [furniture checks](docs/furniture-quality-checks.md), [time-capsule implementation](docs/time-capsule-chest.md), and [remaining polish direction](docs/next-polish-direction.md).

### Historical records

[Figma and display-case summary](docs/Keepsake_Figma_and_Artifact_Display_Case_Summary.pdf), [worklog](docs/keepsake-worklog.pdf), and [suggestions](docs/keepsake-suggestions.pdf) preserve earlier context. Consult the newer art-direction Bible and current handoff record first.

## Run and check

From keepsake/:

```sh
npm install
npm run dev
npm run check:acceptance
npm run build
npm run lint
```

The development server requests port 5174; use the URL it actually reports if that port is occupied. Browser data belongs to that origin, so changing ports opens a separate local room. Use the Room Settings backup/export before moving between origins.

## What is local

Books, photographs, settings, inventory and discoveries persist in IndexedDB. Room backup/restore is available in Settings. Optional account sign-in backs the room, books and photos up to Supabase and can bring the room to a new device; it appears only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set (see [backend design](docs/backend-design.md)). Visiting friends' rooms is not built yet: View as, visibility and guestbook delivery demonstrate behavior locally.

Spotify is optional. SoundCloud plays public links; account OAuth is pending. The ambient Mellow Skies playlist starts with Day's End by Purrple Cat and needs an internet connection. Browser/provider restrictions can require pressing Play. Attribution is shown in the player. No music album is bundled for offline playback.

## Rooms and source assets

- Default: public/room/woodland-study/woodland-study.glb, built by art/woodland-study/build.py and recorded with `npm run assets:woodland`
- Blender sources: art/woodland/woodland.blend (furniture the cabin build starts from) and art/woodland-study/
- Modular runtime: src/components/room3d/
- CSS fallbacks: ?room=chamber and ?room=flat
- Performance display: ?perf=1

Beachfront, Neon City and Sky Castle are in Drawer shop > Room variants. Switching preserves memories and per-room decoration choices. See [Beachfront notes](docs/beachfront-prototype.md) and [Sky Castle notes](docs/sky-castle-room.md). Snowy Mountain is merged into the seasonal Woodland room. Stormy Lighthouse Room remains an idea.

After re-exporting the Woodland cabin, run `npm run assets:woodland` and commit the updated manifest, then `npm run check:room`. Follow the source/export instructions in the prototype notes; do not overwrite the original asset inadvertently.

## Provider configuration

Copy `.env.example` to `.env.local` when configuring optional providers. Use `VITE_SPOTIFY_CLIENT_ID`, never a client secret in browser code. Personal credentials and `.env` files are ignored by Git. Full SoundCloud account linking needs a server-side exchange and is not implemented.

## Acceptance limits

Build and automated acceptance checks pass. Desktop browser checks exist, but target-hardware performance, full keyboard/screen-reader coverage, weather/quality combinations and mobile acceptance remain tracked work. Lint has existing warnings and the 3D bundle remains large. Browser testing is no longer waiting on a sandbox repair.
