# Artifact display case and card binders

## Design fit

The supplied `Keepsake_Figma_and_Artifact_Display_Case_Summary.pdf` extends the existing local-first memory systems. Its distinction is useful: flat memorabilia belongs in the archive/scrapbook; meaningful dimensional objects belong in a display case. Memory Trails can eventually connect both. The case is intentionally empty, not an achievement leaderboard.

The brief's Figma token, sleeve, photo-state and directional-shadow studies remain design work, not completed Figma deliverables. Backend artifact records, permissions, cloud asset storage, object placement and phone reconstruction are also future work. The user's explicit request brought the empty case forward without claiming those systems exist.

## Display case

- Authored Blender 5.1 source: `art/furniture/display-case.blend`; repeatable builder: `art/pipeline/build-display-case.py`.
- Independent browser asset: `public/room/furniture/display-case.glb`. It is composed into both rooms by `ArtifactDisplayCase.tsx`, rather than baked into the room shell.
- Approximately 0.98 m wide, 0.52 m deep and 2.11 m tall. Position [2.04, 0, 1.38], facing into the room. The shelf ends at z=0.60; the case starts at z=0.89, leaving 0.29 m between them. Rear edge x=2.30 clears the wall trim. No room enlargement or furniture scaling was necessary.
- Four empty levels, separate front/side glass, divided double doors, glass shelves, softened painted framing, oak backing and brass fittings. Doors are presently static.
- Opaque parts are batched by material for export; glass panes remain separate for transparent sorting. The editable Blender source keeps individual parts.
- Room > Display case focuses the camera. Room > Lighting > Display case persists an independent on/off setting; LEDs follow the CRT palette, including the owned Beachfront coastal color.
- The walking boundary prevents entering the cabinet. LEDs remain available with the ceiling light off. Browser glass uses inexpensive transparency rather than multi-layer refraction.

## Card binder reference and implementation

Reference reviewed: https://cards.art/ (2026-09-11). Its public viewer uses a dimensional binder, nine-card pocket pages, page navigation and individual inspection. Its customization interface describes cover art, text, colors and rearrangement. Its wallet/trading systems and artwork were not reused.

Keepsake has a separate owner-only Room > Card binders entry. It supports multiple titled binders, five cover colors, cover images, nine pockets per page, two-page spreads, front/back card pictures, full-image fit, paper/foil styles, inspection tilt, positional reordering and reversible card removal. Smaller screens stack the two pages. Reduced-motion preferences disable tilt and page settling.

Device imports accept up to 20 pictures per batch and 180 cards per binder. Imported pictures are also retained in the filing cabinet; original preservation follows the existing profile setting. Binders participate in room persistence and validated backup restoration.

Already reconstructed card scans can be imported as embedded GLB files (5 MB, 50,000 triangles, 200 nodes, four textures, nine scans per binder). Required compressed extensions and external asset URLs are rejected. Models render only in the inspection viewer, with drag orbit and zoom, not as eighteen simultaneous 3D canvases. Imports do not prove the file came from a physical scan; `imported-scan` records the chosen import route.

Photograph a card invokes the device's image capture/file chooser. This is not photogrammetry. Phone-to-3D reconstruction is explicitly unavailable until a provider and storage pipeline are connected. Scans are saved locally and in backups, with no upload to a generation service.

## Verification

- `npm run build` and `npm run check:acceptance`.
- `node scripts/check-display-case-browser.mjs` tests both rooms, camera focus, lighting toggle and persistence; screenshots in ignored `art/demo-work/display-case/`.
- `node scripts/check-card-binders.mjs` covers embedded GLB validation and backup round-trip/rejection.
- `node scripts/check-card-binders-browser.mjs` covers real file import, pagination, front/back, customization, rearrangement, undo, backup and reload, using an isolated browser profile.
- `tests/card-binders.html` is a development-only component verification entry; it uses the normal room store and does not reset data.
