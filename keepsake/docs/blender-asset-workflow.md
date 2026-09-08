# Keepsake assets — Blender 5.1

The editable sources are `art/woodland/woodland.blend` and `art/beachfront/beachfront.blend`. They are now saved with Blender 5.1, with packed image dependencies, metric units, AgX preview color management, and denoised Cycles preview settings. Use Blender 5.1 or newer to edit them. The website continues to use optimized GLB files; it does not load the working Blender files.

## Refresh a saved scene

From `keepsake/`:

```sh
npm run assets:doctor
npm run assets:refresh
```

The first command locates and checks Blender. The second processes both saved scenes. To update only one room, use `npm run assets:refresh -- --room beachfront`. Set `BLENDER_BIN` to the executable if Blender is installed elsewhere. The script finds standard Windows installations automatically; macOS and PATH-based Linux installations are also supported.

Save your edits in Blender before refreshing. Refresh processes the saved file, not unsaved changes in an open Blender window. Keep a single authoritative editing session: an older Blender window can still overwrite a source if you save from it later.

For validation without replacing working files:

```sh
npm run assets:refresh -- --check-only
```

Every run retains the incoming source files in an ignored `art/.staging/refresh-*/originals/` directory. It exports into staging, then checks both quality levels before publishing. A source saved by another process during export causes publication to stop. Blender logs and a measured report remain in the staging directory. Git remains the permanent history for published sources and models.

## What goes to the website

Each room has a stable Balanced model (`woodland.glb` or `beachfront.glb`) and a High model (`woodland.high.glb` or `beachfront.high.glb`). Balanced caps textures at 512 pixels; High retains up to 1024 pixels. Existing smaller photographs are not artificially enlarged. Both use Draco geometry compression with 20-bit positions, 12-bit normals, and 16-bit UVs. Geometry is not automatically decimated. The decoder ships locally, so loading does not rely on a decoder CDN.

Balanced models must stay within 8 MiB; High within 12 MiB. Both retain the 180,000-triangle gate and existing material/primitive budgets. The manifest records download size, triangle count, material count, texture size, estimated texture memory including mipmaps, and content hashes. Texture-memory estimates exclude runtime scenery, framebuffers, personal photos and driver overhead.

`src/generated/roomAssets.ts` maps the stable filenames to content-versioned URLs. The app selects the model using the user's existing Balanced/High setting. Phone, tablet and desktop viewport bands also cap rendering resolution and weather particles. High remains an explicit user choice; these budgets are not a substitute for testing frame rate on real devices.

The existing named objects and origins are the interaction contract. Preserve `Desk`, `Desk_Drawer`, `ks_book`, window, shelf, archive, guestbook, door, clock and light anchors. Do not join moving drawers, chair parts, casement panes or fan blades into the static room. Existing camera bounds and room-view positions remain valid because this material pass preserves furniture geometry and placement.

Camera objects, Blender preview lights/scenery, the old opaque window cards and the hidden original beanbag are excluded from web exports. Runtime forest, ocean, weather, maps, photos and music remain application layers. Export checks verify anchors, contact with the desk/sill, trim clearance, embedded textures, tint preservation, and asset budgets.

## Material detail and future replacement assets

The initial `--polish` pass adds original seamless wood grain, linen weave and plaster textures, with roughness and tangent-space normal maps. Painted trim keeps its original color and uses a very subtle normal texture. New `KeepsakeDetail` UVs leave existing photo/cover UVs intact. Existing photographic material colors are preserved. These are surface-detail improvements, not replacement furniture models.

Use the normal refresh command after hand-editing materials. `--polish` is the optional foundation pass; it regenerates the project's shared procedural tiles and should not be used to preserve hand-painted edits to those tiles. A material version marker prevents repeated node/UV additions.

For a new high-quality asset, model and unwrap it in Blender, use image textures connected to a Principled material, preserve the relevant interaction root, and refresh the scene. Complex procedural shaders need an exportable image representation. The current color-factor setup uses the modern Mix node supported by Blender 5.1's glTF exporter. See the [official glTF material documentation](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html).

The earlier cozy/finish/build Python passes are historical scene-construction scripts, not the current refresh workflow. Do not rerun them over an edited scene. The Beachfront export helper now delegates to the shared validator instead of bypassing it.

## Verification

Run `npm run check:acceptance` and `npm run build`. Browser acceptance must additionally load all four real models, exercise quality switching, open the drawer and scrapbook, and inspect both rooms. Use a fresh browser profile on the isolated review origin; never replace personal room data with test fixtures.

Blender MCP is separate from the export command. The inspected connection was still attached to Blender 3.4.1 even though 5.1.2 was installed. The command above uses 5.1.2 directly. For subsequent interactive MCP editing, enable/start the add-on in Blender 5.1 after stopping its server in the older Blender window.
