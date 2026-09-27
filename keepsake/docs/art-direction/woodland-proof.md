# Woodland composition proof

Review locally at http://127.0.0.1:5184/?study=woodland with the preview server running. Branch: `codex/woodland-composition-proof`. Saved locally; no push or merge.

## What this proves

A Blender-authored rounded-log cabin with square window and triangular transom, an upholstered chair facing 20 degrees to the right of the window, existing desk and functional memory props, and a compact hearth with a stone chimney meeting the ceiling near the rear-left seat. Three authored views (Room, Desk, Window) have separate portrait framing. The live scrapbook still opens, edits and returns to the room.

The six rough exterior layers establish sky, ridge, distant forest, stream/clearing, near trees and foreground. Autumn and winter share their registration. Day, dusk and night are local review controls. These settings do not overwrite saved room preferences. The study appears only for Woodland with `study=woodland`; this development route is not a proposed permanent migration or Classic-room policy.

## Review sequence

1. Start in Room view: assess window, desk and room proportions.
2. Choose Desk view, then Take a seat and Open scrapbook. Check the book's prominence and comfortable reading space.
3. Choose Window view and compare autumn/winter and day/night. Assess the clearing and depth between tree layers.
4. Repeat at portrait width. Judge the composition rather than final surface detail.

## Authored source

- `art/woodland-study/woodland-study.blend`: compact saved Blender source, approximately 4.2 MB.
- `art/woodland-study/build.py`: background build script using the existing Woodland source; writes only the new study outputs.
- `public/room/woodland-study/woodland-study.glb`: 6,232,844 bytes, 311 meshes, 51,692 source triangles.
- `src/generated/woodlandStudy.json`: camera positions, targets and fields of view exported alongside Blender anchors.
- `art/woodland-study/review/`: desktop and portrait captures, geometry results and browser results.

Blender owns the static layout, camera and hearth-light anchors. Three.js owns interaction, camera transitions, light response and the temporary exterior layers. The live Blender session contains an appended `Keepsake Woodland Material Finish` scene; the original unsaved scene was preserved.

The establishing view was raised and widened after reviewing the first captures so the triangular transom is visible. The window camera was moved back to include the opening and sill. Final values live in the generated camera manifest, superseding the preliminary camera book.

## Validation

- Production build passed; the existing large-chunk warning remains.
- All 20 existing acceptance checks passed.
- Study GLB checks passed: functional anchors, camera/manifest alignment, clear square and triangular apertures, closed roof corners, sampled camera corridors, desk/sill and hearth clearances.
- Isolated Edge browser checks passed: all six camera poses, rapid view changes, keyboard view selection, live book title editing, page turns, photo dragging and undo.
- Populated books, archive photos, pins, capsules, card binders and artifact records remained equal through actual drawer-shop room switches and reload. These were test records in an isolated browser, not changes to personal memories.
- Repeated season/light changes held the texture count at 39 across six samples in the latest material pass; no browser runtime errors were observed.
- Portrait at 390 x 844 had no horizontal page overflow. Both scrapbook pages fit within the viewport after settling.
- Reduced-motion camera switching was exercised. The rough exterior has no automatic drift.

Run geometry validation with `node scripts/check-woodland-study-assets.mjs` from `keepsake`. Browser validation uses `node scripts/check-woodland-study-browser.mjs` with Playwright available (or `PLAYWRIGHT_MODULE` pointing to it), Edge installed, and the preview server running on 5184. `TEST_BASE_URL` and `TEST_CHANNEL` can override those defaults.

## Limits and next production step

The layout, window size and camera views are approved. The interior now has a first material finish: original seamless oak grain, floorboard seams, woven moss and oat upholstery, paper, limestone, aged brass and cream/olive enamel. The exterior remains a registration and depth sketch; final prop silhouette refinement and illustrated exterior painting remain future work. Winter currently adds the exterior palette and hearth illumination; finished textiles, flame effects and audio are later production work. No physical mobile-device frame-rate claim is made: browser checks used headless Edge, and renderer diagnostic samples are not a whole-frame performance benchmark.

The next art step is to paint the registered Woodland exterior and refine hero prop silhouettes using the approved composition and new material family. Use that completed small area as the quality reference before extending the treatment to the rest of the room and the other three themes.

## Material and cabin update — 25 September 2026

Owner approved the three views, window size and furniture arrangement. The chair alone turns clockwise 20 degrees; camera/target coordinates are unchanged. Rounded log courses are real geometry fitted around the existing apertures, backed by the sealed shell. Staggered limestone chimney blocks meet the ceiling and remain clear of the door.

`generate-textures.py` creates original repeatable material maps (no downloaded artwork). `materials.py` projects physical-scale UVs and assigns the finished material families before GLB export. Base color, normal and roughness maps are packed into the Blender source and embedded in the GLB. Color variants are baked for matching Blender/browser appearance. The original published room assets are unchanged.

The latest geometry report also verifies the chair heading and chimney/door/ceiling clearances. Browser captures in `art/woodland-study/review/` show the new surfaces. The earlier all-20 acceptance result is from the composition implementation; this asset-only follow-up reruns the dedicated geometry and browser checks.
