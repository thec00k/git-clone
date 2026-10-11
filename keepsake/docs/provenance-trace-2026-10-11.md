# Provenance trace (October 11, 2026)

Goal: find a source page (Poly Haven, Poly Pizza or Sketchfab) for the 13 Woodland objects of unknown origin and the furniture wood textures, so the [licence ledger](../licences/ledger.json) can be updated. Proof files are in [`licences/proof/`](../licences/proof/); each folder has the script that produced its result, so anyone can re-run it.

## Short answer
- **Furniture wood textures: original.** The `Keepsake_Detail_wood_*` maps were not inherited. `art/pipeline/refresh-room.py` generates them from sine waves, and the copies in every furniture and room GLB match a fresh regeneration (correlation 0.9997, mean difference 0.2%; [result](../licences/proof/original-furniture/compare-wood-maps-2026-10-11.txt)). The one other furniture texture is Poly Haven `fabric_pattern_07` (CC0, already in the ledger). `original-furniture` moves from unverified to documented.
- **Room textures: Poly Haven, CC0.** Every downloaded texture in the Woodland, Beachfront and Neon City room files is a Poly Haven texture fetched through the Blender MCP add-on: wood_floor, beige_wall_001, beige_wall_002, brown_leather, leather_white, metal_plate_02, wood_cabinet_worn_long, ash_veneer and wool_boucle ([trace](../licences/proof/polyhaven-textures/trace-textures-2026-10-11.txt), [pages](../licences/proof/polyhaven-textures/polyhaven-pages-2026-10-11.md)). The current default cabin (`woodland-study.glb`) no longer uses any of them; all its textures are generated.
- **The 13 objects: no source page, because they were not downloaded.** In the September 7 room, the 12 that have geometry are all assembled from Blender primitives (`ks_ceiling_switch` is an empty anchor): 142 of the 161 parts of the 12 objects with geometry are 24-vertex boxes (a Blender default cube), the rest are simple cylinders and lathe shapes, and each part has a descriptive name such as `Desk_Leg_FL`, `CRT_Knob_1` or `Clock_BrassLip` ([part list](../licences/proof/woodland-study-room/room-parts-2026-09-07.txt)). Downloaded models look nothing like this: the Sketchfab beanbag had 289,024 triangles and the Kenney chair keeps its own `chairDesk` names. This is how the Blender MCP assistant builds objects, and the same `.blend` files record that add-on in use. Searching Poly Haven, Poly Pizza or Sketchfab for them would only turn up look-alikes, so none is recorded as a match.

## What changed in the ledger
| Entry | Before | After | Why |
| --- | --- | --- | --- |
| original-furniture | unverified | documented | Wood maps proven original; fabric normal is CC0 Poly Haven. A dated copy of the fabric_pattern_07 page moves it to verified. |
| legacy-woodland | unverified | ai-generated | Textures Poly Haven CC0, geometry confirmed original; it still embeds the AI-generated fern print, so it follows room-prints-ai. Not loaded at runtime. |
| beachfront-room | unverified | documented | Textures Poly Haven CC0; geometry confirmed original. |
| neon-city-room | unverified | documented | Same as above. |
| woodland-study-room | unverified | documented | Textures generated; geometry confirmed original; the beanbag keeps its CC BY credit. |
| scrapbook-model | original | original | Note added: its cover normal map is Poly Haven `book_pattern` (CC0). |

## Owner decisions and what is left
1. **Confirmed (October 11):** the owner built the shared furniture in their own Blender sessions with the Blender MCP assistant. The room entries moved as shown above, and no remodel is needed for licensing.
2. **Proof copies.** This cloud session could not reach Poly Haven, Poly Pizza or Sketchfab to save pages, so nothing was marked verified. A dated screenshot or PDF of each page in [polyhaven-pages-2026-10-11.md](../licences/proof/polyhaven-textures/polyhaven-pages-2026-10-11.md), plus fabric_pattern_07, book_pattern, School Chair 01, the Kenney Desk Chair and the two Sketchfab models, saved into `licences/proof/<entry-id>/`, moves those entries to verified. The Blender session on the owner's computer can do this from its browser.
3. **Non-commercial or credit-required items:** none found. Every traced texture is CC0. The two CC BY models (Sketchfab beanbag and lamp) were already credited in the app.

## Remodel list
None needed for licensing. The Illustrated Nostalgia pass (`docs/handoff-blender-tasks.md`, added in pull request #7) still remodels Desk (with `Desk_Drawer`), ks_book, ks_crt, ks_archive, ks_guestbook, ks_map, ks_shelf, ks_chair, ks_lamp, ks_door, ks_clock and ks_window for art reasons; keep `ks_ceiling_switch` as an anchor.

## Not covered here
Sample photos, `public/textures/*` and the world maps stay unverified; they are images, not models, and their replacements are listed in the [licence report](licence-report.md).
