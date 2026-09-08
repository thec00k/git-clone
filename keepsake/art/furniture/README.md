# Keepsake furniture collection

September 8, 2026 prototype checkpoint. Drawer shop → Furniture offers two new alternatives in each of eleven categories, plus the existing room original: desk, chair, lamp, beanbag, rug, curtains, guestbook stand, cabinet, bookshelf, printer and CRT. Choices are stored independently for Woodland and Beachfront and included in room backups.

## Sources and licensing

See asset-ledger.json for exact URLs and licenses. Chair 1 derives from Kenney's CC0 Desk Chair on Poly Pizza; chair 2 derives from Ethan Place's CC0 School Chair 01 on Poly Haven. Poly Haven's CC0 fabric_pattern_07 supplies textile normal detail; book_pattern supplies the shared scrapbook's binding detail. Other new furniture geometry is authored by the Blender pipeline. Existing project wood textures are reused. Imported Green Chair and Wooden Chair candidates were rejected and are not shipped as runtime variants.

Sketchfab was not used: the connected Blender 5.1 scene did not have an authenticated Sketchfab API key. Figma and Higgsfield tools were not callable in this session. No generated or downloaded asset should be described as coming from those providers.

## Editable sources and regeneration

- sources/ contains packed imported source libraries.
- Each category-N.blend is independently editable; corresponding public/room/furniture/category-N.glb is the browser asset.
- art/pipeline/build-furniture-variants.py regenerates the collection from source libraries. Hand edits should be moved into that builder before regeneration, or preserved in separate source files.
- art/pipeline/render-furniture.py renders catalog thumbnails.
- art/pipeline/build-workbench-book.py builds the separate shared scrapbook source and GLB, including its cover hinge, page block and four curl targets.
- art/pipeline/separate-customizable-textiles.py separates replaceable curtains/rugs from room geometry. Room exports go through scripts/refresh-room-assets.mjs.

Runtime fitting uses named anchors and surface bounds. Existing working drawers, memories, printer output, shelf books, LEDs and CRT now-playing content remain attached to their interaction systems. A failed variant download retains the current choice. Originals can be restored in the shop.

The source room files were refreshed headlessly. A Blender window opened before this refresh may contain an older copy: reopen the saved room source before further editing rather than saving that stale scene over it. The live Asset Workshop is separate from the room source.

## Validation and remaining work

Build and automated acceptance cover asset portability, embedded textures, size limits, transformed fitting, selection validation, backup and book interaction state. Browser checks cover both rooms, actual photo dragging and ink, page turns, reduced motion and selection persistence. Every alternative was reviewed in both room layouts at desktop resolution. These checks are not real-device performance certification.

Remaining: final material/art direction review, Figma control-family design, Higgsfield reference exploration, authenticated Sketchfab candidate curation, broader day/dusk/night and hardware coverage. Preserve this modular contract when replacing prototype geometry with final assets.
