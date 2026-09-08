# Next polish direction — September 8, 2026

Discussion checkpoint only. The user requested saving the project and discussing these ideas before any further room changes. None of the proposed work below is implemented by this checkpoint.

## Connection and saved state

- Blender MCP was verified with both an add-on handshake and an executed read-only scene query: Blender 5.1.2, add-on 1.6, protocol 5, Beachfront scene, 391 objects, no unsaved changes.
- Before disconnecting Blender 3.4, its unsaved scene was preserved in a local recovery copy under `art/.staging/recovery/`. This is an ignored local recovery file, not the upgraded source or a GitHub backup.
- Application, upgraded sources, exports, and the Woodland demo were pushed to both main and codex/keepsake-rebuild through 3ac8b31.
- Figma and Higgsfield skills are present. Their callable plugin/Bridge connections have not yet been verified. The X reference post was readable, but video playback was not successfully inspected; do not claim a visual review of it.

## Proposed shared interaction sequence

The user wants a continuous transition from room navigation into scrapbook editing, avoiding a sudden visual switch from the 3D room to the current editor.

1. Align the chair and ease the camera into a centered workbench view.
2. Keep the closed scrapbook visible on the desk, with cover/title editing.
3. Open the same physical book; introduce editing controls after it settles.
4. Turn flexible pages with live user content, paper curl, contact shadows, and restrained settling motion.
5. Close the book and return smoothly; support reduced motion and interruption/repeated-input handling.

For shelf selection, the proposed sequence is book tilt, extraction, cover presentation, then an Open action that transitions to the same seated desk experience before opening. This is a recommendation under discussion. Quick View at the shelf is optional future scope.

Preserve photo dragging, marker drawing, text sharpness, undo/redo, sticky notes, accessibility, and existing saves. Blender supplies editable geometry and animation; the application coordinates live content and camera/object state; Figma supports control and interaction design; Higgsfield can provide visual references and candidate assets.

## Seven proposed refinements

1. Refine scrapbook construction and physical page turns.
2. Unify interface controls and states in Figma, with consistent placement across room palettes.
3. Improve close-up furniture and props: desk, chair, beanbag, guestbook stand, printer, CRT.
4. Refine Woodland forest depth, foliage, fabrics, and lighting.
5. Refine Beachfront shoreline, water, rocks, conch, fishbowl, wood, and dusk/night reflections.
6. Coordinate small animations for shelf books, drawers, printing, and paper, including reduced motion.
7. Curate original illustrations, postcards, papers, stickers, and discovery-note artwork.

Recommended order: prove the full shared book/desk sequence in Woodland; refine its controls and interacting furniture; port to Beachfront to expose layout assumptions; finish both rooms' art polish; then build Cyberpunk Cityscape, Snowy Mountain, and Stormy Lighthouse. Avoid requiring every decorative detail to be final before validating portability.

## Furniture customization proposal

The user asked whether multiple desk/chair/lamp variants can be selected. Recommended design:

- Stable per-category slots and saved item IDs, with default fallbacks.
- Per-asset anchors for tabletop/book/clutter placement, seat and camera position, drawer motion, and lamp light emission.
- Bounds and clearance rules for chair travel, drawer opening, book movement, walls, and nearby props.
- Preserve existing desk clutter and user memories when changing furniture.
- Preview, Apply, and Cancel through the drawer shop/customization flow; persist choices per room.
- Start with a small compatible collection; materials/colors can vary independently where supported. Large furniture may require explicit room compatibility.
- Reuse behavior controllers across assets; retain the current room on asset-load failure, support Balanced/High budgets, and migrate old saves safely.

Candidate assets may be generated through Higgsfield, sourced from appropriately licensed libraries, or authored directly. Inspect construction, topology, UVs, scale, pivots, materials, licenses, and performance before integration. Generated appearance is not evidence that an asset is ready for runtime use.
