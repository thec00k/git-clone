# Beachfront pixel-art window (prototype)

Status, November 26, 2026 (revised the same day for a single animation): prototype behind `?window=pixel`. Without the flag the Beachfront window keeps its shader scenery (`BeachfrontScenery.tsx`). The layers in `public/room/beachfront/window/` are placeholders made by `art/beachfront/pixel-window/make-placeholders.py` from the 44-colour `beach-palette.hex`; the artist (Ramenya) replaces them with the same file names. The artist handoff PDF is in the project's shared folder, `keepsake/beach-pixel-art-reference/pixel-window/Keepsake-beach-window-art-handoff.pdf`.

## Window measurements (from `beachfront.glb`)

| Part | Value (room metres) |
|---|---|
| Opening, jamb to jamb | x -1.100 to 0.800 (1.90 m) |
| Sill top | y 1.137 |
| Arch | semicircle, centre x -0.15, spring line y 2.05, radius 0.95 (apex y 3.00) |
| Opening height | 1.863 m |
| Inner wall face | z -2.125 (outer face -2.25; casements swing out to -2.967) |

## Art contract

- Canvas 480 x 400 native pixels for every layer and phase. The opening maps to the central 320 x 314 box (left 80, top 43), about 168 art pixels per metre, square pixels.
- Overscan: 80 px each side horizontally (25% of the opening), 43 px top and bottom (about 14%).
- One looping animation, 15 s at 8 fps = 120 frames, exported as a PNG sequence per layer: `beach_<NN>_<layer>_<frame 001-120>.png`.
- Sections of 40 frames: day 1-40, dusk 41-80, night 81-120. The first 16 frames of each are the change from the time before; the other 24 are a steady stretch that must loop on its own (40 into 17, 80 into 57, 120 into 97).
- Five registered layers, back to front, with parallax weights: `00_sky` 1.0 (opaque), `01_clouds` 0.85, `02_far-sea` 0.7, `03_near-water` 0.4, `04_foreground` 0.15. A flattened single-layer animation also works: list one layer in `LAYERS` and the other shader slots stay transparent.

## How the parallax works

`PixelParallaxWindow.tsx` draws one card (9 x 6 m at z -3.05, behind the open casements) with a shader. For each pixel it finds where the view ray crossed the window opening, maps that point into the window box, then offsets each layer by `weight x shift x overscan`. `shift` is the camera's viewing angle to the window centre, `(camera - centre) / distance`, measured from a straight-on reference `(0, -0.35)` and divided by `(0.6, 0.3)`, clamped to -1..1. So a layer can never move further than its overscan, and edges cannot show from anywhere in the room; past the clamp the layers hold still. Reduced motion keeps the shift at zero.

Playback (`TIMELINE`, `advance`): the playhead loops the steady stretch of the room's current `Phase`. When the phase changes it runs forward through the cycle: at normal speed through the target's change frames, at 4x through any section the room skipped (day to night passes through dusk quickly; worst case about 4 s). Reduced motion holds the first steady frame of the current phase. All frames are fetched once as compressed PNG blobs (placeholders: 600 files, 2.4 MB); only the frame on screen is decoded (`createImageBitmap`) and uploaded into one texture per layer, so GPU memory stays at five 480 x 400 textures.

Not done yet: no seasonal variants (the shader scenery's winter cloud cover is not carried over), the steady loop and phase change were not watched over time in a browser (the playback logic was checked in isolation), no per-layer lighting, the old shader scenery is still the default, and the flag has no setting in the UI. Real hardware and phone checks are open.

## Verification (November 26)

Headless Chromium (SwiftShader), 1280 x 800, motion allowed: main view at day, dusk and night, and the camera walked to the front-left and front-right corners and the closest point to the window looking up at the arch apex and down at the sill, plus the back-left corner. No gaps or card edges showed in any shot. The script lives outside the repo; the shots are in the project's shared folder under `keepsake/beach-pixel-art-reference/pixel-window/screenshots/`.
