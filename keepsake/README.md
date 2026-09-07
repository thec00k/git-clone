# Keepsake

A calm digital scrapbook in a handcrafted 3D room. React/TypeScript/Vite application in this folder; desktop is the first target.

## Current build

Woodland Writing Room is the playable local prototype. It includes a scrapbook editor, interactive shelf books, photo archive and printer, visible memory map, guestbook/discoveries, day/night and weather, CRT music, and a drawer shop.

Start with the [current project checklist](docs/project-status.md) for verified work, remaining acceptance checks and the ordered roadmap. [Prototype implementation notes](docs/woodland-prototype.md) contain historical detail; [asset provenance](art/woodland/asset-ledger.json) tracks room sources.

The original pitch and design-bible PDFs are not included here. Older worklog/suggestion PDFs are historical, not the current implementation contract.

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

Books, photographs, settings, inventory and discoveries persist in IndexedDB. Room backup/restore is available in Settings. There is no account or shared database. View as, visibility and guestbook delivery demonstrate behavior locally; they are not real privacy enforcement or multiplayer.

Spotify is optional. SoundCloud plays public links; account OAuth is pending. The ambient Mellow Skies playlist starts with Day's End by Purrple Cat and needs an internet connection. Browser/provider restrictions can require pressing Play. Attribution is shown in the player. No music album is bundled for offline playback.

## Rooms and source assets

- Default: public/room/woodland/woodland.glb
- Blender source: art/woodland/woodland.blend
- Modular runtime: src/components/room3d/
- Previous room: ?theme=classic
- CSS fallbacks: ?room=chamber and ?room=flat
- Performance display: ?perf=1

Beachfront is the next planned environment, followed by Cyberpunk Cityscape, Snowy Mountain and Stormy Lighthouse Room. Future room cards do not yet switch scenes. Content must remain independent of environment selection.

After Blender edits, export the Woodland asset to its own path and run npm run check:room. Follow the source/export instructions in the prototype notes; do not overwrite the original asset inadvertently.

## Provider configuration

Copy .env.example only when configuring Spotify. Use VITE_SPOTIFY_CLIENT_ID, never a client secret in browser code. Personal credentials and .env files are ignored by Git. Full SoundCloud account linking needs a server-side exchange and is not implemented.

## Acceptance limits

Build and automated acceptance checks pass. Desktop browser checks exist, but target-hardware performance, full keyboard/screen-reader coverage, weather/quality combinations and mobile acceptance remain tracked work. Lint has existing warnings and the 3D bundle remains large. Browser testing is no longer waiting on a sandbox repair.
