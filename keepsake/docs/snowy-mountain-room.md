# Snowy Mountain room

Branch: `codex/snowy-mountain-room`, created from freshly fetched `origin/main` at `7e74a9a`. The existing Sky Castle worktree and its unsaved Blender session were left intact. This checkout follows main's three-room architecture; it does not merge unpublished Sky Castle work.

Preview: http://127.0.0.1:5183/ — Drawer shop → Rooms → Snowy Mountain. Room → Atmosphere contains Desk lantern and Fireplace sound switches. The ordinary ambience slider controls crackling volume.

## Appearance and exact geometry

The room uses rounded cedar log courses, a pitched plank ceiling, dark rafters, rough stacked granite corners, and an iron-lined stone fireplace. Original marbled ivory/gray fur covers the substantial chair cushions and the organic hide-shaped center rug. Distant mountains have exposed slate slopes and partial snow cover, with spruce in the foreground and a winding river descending toward the cabin. Green, teal and blue aurora curtains appear during dusk and night. The shorter, wider lantern and hearth provide restrained warm flicker. Optional deer and bear taxidermy mounts are available separately in Drawer shop → Extras; neither is placed by default.

All measurements below use Three.js world metres (Y up):

- `ks_window` retains its original pivot and parenting. The square opening spans X -1.10 to 0.80, Y 1.138 to 3.038. `Cabin_Window_Triangle` rises to (-0.15, 3.69). `Cabin_Window_Reveal` occupies Z -2.40 to -2.18, behind the sill objects. `Win_Sill` top remains Y 1.138.
- `Cabin_Logs` uses smooth 16-sided horizontal timber profiles, 0.19 m high and 0.168 m deep. Window and door apertures remain clear. `Cabin_Window_Crossbar` runs across the square opening at Y 2.088 and meets its central vertical divider.
- `Cabin_Hearth` occupies X -1.34 to -0.48 and Z 1.685 to 2.135, Y 0 to 0.124. It sits to the right of the door when facing that wall, with 12 cm clearance to the door jamb. Cabin walking maximum Z is 1.48. Only the cabin's beanbag is shifted forward to maximum Z 1.43, leaving 25.5 cm to the hearth.
- `Cabin_Flames` center is (-0.91, 0.535, 1.687), facing -Z. The spatial audio emitter is (-0.91, 0.53, 1.68), and the hearth light is (-0.91, 0.58, 1.61).
- `ks_lamp` retains (-0.90, 0.765, -1.99). Lantern geometry is shortened to 68% of its previous height and widened to 130%, about the desk contact point (-0.90, 0.75, -1.87). The resulting lantern is about 31 cm tall with a 16.6 cm base diameter. Its original bulb, parenting, switch and runtime light remain connected.
- `Cabin_Mountain_0` begins at Z -24 instead of -10; further ridges begin at -36 and -48. Vertex colors combine slope and altitude for partial snow. `Cabin_River` extends from Z -33 to -3 with descending elevation and animated surface streaks flowing toward the room. Snow banks and spruce leave its channel clear. The sky, stars and aurora were moved behind the farther ridges.
- `Cabin_Deer_Mount` sits left of the window around X -1.73; `Cabin_Bear_Mount` sits right around X 1.46. Both use their own root and are hidden unless owned and placed. Their silhouettes clear the window opening, and each can be put away independently.
- `Cabin_Window_Gable_Cap` closes the upper window wall to the pitched roof at Z -2.19. Continuous `Cabin_Roof_Sheathing` seals daylight gaps behind the decorative ceiling planks. `Cabin_Window_Rafters` moves 10 cm inward to Z -1.94, providing over 4 cm depth separation from `Cabin_Window_Triangle` while keeping its support profile.
- The Snowy Mountain display case root is (1.84, 0, 1.40), retaining rotation Y -135°. Its measured closed bounds are X 1.3897–2.1790, Y 0–2.1075, Z 0.9549–1.7390. The existing shared GLB remains intact; only this room's cloned `Case_PaintedTimber` and `Case_Oak` use cedar grain and warmer wood finishes. Local cloned UVs give the grain a consistent direction. Glass, hinges, door animation, lighting, imported objects and storage are preserved, and the focus camera follows the new position.
- `ks_chair` retains (-0.34, 0, -0.90). `Chair_Fur_Seat`, `Chair_Fur_Back`, arm cushions, support legs and fibres are its children. The original chair click/sit behavior remains. Shop furniture uses existing replacement patterns.
- The live clock face raycasts against the cabin chair, so the HTML digits no longer paint through its fur or frame when the chair crosses the camera-to-clock sightline. Other rooms retain their existing clock rendering.
- `Cabin_Hide_Rug` and `Cabin_Hide_Fibres` form a low organic floor rug centered near (0, 0.035, 0.43); purchasing another rug hides both.
- `Desk`, `Desk_Drawer`, `ks_book`, `ks_archive`, `ks_archive_drawer`, `ks_chair`, `ks_clock`, `ks_crt`, `ks_window`, `ks_window_cactus`, `ks_lamp`, `ks_shelf`, `ks_map`, both fan roots, the light switch and door retain their original world positions and parents in the shipped GLB. Runtime's existing shelf shift, clock shift and chair-floor contact remain in use; the cabin alone adjusts beanbag clearance as described above.

## Files

- Authoring: `art/snowy-mountain/build.py`, `geometry.py`, `inspect.py`, `validate.py`, `source-inspection.json`, `display-case-inspection.json`, `validation.json`, `marbled-fur.png`, `snowy-mountain.blend`, and review captures.
- Web assets: `public/room/snowy-mountain/snowy-mountain.glb`, `asset-manifest.json`, `preview.png`; registration in `src/generated/roomAssets.ts` and `scripts/publish-snowy-room.mjs`.
- Appearance: `SnowyMountainScenery.tsx`, `SnowyMountainEffects.tsx`, and scoped integration in `RoomModel.tsx`, `RoomScene3D.tsx`, `RoomLighting.tsx`, `RoomProps.tsx`, `useRoomAsset.ts`, `ArtifactDisplayCase.tsx`, and `RoomCamera.tsx`.
- State and shop: `src/types/app.ts`, `src/lib/roomThemes.ts`, `roomBackup.ts`, `furniture.ts`, `themes.ts`, `useActiveRoom.ts`, `ShopRoomVariants.tsx`, `FurnitureModels.tsx`, `FurniturePrinter.tsx`.
- Audio and accessible controls: `src/lib/fireplaceAudio.ts`, `RoomControls.tsx`, `RoomListen.tsx`.
- Checks: `scripts/check-room-themes.mjs`, `scripts/check-snowy-room-browser.mjs`. The existing asset refresh script preserves the new theme manifest.

## Persistence, motion, audio and performance

Room switching changes the theme and its per-room decor/furniture selection through the existing state transition. It does not recreate books, pages, notes, photos, archive data, pins, currency or collections. The only added preference is optional `environment.fireplaceSound`; old saves default to enabled, and backup validation requires a boolean when supplied.

Crackles are an original synthesized 18-second buffer, spatialized with Web Audio's distance attenuation and HRTF panning. Audio starts only after a user gesture, follows ambience volume, suspends when muted or the document is hidden, and closes/disconnects its context on leaving the cabin. It is independent of music. No third-party audio requests are introduced.

Reduced motion holds the river, aurora, flames and lantern illumination steady. The existing room visibility/frame scheduling continues to apply. Lights do not add shadow maps. GPU materials/geometries are disposed by React Three Fiber; original room GLTF data are cloned and never mutated globally. Mount ownership and placement are saved in `roomDecor`, validated on backup import, and rendered only in Snowy Mountain.

The final room export is 6,347,832 bytes (6.05 MiB), 166,785 triangles and 315 meshes, within the existing 8 MiB / 180,000 triangle / 350 primitive targets (the GLB has 324 primitives). Both graphics presets use this model; their existing DPR and shadow settings still differ. Physical mobile devices and hardware frame-rate benchmarking remain unverified. Shader animation and audio add a modest runtime cost beyond these static counts.

## Verification

- Production TypeScript/Vite build passes, with the existing large-chunk warning.
- Actual exported GLB validation passes: preserved anchors/parents, lantern-to-desktop contact, sill height, fireplace/door separation, beanbag and walking clearance, crossbar placement, sealed log joints, window opening ray casts, mount clearance, distant mountain placement and scene budget.
- Room-theme switching and backup checks pass, including Snowy Mountain memories, decor, furniture and the fireplace preference. Existing Neon Extras and time-capsule tests pass.
- Independent browser captures cover day/dusk/night, fireplace, rug/chair and lantern. Reduced-motion and phase visibility checks pass. The full browser check also exercises sound muting/resuming/cleanup, switching to Woodland and back, reload and chair/book behavior. Both mount additions, independent removal, and saved placement after switching and reload are covered. The wooden display case is checked closed and open, including exactly four hinge groups under React Strict Mode; Woodland retains its original case position and finish.
- Existing Woodland, Beachfront, Neon City and furniture asset directories have no diff from the branch base. Sky Castle remains in its separate checkout.
- Targeted lint has no errors. It flags intentional Three.js material, visibility, camera and shader-uniform mutations, plus the existing pattern of exporting placement constants beside components. Whitespace checks pass.
- Existing loading-state React warnings and blocked external SoundCloud requests occurred in the isolated browser test. No new external requests were added for cabin assets or audio. Physical speaker/headphone playback and real-device performance are not verified by the automated browser checks.

Rebuild from this checkout's `keepsake` folder:

```text
blender -b --python-exit-code 1 --python art/snowy-mountain/build.py
blender -b --python-exit-code 1 --python art/snowy-mountain/validate.py
node scripts/publish-snowy-room.mjs
npm run build
node scripts/check-room-themes.mjs
node scripts/check-snowy-room-browser.mjs
```

Browser checks accept `TEST_BASE_URL`, `TEST_BROWSER`, and `PLAYWRIGHT_MODULE`; the default URL is port 5183. `SNOW_CHECK=visual` limits the run to rendered scenes, time phases and reduced motion. Tests seed a separate browser context and never overwrite the user's live browser memories.

The `.blend` review rig includes static geometry and lights. The animated fire, auroras, live map, memory objects and spatial audio are supplied by the website at runtime.

## Original fur artwork

Built-in image generation produced `marbled-fur.png`, packed into the GLB at 1024 × 1024. Prompt:

"Create an original seamless square PBR albedo texture for marbled white sheepskin upholstery in a cozy alpine log cabin. Orthographic straight-down macro material scan, entire image filled edge to edge with thick luxurious ivory and silver-white fur with scattered wispy charcoal-gray marbling; about 80 percent white, small irregular gray tips and patches, NO zebra stripes, no regular waves, no geometric pattern. Dense fine long individual hairs overlap naturally in softly changing directions. Even neutral diffuse lighting, no perspective, no object outline, no furniture, no background, no baked cast shadows, no text, no border. A photorealistic material texture, gently tactile rather than high-contrast."
