# Neon City and Sky Castle: art-direction review

Reviewed 2026-10-11 against `codex/foundations-and-seasons` at `16c7bf0`. Nothing was merged or changed; this file is the only output.

Sources: `Keepsake_New_Art_Direction_and_Room_Production_Bible.pdf` (sections 1, 3, 4, 7, 10, 12, 21–24), `docs/art-direction/README.md`, `docs/v4-decisions.md`, and the owner decisions of 2026-10-09/10 (Project file `claude/owner-decisions-2026-10-09.md`). Where the owner and the PDF differ, the owner wins (see "Ground rules").

## Short answer

| Room | Where it is | Fits the direction? | Recommendation |
| --- | --- | --- | --- |
| Neon City (`cyberpunk`) | Already on `codex/foundations-and-seasons` (and `main`) since `7e74a9a`. There is no separate Neon branch to merge. | Identity is right; execution is the "too many glowing things" problem the PDF warns about. Scrapbook does not lead the frame. | Keep it selectable as is. Do not polish it now. Rebuild as Neon City 2.0 after Woodland 2.0 and Beachfront, with a short list of restraint fixes allowed earlier. |
| Sky Castle (`codex/sky-castle-room`, 2 commits on top of `7e74a9a`) | Not integrated. The base branch currently maps a saved `sky-castle` room back to Woodland. | Anchor contracts and the real-world atlas are good. The look conflicts: flat pearl-white interior, cold lighting, glass furniture, and a fully modelled castle instead of painted layers. | Do not merge the branch. Keep it as reference. Harvest the reusable parts into a fresh branch from the base when Sky Castle's turn comes, and repaint the look. |

## Ground rules used for this review

- Four rooms: Woodland Retreat, Beachfront, Neon City, Sky Castle (PDF §1, §24.22). Owner order: Woodland and Beachfront first, then Neon City and Sky Castle (roadmap: Q2 2027). Owner: Sky Castle "need not wait for Woodland", so it may start earlier if there is capacity, but the PDF says not to rebuild all rooms at once (§20, phase 8).
- Illustrated Nostalgia (§3): photos and scrapbook are the protagonists; warm local interior light against cooler exterior light; materials share one roughness/edge/colour language; evidence of life; restrained animation.
- Major furniture is authored per room, not swapped (§1). Personalisation lives in small objects.
- Exteriors are 2.5D layers, not distant 3D geometry (§1, §7). **Owner override:** the layers will be commissioned **pixel art**, not Procreate paintings. Both point the same way for these rooms: stop modelling the far world.
- Shared room systems on the base branch that every room will eventually need: seasons and holidays (`src/lib/seasons.ts`, `HolidayDecor`), room ageing (`roomAge.ts`, `DustBunnies`), outdoor weather, free room swapping, legacy-id fallback (`LEGACY_ROOM_IDS`).
- Acceptance checklist for a "professional" room: PDF §22.

## Neon City

Evidence: `art/room-screenshots/neon-city-room.jpg` and `window-views/neon-city-window.jpg` (committed screenshots), `docs/neon-extras-and-chair.md`, `RoomScene3D.tsx`, `RoomModel.tsx`, `RoomLighting.tsx`, `OutdoorWeather.tsx`. The screenshots may predate the latest Neon Extras.

### What fits

- The fantasy is right: "late-night Y2K / future nostalgia" (PDF §4). Dark graphite walls, CRT, rounded window, pink/cyan practicals read as Neon City at a glance.
- It keeps the shared skeleton: desk, chair, CRT, archive, shelf, map, time capsule (metal variant) and door all sit on the standard anchors.
- Budgets are inside current limits: GLB about 2.93 MiB, 176,596 triangles, 316 primitives (limits 8 MiB / 180k / 350). Historical warm-cache sample 487 draws, 12.5 ms p95 (`room-performance-pass.md`). The PDF's direction is "improve composition and material hierarchy rather than adding geometry" (§12), and it is already at the triangle ceiling.
- Good engineering habits to keep: Snake poster only animates when visible and stops for reduced motion; cherry/heart signs share one slot; outdoor rain/snow uses the shared weather layer with a Neon palette; per-room decor survives room switches and backups.

### What conflicts

1. **Too many competing emissives.** Window outline, a full-height pink wall strip, hexagon wall lights, lava lamp, jellyfish lamp, luminous mushrooms, cherry/heart sign, Snake poster and door channels all glow at once. PDF §21: the Neon proof is about "preventing neon, holograms, shaders, reflections and CRT effects from competing". §10: "keep as a special-case room but reduce simultaneous effects".
2. **The scrapbook does not lead.** In the room view the book is a dark rectangle on a dark desk; the brightest things are the window and the lamps. The task lamp is switched off for Neon in `RoomLighting.tsx` (`lampOn && !neon`), so nothing warm falls on the desk. PDF §3 lighting hierarchy: scrapbook first.
3. **The skyline is modelled and repetitive.** Flat box towers with repeated "ARCADE / LUNA / NIGHT" signs. It reads as a placeholder rather than layered depth (sky, distant skyline, mid skyline, near signage, rain on glass; PDF §7). Under the owner decision this becomes commissioned pixel-art layers.
4. **Generic furniture.** The desk, chair, cabinet and stool look like recoloured shared pieces rather than a Neon asset family (graphite, plastic, alloy; PDF §4, §9). The Honey chair and furniture swapping still apply here, which the PDF retires.
5. **Little evidence of life.** No receipts, cables, stickers, leaning media, worn edges. The room is tidy and empty under the lights.
6. **Missing shared systems.** Neon gets no holidays, no ageing and no seasonal change (`RoomModel.tsx` gives `HolidayDecor` and `DustBunnies` only to Woodland and Beachfront). The owner wants every room to change with seasons and holidays.

### Recommended plan for Neon City

- **Now:** leave it live and selectable. No merge is needed; it is already on the base branch. Avoid new Neon features (PDF §24.20: no new room features until the pipeline is proven).
- **Small restraint pass, allowed any time (one reviewable PR, no new assets):** give the desk a cool-white task light so the book reads first; drop the full-height wall strip or dim it to an accent; cap the room at two or three lit practicals at once (window rim plus one desk light plus at most one decor sign). This is tuning, not a rebuild.
- **Neon City 2.0 (after Woodland 2.0 and Beachfront):** authored Neon furniture family in Blender; pixel-art skyline layers with isolated animated signs and a rain-on-glass layer; a Neon Camera Book; Neon variants for holidays and ageing (for example a paper lantern in the window rather than more neon); measure against §22.
- **Memories:** none of this touches photos, books, pins, scans or notes. Room records stay keyed `cyberpunk` so nobody's saved room moves.

## Sky Castle

Evidence: branch `codex/sky-castle-room` (`5fc9542`, `847b754`), `keepsake/docs/sky-castle-room.md` on that branch, review renders in `art/sky-castle/review/` (`day-room.png`, `night-room.png`, `window.png`), and the diff against `7e74a9a` (51 files, about 9.8k lines, most of it generated JSON/SVG and binaries).

### What fits

- **Anchor discipline.** Every functional root (`Desk`, `ks_book`, `ks_shelf`, `ks_map`, `ks_window`, `ks_archive`, `ks_clock`, `ks_crt`, `ks_lamp`, `ks_door`, chair pivot) keeps its world position and parent. That is exactly the "same functions, different fiction" skeleton (§4) and makes later integration cheap.
- **Real-world atlas.** `public/maps/world-sky-castle.svg` keeps all 339 country paths at the same coordinates and only changes the presentation (parchment and cloud ornament). Pins and photo locations are unaffected. Owner-requested and worth keeping.
- **Split window-sill shelves.** The two rounded shelves solve a real collision (straight sill crossing the round frame) and the validation ray-casts prop footprints. Good template for authored sill anchors (§2: "a few small objects only").
- **Compact core asset.** About 1.40 MiB, 135,416 triangles, 230 primitives. Static cloud masks, no volumetric ray marching, reflection environment installed only while the room is mounted.
- **Reduced motion and hidden-tab handling** for waterfalls and cloud drift.
- **Time capsule variant** keeps all nine original chest nodes and the lid pivot, adds 248 triangles, one non-shadowing light.
- **Memory-safe switching.** Switching only touches theme, environment appearance and per-room decor; books, pages, photos, pins, archive and currency are untouched.

### What conflicts

1. **The interior does not read as Illustrated Nostalgia.** Pearl walls, white furniture and white cabinet sit at nearly the same value. There is no warm local light: the branch scales the desk lamp to 28% and the ceiling to 1.25 in `RoomLighting.tsx`, and sun/hemisphere colours are cool. At night the window darkens but the room stays daylight-bright, so there is no warm-inside/cool-outside contrast (§3). The PDF asks for "human clutter inside fantastical architecture" and "worn scrapbook, mug, photos, books, CRT, letters" (§4, §21); the renders show a clean showroom.
2. **The scrapbook does not lead.** A small brown book on a transparent desk, in front of a large bright window with a castle in it. The castle is the protagonist.
3. **Glass desk and chair.** Transparent quartz loses the silhouette and shadow the PDF relies on for readability (§3: silhouettes, bevels), and makes the chair nearly invisible against the floor.
4. **The far world is modelled.** A full 3D castle island, five waterfall ribbons and cloud sea, moved to Z −24 with the camera far plane raised from 40 to 90 m for this room. PDF §21 calls Sky Castle "the most painterly of the four rooms" and says to get scale "through illustration rather than increasing camera range and geometry". Under the owner decision that means pixel-art layers, keeping only selective waterfall/cloud motion.
5. **Furniture swapping.** The branch extends `RoomFurnitureChoices` and the furniture allowlist to `sky-castle`, and its chair uses "the existing furniture-replacement naming patterns". The PDF retires major furniture swapping.
6. **Generated artwork and licences.** `art/sky-castle/atlas-parchment.png` was made with an image generator. The base branch's licence ledger (`licences/ledger.json`) is enforced in CI and has no Sky Castle entries, so the branch would fail CI as is; the parchment would need an `ai-generated` entry, and the owner may prefer commissioned art for a shipped room.
7. **Out of date with the base.** It branched before seasons, holidays, ageing, free room swapping, the legacy-id cleanup, Prettier and the licence ledger. 17 files changed on both sides (`roomThemes.ts`, `RoomScene3D.tsx`, `RoomLighting.tsx`, `RoomModel.tsx`, `themes.ts`, `useActiveRoom.ts`, `furniture.ts`, `roomBackup.ts`, `types/app.ts`, `TimeCapsuleChest.tsx`, `SillDecoration.tsx`, `RoomWorldMap.tsx`, `FurnitureModels.tsx`, `ShopRoomVariants.tsx`, `ui-theme.css`, `check-room-themes.mjs`, `refresh-room-assets.mjs`). Its `ownsRoomTheme` still gates rooms behind ownership, which the owner removed. A merge would conflict and partly undo base work.
8. **`sky-castle` is currently a legacy id on the base.** `LEGACY_ROOM_IDS` in `src/lib/roomThemes.ts` sends it to Woodland, and `normalizeLegacyRooms` deletes its per-room layout. Integration must remove it from that list in the same change that registers the room, or any saved Sky Castle layout is dropped.

### Recommended plan for Sky Castle

- **Do not merge `codex/sky-castle-room`.** Keep it published as reference, like Snowy Mountain.
- **When Sky Castle is scheduled, start a fresh branch from `codex/foundations-and-seasons` and bring pieces across by hand:**
  1. Registry: add `sky-castle` to `RoomThemeId`, live rooms, backup validation, asset registry; remove it from `LEGACY_ROOM_IDS` in the same commit. Keep free swapping (no ownership check). Do not extend furniture choices.
  2. Keep: anchor contract, `world-sky-castle.svg` and `build-sky-map.mjs`, split sill shelves, time capsule variant, reduced-motion handling, budget checks, browser check scripts (updated to the current app).
  3. Rework the look in Blender before shipping: warmer stone and parchment, opaque furniture with clear silhouettes (gold or pale timber with a little pearl, not quartz), one warm practical on the desk, a darker interior at dusk/night, and lived-in clutter on the authored anchors.
  4. Replace the 3D castle and waterfalls with pixel-art layers (sky, cloud ocean, distant islands, castle silhouettes, near cloud bank), with selective waterfall/cloud motion; drop the far-plane exception.
  5. Hook into seasons, holidays and ageing with Sky Castle variants.
  6. Add licence ledger entries for every new file; decide whether the generated parchment ships or is replaced by commissioned art.
- **Memories:** books, photos, pins, scans and notes stay untouched by all of the above, as they are today.

## Decisions for the owner

1. Is the small Neon restraint pass (desk light, fewer glowing objects) welcome now, or should Neon stay frozen until its 2.0 rebuild?
2. Should Sky Castle start early (owner said it need not wait for Woodland) or wait its turn after Beachfront, as the PDF suggests?
3. May the AI-generated parchment behind the Sky Castle map ship, or should it be commissioned with the pixel-art scenery?
