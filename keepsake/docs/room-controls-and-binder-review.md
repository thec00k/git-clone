# Room controls, binders and contact review

Figma design: https://www.figma.com/design/5RwG3LC2YWU3QOcJ8DTUe9

The bottom taskbar keeps the main actions visible. Room now separates Places, Collections and Atmosphere, with one consistent Room settings entry. Navigation actions close the menu; lighting switches stay open for adjustment. The separate unlabeled settings shortcut is removed from the 3D room.

Each room has its own Color Designer palette. Woodland uses moss / cream / brass; Beachfront uses ocean blue / warm white / sea glass. Reserved palettes for future rooms are aubergine / pale lilac / neon rose (Cyberpunk), slate blue / frost / ice blue (Snowy Mountain), and deep teal / parchment / amber (Stormy Lighthouse). These future palettes do not enable unfinished rooms. Preserve these separate identities when authoring their materials and lighting.

The blank bookshelf book and library New book offer Scrapbook or Card binder. Binders are private, use their own data, appear on the shelf, and share the seated cover/open/close and physical page-turn animation. Card imports, scanned GLB inspection, repositioning and backups retain the existing validation. Reduced motion changes spreads immediately.

Chair floor contact now follows the visible rug height, including furniture variants. The discovery note follows the actual seat surface rather than a fixed world coordinate. The Blender review copies include corrected chair heights; runtime contact adapts when users change furniture.

## Required completion review

For every future room/asset task, inspect the Blender scene before finishing: supports, clipping, clearances, material assignments, lighting and moving parts. Inspect the exported website too, including the room's seated view. Check variants affected by the change. If Blender is unavailable, explicitly record that its inspection is pending; do not report it as verified.

Do not overwrite a dirty artist scene as part of review. Save an in-room review copy and retain the editable source assets.

## Verification completed

- Production build and automated acceptance suite passed.
- Woodland: new binder from shelf, title editing, 20-image import, reduced-motion pagination, closing and reopening passed.
- Woodland and Beachfront: actual textured forward/back page curls, cover opening, closing and return to room passed.
- Original chair and all three replacements: rug clearance and chair-note contact passed in standing and seated positions. Measured clearance was 1 mm over the rug, with the note 2 mm over the seat.
- Blender: inspected the open scene visually and measured the chair, cushion, rug and case. Saved corrected Woodland and Beachfront review copies without overwriting the artist's open source.
