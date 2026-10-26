# Beachfront, Neon City and Sky Castle: lighting pass (October 26, 2026)

The same pass Woodland had on October 17 ([woodland-lighting-review.md](woodland-lighting-review.md)), applied to the other three rooms. Lens, as before: the art bible's lighting hierarchy (scrapbook first, desk objects second, window third), warm local light against a cooler room at dusk and night, and paper that stays near neutral.

Method: dev server, `scripts/capture-room.mjs` (960 x 600, software rendering, fixed date 20 July 2027, default start view, balanced quality) at day, dusk and night for each room, then pixel measurements on a few hand-picked patches. Before and after pictures are in [`lighting-pass/other-rooms/`](lighting-pass/other-rooms/) as JPEGs (the Woodland pass kept PNGs; these are smaller to keep the repository light).

Intensities only: no light was added, removed or hidden (`check-constant-lights` passes), no post-processing, no asset changes. Woodland's values are unchanged and now sit in the same table as the other rooms' (`GRADES` in `RoomLighting.tsx`).

## What looked off

| Room | Finding | Evidence |
| --- | --- | --- |
| Beachfront | **Night and dusk looked like day indoors.** The ceiling light stayed at full strength at every hour and the fill stayed warm, so the night room was as bright as the day room and the small lamp pool was lost. The closed book was the darkest thing on the desk. | Night walls 71 against a desk of 76; book 54. Wall warmth (red to blue) 1.18 at night, the same warm cast as day. |
| Neon City | **Nothing lit the desk.** The task lamp was switched off for this room (`lampOn && !neon`), so the scrapbook was a dark rectangle on a dark desk while the window rim and wall signs were the brightest things in the frame (the October 11 review's finding 2). The violet ceiling light was at 3.2, the highest of any room. | Book 55 to 60 at every hour, under the wall sign and window glow. |
| Sky Castle | **Blown-out white at every hour.** Walls, floor and pillars measured 228 to 231 (of 255) by day, dusk and night alike; the night room was as bright as the day room, so there was no warm-inside, cool-outside contrast and the castle in the window was the only thing with any value range. | Wall 228, floor 230, desk 182 to 188 at all three hours. |

## What was changed

1. **Per-room grades** (`RoomLighting.tsx`): the five room lights (ambient, window sun, ceiling, desk lamp, sky fill) now read their strength from one table per room and hour instead of nested conditions. Beachfront eases the ceiling down at dusk (2.3 to 1.3) and night (0.85), raises the lamp so its pool leads (0.45 by day to 1.5 at dusk and 1.9 at night), and takes a cool blue-grey sky and ground fill at night. Neon City turns the lava lamp into the task light (1.3 by day, 1.8 at night, a pale peach-pink so paper stays paper) and lowers the violet ceiling light (3.2 to 2.0 by day, 1.3 at night). Sky Castle's lights are all lower than Woodland's because the room is white, with a warm lamp pool at night.
2. **Sky Castle's studio reflection** (`SkyCastleFinish.tsx`): the room's materials take a studio environment for the crystal's sparkle, and it turned out to light the white plaster and marble far more than the room lights do. Setting every light to zero left the walls at 228; removing the environment dropped them to 34; the per-material `envMapIntensity` already in the file had no visible effect on them. The scene's `environmentIntensity` is now graded with the hour (0.45 by day, 0.2 at dusk, 0.07 at night) and reset when the room is left. Measured on the night room before choosing: 0.5 gave walls of 201, 0.25 gave 162, 0.12 gave 118, 0.06 gave 84 with a desk of 107, 0.03 gave 62.

## Before and after measurements (960 x 600, default view)

Brightness is 0 to 255; warmth is the red-to-blue ratio (1.0 is neutral, higher is warmer).

| Room, hour | Patch | Before | After |
| --- | --- | --- | --- |
| Beachfront night | Walls | 71, warmth 1.18 | 46, warmth 0.99 |
| Beachfront night | Desk top | 76 | 63 |
| Beachfront night | Closed book | 54 (darker than the walls) | 62 (brighter than the walls) |
| Beachfront dusk | Walls | 109 | 102 |
| Beachfront dusk | Closed book | 65 | 71 |
| Beachfront day | Everything | unchanged | unchanged |
| Neon City night | Closed book | 55 | 67 |
| Neon City night | Walls | 10 | 10 |
| Neon City day | Closed book | 60 | 68 |
| Sky Castle night | Walls | 228 | 91 |
| Sky Castle night | Closed book | 144 | 68 |
| Sky Castle night | Desk top | 224 | 118 |
| Sky Castle dusk | Walls | 228 | 169 |
| Sky Castle day | Walls | 231 | 206 |

Limits: software rendering, a few hand-picked patches, direction of change rather than an acceptance score. No frame-rate claim: nothing was added, so no cost is expected, but that is not measured.

## Still open (not lighting)

- The Beachfront lamp is a very small pale shade; its pool is right but the fixture itself barely reads as lit. A Blender touch.
- Neon City still has more lit practicals at once than the October 11 review recommended (window rim, wall strip, hexagons, two lamps, signs). Dimming or removing some is a decor decision for the owner, not a lighting value.
- Sky Castle's glass desk and chair now show a silhouette at dusk and night, but still vanish into the floor by day, and the castle outside is modelled, not painted (the bible's painted-layer direction). Both are asset work.
- None of the three rooms has approved camera-book views like Woodland's `?view=` set, so these shots use the default start view only.
