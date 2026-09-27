# Woodland focused quality and performance pass — 2026-09-26

All three requested bounded tasks completed locally on codex/woodland-composition-proof. Guided by Illustrated Nostalgia: restrained materials, softened edges, the scrapbook as focal point. No push or main merge. Broader PDF Phases 5–7 remain incomplete.

## 1. Three-view baseline

1280 x 720 desktop in-app browser, DPR 1.0, Autumn/Dusk. Warm rolling 1,200-frame samples using the visible performance overlay. This is a local comparison, not cold-load, memory, mobile GPU or low-tier acceptance. Other open browser tabs can affect timing.

| View | Draws before / after | Triangles before / after | FPS before / after | p95 ms before / after |
| --- | --- | --- | --- | --- |
| Room | 551 / 489 | 127236 / 142404 | 144 / 142 | 7.2 / 8.2 |
| Desk | 235 / 219 | 24328 / 31000 | 144 / 144 | 7.1 / 7.2 |
| Window | 117 / 85 | 16892 / 21804 | 144 / 144 | 7.1 / 7.1 |

## 2. Focused hero-object finish

Desk top and supports have small rounded edges; chair has a subtle stitched welt and eased legs; lamp has a rolled brass rim with quieter brass/enamel. Timber and textile normal strength reduced to avoid harsh surface detail. The separate articulated scrapbook has study-only matte cloth roughness and restrained normal strength, retaining dynamic colors, lettering and photos. Approved transforms and cameras retained.

## 3. Scoped optimization

Static logs and chimney grouped in half-metre height bands, with the window wall split left/right. First attempt grouped whole walls, which inflated Desk-view triangles to 56,192; the final spatial grouping lowers that to 31,000. Materials share only within explicitly marked static batches. New tiny trim does not cast separate shadows. No added postprocessing passes or lights.

Asset meshes: 311 -> 229. Asset triangles: 51,692 -> 55,516. GLB bytes: 6,232,844 -> 6,456,224 (+3.6%). Draw calls decrease 11% / 7% / 27% across Room / Desk / Window. Added bevels and coarser batch culling increase triangles. Room frame time is slightly worse in the captured run: no FPS improvement or universal performance guarantee is claimed.

## Verification

Production TypeScript/Vite build passed (large chunk advisory remains). All ten study geometry checks passed: semantic anchors, cameras, apertures, roof, camera corridors, desk/sill, hearth, chair heading, chimney clearance, logs. Workbench cancellation/repeat-click/page-coordinate/curl checks passed. Browser verified all three views and opening/closing the existing scrapbook with its photographs and captions present. No memory records or storage schemas edited.

Browser also reports a RoomLoading state update during ArtifactDisplayCase render, Three.Clock deprecation and multiple Three.js instances. Those components were not modified by this pass; they remain follow-up diagnostics and prevent calling the console clean.

Evidence: art/woodland-study/review/quality/*.png and woodland-quality-metrics.json. Editable result: art/woodland-study/woodland-quality.blend. Original source and live session preserved. See art/woodland-study/README.md for repeatable export instructions.

Next production work: reconcile outstanding preproduction/window illustration deliverables, then review the full hero-asset family and lighting states. Device profiling and asset loading/cache policy remain Phase 7 work; do not propagate to every room until Woodland receives visual and performance acceptance.
