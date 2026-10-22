# Overlap check of the Woodland cabin

October 19, 2026. This check looks for places where two surfaces lie on top of each other in `public/room/woodland-study/woodland-study.glb`, the cabin the app loads. Surfaces that close together can flicker (z-fighting). The owner asked for the spots to be checked before anything is fixed, so nothing in the model was changed.

## How it was checked

- `zf_spots.py` uses the same test as the `blender-asset-qa` model checker: faces that face the same way and lie within 1 mm of each other. It keeps every pair of objects, where the checker stops listing after 20. For each spot it records the gap between the two surfaces. It also records whether the spot can be seen by a person standing anywhere in the room, by casting rays from 240 eye points (heights 0.9, 1.3 and 1.7 m).
- `render_spots.py` renders each visible spot close up, with the overlapping faces painted magenta.
- Run with Blender 5.1: `blender -b --factory-startup -P zf_spots.py -- <glb> spots.json`, then `blender -b --factory-startup -P render_spots.py -- <glb> spots.json <output folder>`.

## What decides whether a visitor sees flicker

The room camera uses near 0.08 m and far 40 m. With the browser's 24-bit depth buffer, two surfaces separate cleanly once they are more than about 0.001 mm apart at 1 m and 0.012 mm apart at 4 m. Surfaces that are 0.2 to 1 mm apart therefore never flicker in Keepsake. Only surfaces that lie exactly on top of each other (a gap of 0) can flicker, and only where a person can see them.

## Result

197 overlapping spots. The model checker's "20 errors" was the first page of this list.

- **157 are hidden.** They are inside the log walls: logs that overlap their neighbours (the 35 mm crease), log ends inside the corners, the ceiling joist and beam ends inside the top logs, and the chimney core inside its stones. No eye point in the room can see them.
- **Spots a person can see, but too far apart to flicker** (gap 0.2 to 1 mm): the lamp shade and its rolled rim (0.44 mm, `lamp-rim.png`), the beanbag and its stitched seams (0.21 mm, mostly underneath, `beanbag-seams.png`), the brass desk-leg ferrules (0.8 mm), the archive's brass inlay and handle posts (0.5 and 1 mm), the clock's brass inlay (0.4 mm), the shelf bottom against its sides (0.5 mm, at floor level) and the archive photo frame (0.07 mm, seen from 17 cm or more).
- **Exact overlaps a person can see** (gap 0). These are the only spots that could flicker:
  1. **Door casing corner** (`Cabin_Trim_Door` against `Cabin_Trim_Door.002`, `door-casing-corner.png`). The casing pieces share their rounded edge along the narrow left board next to the hearth, about 1.5 m tall and 3 mm wide. Both pieces are the same walnut, so at most the grain would shimmer on a thin line. Least likely to be noticed.
  2. **Desk drawer ends** (`Desk_Drawer` against `Desk_DrawerFront`). The 4 mm ends of the cream drawer front are flush with the oak drawer sides. With the drawer shut they are inside the desk. With the drawer open, a thin strip at each end could flicker between cream and oak when seen from close by.
  3. **Top window-wall logs at the ceiling** (`Cabin_Window_Log.013` against `.016`). Almost entirely hidden behind the ceiling boards and beams; one of ten sample points can be seen, from 2.5 m.
  4. **Chair legs** (`Study_ChairLeg`, all four). Tiny faces inside each leg (0.08 cm² in total), same material. Not noticeable.
  5. `Archive_Plinth` against the floor and the clock's base against the desk top are faces under the furniture; they register as visible only because the ray reaches the floor beside them.

## Suggested fixes, if wanted

- Door casing: in `cabin-shell.py`, stop the side board 1 mm short of the head board, or move one board 1 mm forward.
- Desk drawer: in `restyle-furniture.py`, make the drawer front 1 mm narrower than the drawer box.
- The rest need nothing.

## Since then (October 20)

Both visible exact overlaps are fixed: the door casing in `cabin-shell.py` (PR #31) and the desk drawer front in `furniture-remodel.py`, whose drawer box is now 2 mm narrower than its front.
