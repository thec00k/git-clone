# Neon City furniture remodel

October 25, 2026. The owner asked for Neon City's furniture to be remodelled to match the other rooms, and for the room to have a cyberpunk, Blade Runner kind of vibe.

`before-*.jpg` and `after-*.jpg` use the same cameras and lights (Cycles, 48 samples, an amber window light with teal and amber fills). Cycles shows the room brighter than the app does; `in-app-night.jpg` is the app in a browser.

## How it is built

`art/cyberpunk/build.py` starts from the retired `public/room/woodland/woodland.glb`, so it can no longer run. `art/cyberpunk/blade-remodel.py` ran once on `cyberpunk.blend` instead. It exports `public/room/cyberpunk/cyberpunk.glb`, and `node scripts/publish-cyberpunk.mjs` records it. The script:

- runs `art/woodland-study/furniture-remodel.py` with `KS_ROOM = 'cyberpunk'`, so the desk with its drawer front, the chair, archive cabinet, guestbook table and guestbook, bookshelf, door and beanbag take the cabin's shapes and footprints. Neon City keeps its own lava lamp, clock, CRT, rounded window, holograms, jellyfish, honeycomb panels, door channels and skyline. At the owner's request the ceiling and the map keep their style: the script swaps the shared remodel's map frame, pins, cord and nail back for the original satin metal frame and pins (the holographic map is untouched), and it does not touch the ceiling or its infinity mirror;
- gives the furniture original procedural materials:
  - satin gunmetal on what was oak (with faint brushing, scuffs and grime);
  - black enamel on legs, plinths and crowns;
  - worn black leather on the chair cushions and beanbag;
  - oxblood leather on the guestbook cover, a rust-amber wool throw, and amber brass handles and hinges;
- turns the walls into cast textile blocks: an original stepped geometric relief, 40 cm blocks lined up across the wall pieces. This is a nod to the Blade Runner apartment, not a copy of any real block design;
- gives the floor dark, satin-wet deck boards, so neon and the window streak across them. The wainscot becomes black enamel boards with steel rails;
- adds two thin light strips: cyan under the desk top's front lip, and amber under the shelf crown;
- merges small static parts, as in the other rooms. Textures are saved as JPEG, so the room is 3.97 MiB (budget 8).

## In the app (runtime)

- `NeonAtmosphere.tsx`: the two broad fills are now teal (desk side) and sodium amber (shelf side), instead of cyan and magenta. Every 28 seconds a spinner (a dark wedge car with a lit canopy and a blinking red tail light) drifts past outside the window. Its searchlight sweeps the floor, desk and walls, with a faint beam through the smog. There is no shadow map, and the sweep is off with reduced motion.
- `RoomLighting.tsx`: the window light is sodium amber (was lavender). The ceiling light keeps its colour.
- `useRoomAsset.ts`: the rug tint is dark teal-charcoal (was plum).

## Checks

- `art/cyberpunk/validate.py` passes: anchors, finite transforms, the lava lamp resting fully on the new desk top, fan and window clearances, 165,172 triangles in the source.
- `scripts/check-neon-assets.mjs` passes: 3.97 MiB, 174,020 triangles, 317 primitives (limits 8 MiB, 180,000 and 350), anchors, Draco compression and the content revision.
- `npm run check:acceptance`, lint and the production build pass. In the app, the room loads the new model, and the spinner and its sweep show at the window.
