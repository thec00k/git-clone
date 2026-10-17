# Woodland cabin: lighting and material feel review (dusk proof scene)

Reviewed at the three approved camera views (Establishing, Desk, Window) in the autumn dusk proof scene, against the art bible and `woodland-camera-book.md`. Lens: the bible's rules that "warm localized interior lights contrast with cooler exterior light at dusk/night", that lighting follows attention (scrapbook first, desk objects second, window third, storage fourth, the rest fifth), and the camera book's "keep the scrapbook white point neutral enough that photographs do not look permanently amber".

Method: dev server, `scripts/capture-room.mjs` (960 x 600, software rendering, fixed date 10 October 2026, dusk), then simple pixel measurements of the saved screenshots. The graphics and QA skills were used as checklists only (key/fill/rim, exposure, clipping, luminance contrast, hierarchy). Where they differ from the art bible, the bible wins: no bloom or other extra effects were added, and no paid generation services were used.

Before and after pictures are in `lighting-pass/` (`before-*.png`, `after-*.png`).

## Ranked findings (biggest effect on the picture first)

| # | What looks off | Evidence | Status |
| --- | --- | --- | --- |
| 1 | **The "dusk" window looks like warm daytime.** The exterior is tan and beige and is the brightest thing in the frame, so there is no warm-inside, cool-outside contrast and the window competes with the desk. | Window area average brightness 158 (desk top 121), red-to-blue ratio 1.34 to 1.46 (warm). | Fixed in this PR |
| 2 | **One flat amber wash over the whole room.** The ceiling light is the same strength at dusk as at midday and nothing is cool, so walls, floor and desk are all orange and the lamp pool does not stand out. Scrapbook-first is lost. | Wall red-to-blue ratio 2.3 to 2.7, colour saturation 0.62 to 0.64, desk top barely brighter than the walls. | Fixed in this PR |
| 3 | **Harsh lamp hot spot and amber paper.** The desk lamp burns out the wall behind it, and white paper on the desk comes out cream-orange, so photos would look permanently amber. | 15% of the back-wall pixels fully clipped; loose paper 77% clipped, red-to-blue 1.37. | Fixed in this PR |
| 4 | **The closed scrapbook is the darkest object on the desk.** Dark brown cover on a mid-brown desk: it reads as a shape, not as the glowing centre of the scene. Paper is not visible until it opens. | Cover brightness about 41 against desk 111. | Not fixed: needs a cover tone or edge decision (Blender material), or a very soft book-focused light. |
| 5 | **Log walls read as repeated stripes.** Same highlight and shadow band on every course, little variation in roughness or tone, so walls look like a pattern instead of timber with age. | Visible in Establishing and Window views. | Not fixed: material work in the Blender source. |
| 6 | **Window frame goes almost black** in the Window view and has no catch-light on its bevels, so the opening reads as a hard dark cut-out. | Window view. | Not fixed. |
| 7 | **Metals look matte.** Aged brass and warm iron have no environment to reflect (the room has no environment map), so lamp rim, drawer pull and hinges look dull rather than metallic. | Desk view lamp base and pull. | Not fixed: a small generated environment map would help, to be tried with a careful look at keeping it cool and dim. |
| 8 | **Night and winter grades have not had this pass.** The ceiling light is still the same strength at night, which is not "restrained practical light". | Code review only; not captured. | Not changed on purpose (no before/after evidence yet). |
| 9 | **Exterior layers are flat colour.** The six paint layers have no haze or value steps between them and the sun is a flat disc. | Window view. | Art task (the painted exterior is already planned). |
| 10 | **Hearth view not reviewed.** The capture failed three times under software rendering in this session. | n/a | Open. |

## What was changed (top three)

All changes apply only to the Woodland room at dusk. Day, night, Beachfront and Neon City lighting values are unchanged.

1. **Cool, dimmer dusk exterior** (`WoodlandStudyExterior.tsx`): the autumn dusk sky and distant ridge layers now use a blue-grey, desaturated palette with a warm horizon glow, while the rust mid-ground stays autumn. The window is now clearly the third thing in the hierarchy, and it supplies the cool half of the contrast.
2. **Cool fill and a quieter ceiling light at dusk** (`RoomLighting.tsx`): the ceiling light drops from 3.2 to 1.1, the ambient and sky fill turn a soft blue-grey, and the window light is a pale peach rather than saturated orange. Walls and floor are less orange and the desk lamp pool now leads.
3. **Softer, less amber desk lamp** (`RoomLighting.tsx`): lamp colour is a lighter warm tone and slightly lower power, which stops the wall burning out and lets white paper read as paper.

Nothing else in the render pipeline changed: no new lights, no post-processing, no new dependencies, no change to tone mapping, shadows, assets or the scrapbook's own colours.

## Before and after measurements (960 x 600 screenshots)

| Measure | Before | After |
| --- | --- | --- |
| Window area brightness (Establishing) | 158 | 136 |
| Window area warmth (red-to-blue) | 1.34 | 1.05 (neutral to cool) |
| Wall warmth, left wall (red-to-blue) | 2.56 | 2.05 |
| Desk top clipped pixels (Establishing) | 5.8% | 2.3% |
| Back wall clipped pixels (Desk view) | 14.7% | 8.0% |
| White paper on desk: red-to-blue (1.0 is neutral) | 1.37 | 1.22 |
| White paper on desk: fully clipped pixels | 77% | 12.5% |
| Desk top brightness vs Establishing walls (lamp pool lead) | 103 vs 52 to 62 | 93 vs 31 to 41 |

Limits of these numbers: they come from screenshots on software rendering, are measured on a few hand-picked patches, and show the direction of change, not an acceptance score. White paper is still slightly warm by design (lamp light), within the "neutral enough" intent; no change was made to scrapbook paper, photo or text colours.

## Frame rate

No frame-rate claim is made. Software rendering cannot say anything about real devices. The changes do not add lights, passes or textures, so no cost is expected, but that is not measured.

## Suggested next steps

Items 4 to 6 above (cover contrast, wall material variation, window trim catch-light), then the same pass on the night and winter grades with captures, then the hearth view.
