# Room load and settings freezes: findings and fixes

October 17, 2026, on branch `claude/woodland-remodel-one-object`. The owner reported that the site was very laggy on open, stopped responding when clicking through settings, and started with the camera "staring at the ground".

## How it was measured

The production build was served with `vite preview` on the isolated `127.0.0.1:5178` origin and tested in a fresh, muted headless Edge on the owner's PC (RTX 3070, ANGLE/D3D11). Personal room data on 5176 was never touched. Tools used: long-task observer, frame timing, Chrome CPU profiles, a WebGL `linkProgram` counter, and three.js's devtools hook to watch lights and programs over time.

## Root causes

All of the freezes were shader compilation on the main thread.

1. **First load.** About 80 large shader programs compiled synchronously on first draw. One long task lasted 24.5 s, plus another 4.6 s. The profile showed 24.4 s inside three.js `WebGLProgram.getUniforms`, which waits for the GPU compiler. During the freeze the screen showed a half-built first frame, which is what read as "staring at the ground". The camera code itself starts on the desk/window view.
2. **Settings toggles.** "Bookshelf lights" mounted 12 point lights and "Display case" mounted 4 rect-area lights. Any change in a scene's light count makes three.js rebuild every material's program. These froze the page for 15.7 s and 11.7 s. The map picture light was also mounted only at night, so dusk-to-night would freeze too.
3. **Late arrivals.** The display case, chest, live scrapbook and map print load a few seconds after the room. Their materials compiled on first draw, and the case's rect-area lights changed the light count, causing a further 8 s freeze.
4. **Heavy shaders.** Four rect-area lights and 12 extra point lights made every standard-material shader very large (up to 88k characters), which is slow to compile on D3D11.
5. **Transmission pass.** The lamp bulb, ceiling-fan bowl and clock glass used `KHR_materials_transmission`. One transmissive material makes three.js render the entire room a second time each frame into a separate target, with its own shader variants (another 3 s compile, and double the draw cost).

## Fixes

- `ShaderWarmup` / `RoomRenderGate` (`src/components/room3d/ShaderWarmup.tsx`) compile every shader with `renderer.compileAsync` (`KHR_parallel_shader_compile`) before the first frame. The loading screen stays up and responsive, and the first frame shown is the finished desk/window view. The warm-up re-runs per room and graphics quality.
- `LateShaderGuard` hides any mesh whose program is missing or still compiling (layer mask 0, so components that toggle `visible` are unaffected), compiles it in parallel, then shows it. Late pieces appear a moment later instead of freezing the page. It does nothing on browsers without the parallel-compile extension.
- Lights are always mounted and dimmed to intensity 0 when off: shelf, display case, map picture light and study hearth.
- The display-case lights moved out of the lazily loaded case into `DisplayCaseLights`, mounted with the room. Four rect-area lights became emissive strips plus one tinted point light.
- The bookshelf went from 12 point lights to 2 shared washes plus glowing strips. The scene now has 9 lights instead of 14–26.
- Transmissive GLB glass is converted to alpha glass at load (`useRoomAsset.ts`). The display case already did this.
- The old CRT/clock prop-refinement overlays are skipped in Woodland, where those props are now authored with rounded edges. They had been failing a bounds check on every load.

## Results (same machine and method)

| | Before | After |
| --- | --- | --- |
| Longest main-thread block on load | 24,524 ms | about 270–520 ms |
| Room visible | after about 26 s | after about 2 s, on the desk/window view |
| Toggle bookshelf lights | 15,733 ms freeze | under 60 ms |
| Toggle display-case lights | 11,673 ms freeze | none |
| Open Bookshelf view | 3,121 ms | under 80 ms |
| Steady frame time (p50 / p95) | 14 / 14 ms | 7 / 7 ms |
| Switch graphics to High | not measured | one pause of about 2.9 s (larger textures and shadows) |

## Keeping it fixed

- `scripts/check-render-stability.mjs` is part of `check:acceptance`. It fails on conditionally mounted lights, `rectAreaLight`, or enabling `transmission` in room components, and it checks that the warm-up gate and glass conversion are present. A light that depends only on the room can be marked `render-stability: per-room`.
- `npm run check:responsiveness:browser` (with `PLAYWRIGHT_MODULE` / `TEST_BROWSER`, against `vite preview` on 5178) fails if loading blocks the page for more than 3 s, if any light toggle blocks for more than 1 s, or if the first view doesn't face the desk.
- Rules of thumb for new room work:
  - Never add or remove lights at runtime; dim them.
  - Prefer emissive surfaces to extra lights.
  - Avoid transmission and rect-area lights.
  - New GLBs and lazily loaded pieces are covered by the guard, but new materials still cost compile time, so share materials where possible.

## Still open

- Switching to High graphics still pauses for about 3 s once (texture uploads and shadow programs).
- In Neon City, each map pin adds its own point light (`MemoryObjects.tsx`), so adding a pin there can still trigger a recompile.
- Measurements are from one desktop GPU. Phones and integrated GPUs haven't been profiled.
- The THREE.Clock deprecation warning and the SoundCloud embed's encrypted-media warning remain in the console.
