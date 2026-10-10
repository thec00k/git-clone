# Commission brief: Woodland window scenery and holiday art

Status: draft for the owner to send to artists, October 10, 2026. The provisional painted layers in `src/components/room3d/WoodlandStudyExterior.tsx` and the paper-craft holiday shapes in `HolidayDecor.tsx` are placeholders that this commission replaces.

## What Keepsake is
A calm, nostalgic 3D room where people keep scrapbooks of their photos. Art direction: **Illustrated Nostalgia** (see `docs/Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf`): warm, hand-made, soft light, nothing loud or glossy. References in spirit: *What Remains of Edith Finch*, *Firewatch*, *Sly Cooper*, *LittleBigPlanet*.

## 1. Window scenery (pixel art, layered)
- **View:** a forest valley seen from a cabin window: distant mountains, mid-ground ridges, a winding stream, two near trees framing the view, foreground undergrowth.
- **Layers:** 6 separate transparent PNGs, back to front: sky, far mountains, far ridge, mid ridge with stream, near trees, foreground. The app shifts them slightly with the camera for depth, so each layer must extend about 10% past the frame on every side.
- **Size:** each layer 2048 x 1536 px (4:3), PNG with alpha. Pixel art at a native resolution of 512 x 384, scaled up 4x with nearest-neighbour, is ideal.
- **Variants (12 sets):** 4 seasons (spring blossoms and fresh green; summer deep green; autumn amber and rust; winter snow) x 3 times of day (day, dusk, night with stars and a moon).
- **Optional:** a simple 2- to 4-frame loop for snowfall, falling leaves, fireflies (summer night). Everything must look right when held still, because users with reduced motion see no animation.
- **Palette:** muted and warm. Avoid pure black and fully saturated colours. Night is deep blue, not black.

## 2. Holiday dressing (inside the room)
Small props placed on the mantel, on the window and beside the hearth. Delivered either as low-poly 3D models (glTF/GLB, under 3k triangles each, one 512 px texture) or as flat illustrated cut-outs (PNG with alpha) that we mount on cards. Paper-craft style fits the scrapbook theme.
- **Christmas:** mantel garland, three stockings, a small tree beside the hearth.
- **Halloween:** three pumpkins (one carved, softly lit), paper bats for the wall.
- **Valentine's Day:** paper-heart garland for the window, small hearts for the mantel.
- **Easter:** a basket of pastel eggs, tulips in a vase.
- **Fourth of July:** red, white and blue bunting for the window, a small flag.

## 3. Deliverables and rights
- Layered source files (Aseprite, PSD or Krita) plus the exported PNGs or GLBs.
- **Licence:** exclusive or non-exclusive commercial rights to use, modify and display in the Keepsake website and apps, with no attribution required in the room. State it in writing. Record it in `docs/asset-licenses.md`.
- **Do not** use AI-generated imagery or other artists' work. Original work only.
- Milestones: sketches of one season, then one full set (autumn, all three times of day), then the rest. Payment per milestone.

## 4. Technical notes for us
- Exterior layers load into `WoodlandStudyExterior` (six planes at depths -19 to -3.7). Replace the canvas painting with texture loading keyed by season and phase.
- Holiday props replace the placeholder components in `HolidayDecor.tsx`; keep positions (mantel top y 1.04, front z 1.74; window opening x -1.12 to 0.82, top rail y 3.05).
- Check every set in the screenshot job (`.github/requests/browser-checks`, branch `ci-shots`).
