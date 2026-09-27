# Keepsake room production: first design pass

Status: the initial pre-production proposal is delivered; full PDF phase acceptance is tracked separately in [production progress](production-progress.md); the next Woodland composition proof is now implemented locally on `codex/woodland-composition-proof`. See [proof results and review guide](woodland-proof.md). The original planning pass did not change runtime assets; the subsequent proof adds a separate study asset and preview route.

Approved source: `C:/Users/iront/Desktop/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`, especially sections 3–10, 13, 18, 20–24, plus the owner's clarification: directly improve unfinished rooms; no Classic-room or opt-in migration product is required.

Figma review boards:

- [Four-room direction matrix](https://www.figma.com/design/5RwG3LC2YWU3QOcJ8DTUe9?node-id=14-2)
- [Woodland camera and composition book](https://www.figma.com/design/5RwG3LC2YWU3QOcJ8DTUe9?node-id=15-2)
- [Framework audit and production sequence](https://www.figma.com/design/5RwG3LC2YWU3QOcJ8DTUe9?node-id=16-2)

## Deliverables

- Four-room direction matrix: illustrated mood studies, palettes, material families, silhouette rules, lighting, exterior concepts and limits on motion.
- Framework audit: `framework-audit.md`; identifies inspected code, exact GLB roots, reusable behavior and replacement priorities.
- Woodland camera/composition plan: `woodland-camera-book.md`; measured baseline, proposed shot parameters, arrangement, interaction and visibility rules.
- Preliminary Procreate guide: `procreate-guide.md` and `woodland-window-template.svg`. The SVG is a registration guide, not finished exterior artwork.
- Figma boards include the direction matrix, Woodland camera/season studies and the audit/production sequence. Scene pictures are schematic composition studies, not Blender renders or approved final art.

## Approved direction versus this pass's proposals

Approved: Illustrated Nostalgia; four rooms; Snowy Mountain absorbed into seasonal Woodland; authored major furniture and viewpoints; personal memories remain central; layered exteriors; Blender owns static placement and Three.js owns behavior.

Proposed for review: warm timber walls with restrained rounded log accents, a square window with triangular transom, permanent compact fireplace by the rear-left sitting corner, a fixed upholstered timber chair with removable winter textile, and autumn dusk as the first proof scene. These establish a useful working composition without claiming the owner has chosen final architecture.

Marble remains an optional exterior experiment. The window asset contract should support authored image layers first; do not make generation services or a splat renderer a prerequisite for loading a room. No account, paid generation or external upload was initiated.

## Composition proof scope

Build a Woodland-only graybox using the three proposed views and existing book/archive interactions. Validate camera paths and the window opening on desktop and portrait screens. Test a rough layered exterior before painting finished seasonal scenes. Establish a baseline with the same device, viewport and quality settings before measuring improvements.

Exit gate: the scrapbook leads the desk composition; the window reads as depth rather than a sliding picture; all required functions have keyboard/touch access; shelf, chair, case and window do not intersect; reduced motion holds atmosphere steady; repeated season/room changes settle rather than accumulating GPU assets. Budget goals from the PDF (<250 draws and approximately 80–150k visible triangles) are provisional measured targets, not guarantees.
