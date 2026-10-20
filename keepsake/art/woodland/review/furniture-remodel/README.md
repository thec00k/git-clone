# Woodland furniture remodel and the Snowy keepsakes

October 19, 2026. The owner asked for every furniture piece in the cabin to be redone, for the Snowy Mountain room to be retired, and for its deer and bear wall mounts and fur rug to be kept.

`before-*.jpg` and `after-*.jpg` use the same cameras and lights (Cycles, 48 samples, `art/woodland/review/cabin-shell/render-script/review-render.py` with these shots). `in-app-night.jpg` is the built app in a browser at night.

## How it is built

`art/woodland-study/build.py` now runs two more passes after `cabin-shell.py`:

- `keepsakes.py` appends the deer mount, bear mount and hide rug from `keepsakes.blend`. That file was extracted once from the Snowy branch by `extract-keepsakes.py`. The mounts hang where they hung in the Snowy cabin, either side of the window, with their plaques flat on the log crowns (found by casting rays at the logs). Their plaques now use the cabin's walnut. The rug is 85% of its Snowy size, centred at x 0.10, z 0.45, which keeps it clear of the chair, the hearth and the beanbag. Geometry, coats and the rug's fur image are the Snowy ones. The fur image is repacked as a 1024 px JPEG.
- `furniture-remodel.py` rebuilds each piece inside its old footprint in the approved CRT family. New parts carry `ks_family`, which `materials.py` uses to pick their material, and `ks_remodel`, which `quality-pass.py` uses to leave them alone.

| Piece | What changed |
| --- | --- |
| Desk | Thicker rounded top. Tapered legs with brass shoes. One centred drawer under the scrapbook with a raised panel, a D-pull on two roses and apron panels either side. The drawer box is 2 mm narrower than its front, which removes the flush-ends overlap. |
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
- Model: 84,570 triangles (was 64,210), 9.1 MB (was 7.8 MB). The keepsakes add about 1.3 MB, which is mostly the mounts' fur strands and the rug's fur image. The inherited beanbag's 9,400 faces are gone.
