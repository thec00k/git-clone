# Furniture restyle in the CRT style

October 17, 2026. After the owner approved the desk CRT remodel, its style was carried across the remaining inherited Woodland furniture by `art/woodland/restyle-furniture.py`. Run it once after `remodel-crt.py`, then publish with `npm run assets:refresh -- --room woodland`.

The shared style uses softly rounded edges, cream-enamel fronts, oak carcasses, walnut bases, brass hardware and warm-iron accents. Materials are the same ones the CRT uses, so the set reads as one family.

| Object | Change |
| --- | --- |
| Desk | Rounder top, tapered legs with brass ferrules, cream drawer front with brass pull. The drawer front was moved 3 mm forward because it sat flush with the drawer box and rendered dark. |
| Chair | Eased frame, tapered legs, rounded back panel. The moss cushion is unchanged. |
| Lamp | Walnut base and brass foot. The shade and bulb are unchanged. |
| Clock | Cream-enamel case, walnut base and brass inlay, a small sibling of the CRT. The live digits are unchanged. |
| Archive cabinet | Rounded oak case, cream-enamel drawer, walnut plinth, brass handle and inlay. The photo frame is unchanged. |
| Guestbook table | Walnut legs. The top was already rounded. |
| Bookshelf | Rounded top and sides, walnut kick and base. The boards and runtime-coloured books are unchanged. |
| Corkboard map | Rounded walnut frame and round-headed pins. The map sheet is unchanged. |
| Door | Eased leaf and frame, room-side raised panels, walnut sill, brass knob and plate. |

Not changed: `ks_window` (rebuilt by the Woodland study), `Beanbag` (already remodeled), `ks_ceiling_switch` (an invisible anchor) and `ks_book` (a placeholder; the live scrapbook is a separate model).

Every existing object keeps its name, parent, origin and transform. Only materials, edge rounding and leg tapers change. The new parts (`Desk_Leg_*_Ferrule`, `Door_Panel_*_Inside`) use names that the furniture-swap and door code already handle.

`before-*.png` and `after-*.png` use the same cameras and light (Cycles, source scene).
