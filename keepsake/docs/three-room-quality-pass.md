# Three-room quality pass

Scope: inspect the shipped Woodland, Beachfront and Neon City rooms, improve props
within their existing art direction, and polish shared controls. Original reference
art is not copied. No new storage schema, purchases, telemetry or room layout changes.

## Inspection and choices

`art/pipeline/audit-room-props.py` measures the actual shipped GLBs in an isolated
Blender process. Full object names, parents, transforms, local scale, world bounds,
materials and triangle counts are in `art/demo-work/room-prop-audit.json`.
The live Blender scene was inspected separately before refreshing it.

| Room | Direction and findings | Implemented |
| --- | --- | --- |
| Woodland | Warm wood, moss joinery, linen. CRT and clock casing parts have single sharp edges; the mug already has 1,504 triangles and a rounded lip. | Eased CRT casing and clock edges. Preserve existing wood maps, mug and authored furnishings. |
| Beachfront | Pale joinery, ceramic lamp, sea glass and linen. The coastal clock is already beveled; the shared CRT has the same sharp casing parts. | Eased CRT edges; retain coastal clock, fishbowl and window animation. |
| Neon City | Graphite, alloy, cyan/magenta. The original cat/car/flower were assembled from coarse primitive shapes and every triangle was drawn as wireframe. | Original sculpted cat, continuous coupe body and cupped flower petals/curved leaves; scan-line shading, restrained edge halo and projector light. Shared CRT and clock casing refinements. |

The metallic capsule, lava lamp, jellyfish tank, infinity mirror, rounded window,
bookshelf, chairs and moving drawers were inspected as room context and kept in place.
Large furniture remodels were not necessary for this pass. Source Beachfront edits
already in the workspace were preserved; that source was not regenerated.

## Exact implementation boundaries

- `art/cyberpunk/holograms.py`, invoked by `art/cyberpunk/build.py`, replaces only
  `Neon_Hologram_cat`, `Neon_Hologram_car`, `Neon_Hologram_flower` contents.
  Projector center is web `(-0.45, 1.138, -2.06)`. Group names and origin/parent
  contracts stay the same. Static miniature pieces are batched by material.
- `NeonAtmosphere.tsx` retains selection using `roomDecor.sillItem` and `owned`.
  Smooth view-dependent shading replaces the triangle wire overlay. One soft halo
  shell per body material shares geometry; one short-range light activates only
  for owned, selected holograms. Scan lines are static, without flashing animation.
- `art/pipeline/build-prop-refinements.py` generates a geometry-only overlay GLB
  and separate editable Blender file. Targets are `CRT_Back`, `CRT_Base`,
  `CRT_Bezel` in all three rooms, plus `Clock_Back`, `Clock_Bottom`, `Clock_Left`,
  `Clock_Right`, `Clock_Top` in Woodland and Neon City (19 pieces total).
  0.8–3 mm bevels preserve original bounds. UVs are retained. The screen, digits,
  controls, `ks_crt`, `ks_clock`, parenting and animation pivots are unchanged.
- `PropRefinements.tsx` asynchronously replaces only target geometry. Original
  meshes remain while loading or on failure. Runtime bounds are checked before
  swapping. Materials remain owned by the room; local overlay geometry is disposed
  and originals restored on unmount. The small overlay is cached across rooms.
- `RoomControls.tsx` adds semantic tabs with arrow/Home/End navigation. Selectors
  and focus rings use existing room tokens. Small screens put the primary action
  on its own row; secondary controls keep at least 44 px targets. The menu is
  constrained to the viewport and anchored to the full bar, not the Room button.

## UI reference

Reviewed the existing Figma foundations board, file `5RwG3LC2YWU3QOcJ8DTUe9`, node
`7:3`. Keep its room palettes and heading families. Changes implement consistency
and responsive behavior in code; no new Figma file or replacement design system.

## Validation and limits

- Production build; room theme/persistence/backup tests.
- Blender geometry validation: finite transforms, required names, lamp support,
  fan clearance and window/desk clearance.
- GLB checks: portable embedded assets, content hash, triangle and primitive budget.
- Three-room browser check: keyboard switches/tabs, settings, Escape, mobile
  overflow, all expected overlay meshes loaded.
- Neon browser check: buy/select all three holograms, close-up screenshots and
  halo presence, map/CRT linkage, reduced motion, jellyfish movement, scrapbook.
- Screenshots: `art/demo-work/neon-hologram-{cat,car,flower}.png` and
  `art/demo-work/ui-{room}-*.png`.

Browser checks use isolated storage. Real mobile GPU performance, screen-reader
usability and all possible furniture combinations are not certified by these checks.
The Blender source previews geometry/materials; the final scan-line/halo treatment
is authored for the website renderer and must be reviewed there.

Final measured Neon City export: 2.91 MiB, 173,280 triangles, 312 primitives,
within the existing 8 MiB / 180,000 triangle / 350 primitive budget. The refinement
overlay is 27,944 bytes and adds no mesh objects to the room hierarchy.
Production build, theme/backup tests, all three room UI browser checks and the
final Neon City interaction/close-up check passed. Reviewed the final cat, car and
flower browser screenshots and the updated Blender cat viewport.
