# Woodland quality pass

Direction: Illustrated Nostalgia, following the approved production PDF. Retain authored camera poses, furniture placement, window size, interaction pivots and the 20-degree chair heading.

`quality-pass.py` runs after `materials.py` in the full `build.py` pipeline. Run each pass once on an unpolished scene. It eases desk/leg edges, adds a rolled lamp rim and chair welt, softens texture normals, and batches static logs/chimney in half-metre height bands. The window wall is additionally split left/right to retain useful close-view culling.

For this incremental revision, `export-quality.py` was run in background Blender with the existing unpolished `woodland-study.blend` as input. It publishes the study GLB and saves `woodland-quality.blend`. The original study source and live `woodland-session.blend` were preserved. Do not rerun the incremental pass on the already polished quality file: reopen the unpolished source or use the full build from its original room source.

The live scrapbook remains a separate articulated asset. Its study-only cloth roughness and normal strength are set in WorkbenchBook. User-selected colors, lettering, photographs, pivots and page animation remain dynamic.

Runtime sharing is limited to materials on explicitly marked static batches. Animated and individually tinted objects keep separate materials. Tiny added trim receives shadows but does not cast separate shadows.
