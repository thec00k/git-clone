# Licence report

Generated from licences/ledger.json (2026-10-10) by `node scripts/check-licences.mjs --report`. Do not edit by hand.

| Status | Entries | Files |
| --- | --- | --- |
| unverified | 9 | 98 |
| ai-generated | 2 | 3 |
| documented | 6 | 25 |
| verified | 2 | 15 |
| original | 6 | 158 |

Status meanings: **unverified**: Origin or licence unknown, or contains such parts. Replace or remodel before public launch. **ai-generated**: Made with an image generator. Check the tool's terms; may not be protectable by copyright. **documented**: Licence known from the source, but no saved proof yet. Save a dated copy to move it to verified. **verified**: Licence known and a copy of the licence or receipt is stored (licences/proof/ or a file shipped with the asset). **original**: Made for Keepsake; the source files or scripts are in this repository.

## unverified

### original-furniture

- **Files:** 63 (42 shipped, 31.1 MB shipped)
- **Author / origin:** Keepsake project (scripted in art/pipeline/build-furniture-variants.py) (mixed)
- **Licence:** Original geometry; contains inherited wood normal maps of unknown origin
- **Why:** Wood materials reuse the 'Keepsake_Detail_wood_*' normal maps loaded from art/woodland/woodland.blend (inherited, origin unknown).
- **Next action:** Replace those normal maps with generated ones (like art/woodland-study/generate-textures.py) and re-export; the geometry itself is scripted and original.

### legacy-woodland

- **Files:** 7 (2 shipped, 12.8 MB shipped)
- **Author / origin:** Prior contributors + Keepsake project (mixed)
- **Licence:** Inherited parts unknown; added details original
- **Why:** Built on the inherited room. Not used at runtime any more, but feeds the furniture pipeline (wood normals) and the Woodland study build.
- **Next action:** Retire once nothing loads from it.

### woodland-study-room

- **Files:** 4 (1 shipped, 6.2 MB shipped)
- **Author / origin:** Keepsake project, built by art/woodland-study/build.py on top of the inherited woodland.blend (mixed)
- **Licence:** Mixed
- **Why:** build.py keeps these objects from the inherited scene; the walls, hearth, floor, materials and textures are new and original.
- **Inherited objects to remodel:** Desk, ks_book, ks_crt, ks_archive, ks_guestbook, ks_map, ks_shelf, ks_chair, ks_lamp, ks_door, ks_clock, ks_ceiling_switch, ks_window, Beanbag (CC BY, see sketchfab-beanbag)
- **Next action:** Remodel the kept objects from scratch (or swap in CC0/original furniture variants) so the default room has no inherited geometry. This is the most important remodel.

### beachfront-room

- **Files:** 5 (2 shipped, 13.2 MB shipped)
- **Author / origin:** Keepsake project on top of inherited furniture (mixed)
- **Licence:** Mixed
- **Why:** art/beachfront/asset-ledger.json lists inherited furniture with no licence.
- **Next action:** Rebuild on original/CC0 furniture during the Beachfront art pass.

### neon-city-room

- **Files:** 2 (1 shipped, 2.9 MB shipped)
- **Author / origin:** Keepsake project (art/cyberpunk/build.py) keeping the shared room anchors (mixed)
- **Licence:** Mixed
- **Why:** Retains shared interaction anchors from the inherited room; needs the same object check as Woodland.
- **Next action:** Audit which inherited objects remain when Neon City is next built.

### sky-castle-room

- **Files:** 2 (1 shipped, 1.4 MB shipped)
- **Author / origin:** Keepsake project (art/sky-castle/build.py) built from an imported copy of the Woodland room, keeping the shared room anchors (mixed)
- **Licence:** Mixed
- **Why:** build.py imports public/room/woodland/woodland.glb and keeps its shared interaction anchors, so it inherits the Woodland provenance question.
- **Next action:** Audit which inherited Woodland objects remain when Sky Castle is next built.

### sample-photos

- **Files:** 7 (7 shipped, 1.8 MB shipped)
- **Author / origin:** Unknown (added with the first MVP, Aug 21 2026) (unknown)
- **Licence:** Unknown
- **Why:** Seed scrapbook photos with no recorded source.
- **Next action:** Replace with your own photos or CC0 photos and record each one here.

### legacy-textures

- **Files:** 4 (4 shipped, 0.9 MB shipped)
- **Author / origin:** Unknown (added with the first MVP, Aug 21 2026) (unknown)
- **Licence:** Unknown
- **Next action:** Replace with generated textures (see art/woodland-study/generate-textures.py) or CC0 textures from Poly Haven / ambientCG.

### world-maps

- **Files:** 4 (4 shipped, 3.8 MB shipped)
- **Author / origin:** Unknown ('inherited map provenance') (unknown)
- **Licence:** Unknown
- **Next action:** Replace with Natural Earth (public domain) outlines; record the download here.

## ai-generated

### sky-castle-atlas-parchment

- **Files:** 1 (0 shipped, 0.0 MB shipped)
- **Author / origin:** Image-generation tool (prompt recorded in docs/sky-castle-room.md); embedded in public/maps/world-sky-castle.svg (ai-generated)
- **Licence:** Depends on the tool's terms; likely not copyrightable in the US
- **Next action:** Owner to decide: confirm the tool's terms allow commercial use, or commission a replacement with the window scenery.

### room-prints-ai

- **Files:** 2 (2 shipped, 5.5 MB shipped)
- **Author / origin:** Image-generation tool, Sep 8 2026 (ai-generated)
- **Licence:** Depends on the tool's terms; likely not copyrightable in the US
- **Next action:** Confirm the tool's terms allow commercial use, or replace with commissioned or hand-made prints.

## documented

### paper-slide-sound

- **Files:** 1 (1 shipped, 0.0 MB shipped)
- **Author / origin:** Mixkit (third-party)
- **Licence:** Mixkit Sound Effects Free License
- **Next action:** Save a dated copy (PDF or screenshot) of the Mixkit licence page and the item page into licences/proof/ to move this to verified.

### sketchfab-beanbag

- **Files:** 4 (2 shipped, 3.3 MB shipped)
- **Author / origin:** Twisty_z (third-party)
- **Licence:** CC-BY-4.0
- **Next action:** Save the Sketchfab page showing the CC BY licence (dated) into licences/proof/.

### sketchfab-lamp

- **Files:** 4 (2 shipped, 2.4 MB shipped)
- **Author / origin:** Jeff Meunier (third-party)
- **Licence:** CC-BY-4.0
- **Next action:** Save the Sketchfab page showing the CC BY licence (dated) into licences/proof/.

### cc0-chairs

- **Files:** 7 (4 shipped, 1.5 MB shipped)
- **Author / origin:** Kenney (Desk Chair, Poly Pizza); Ethan Place (School Chair 01, Poly Haven) (third-party)
- **Licence:** CC0-1.0
- **Next action:** CC0 needs no credit; save the source pages for the record.

### cc0-patterns

- **Files:** 2 (0 shipped, 0.0 MB shipped)
- **Author / origin:** Poly Haven (third-party)
- **Licence:** CC0-1.0

### paper-textures

- **Files:** 7 (3 shipped, 0.5 MB shipped)
- **Author / origin:** Keepsake project, rendered with @paper-design/shaders-react 0.0.81 (original)
- **Licence:** Original renders; check the shader library licence
- **Next action:** Confirm the @paper-design/shaders licence allows commercial use of rendered output and save it to licences/proof/.
