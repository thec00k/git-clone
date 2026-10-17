# Woodland quality pass

Direction: Illustrated Nostalgia, following the approved production PDF. Retain authored camera poses, furniture placement, window size, interaction pivots and the 20-degree chair heading.

`quality-pass.py` runs after `materials.py` in the full `build.py` pipeline. Run each pass once on an unpolished scene. It eases desk/leg edges, adds a rolled lamp rim and chair welt, softens texture normals, and batches static logs/chimney in half-metre height bands. The window wall is additionally split left/right to retain useful close-view culling.

For this incremental revision, `export-quality.py` was run in background Blender with the existing unpolished `woodland-study.blend` as input. It publishes the study GLB and saves `woodland-quality.blend`. The original study source and live `woodland-session.blend` were preserved. Do not rerun the incremental pass on the already polished quality file: reopen the unpolished source or use the full build from its original room source.

The live scrapbook remains a separate articulated asset. Its study-only cloth roughness and normal strength are set in WorkbenchBook. User-selected colors, lettering, photographs, pivots and page animation remain dynamic.

Runtime sharing is limited to materials on explicitly marked static batches. Animated and individually tinted objects keep separate materials. Tiny added trim receives shadows but does not cast separate shadows.

## October 17 rebuild with the CRT-style restyle

`woodland-study.glb` and `woodland-study.blend` were rebuilt with the full `build.py` pipeline from the restyled `art/woodland/woodland.blend` (see `art/woodland/remodel-crt.py`, `art/woodland/restyle-furniture.py`). Before rebuilding, the pipeline was checked to reproduce the previously shipped GLB exactly from the pre-restyle source (256 nodes, 229 meshes, 55,516 triangles, 17 materials).

- `materials.py` maps the restyled parts to the study families: brass ferrules and lamp foot; cream ceramic desk drawer front, archive drawer and clock case; walnut joinery lamp base, clock base, archive plinth, shelf kick/base, map frame, door sill and guestbook legs; terracotta map pins. The study chair and window are still rebuilt by `build.py`, so the furniture restyle of those two does not apply here.
- `build.py` now authors the `hearth` / `portraitHearth` shots, which had been added to `src/generated/woodlandStudy.json` by hand. The exported anchors match the manifest again, and `check-woodland-study-assets.mjs` passes, including camera alignment.
- Result: 267 nodes, 236 meshes, 69,288 triangles, 17 materials, 6.83 MB (was 6.46 MB). Before/after captures are in `art/woodland/review/study-rebuild/`.

## Wood finishes (October 17, owner feedback)

The owner preferred wood to cream for a "modern nostalgia" cabin: a hand-built place in the woods with a few modern pieces, such as the CRT. The CRT keeps its rounded shape, and three pieces now each get their own wood. All use the project's own procedural tiles from `generate-textures.py`; no third-party textures.

- **CRT cabinet and hood:** medium walnut veneer (`oak` tile tinted `#b08868`), with projected grain. The screen keeps its runtime UVs. The bezel stays warm iron, and the knobs and antenna stay brass.
- **Desk drawer front:** the desk's own oiled oak.
- **Archive drawer:** warm honey planks (`timber` tile tinted `#f2c99f`).
- The clock keeps its cream case as a small modern accent.

Regenerating the textures reproduced every existing map byte-for-byte; only `oak-b08868-color.png` and `timber-f2c99f-color.png` are new. The study GLB is now 7.47 MB with 19 materials and 22 images. Captures are in `art/woodland/review/study-wood/`.

## Solid log walls and a log-beam ceiling (October 17, owner references)

The owner asked for walls that read as stacked solid logs, with no gaps between the logs and the wall or beside the door frame, and for a log roof with support beams that stays clear of the ceiling fan and light. `cabin-shell.py` (run by `build.py` before `materials.py`) now builds the walls and ceiling; the old course loop, corner posts and baseboards were removed from `build.py`.

- **Walls:** 17 courses on the old pitch, with the logs' room-side crowns where they were, so furniture, the map, the shelf and every camera corridor are unchanged. The radius grows from 0.112 to 0.13 m (with ±4 mm variation), so neighbouring courses overlap by 35 mm and meet in a shaded crease. Each log is modelled only in front of its wall plane, with a flat back, sharp edges and grain UVs that wrap around the log.
- **The cause of the "glued on" look:** the flat shell walls stood 30–40 mm in front of the creases between courses and showed as pale strips. The shell now sits on the logs' back planes (side walls 60 mm out, window and door walls 65 mm out).
- **Openings:** each window and door course is one full log with the opening cut out exactly (EXACT boolean, 10 mm inside the jambs, rail, head and sloped transom frame). Logs end behind the frames, so there is no gap beside the door or under the transom.
- **Corners:** side logs run into the end walls' shells and end logs run into the side shells, so each inner corner closes on log.
- **Ceiling:** 135 mm tongue-and-groove boards in honey timber over a walnut backing that shows in the grooves; four round log joists (0.22 m) spanning side wall to side wall at z = ±0.85 and ±1.6; and two heavy support beams (0.30 m) at x = ±1.55 spanning the window wall to the door wall, with the joists notched 30 mm into them.
- **Ceiling fan:** the inherited fan from `woodland.blend` (`ks_ceiling_fan`) is kept. Its blades hang at 3.20 m, below the beams, and the drop rod reaches the boards. The runtime spins `ks_ceiling_fan_blades` and puts the ceiling light at `ks_ceiling_fan_light`, which is now above the centre of the room instead of the old fallback point.
- `check-woodland-study-assets.mjs` adds a fan clearance check: no point on any `Cabin_*` log or beam (sampled every 5 cm along each triangle edge) may enter the blade sweep (blade radius + 10 cm, from 5 cm under the blades up to the canopy), and the canopy must meet the boards.
- Result: 293 nodes, 259 meshes, 56,696 triangles (was 69,288), 18 materials, 22 images, 7.01 MB (was 7.47 MB). The removed bevel modifiers on the old logs account for the triangle drop. Before/after renders are in `art/woodland/review/cabin-shell/`.
- Built headless with Blender 5.1.2 (the `bpy` wheel), the same major version that saved the files.
