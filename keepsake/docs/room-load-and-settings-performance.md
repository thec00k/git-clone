# Room load and settings freezes: findings and fixes

October 17, 2026. The owner reported that the site was very laggy on open, stopped responding when clicking through settings, and started with the camera "staring at the ground". All of it was three.js compiling shader programs on the main thread.

This branch combines two fixes:

- **PR #26** (merged into `codex/foundations-and-seasons`) keeps every light mounted and only changes brightness. It keeps renderer shadows on at every quality (`RoomShadowQuality`) and guards this with `scripts/check-constant-lights.mjs`. That removed the settings freezes.
- **This PR's extras** on top: fewer and cheaper lights, simple glass, and compiling every shader behind the loading screen before the first frame. These remove the load freeze and halve the per-frame cost.

## Root causes

1. **First load.** Every material's shader compiled synchronously on its first draw, freezing the page for 10–25 s. The half-built first frame shown during that freeze was the "ground" view.
2. **Settings toggles.** Adding or removing lights, or switching shadows, rebuilt every shader. Fixed by PR #26.
3. **Late arrivals.** The display case, chest, live scrapbook and map print load seconds after the room. They compiled on first draw, and the case's lights arrived late, which changed the light count.
4. **Heavy shaders.** Four rect-area lights and 12 shelf point lights are part of every standard material's shader, even at intensity 0. That made shaders large, slow to compile and slower to draw.
5. **Transmission pass.** The lamp bulb, ceiling-fan bowl and clock glass used `KHR_materials_transmission`, which renders the whole room a second time each frame with its own shader variants.

## Extras in this PR (on top of PR #26)

- `ShaderWarmup` / `RoomRenderGate` (`src/components/room3d/ShaderWarmup.tsx`) replace PR #26's ungated `RoomShaderWarmup`. They make the same `compileAsync` call (parallel compile), but hold the first frame and keep the loading screen up until it finishes, per room/quality asset. The first frame shown is the finished desk/window view.
- `LateShaderGuard` hides any mesh whose program is missing or still compiling (layer mask 0), compiles it in parallel, then shows it.
- `DisplayCaseLights` mounts the case lighting with the room instead of with the lazily loaded case. Four rect-area lights became emissive strips plus one small tinted point light.
- The bookshelf has glowing strips plus 2 shared washes instead of 12 point lights. Lights stay always mounted, per PR #26.
- Transmissive GLB glass is converted to alpha glass at load (`useRoomAsset.ts`).
- The CRT/clock prop-refinement overlays are skipped in Woodland, where those props are now authored with rounded edges.
- `scripts/check-render-stability.mjs` (in `check:acceptance`) fails on `rectAreaLight` or enabled `transmission`, and requires the warm-up gate and room-mounted case lights. Light-count rules stay with PR #26's `check-constant-lights.mjs`.

## Measurements

Owner's PC (RTX 3070, ANGLE/D3D11), muted headless Edge, fresh profile, 1280 x 800, production builds served with `vite preview` on isolated ports.

| | `foundations-and-seasons` (`e8a9cfa`, with PR #26) | This branch |
| --- | --- | --- |
| Longest main-thread block on load | 10.2–15.9 s | 1.8–2.2 s |
| Total blocked time while loading | 16.9–21.2 s | 2.1–2.4 s |
| Steady frame time p50 / p95 | 7 / 14 ms | 7 / 7 ms |
| Lights in the Woodland scene | 23 | 10 |
| Settings toggles (lamp, ceiling, shelf, case) | no freezes (PR #26) | no freezes; responses 65–95 ms instead of 170–270 ms |
| Switching graphics quality | no freeze | no freeze |

Before PR #26 (on `codex/woodland-composition-proof`), shelf and case toggles froze the page for 15.7 s and 11.7 s.

## Still open

- One block of about 2 s remains during loading, behind the loading screen.
- In Neon City, each map pin has its own light, so adding a pin there can still rebuild.
- Measured on one desktop GPU only. Phones and integrated GPUs are not profiled.
- `npm run check:responsiveness:browser` (muted browser check: load block, toggles, first view) needs Playwright and a `vite preview` on port 5178.
