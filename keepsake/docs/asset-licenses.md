# Asset licences and provenance

Compiled 2026-10-10 from `art/*/asset-ledger.json`, `public/audio/ATTRIBUTION.md`, `public/artwork/README.md` and the code. The ledgers stay the source of truth; this page is the summary to read before anything is published. `scripts/check-asset-credits.mjs` keeps the CC-BY credits in the app in step with the ledger.

## Third-party assets with known licences

| Asset | Author / source | Licence | What is required | Status |
| --- | --- | --- | --- | --- |
| Bean Bag Chair | Twisty_z, Sketchfab | CC BY 4.0 | Credit, link, note of changes | In app credits (Settings > Help & profile) |
| Old vintage desk lamp | Jeff Meunier, Sketchfab | CC BY 4.0 | Credit, link, note of changes | In app credits |
| Desk Chair | Kenney, Poly Pizza | CC0 | None | Recorded |
| School Chair 01, Wooden Chair 01, Green Chair 01 (rejected), Book Pattern, fabric_pattern_07 | Poly Haven | CC0 | None | Recorded |
| Paper slide sound | Mixkit, sound effect 1530 | Mixkit Sound Effects Free Licence | No attribution; no resale or redistribution as a sound file | `public/audio/ATTRIBUTION.md` |
| Inter, Fraunces, Caveat | Fontsource packages from the Google Fonts families | SIL OFL 1.1 | Keep the licence with the files | `public/fonts/LICENSES` |
| Mellow Skies playlist (Purrple Cat) | SoundCloud / Bandcamp | Artist's terms | Played through SoundCloud's own player only; never copied or re-hosted | Linked, not distributed |

## Needs the owner's attention before public launch

1. **The original Woodland room.** `art/woodland/asset-ledger.json` says: "individual origins not recorded", "inherited asset provenance not independently verified", "commercial use: not verified". The base model (`public/room/keepsake.glb` and what Woodland and Beachfront inherited from it, including furniture and textures) has no known source or licence. Where did it come from? If it cannot be traced, replace or redraw those parts.
2. **Textures with no ledger entry:** `public/textures/` (`wood.jpg`, `leather.jpg`, `paper.jpg`, `grain.png`, three paper `.webp` files).
3. **AI-generated material.** The ledgers and `public/artwork/README.md` describe work made with an image-generation tool ("Codex-assisted", "built-in image generation tool"): the two room prints, and parts of the room. Check that the tool's terms allow commercial use. Separately, in the United States purely machine-generated images generally cannot be copyrighted, so nobody, including Keepsake, could stop others copying them. Commissioned and hand-made art does not have this problem.
4. **Map.** `room-world-map` has "inherited map provenance". The planned city map should use Natural Earth (public domain) and GeoNames (CC BY 4.0, credit required).
5. **Future scans.** Anything a user imports is theirs, but the terms of service must say they have the right to upload it.

## Rule going forward
Every asset that enters the repository gets a ledger line with author, source link, licence and what was changed, in the same commit. CC BY assets also get a credit in the app.
