# Licence report

Generated from licences/ledger.json (2026-10-19) by `node scripts/check-licences.mjs --report`. Do not edit by hand.

| Status | Entries | Files |
| --- | --- | --- |
| unverified | 3 | 14 |
| ai-generated | 3 | 11 |
| documented | 10 | 100 |
| verified | 2 | 15 |
| original | 6 | 226 |

Status meanings: **unverified**: Origin or licence unknown, or contains such parts. Replace or remodel before public launch. **ai-generated**: Made with an image generator. Check the tool's terms; may not be protectable by copyright. **documented**: Licence known from the source, but no saved proof yet. Save a dated copy to move it to verified. **verified**: Licence known and a copy of the licence or receipt is stored (licences/proof/ or a file shipped with the asset). **original**: Made for Keepsake; the source files or scripts are in this repository.

## unverified

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

- **Files:** 3 (3 shipped, 0.2 MB shipped)
- **Author / origin:** Unknown ('inherited map provenance') (unknown)
- **Licence:** Unknown
- **Next action:** Replace with Natural Earth (public domain) outlines; record the download here.

## ai-generated

### legacy-woodland

- **Files:** 7 (0 shipped, 0.0 MB shipped)
- **Author / origin:** Keepsake project (built in Blender for Keepsake); textures by Poly Haven; botanical print from an image generator (mixed)
- **Licence:** Original geometry; textures CC0 from Poly Haven; embeds the AI-generated woodland-fern-v1 print (see room-prints-ai)
- **Next action:** Settled with room-prints-ai (confirm the image tool allows commercial use).

### snowy-keepsakes

- **Files:** 2 (1 shipped, 8.7 MB shipped)
- **Author / origin:** Keepsake project (deer and bear mounts and hide rug built in Blender for the Snowy Mountain room, art/snowy-mountain/build.py on codex/snowy-mountain-room); rug fur image from an image generator (mixed)
- **Licence:** Original geometry and procedural coat textures; the rug's marbled fur image (marbled-fur.png) was made with the built-in image generator, prompt recorded in docs/snowy-mountain-room.md on that branch
- **Next action:** Confirm the image tool's terms allow commercial use (as for room-prints-ai), or replace the rug's fur image with a hand-made or commissioned one.

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

### original-furniture

- **Files:** 63 (42 shipped, 31.1 MB shipped)
- **Author / origin:** Keepsake project (scripted in art/pipeline/build-furniture-variants.py); fabric normal map by Poly Haven (mixed)
- **Licence:** Original geometry and procedural wood maps; fabric normal map is CC0 (Poly Haven fabric_pattern_07)
- **Next action:** Save a dated copy of the Poly Haven fabric_pattern_07 page (see cc0-patterns) to move this to verified.

### woodland-study-room

- **Files:** 5 (1 shipped, 8.7 MB shipped)
- **Author / origin:** Keepsake project (built in Blender for Keepsake; art/woodland-study/build.py) (mixed)
- **Licence:** Original geometry and textures (the rug's fur image is covered by snowy-keepsakes)
- **Inherited objects to remodel:** ks_book (placeholder, hidden behind the live scrapbook), ks_ceiling_switch (invisible anchor)
- **Next action:** Nothing blocks launch. The furniture was remodelled on 2026-10-19 (art/woodland-study/furniture-remodel.py); the CRT keeps its approved October 17 remodel.

### beachfront-room

- **Files:** 5 (2 shipped, 13.2 MB shipped)
- **Author / origin:** Keepsake project (built in Blender for Keepsake); textures by Poly Haven (mixed)
- **Licence:** Original geometry; textures CC0 from Poly Haven
- **Next action:** Save dated copies of the Poly Haven pages listed in licences/proof/polyhaven-textures/ to move this to verified.

### neon-city-room

- **Files:** 2 (1 shipped, 2.9 MB shipped)
- **Author / origin:** Keepsake project (art/cyberpunk/build.py, built in Blender for Keepsake); textures by Poly Haven (mixed)
- **Licence:** Original geometry; textures CC0 from Poly Haven
- **Next action:** Save dated copies of the Poly Haven pages listed in licences/proof/polyhaven-textures/ to move this to verified.

### paper-textures

- **Files:** 7 (3 shipped, 0.5 MB shipped)
- **Author / origin:** Keepsake project, rendered with @paper-design/shaders-react 0.0.81 (original)
- **Licence:** Original renders; check the shader library licence
- **Next action:** Confirm the @paper-design/shaders licence allows commercial use of rendered output and save it to licences/proof/.
