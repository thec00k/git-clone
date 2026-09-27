# Woodland window: preliminary Procreate brief

Purpose: one recognizable exterior landscape across four seasons, designed for small authored camera movements. This is a planning template; final aperture dimensions and motion envelope await the Woodland graybox.

## Registration template

`woodland-window-template.svg` uses a 3200x2400 artboard. The central 2400x1800 rectangle is the provisional composition area, with 400px left/right and 300px top/bottom extension (16.7% of the safe area's size on each side). The window shape is deliberately not baked into it. A square/triangular aperture can reveal different parts of the registered painting; do not cut artwork into that silhouette yet.

Start with this canvas size only if the iPad permits the required layers. Keep a layered master and use smaller derivatives for the web. The runtime should not automatically load full-size master PNGs for every season. These proposed dimensions are not a final texture budget.

## Six registered groups, far to near

00 SKY: full opaque coverage; sky color and separate sun/moon/cloud sublayers. Minimal parallax.

01 FAR RIDGE: soft mountain/hill silhouette, broadly recognizable in every season. Very small parallax.

02 DISTANT FOREST: connected canopy with low contrast; paint behind all nearer silhouettes.

03 MIDGROUND: clearing, winding stream and recognizable tree group. Moderate relative parallax. The stream is painted geography; isolate a surface region if motion is later justified.

04 NEAR: one or two substantial trees/branches, stronger edge definition. Avoid blocking the desk-view window entirely.

05 FOREGROUND: sparse leaves, twigs or near snowbank; highest relative parallax but limited movement. Leave a calm central view corridor.

Keep rain, snowfall, glass/reflections, the physical sill/frame and interior objects outside the painted base. Keep fog optional and separate so it does not flatten every season. Illustrations should already read as depth without movement.

## Export contract

- Same canvas dimensions, origin and registration for every layer. No auto-trimming of transparent borders.
- Opaque sky: no alpha required. Other layers: PNG with clean alpha, no baked matte fringe.
- Name pattern `woodland_autumn_00_sky.png` through `woodland_autumn_05_foreground.png`.
- Duplicate the same geography master for spring/summer/autumn/winter. Change foliage, snow, atmosphere and daylight rather than moving mountains or the stream.
- Day/dusk/night: keep lighting-dependent elements separable. Begin with one dusk painting and a winter study; validate grading before committing to complete alternate sets.
- Preserve source artwork separately from compressed runtime derivatives. Select active-season assets only; prefetch transitions deliberately.

## Prototype checks before finished painting

Render all three proposed camera endpoints and their transition paths against the same layer stack. Look for empty edges, disocclusion holes, sliding horizons, visible card edges, alpha halos and flat near trees. Test portrait too. Increase coverage or reduce camera displacement based on evidence; 16.7% margins are only a starting point. Reduced motion keeps layers still. Check actual texture memory and transparency cost on the selected laptop and phone.

Optional Marble study: compare an exported panorama with a live splat from the same composition, without making either mandatory. A panorama can supply a background, but it does not automatically produce these separately painted depth groups. Do not assume automatic seasons, relighting or free mobile performance.
