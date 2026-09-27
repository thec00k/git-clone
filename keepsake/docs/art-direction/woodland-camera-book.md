# Woodland 2.0: camera and composition study

Draft for review. Values below are proposed graybox starting points, not render-validated final camera anchors. Coordinates use Three.js metres: +Y up, window wall toward -Z, shelf wall +X. Blender conversion for a web point (x,y,z) is (x,-z,y). Exported camera targets should be explicit empties, not inferred from furniture centers.

## Fixed composition

Keep the approximately 5 m-wide existing footprint as the first blockout. Place the desk at the window wall, memory map on the left, shelf on the right, archive to the right of the desk, and display case in the rear-right corner. Place a compact permanent hearth at the rear-left side near the sitting area; its winter use changes without moving furniture. Keep an unobstructed central area and clear the drawer/door sweeps.

Proposed architectural treatment: calm warm timber wall fields, a few rounded log/beam accents, restrained stacked stone at the hearth, square window with triangular transom. Avoid dense logs, stone corners, rafters and bright trim all competing in the same frame. A fixed upholstered timber chair receives an ivory winter throw rather than becoming a different chair.

Desk composition: book centered/front; CRT to right/rear and lower contrast; lamp to left; camera and loose photos on the left-front anchor; one personal keepsake at the rear; a shallow seasonal slot. Keep the open page sweep and editor surface free. Sill has two curated side positions with a central view gap, not a continuous row of objects.

## Measured baseline, before runtime changes

- `Desk_Top` bounds: X [-1.075,0.775], Y [0.714,0.750], Z [-2.065,-1.305]. `Desk` pivot (-0.150,0,-1.765).
- `ks_book` pivot (-0.150,0.764,-1.685), a placeholder. The actual workbench book renders initially at (-0.31,0.756,-1.72), shifting X toward -0.15 when open. Fit shots to the live book, including its open spread.
- `ks_crt` pivot (0.500,0.750,-1.780); bounds X [0.298,0.709], Y [0.750,1.045], Z [-1.995,-1.592].
- `ks_chair` pivot (-0.340,0,-0.900); bounds X [-0.637,-0.043], Y [0,0.870], Z [-1.197,-0.603].
- `ks_window` pivot (-0.150,1.875,-2.113); sill top ~1.137. Existing root window bounds include its trim; they are not the clear aperture.
- `ks_shelf` pivot (2.340,0,-0.120), before runtime Z -0.22 offset; `ks_map` (-2.390,1.840,0.050); `ks_archive` (1.220,0,-1.805); `ks_door` (0.150,0,2.125).
- Runtime display case placement in root: (2.030,0,1.650), with a separate GLB. Snowy branch moves it to (1.840,0,1.400), rotation Y -135 degrees, to clear the stone corner. Use that clearance precedent, not its coordinate as a universal new room requirement.

## Three priority shots

**01 Establishing — invitation to sit**

Proposed `Camera_Establishing`: position (0.85,1.45,1.55), target (-0.20,1.20,-1.65), vertical FOV 50 degrees. Start from existing front view (0.65,1.32,1.60) -> (-0.15,1.25,-1.68). Frame the desk across the lower third, chair offset from the book, window as a quieter cool field. Book/desk lead; room architecture comes second; scenery third. The hearth does not need to appear in this view.

Desktop reference frame 1440x900. Portrait 390x844 requires an authored crop/pose, not a blind desktop crop: move/aim as needed to show the desk-book-light relationship, allowing storage to have separate views. Keep controls outside the page silhouette.

**02 Desk — the scrapbook is the protagonist**

Proposed `Camera_Desk`: position (-0.15,1.43,-0.52), target (-0.15,0.79,-1.70), vertical FOV 42 degrees. Existing seated view is (-0.34,1.26,-0.58) -> (-0.15,0.82,-1.68); existing workbench camera is (-0.15,1.55,-1.12) -> (-0.15,0.78,-1.72). Keep the reading/editor view distinct from the wider desk portrait.

Give the book approximately 35–45% of horizontal frame width in the desk study, then fit the entire open spread for reading. These are composition targets, not measured current coverage. CRT is secondary: reserve its brighter animation for intentional music focus. Camera movement must not intersect the chair back; test the full transition, not just endpoints.

**03 Window — a seasonal pause**

Proposed `Camera_Window`: position (-0.15,1.82,-0.48), target (-0.15,2.00,-2.15), vertical FOV 52 degrees. Frame the main square aperture; the triangular transom may remain partly outside this closer shot. Its complete silhouette belongs in the establishing shot. Landscape horizon stays below the aperture's center; one foreground trunk provides depth without covering the distant clearing.

Allow only subtle viewing offsets within a tested envelope. Disable automatic drift in reduced motion. Keep weather/settings reachable through a conventional control; exterior pixels are not required interaction targets.

## Remaining Camera Book entries

Reading: preserve the live editor fit, use per-aspect FOV/pose; no ambient motion near pages. Shelf: readable spines and explicit keyboard list. Archive: drawer clearance and direct photo-library route. Display Case: door sweep and slot selection without transparent sorting artifacts. Memory Wall: readable real-world map and pins. Final numbers follow graybox inspection; do not reuse generic left/right poses as final shots.

## Visibility and transition policy

- Establishing: render the visible shell, desk, window and peripheral storage; animate only the chosen subtle exterior layer and practical light.
- Desk: full book/desk behavior; window stays visually present but its expensive effects are reduced; hidden shelf/case animation stops.
- Window: full active-season exterior; retain desk/sill occluders; pause unrelated prop motion.
- Reading: preserve the book/editor and a quiet room backdrop. Pause decorative motion; never unmount the editor just to optimize the room.
- Before changing views, preload the destination's assets and retain both visible zones until the transition completes. Render visibility, loading, animation and spatial audio are separate policies.
- Preserve Escape/modal guards and focus return; provide equivalent named-view buttons with at least the existing 44px targets. Reduced motion uses immediate view changes or a short non-moving fade.

## Light and season script

Day: warm neutral paper, soft forest green outside, gentle directional window light. Dusk (first proof): warm desk pool against desaturated blue-green forest; book paper is the clearest readable foreground value. Night: blue exterior silhouettes, restrained practical light, no pure-white glowing window. Winter night: same furniture and geography; snow-blue window, warm hearth, heavier textile and occasional restrained aurora. Keep the scrapbook white point neutral enough that photographs do not look permanently amber.

The first acceptance sheet should compare these three views in day, dusk and winter night, with both sparse and populated memory anchors. No production camera or lighting values are approved by this document alone.
