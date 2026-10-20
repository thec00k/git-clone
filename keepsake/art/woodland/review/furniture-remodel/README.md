# Woodland furniture remodel

October 19, 2026. The owner asked for every furniture piece in the cabin to be redone, including the desk drawer front. The Snowy deer and bear mounts and hide rug are handled separately in PR #31.

`before-*.jpg` and `after-*.jpg` use the same cameras and lights (Cycles, 48 samples, `art/woodland/review/cabin-shell/render-script/review-render.py` with these shots).

## How it is built

`art/woodland-study/build.py` runs `furniture-remodel.py` after `cabin-shell.py`. It rebuilds each piece inside its old footprint in the approved CRT family. New parts carry `ks_family`, which `materials.py` uses to pick their material, and `ks_remodel`, which `quality-pass.py` uses to leave them alone.

| Piece | What changed |
| --- | --- |
| Desk | Thicker rounded top. Tapered legs with brass shoes. A new drawer front: one centred drawer under the scrapbook with a raised panel and a D-pull on two roses, between two apron panels. The drawer box is 2 mm narrower than its front, which removes the flush-ends overlap. |
| Chair | Upholstered side chair: turned walnut legs with an H-stretcher, back posts that lean back slightly, an arched crest rail, a piped moss seat cushion and a back cushion. The seat top stays at 0.52 m, where the hidden note rests. |
| Lamp | Walnut domed base on a brass ring, slim brass stem and socket, a larger cone shade (bible: oversized lamp shade), and a harp with a finial. |
| Clock | Rounded walnut case with half-round cheeks and four brass feet. The live digits are unchanged. |
| Archive cabinet | Rounded overhanging top, panelled sides, a walnut plinth on bracket feet, and on the drawer a raised panel, a brass label holder and a bow handle on roses. |
| Guestbook table | Oval top with a rounded edge, three splayed tapered legs and an oval lower shelf. The guestbook has cloth boards, a rounded spine and an inset page block. |
| Bookshelf | Overhanging top with a crown, rounded sides, a planked back and softened shelf and book edges. Shelf heights and the decorative books are unchanged. |
| Corkboard map | Deeper walnut frame standing proud of the cork, larger push pins, and a hanging cord over a nail in the log above. |
| Door | Rounded frame, raised fields on both faces, a larger brass knob on a rose, a keyhole plate, three brass hinges and a walnut sill. |
| Window | Rounded jambs, rails and transom frame, and a bullnose sill. The opening is unchanged. |
| Beanbag | An original slouchy bag (high back, seat hollow, soft front lip) with four piped panel seams and a piped base, and a folded moss throw on the seat. It replaces the inherited CC BY Sketchfab model in this room. |

Not changed: the CRT (the approved October 17 remodel), `ks_book` (a placeholder the live scrapbook always hides; its bounds place the scrapbook), `ks_ceiling_switch` (an invisible anchor) and the ceiling fan.

## Kept for the app

Every root keeps its name, origin and transform. The child names the code and checks look up are kept: `Desk_Top`, `Desk_Drawer` (with the front and pull as its children), `Archive_Top`, `ks_archive_drawer` (with its handle, label and tabs), `ks_shelf_board_*`, `ks_shelf_book_*`, `Cozy_Guest_Tabletop`, `Guestbook_Cover`, `Map_Sheet`, `Map_Pin_0`–`3`, `Study_ChairSeat`, `Lamp_Shade`, `ks_lamp_bulb` and `ks_clock_digits`. The heights things rest on are kept too: the desk at 0.75 (now 0.7495, so props rest on it without sharing a face), the cabinet at 0.84, the shelf boards, the guestbook table at 0.679 and the seat at 0.52.

## Checks

- `check-woodland-study-assets.mjs` passes. That covers prop clearance with both drawers shut and open, props resting on the floor, desk and wall, the map on the log crowns, the camera corridors, and the fan and hearth clearances.
- `check-discovery-geometry.mjs` and `npm run check:acceptance` pass, and the build succeeds.
- Overlap scan (`art/woodland/review/overlap-check/zf_spots.py`): no new spot where two surfaces lie exactly on each other and a visitor can see it. The desk-drawer spot is gone. The two known cabin-shell spots remain (the door casing corner, and the top window logs behind the ceiling).
- Model: 59,970 triangles (was 64,210), 7.5 MB (was 7.8 MB). Removing the inherited beanbag's 9,400 faces more than pays for the new parts.
