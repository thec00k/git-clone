# Sky Castle furniture remodel

October 22, 2026. The owner asked for Sky Castle to be remodelled like Woodland and Beachfront, keeping its glass, crystal-like furniture with jagged shapes and small speckles for texture, and a marble and gold finish for the other pieces.

`before-*.jpg` and `after-*.jpg` use the same cameras and lights (Cycles, 48 samples); the glass reads milkier in Cycles than in the app. `in-app-night.jpg` is the app in a browser.

## How it is built

`art/sky-castle/build.py` starts from the retired `public/room/woodland/woodland.glb`, so it can no longer run. `art/sky-castle/crystal-remodel.py` runs once on the published `sky-castle.blend` instead, exports `public/room/sky-castle/sky-castle.glb`, and `node scripts/publish-sky-castle.mjs` records it. The script:

- removes the old glass desk's extra parts, then runs `art/woodland-study/furniture-remodel.py` with `KS_ROOM = 'sky-castle'`, so the shapes are the cabin's. Sky Castle keeps its own lamp, clock, CRT, round window, sill shelves, map and pearl time capsule;
- gives the desk (with its drawer front), chair frame and guestbook table a crystal material. It is the room's clear quartz plus a texture of tiny white sparkle specks and a few lilac flecks. The name still contains "clear quartz", so `SkyCastleFinish.tsx` draws it as before;
- chips the edges of the crystal desk top, its front apron panels and the guestbook table top into small flat-shaded facets (inward only, so tops keep their height and props their clearance);
- makes the cabinet, shelf and door polished white marble with soft grey veins and the odd thread of gold (an original procedural texture), with gold trims: plinths, crown, kick, sill, handles, hinges and leg shoes;
- uses mist-blue cushions on the chair, a lilac beanbag, a rose throw and a lagoon-teal guestbook cover;
- merges small static parts (shelf back planks, beanbag seams, door hinges, cabinet feet, chair stretchers, guestbook-table legs, desk-leg shoes) to stay within the draw budget.

## Checks

- `art/sky-castle/validate.py` passes on the exported GLB: anchor positions and parents (the desk drawer keeps its pivot), desk top 0.75, sill shelves, castle distance, cloud floor, 155,016 triangles and 249 meshes (limits 180,000 and 350). Two of its rules were written for the old look and now check the new one: the shelf back is the white marble, and the "substantial chair back" is measured over the back cushion, posts and crest together.
- `npm run check:acceptance` and the build pass. In the app, the room loads the new model and the glass reads as clear crystal.
- `publish-sky-castle.mjs` now writes the room index with the shared writer (`room-asset-index.mjs`); its old in-place edit had stopped matching, so the app was still requesting the previous model's version stamp.
- `furniture-remodel.py` now keeps the drawer's pivot where the old drawer's was and places the shelf from its own root, so Sky Castle's shelf (z -0.12) is right. The cabin and Beachfront get the drawer pivot on their next rebuild; nothing else changes for them.
