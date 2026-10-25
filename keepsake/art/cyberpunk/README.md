# Neon City

`build.py` starts from the retired `public/room/woodland/woodland.glb`, so it can no longer run; `cyberpunk.blend` is now the source. Run `validate.py` and `scripts/check-neon-assets.mjs` after every export, and `node scripts/publish-cyberpunk.mjs` to refresh the asset manifest SHA-256 and the generated room asset URL.

Furniture remodel (October 25, 2026): `blade-remodel.py` ran once on `cyberpunk.blend` (`blender -b art/cyberpunk/cyberpunk.blend --factory-startup -P art/cyberpunk/blade-remodel.py`). It builds the furniture with the Woodland shapes (`art/woodland-study/furniture-remodel.py`, `KS_ROOM = 'cyberpunk'`) and gives the room a cyberpunk, Blade Runner mood. Details and before/after renders: `review/blade-remodel/README.md`.

`infinity.py` replaces the former clouds with a shallow ceiling frame, smoked face and nested neon rectangles for Blender preview. `NeonAtmosphere.tsx` draws view-dependent virtual reflections in the browser without real-time reflection rendering. Room / Atmosphere / Infinity mirror supports Multicolor, Match CRT and Off. The legacy cloudPalette preference key remains for backup compatibility. The corner behind the beanbag is clear.

`chest.py` creates the metallic capsule in `time-capsule-metal.blend` and exports the separate furniture GLB. Metallic and Attic wood remain selectable.

The shared room interaction anchors are retained. Hologram cat, car and flower are available in the drawer. Lava and jellyfish motion respect reduced motion; the world map follows CRT color. The central ceiling beam remains removed, and validation checks the lamp rests entirely on the desk.

Browser acceptance: `scripts/check-neon-scene-browser.mjs`, with screenshots in `art/demo-work`. Tests use isolated browser storage.

`window.py` replaces the curtains and square crossbars with a rounded neon border and a 22 cm recessed metal reveal. The original sill and window interaction anchors remain.
