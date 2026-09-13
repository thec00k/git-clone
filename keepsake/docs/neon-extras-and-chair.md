# Room movement, Honey chair and Neon City Extras

Implemented September 12, 2026.

## Changes and files

- `src/components/room3d/RoomCamera.tsx`: walking 1.55 → 2.35 m/s; drag sensitivity 0.0034/0.0028 → 0.0044/0.0036 radians per pixel; wheel step 0.0022 → 0.0032. Diagonal input is normalized. Existing room boundaries, eye height, book/focus transitions and modal guards remain in place.
- `art/pipeline/build-furniture-variants.py`, `art/furniture/chair-3.blend`, `public/room/furniture/chair-3.glb`, `catalog.json`, `chair-3.png`, `src/lib/furniture.ts`: Honey back increased from 25 to 65 mm, with balanced shoulder width, a 100 mm seat cushion and 56 mm padded arms. The GLB export now evaluates this chair's modifiers; this was the reason Blender padding was missing from the website. Existing seat/floor anchors and placement hierarchy are retained. Other furniture exports are unchanged.
- `art/pipeline/render-furniture.py`: accepts an optional item ID so a single edited chair can be reviewed without rerendering unrelated furniture.
- `art/cyberpunk/mushrooms.py`, `art/cyberpunk/build.py`, the Cyberpunk BLEND/GLB, manifest and `src/generated/roomAssets.ts`: four blue luminous mushrooms, a walnut bowl, moss and small light shards replace `Accent_Pot`, `Accent_Leaf1`, `Accent_Leaf2`. Four material batches stay parented to `ks_window_cactus`. Fixed cyan/pink door channels were added without changing the door leaf or its interaction.
- `src/components/room3d/NeonExtras.tsx`, `RoomModel.tsx`, `RoomPoster.tsx`, `RoomInteractions.tsx`, `src/lib/snakePoster.ts`: optional cherry sign and Snake poster with autoplay and arrow-key play. The ordinary poster renderer does not draw beneath the Snake poster. The door receives a small local fill light.
- `src/components/ShopCreativeExtras.tsx`, `RoomShopGoods.tsx`, `src/lib/roomShop.ts`, `roomThemes.ts`, `roomBackup.ts`, `src/types/app.ts`: included Neon City Extras, placement/removal, poster pause control, saved choices and backup validation. Cherry sign and poster can coexist; posters continue using one wall slot per room.

## Measured placement

All following coordinates use the website's X/Y/Z convention; Blender uses X/−Z/Y.

- Cactus bowl contact was Y=1.138. The new bowl keeps that contact, centered at (0.57, 1.138, −2.063), radius 0.055 m. Mushroom tops reach approximately Y=1.368.
- `ks_ceiling_switch` is (−1.58, 1.32, −2.08). `Neon_Cherry_Sign` is centered at (−1.72, 1.72, −2.045), above and slightly left of it.
- Door jambs occupy X=[−0.36, −0.30] and [0.60, 0.66], with the head at Y=[2.10, 2.16]. `Neon_Door_Left`, `Neon_Door_Right`, `Neon_Door_Head` sit on the fixed jamb faces at Z=2.028, clear of the leaf and handle.
- `Neon_Snake_Poster` is moved to the opposite side of the door: (−0.95, 1.48, 2.075), facing into the room, 0.50 × 0.65 m. This mirrors its earlier position around the door centre X=0.15.

## Behavior, persistence and rendering cost

The two new Extras are available only in Neon City and cost no stamps. Cherry visibility and poster pause state survive reload and backup. Existing per-room poster layouts are preserved; a new non-neon room does not inherit the exclusive Snake poster. Woodland and Beachfront retain their original cactus.

Autoplay grows toward food on a continuous safe route, completes the board and restarts. Click the poster to start a manual round, use the arrow keys to steer, and press Escape to exit. Food grows the snake; wall/body collisions end the round. Restart Snake begins again, and Leave game also returns to autoplay. The compact controls sit above the room taskbar at desktop, tablet and mobile widths. Room walking, looking and wheel input are locked while playing and released on exit, removal, another room control, the scrapbook opening or window blur. Game progress is temporary; decoration placement and autoplay pause remain saved.

Snake runs at six updates per second only when the poster is in view and the document is visible. Reduced motion freezes autoplay; the Extras tab also provides an explicit autoplay pause control. Manual play remains available as an intentional user action. Its canvas texture is released on removal. Cherry tubes are static; the door light casts no additional shadow map.

The final Neon City GLB is about 2.93 MiB, 176,596 triangles and 316 material primitives, below the existing 8 MiB / 180,000 triangle / 350 primitive limits. Optional runtime decorations are additional geometry and are not part of those GLB counts.

## Verification

- Production build: TypeScript and Vite pass; existing large-bundle warning remains.
- `check-neon-extras.mjs`: 30,000 autoplay simulation steps; continuous route, body/food separation, safe restart; player steering/reversal guard, food growth and wall/body collision; purchase/removal, room switching and backup validation.
- `check-honey-chair.mjs`: exported back has no open boundary edges, 13.64 litres of enclosed padding, and retained seat/floor anchors.
- `check-room-themes.mjs`, `check-furniture.mjs`: existing theme persistence, furniture allowlists and placement checks.
- `check-neon-assets.mjs`, Blender `art/cyberpunk/validate.py`: asset revisions/budgets, named nodes, removed cactus, finite transforms, lamp support and window/fan clearances.
- `check-neon-extras-browser.mjs`: visible geometry, placement/removal, reload persistence, autoplay, reduced motion, explicit pause, click-to-play, arrow controls, camera isolation, restart/exit and walking bounds; screenshot review for all changed props.

Browser checks use an isolated test profile. Screenshots are in `art/demo-work/`: `neon-mushroom-planter.png`, `honey-chair-room.png`, `neon-cherry-sign.png`, `neon-snake-poster.png`, `neon-door-outline.png`.

Hardware frame-rate benchmarking and every possible furniture combination were not tested. The cherry sign and animated poster are website decorations; the mushroom planter and door channels are also authored in the Blender scene.

## Shared neon sign spot

The Extras shop now includes a red heart sign. Heart and cherries share the measured position (−1.72, 1.72, −2.045); exactly one is rendered. Both can remain owned, and either can be put away. The included heart uses a smooth red tube with a dark backing and subtle glow, authored as runtime geometry like the cherries; no Blender asset was changed.

`roomDecor.neonSign` stores the selected sign or explicit empty slot. Older saves using `neonCherry` still display their cherries. Updates synchronize the legacy flag. The shop, backup validator, app types and `NeonExtras.tsx` use the shared selection. Tests cover old saves, switching, removal, theme changes and backup round trips; `check-neon-signs-browser.mjs` covers the shop and mutually exclusive scene objects. Preview: `art/demo-work/neon-heart-sign.png`.
