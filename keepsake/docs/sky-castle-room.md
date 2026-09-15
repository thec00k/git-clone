# Sky Castle

Branch: `codex/sky-castle-room`, created from fetched `origin/main` at `7e74a9a`.
Work is isolated under `.worktrees/sky-castle-room/keepsake`; unfinished changes in the original checkout were not copied or modified.

## Scope and art direction

A fourth room using the existing theme registry, shop selection, GLB cache, interaction anchors, and saved-room layout architecture. Pearl-white stone, champagne-gold mouldings, a deep circular window, transparent quartz desk and chair, cloud-silk floor, floating castle with pointed crystal spires, cloud banks and five falling-water ribbons. Existing time controls select daylight, rose dusk, or a darker teal night with luminous windows and stars.

The user clarified that the wall map must show the **real world**. `world-sky-castle.svg` retains all 339 geographical paths and their transforms from `world-room.svg`, at the same 950 × 620 coordinates. The original atlas, travel pins, photo locations and navigation remain unchanged. New parchment/cloud ornament changes only its presentation.

## Scene source and measured contracts

- Authoring: `art/sky-castle/build.py`, `sky-castle.blend`.
- Shipped model: `public/room/sky-castle/sky-castle.glb`; balanced/high share geometry. High adds the existing higher resolution/shadows plus more cloud layers.
- Shell: 5 × 4.25 m; ceiling 3.15 m.
- `Sky_Window_Masonry`: circular aperture centered at web XYZ (-0.15, 2.015, -2.125), radius 0.90 m. Reveal extends outward to Z -2.47; mouldings remain behind desk props.
- `Desk_Top`: retained surface at Y 0.75. `Desk_Drawer` retains its parent, pivot and slide direction.
- `ks_chair`: retained pivot (-0.34, 0, -0.90). `Chair_Back` is a closed curved shell, 0.07 m thick in its local depth direction; quartz seat, arms and legs use the existing furniture-replacement naming patterns.
- `Sky_Sill_Shelf_Left` and `Sky_Sill_Shelf_Right`: separate rounded shelves at Y 1.115, replacing the straight `Win_Sill` that intersected the round frame. Left X bounds -1.10 to -0.66; right X bounds 0.36 to 0.80; both Z -2.14 to -1.985. Their gold edges also clear the measured window-frame/diamond radius by at least 1 cm. The planter stays at X 0.57 on the right. Sky Castle owned extras use (-0.88, 1.115, -2.063) on the left; other rooms keep their original placement. Parenting remains `ks_window`.
- `Sky_Cloud_Floor`: continuous noise-shaped relief, at most 0.102 m high, flattened near chair/desk feet and large furniture. UV-mapped matte procedural grain supplies finer detail.
- `Sky_Castle_*`: independently authored and batched by material. The complete castle/island composition moves by (-2.8, 2.8, -12) from its first position, putting the main island center at Z -24. The slight upward/left framing shift reveals the floating base from the normal room view. `Sky_Waterfalls` carries the same offset so the streams stay attached.
- `Sky_Waterfall_0` through `Sky_Waterfall_4`, `Sky_Cloud_Sea`, `Sky_Stars`: browser scenery only. Water animation and slow cloud drift pause for reduced motion and hidden documents.
- `Desk`, `ks_book`, `ks_shelf`, `ks_map`, `ks_window`, `ks_archive`, `ks_archive_drawer`, `ks_clock`, `ks_crt`, `ks_lamp`, `ks_door`, `ks_ceiling_switch`, and fan roots retain their original world positions and parenting.

## Follow-up refinements

Mist-blue window masonry and cabinet sides, teal window reveal/bookshelf backing/CRT bezel/door, lavender beanbag, rose throw and richer warm gold provide definition while the primary walls and furniture frames stay pearl white. Materials are authored only in the independent Sky Castle source. No extra animation or texture uploads are introduced by the color changes.

Sky Castle automatically uses its own pearl-and-quartz time capsule at the existing (1.94, 0.002, -1.79) room position. `art/sky-castle/chest.py` builds `time-capsule.blend` and `public/room/sky-castle/time-capsule.glb` from the unchanged original chest. All nine original nodes retain exact transforms/parents, including `TimeCapsule_LidPivot`. Added moonstone and seams use restrained emission plus one non-shadowing light (intensity 0.10, range 0.85 m); no flashing, extra interaction, or new saved state. Original wood/Neon variants and the capsule dialog remain unchanged. The variant adds 248 triangles to the original 16,888 and removes the wood texture dependency.

Follow-up checks pass for actual ray-cast support beneath planter/decor footprints, castle distance, color assignments, day/night visual review, unchanged Woodland sill placement, and room switching/reload. `scripts/check-sky-capsule-browser.mjs` passes for the new chest's light, pivot, day/night appearance and actual mesh click. `scripts/check-time-capsules.mjs` passes for the existing backup/opening rules. A crashed in-app preview was replaced with a working fresh tab; the independent browser checks completed without uncaught page errors.

Follow-up files: `art/sky-castle/build.py`, `validate.py`, `chest.py`, the corresponding source/export assets and validation reports; `SillDecoration.tsx`, `SkyCastleScenery.tsx`, `TimeCapsuleChest.tsx`, the generated asset registry; both Sky Castle browser check scripts; and this report. Existing room and furniture asset folders remain unchanged.

Split-shelf correction: the straight ledge was removed because it crossed the round lower moulding. The focused browser check passes with an owned fern on the left shelf, both separate shelves present, and no old `Win_Sill`. Close-up and room-wide captures confirm a clear gap around the window arc. Export validation checks both shelves/edges against the measured frame radius and ray-casts all prop footprint corners onto the support surfaces. Build and whitespace checks pass; no persistence, animation, or accessibility behavior was changed.

Blender's source includes a separate review camera/light collection. Browser cloud textures, waterfall animation, dynamic atlas print, live book/photo surfaces and reflection environment are supplied at runtime. They are not baked into the Blender review render.

## Integration files

- Registry and persistence: `src/lib/roomThemes.ts`, `src/types/app.ts`, `src/lib/roomBackup.ts`, `src/lib/furniture.ts`.
- Selection/loading: `src/components/ShopRoomVariants.tsx`, `src/components/room3d/themes.ts`, `useActiveRoom.ts`, `src/generated/roomAssets.ts`.
- Scene: `RoomModel.tsx`, `RoomScene3D.tsx`, `RoomLighting.tsx`, `RoomWorldMap.tsx`, `FurnitureModels.tsx`.
- New isolated appearance: `SkyCastleFinish.tsx`, `SkyCastleScenery.tsx`, `skyTextures.ts`, one Sky Castle selector in `src/ui-theme.css`.
- Existing asset refresh now preserves the Sky Castle manifest when regenerating the registry. Sky Castle itself has its own authoring/publish commands.

## Persistence, accessibility and performance

Room switching updates only theme ownership, environment appearance, and per-room decor. It does not recreate or reset books, pages, photos, notes, pins, archive data, currency, collections or active-book selection. Backup validation accepts the new room and its furniture/layout keys. Existing saved rooms require no migration.

The existing keyboard-accessible room/shop controls remain in use. The UI uses cream text on dark slate with gold focus accents. No additional animated controls or inaccessible canvas-only interactions were introduced. The reflection environment is installed only while Sky Castle is mounted and restored on leaving.

Room export budget: approximately 1.40 MiB, 135,416 triangles, 230 meshes/primitives, below the existing 8 MiB / 180,000 / 350 limits. The separate capsule is 827,464 bytes and 17,136 triangles. Generated static cloud masks avoid volumetric ray marching and repeated per-frame texture uploads. No hardware frame-rate claim is made.

## Rebuild and verification

From this checkout's `keepsake` directory:

```text
blender -b --python art/sky-castle/inspect.py
blender -b --python art/sky-castle/build.py
blender -b --python art/sky-castle/validate.py
blender -b --python art/sky-castle/chest.py
node scripts/publish-sky-castle.mjs
node scripts/build-sky-map.mjs
npm run build
node scripts/check-room-themes.mjs
node scripts/check-sky-castle-browser.mjs
```

The browser check uses `TEST_BASE_URL`, `TEST_BROWSER`, and `PLAYWRIGHT_MODULE` when supplied; it defaults to port 5182 and runs in an isolated browser context. It verifies named scene objects, reduced motion, day/night changes, room-shop switching, reflection cleanup, memory preservation across reload, and chair interaction. `SKY_CHECK=sill` runs the focused shelf/Extra placement and visual checks. Review screenshots are in `art/sky-castle/review`.

Build passes with the existing large-chunk warning. GLB validation, room-theme memory/backup round trips, and the existing Neon extras checks pass. The complete isolated browser check passes: day/night changes, reduced-motion animation behavior, switching to Woodland and back, reflection cleanup, saved-memory preservation across reload, and chair/book interaction. Day, window, furniture, atlas, and night screenshots were visually reviewed. No uncaught browser errors occurred; existing loading-state warnings and unavailable external audio were observed in the isolated test.

Targeted lint reports no errors and three warnings about intentional imperative Three.js material/scene updates. Existing Woodland, Beachfront and Neon City source/model files have no diff from the branch base. Physical mobile-device performance and a hardware GPU frame-rate benchmark remain unverified. The Blender connection was rechecked successfully with this room open and no unsaved changes.

## Generated map artwork

Built-in image generation was used for `art/sky-castle/atlas-parchment.png`. It is embedded in the new vector map; no runtime dependency on a generated-image cache remains.

Final background prompt: “Use the exquisite engraved pen-and-watercolor parchment, champagne gold, pale turquoise and ivory style to create a BACKGROUND PLATE for a real-world atlas that will receive exact vector coastlines separately. Keep elegant narrow gold ornamental border and the small compass rose in far bottom left. Replace all islands, castles, bridges, labels and the title with a softly mottled pale ivory-to-pale turquoise empty parchment field, faint delicately sketched cloud wisps hugging only the outside edges. The middle 90% must be extremely quiet empty pale parchment, no geography and no text. Subtle paper grain and watercolor clouds; restrained corner engraved crystal/floral details. Landscape 3:2. Flat straight-on texture, edge-to-edge artwork.”
