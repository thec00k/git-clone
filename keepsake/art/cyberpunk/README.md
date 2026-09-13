# Neon City

Run `build.py` in Blender to rebuild `cyberpunk.blend` and the compressed room GLB. Run `validate.py` and `scripts/check-neon-assets.mjs` afterward. Refresh the asset manifest SHA-256 and generated room asset URL after every export.

`infinity.py` replaces the former clouds with a shallow ceiling frame, smoked face and nested neon rectangles for Blender preview. `NeonAtmosphere.tsx` draws view-dependent virtual reflections in the browser without real-time reflection rendering. Room / Atmosphere / Infinity mirror supports Multicolor, Match CRT and Off. The legacy cloudPalette preference key remains for backup compatibility. The corner behind the beanbag is clear.

`chest.py` creates the metallic capsule in `time-capsule-metal.blend` and exports the separate furniture GLB. Metallic and Attic wood remain selectable.

The shared room interaction anchors are retained. Hologram cat, car and flower are available in the drawer. Lava and jellyfish motion respect reduced motion; the world map follows CRT color. The central ceiling beam remains removed, and validation checks the lamp rests entirely on the desk.

Browser acceptance: `scripts/check-neon-scene-browser.mjs`, with screenshots in `art/demo-work`. Tests use isolated browser storage.

`window.py` replaces the curtains and square crossbars with a rounded neon border and a 22 cm recessed metal reveal. The original sill and window interaction anchors remain.
