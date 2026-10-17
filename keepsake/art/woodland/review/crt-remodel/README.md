# Desk CRT remodel: first single-object pass

October 17, 2026. One inherited Woodland object remodeled toward Illustrated Nostalgia, as a review sample before any further objects.

## Why the CRT

Of the 14 roots carried into the Woodland study (`Desk`, `ks_book`, `ks_crt`, `ks_archive`, `ks_guestbook`, `ks_map`, `ks_shelf`, `ks_chair`, `ks_lamp`, `ks_door`, `ks_clock`, `ks_ceiling_switch`, `ks_window`, `Beanbag`), the CRT is the most placeholder-looking object in the hero Desk view: eight sharp boxes, 128 triangles, beside the scrapbook. It is static, and its only runtime contracts are the root name/properties and the `CRT_Screen` surface.

## What changed

`art/woodland/remodel-crt.py` replaces the cabinet, hood, bezel, plinth, knobs and rocker, and adds `CRT_Antenna`:

- soft, chunky cream-enamel cabinet, slightly narrower at the crown;
- tapered tube hood for a classic silhouette;
- rounded warm-iron bezel whose inner corners round off the screen;
- brass knobs and rabbit-ear antenna; walnut plinth.

Materials follow the Woodland study families (cream enamel, warm iron, aged brass, walnut). The footprint, desk contact (Y = 0.75 m) and the `ks_crt` root are unchanged. `CRT_Screen` is untouched, so the runtime "Keepsake Radio / Now Playing" lettering still maps correctly. All parts keep `CRT_*` names, so furniture swaps still hide them.

## Evidence

- `before-closeup.png`, `before-desk.png`: inherited set, Cycles, committed source.
- `after-closeup.png`, `after-desk.png`: same cameras and light after the remodel.
- `after-in-app-night.jpg`: built app (Balanced model) on an isolated preview origin, showing the remodeled set with live screen lettering.

Clearance: a BVH test found no intersection with the window sill, paneling or other nearby meshes; the plinth rests flush on `Desk_Top`.

The Woodland study (`art/woodland-study/build.py`) reads `woodland.blend`. A rebuild of the study will pick up the new CRT, and its `materials.py` now maps the new antenna to brass and the plinth to walnut joinery. The rest of the set already matched these families. The study GLB was not regenerated in this pass.
