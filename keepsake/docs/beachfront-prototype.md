# Beachfront — first playable slice

Beachfront is a separate asset in the same application. Select Drawer shop > Room variants > Preview Beachfront > Make this my room. Woodland can be restored through the same menu. The three other environments remain planned.

## Art direction

The user's updated palette is warm teak furniture, whitewashed shelf/cabinet wood, light beige boards, and sea-glass/ocean-breeze/baby-blue trim. The first authored shell adds an arched window, pale plaster, pleated sailcloth and curved string lights. The functional furniture layout is retained in this slice to verify portability of books, photos and interactions. The exterior uses a layered coastal scene, slow water movement, a sailboat, clouds, and weather. Ocean air/surf is synthesized locally when clear; music stays independent.

This is the first coastal art pass, not final bespoke furniture or exterior polish. The preview cards are labeled illustrated style studies, not screenshots of final assets.

## Source and export

Authoritative source: art/beachfront/beachfront.blend. Woodland's source and GLB are unchanged.

To reproduce from Woodland: run build-beachfront.py, let the Blender file change settle, then run coastal-palette.py in a separate Blender call, followed by window-clearance.py. export-beachfront.py explicitly selects visible assets for a later export. Do not export with an empty selection. All scripts guard or write only the separate Beachfront source paths.

Run node scripts/check-woodland.mjs --beachfront to validate the same functional anchor, contact, clearance and asset-budget contract as Woodland, plus window light clearance from curtains and ceiling. The gathered-curtain export is 4,961,008 bytes, 71,964 triangles, 71 materials, 280 primitives and 16 required anchors.

The window uses shorter gathered sailcloth side panels on individual rods outside the arch. The light strand follows the outer trim with a clear gap from the fabric; the old straight tieback bars have been removed. A fresh browser load was visually checked at night.

Blender now includes a labeled `Beachfront Scenery Preview (Blender only)` collection so the window no longer faces an empty background while authoring. Run `scenery-preview.py` after the room scripts to recreate it; optionally set `PHASE='dusk'` or `PHASE='night'` before executing it. This static preview supplies sky, ocean, waves, sun/moon, reflections, clouds and shoreline rocks. The app still creates its animated exterior in `BeachfrontScenery.tsx`. The exporter explicitly excludes preview objects to avoid doubling the scenery or covering the live day/night view.

## Coastal prop pass

`coastal-props.py` authors a reference-inspired knobbed conch with an amber aperture, open glass fishbowl with water/pebbles/copper fish on a teak coaster, glazed ceramic lamp with linen shade, and rounded modern digital clock. Run it after `window-clearance.py`, then `open-casements.py`, `scenery-preview.py` and `export-beachfront.py` to reproduce the current room. Clock and lamp retain their existing named interaction anchors; each new model has a separate `Beachfront_Prop_` object name for replacement. The live clock uses a cool white display and still keeps 12-hour time.

Three `Beachfront_ShoreRock_` meshes now live in the GLB and Blender source, replacing both sets of stand-in rocks. Erosion, broken contours, fissures and vertex colors are authored once for both views. The sky/water remain live app layers. Glass avoids opaque shadow/depth artifacts in the app; the coastal lamp has gentler warm output. The beach plane now clears the back wall.

This export is 6,695,452 bytes, 134,608 triangles, 77 materials and 305 primitives, within the existing room budget. Geometry checks cover shell/sill contact, bowl/cabinet fit, removal of old plants, rock placement and window-light clearance. Browser review covered standing/seated views, day/dusk/night, clock readability and the lamp toggle.

## Theme switching

Environment.roomTheme persists in the room backup. The loader fetches and parses the destination asset before switching, verifies required anchors, caches it for the session, and leaves the current room selected on a load failure. Only selected/requested room assets load. Room cameras use the selected theme's configuration.

The pure switchRoomTheme operation preserves books, photographs, archive, map pins, guestbook, notes, achievements, inventory and currency. The first visit carries current decorations; subsequent visits restore that room's own sill and wall slots, including empty slots. Global item ownership stays shared. Backup import validates room IDs, item ownership and slot categories.

Automated checks cover switching both ways, content preservation, no charges, JSON backup round trips and empty-slot restoration. Browser checks cover selection, saved destination on a new load, and the daytime coastal palette. Further real-device, lighting and art acceptance stays on the project checklist.

## Door flow completed before this phase

The physical door and Room > Exit through the door open three choices: visit friends' rooms, tidy up room, and log out. Tidying saves the transformed settings instead of flushing the previous render. Logout waits for successful saving, clears the local Spotify token and unmounts the room/music to a return screen. The closed state survives refresh within the tab. This is not account authentication or a security lock. Friend visits have a dedicated honest empty state until the backend exists; they no longer change the current room into a friend preview.

## Coastal preset refinements

Coastal Blue is a seventh CRT color exclusive to Beachfront ownership. Choosing Beachfront acquires it at no charge during the prototype and uses it as the initial room preset. Room-specific CRT colors are restored on subsequent switches. The CRT button is disabled without ownership, state updates enforce the same gate, and backup validation rejects unowned exclusive colors. Existing first-pass Beachfront rooms migrate to the acquired preset on load.

The ocean displays a low sun at dusk and a visible moon with moving reflected streaks at night. Three shoreline rocks frame the view. Reduced motion freezes water/reflections, boat movement and precipitation. The same DeskAssembly and inherited desk props remain in both rooms. Browser checks inspected dusk/night and switched Woodland > Beachfront > Woodland > Beachfront; a fresh load retained Beachfront.


The two independent arched casement leaves are posed open 62 degrees outward toward the ocean, with brass hinges and handles. Their side-jamb pivots animate between closed and 62 degrees open. Click a pane or use Room > Open/Close ocean window. The setting persists in saves and backups. Export checks verify clearance from the sill, curtains and interior light strand.

The conch is independently reproducible through conch-shell.py (also called by coastal-props.py): fuller body, swept open aperture, raised whorls/knobs, and baked cream/ochre vertex colors based on the user-provided reference. No reference image is redistributed in the app.

## Coastal scenery and interaction refinement

The ceiling-light switch moved to x=-2.16, safely left of the gathered curtain. Separate teak-framed original illustrations replace the merged fern leaves/stems and unfinished coral sticks: sailboat on the left, branching coral on the right. Rebuild the packed print textures with paint-coastal-art.py (Pillow), then run coastal-wall-art.py after the prop/window scripts and before export.

CoastalWater.tsx provides a purple/orange/blue dusk gradient, a matching rippled horizon, shallow/deep water colors, small swells, moving shore foam, glints and a sloping beach with wet sand. The Blender scenery preview mirrors the palette and beach slope; the animated shaders run in the app. Coastal lamp and ceiling intensities are gentler. Fish body, tail, fins and eye move together within the bowl. Reduced-motion preferences freeze water/fish motion and make the window settle immediately. Closing the window reduces outside ambience to 28 percent of the selected volume; reopening restores it.

Validated: automated acceptance suite, Beachfront asset/clearance checks, production build, Blender preview, browser dusk/night and seated views, window opening/closing, lamp toggle, and no browser rendering errors. Backups reject invalid window values and preserve the preference across room switches.
