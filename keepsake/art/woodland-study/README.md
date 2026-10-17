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
