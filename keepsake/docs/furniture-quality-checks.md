# Furniture acceptance before release

The September 8 review exposed gaps in the earlier load-and-toggle checks. A thumbnail and a successful download do not establish that an item fits a room. Apply this checklist to every new or remodeled piece before reporting it ready.

1. Inspect the editable Blender source and exported model. Check the underside, joints, open tube ends, normals, UVs, real thickness and contact with supporting surfaces. Reopen the saved source.
2. Equip the item in Woodland and Beachfront, both alone and with the other alternatives. Preserve the original room choice and personal data; use isolated browser profiles for automated checks.
3. Check occupied bounds, not parent bounds containing unrelated children. Rugs must exclude trim and retain plausible thickness. Tabletop contact must use the top surface, not a raised tray rim. Knobs and handles must physically meet the case.
4. Inspect the whole room, desk, shelf and reading corner. Verify floor/wall clearance, drawer closure, camera/printer/book separation, and seat direction. Check the fully opened book and seated chair as well as their resting positions.
5. Review day and night with the ceiling light on and off. Lamps should glow at the shade/diffuser and illuminate their surroundings. Concealed shelf lights should illuminate spines without a bright exposed line.
6. Test mouse selection on the visible object, including every neighboring spine, the blank book, hover, pull-out, Put back and keyboard activation. Highlighted objects must stay readable. Check points again after animation.
7. Capture opening and closing mid-motion, and test reduced motion. Check page/cover separation in the cover's own coordinates throughout the motion.
8. Test placing, restoring originals, reloading, backing up and a failed asset download. Preserve the previous furniture if loading fails.
9. Run the production build and relevant acceptance checks. Review the screenshots rather than relying on test assertions alone. Document any remaining limitations honestly.

`scripts/check-furniture-clearance-browser.mjs` exercises complete variant combinations, room views, printer and table clearances, adjacent spine mouse selection, and book opening/closing. It uses a separate local origin. `QA_ROOM` and `QA_VARIANT` narrow a rerun after a failure; `QA_ARTIFACT_DIR` saves review screenshots.

Hardware performance and final art approval remain separate from these prototype geometry and interaction checks.

## Deferred idea requested during this pass

Drawer-shop custom cursors: a cat cursor and optional fading sparkle trail. Keep an exact visible click point, preserve text/resize/editor cursors, respect reduced motion, offer a trail toggle, and keep touch behavior unchanged. This is a backlog idea, not implemented in this pass.
