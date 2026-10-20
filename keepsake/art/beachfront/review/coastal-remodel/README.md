# Beachfront furniture remodel

October 20, 2026. The owner asked for Beachfront to get Woodland's new furniture shapes in pale driftwood, whitewash and sea glass.

`before-*.jpg` and `after-*.jpg` use the same cameras and lights (Cycles, 48 samples). `in-app-night.jpg` is the app in a browser after switching a test room to Beachfront.

## How it is built

`art/beachfront/coastal-remodel.py` runs once against `beachfront.blend`, then `npm run assets:refresh -- --room beachfront` publishes it. It runs `art/woodland-study/furniture-remodel.py` with `KS_ROOM = 'beachfront'`, so the shapes are the cabin's, and then gives each new part a coastal material by its `ks_family`:

| Family | Beachfront material |
| --- | --- |
| Woodland oak and walnut veneer | Pale driftwood: the room's teak grain, bleached to a soft grey-beige (new material) |
| Woodland walnut joinery; shelf and cabinet carcasses | The room's whitewashed wood |
| Drawer fronts, door fields, guestbook cover | The room's sea-glass joinery paint |
| Cushions and throw | The window's soft sea-glass paint (the room is at its 80-material budget) |
| Beanbag, pages, pins, brass, iron | Sailcloth, warm white linen, coral pin, the room's brass and iron |

Remodelled: desk with the new drawer front, chair, archive cabinet, guestbook table and guestbook, bookshelf, map frame, door and beanbag. Kept as they were: the coastal lamp, clock, CRT, conch and fishbowl, the arched window and casements, and the room shell.

`furniture-remodel.py` now builds the chair relative to the chair's root, keeps the map frame's back where the old frame's back was, and sets the beanbag on the floor whatever height its root has. For the cabin these give the same numbers as before: a rebuild matched the published cabin in node, mesh, triangle and material counts. For Beachfront it skips the lamp, clock and window, and renames the chair parts to `Chair_*` and `Cozy_Chair_Cushion` (the names Beachfront's furniture swaps and hidden note use).

## Budgets

Beachfront's export allows 80 materials and 350 draws. The script merges small static parts that share a material (shelf back planks, beanbag seams, door hinges, cabinet feet, chair stretchers, guestbook-table legs and desk-leg shoes). The source also holds review copies of the display case and time capsule; the app loads those from `public/room/furniture/`, so they are marked `blender_preview_only` and stay out of the room export. Result: balanced 4.61 MiB, high 7.53 MiB, within budget. `check-woodland.mjs --beachfront` passes (anchors, contacts, window lights, budgets).

The guestbook table and book now have the cabin's heights (top 0.679), which the hidden notes were set for.
