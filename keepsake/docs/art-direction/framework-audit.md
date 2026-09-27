# Existing framework audit

Read-only source inspection, 24 September 2026. Baselines: root `codex/keepsake-rebuild` at `9bb1ce9`, Sky Castle `codex/sky-castle-room` at `847b754`, Snowy Mountain `codex/snowy-mountain-room` at `7037e85`. All three worktrees were clean before this documentation pass. These are separate histories; do not assume either experimental room is already integrated into the root application. No fresh remote-main comparison was performed.

Paths below are relative to each checkout's `keepsake/` unless marked otherwise.

## Reuse: preserve behavior, improve presentation

1. **Memory and editor foundation.** `src/store/appStore.tsx`, `src/store/workbench.tsx`, `src/components/BookView.tsx`, `src/components/room3d/WorkbenchBook.tsx`: keep book identity, page editing, physical page turns and the bridge between DOM editor and room. The room GLB's `ks_book` is a placeholder; the live book is a separate `/room/shared/scrapbook.glb`. Do not scale or move only the placeholder and assume the editor will follow.
2. **Theme selection.** `src/lib/roomThemes.ts`, `src/components/room3d/themes.ts`, `useActiveRoom.ts`, `src/generated/roomAssets.ts`: keep the selection/asset registry seam and the pure state transition. Root has Woodland, Beachfront and internal ID `cyberpunk` for Neon City; Sky and Snowy register independently in their worktrees. Preserve stable memory records while changing the selectable room lineup to four.
3. **Functional anchors.** `src/lib/roomHotspots.ts`, `RoomInteractions.tsx`, `RoomProps.tsx`: keep the map from physical object to action. Exact roots include `Desk`, `Desk_Drawer`, `ks_book`, `ks_crt`, `ks_archive`, `ks_archive_drawer`, `ks_shelf`, `ks_map`, `ks_window`, `ks_guestbook`, `ks_chair`, `ks_lamp`, `ks_lamp_bulb`, `ks_door`, `ks_ceiling_switch`. Preserve drawer/door pivots and local animation axes during authoring.
4. **Accessible alternatives.** `RoomControls.tsx`, `src/components/room/RoomListen.tsx`, `src/hooks/useReducedMotion.ts`: retain conventional controls and reduced-motion behavior. In-scene hotspot HTML is currently `aria-hidden` and removed from tab order; do not mistake it for an accessible navigation replacement. Named-view controls must be keyboard operable and preserve focus when opening/closing dialogs.
5. **Artifacts and time capsules.** `ArtifactDisplayCase.tsx`, `TimeCapsuleChest.tsx`, `src/lib/displayModelImport.ts`, `src/lib/roomBackup.ts`: reuse import/validation, shelf/slot records, open states, dates and content. Phone scanning remains a separate acquisition workflow; a model importer is not a complete phone scanning service. Room polish does not require expanding that product scope.
6. **Geographic memories.** `RoomWorldMap.tsx`, `public/maps/world-room.svg`: keep real-world geography, pins and links. Fantasy framing is appropriate to Sky Castle; fictional geography is not a replacement for the memory map.

## Re-author: high-value visual work

- **Static transforms belong in Blender.** `useRoomAsset.ts` moves `ks_shelf` by Z -0.22 m, moves `ks_clock` X -0.06 m, and repositions the beanbag from measured bounds. `furnitureLayout.ts` shares the shelf delta with related systems. Bake approved placements into the new room and remove corresponding runtime offsets together; otherwise placements shift twice.
- **Furniture replacement layer.** `FurnitureModels.tsx` hides original materials, fits replacements and reconnects screens/drawers. Retire major furniture swapping for redesigned rooms. Preserve useful adapters for personal content until new explicit anchors replace them. `PropRefinements.tsx` and `ChairFloorContact.tsx` require the same review before removing visual patches.
- **Camera architecture.** `themes.ts` shares front/left/right views across existing root themes. `RoomCamera.tsx` combines walking, wheel motion, seated/read/workbench/case poses and photo focus. Reuse smooth transition math and modal/input guards, but introduce named, per-room shots instead of inheriting room-face positions. The loop currently forces ordinary unseated poses to eye Y=1.32 and walk bounds; authored camera anchors need an explicit mode that does not apply those clamps.
- **Exterior scenery.** `WoodlandScenery.tsx`, `BeachfrontScenery.tsx`, Sky Castle's `SkyCastleScenery.tsx`, Snowy's `SnowyMountainScenery.tsx`: replace distant worlds with layered artwork. Retain purposeful window-relative weather separately. Preserve Neon identity through selective use of `NeonAtmosphere.tsx` / `NeonExtras.tsx`; reduce simultaneous emissive animation.
- **Materials and lights.** `RoomLighting.tsx`, `useRoomAsset.ts` and authored assets: replace ad-hoc recoloring with a small authored material family and named lighting anchors. Keep emissive switches and time/season state. Avoid treating all room meshes as shadow casters by default.

## Selective Snowy Mountain sources

Source prefix: `.worktrees/snowy-mountain-room/keepsake/` in the repository root.

- `art/snowy-mountain/build.py`, `geometry.py`, `snowy-mountain.blend`: source for hearth stone, lantern proportions, timber detailing and winter upholstery. Re-author to match the new shared shape/material language rather than importing the whole cabin unchanged.
- `src/components/room3d/SnowyMountainEffects.tsx`: reusable flame and lantern flicker logic with reduced-motion handling. Split into seasonal warmth effects; remove the Snowy-only furniture-selection condition and move emitters to authored anchors.
- `src/lib/fireplaceAudio.ts` with `RoomListen.tsx` integration: reusable synthesized crackle, HRTF positioning and lifecycle cleanup. Current emitter (-0.91, 0.53, 1.68) is hardcoded; bind it to the proposed hearth anchor. Keep gesture-unlock, volume, hidden-tab suspension and disposal.
- `SnowyMountainScenery.tsx`: aurora concept and phase gating are worth preserving. Procedural mountain/river geometry is reference material, not required in the new room.
- `ArtifactDisplayCase.tsx`: inspect the effect-based hinge setup/cleanup fix and wood material treatment before adapting the shared case. This branch's strict-mode duplicate-hinge fix is independent of the new art style.
- `scripts/check-snowy-room-browser.mjs` and `art/snowy-mountain/validate.py`: reuse test cases for day/dusk/night, reduced motion, audio cleanup, switching and object clearance; adapt room IDs and new anchors.

## Runtime risks and practical response

**Asset lifetime:** `roomAssetCache.ts` stores a Promise per URL for the session and deletes only failed loads. `useRoomAsset.ts` disposes cloned materials, not shared source textures/geometry. Measure repeated room/season switching before choosing eviction. Any later eviction needs ownership/reference tracking so mounted clones never lose their shared resources.

**Rendering:** `RoomScene3D.tsx` uses continuous frames while the tab is visible and selected overlays are closed; otherwise demand mode. Add semantic zones with separate render, animation, audio and load decisions. Merely setting `visible=false` neither stops every `useFrame` callback nor unloads assets. Keep outgoing/incoming geometry available during transitions; prefetch target zones to avoid pop-in.

**Quality tiers:** `themes.ts` already changes DPR, shadow flags and particle counts; phone/tablet are inferred by viewport width. Extend measured tiers with texture derivatives and effect/shadow decisions rather than claiming tiers do not exist. Viewport size alone does not measure GPU capability.

**Persistence:** `Environment` already has four seasons, weather and time modes. Reuse this state. Consolidating the room should not reset books, archive, artifact slots, pins, capsules or currency. No Classic mode, compensation scheme or legacy furniture compatibility project is required for these unfinished prototypes.

**Privacy:** the app type header explicitly describes local simulation of server concerns. Preserve existing visibility filtering; do not claim this room work provides production authorization or asset security.

## Measured evidence and limits

Current Woodland balanced GLB inspected directly: 4,852,228 bytes, 266 meshes, 73 materials. Its `Desk_Top` reaches Y=0.750 m. `ks_window` pivot is (-0.150, 1.875, -2.113). `Win_Sill` top is approximately Y=1.137 m. Transforms and bounds were derived from GLB node TRS and accessor bounds, before runtime replacements; bounds are conservative transformed accessor boxes, not triangle collision tests.

Snowy's saved validation reports 6,347,832 bytes, 166,785 triangles, 315 meshes, 324 primitives. This pass checks that source report and exported file exist; it does not rerun Blender validation.

`docs/room-performance-pass.md` records September 12 warm-local-cache observations: Woodland 485 draws / 14.3 ms p95; Beachfront 552 / 16.7 ms; Neon 487 / 12.5 ms. These are historical samples, not fresh measurements or mobile guarantees.

## Execution order and checks

1. Approve the Woodland composition study; keep other room sheets as direction targets.
2. Graybox the window, desk, chair, storage and fixed hearth with explicit camera/interaction anchors.
3. Wire named views and reuse the live book/door/archive behavior. Check interruption, Escape, focus, touch and reduced motion.
4. Prove one layered autumn exterior plus a winter treatment with shared geography. Profile the same cameras/device settings, cold load and repeated switching.
5. Finish hero furniture/materials and selectively import hearth/lantern systems. Recheck day/dusk/night, empty/populated surfaces and reflection/transparent overlap.
6. Run the build and adapted checks: `check-room-themes.mjs`, `check-room-layout.mjs`, `check-room-assets.mjs`, `check-time-capsules.mjs`, `check-room-performance-browser.mjs` and targeted editor/backup cases. The old full workbench script has a documented stale shelf assertion; update that expectation rather than citing it as passing.

No app build or browser performance test was run for this documentation/design-only pass. No claim of a working Woodland 2.0 implementation is made.
