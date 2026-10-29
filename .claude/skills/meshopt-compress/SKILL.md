---
name: meshopt-compress
description: Shrink Keepsake room and furniture GLB files with meshoptimizer's gltfpack (meshopt geometry compression, optional WebP/KTX2 textures) and wire up the three.js decoder. Use when a task asks to compress, optimise or speed up loading of a .glb model.
license: MIT
metadata:
  author: Keepsake (written 2026-10-29; tool is zeux/meshoptimizer, MIT)
---

# Compress GLB models with meshoptimizer

gltfpack (from https://github.com/zeux/meshoptimizer, MIT, checked at commit `f0a684f`, 2026-10-14)
rewrites a GLB so it downloads smaller. three.js reads the result with its bundled meshopt decoder,
so no new runtime dependency is needed.

## Before you start

- Work on a copy. Never overwrite a GLB in `keepsake/public/room/` until the before/after review is done.
- Know which models the app loads: the default room is `public/room/woodland-study/woodland-study.glb`
  (not the older `woodland/woodland.glb`). Furniture is `public/room/furniture/*.glb`.
- Beachfront already ships Draco and `scripts/check-room-assets.mjs` asserts Draco for it. Leave Draco
  rooms alone unless the task is to switch them, and then update that check in the same PR.
- The art direction and `keepsake/docs/v4-decisions.md` win: compression must not visibly change the room.

## Command

```bash
npx gltfpack@0.25.0 -i in.glb -o out.glb -cc -kn -km -ke
```

- `-cc` meshopt compression (adds `EXT_meshopt_compression`, required by the file).
- `-kn` keep named nodes. Required: the app finds parts by name (`Desk`, `ks_book`, `ks_window`,
  `ks_shelf`, `ks_door` in `roomAssetCache.ts`, plus hotspots and furniture parts).
- `-km` keep named materials (seasonal and finish code looks materials up by name).
- `-ke` keep extras (the app reads `userData`, for example `quality_static_batch`, `hotspot`).
- gltfpack quantizes positions by default, which can insert extra dequantization nodes. If a check
  that measures geometry (prop clearance, camera bounds) fails, retry with `-vpf`.
- Do not use `-si` (simplify) on rooms: it changes shapes. Only consider it for 3D scans, with review.

**Textures** are usually most of the size (Woodland: 5.2 of 8.9 MB are PNG images). The npm build of
gltfpack cannot convert textures (`-tw` fails with "built without WebP support"). For WebP (`-tw`) or
KTX2 (`-tc`) use the native release build from the meshoptimizer GitHub releases, or glTF-Transform.
KTX2 also needs `KTX2Loader` and its transcoder in the app; WebP needs nothing extra.

## Wire up the decoder (once)

In `keepsake/src/components/room3d/roomAssetCache.ts`, next to the existing `setDRACOLoader(draco)`:

```ts
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// ...
new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder)
```

Check every other `GLTFLoader` / `useGLTF` call in `src/` that loads a file you compressed; each needs
the decoder too.

## After compressing

1. Record the new file: `npm run assets:woodland` for the Woodland room (`assets:refresh` for
   Beachfront), and commit `asset-manifest.json` and `src/generated/roomAssets.ts`.
2. Run `npm run build`, `npm run lint`, `npm run check:room` and `npm run check:assets:browser`.
3. Before/after screenshots of the same camera views (CI `browser-checks` workflow; the cloud renders
   about 5 s a frame, so never claim frame rates from it).
4. Report sizes in plain words: file size and gzipped size, before and after.

Reference result (2026-10-29, geometry only, `-cc -kn -km`): woodland-study.glb 8.9 MB to 6.1 MB;
gzipped download 6.3 MB to 5.6 MB.
