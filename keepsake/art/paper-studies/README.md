# Keepsake paper studies

Three 1024 × 1280 clean paper PNGs rendered with @paper-design/shaders-react 0.0.81. Exact presets are retained in renderer/main.jsx, and dependencies are pinned by renderer/package-lock.json.

- Warm cream: fine grain and shallow wrinkles; everyday album stock.
- Handmade cotton: denser fibers and uneven pulp; tactile handmade stock.
- Creased journal: warmer paper with broad wrinkles and a gentle fold; archival memories.

The Paper comparison board uses these PNGs beneath editable content. Photographs and handwriting should remain above the texture.

To regenerate, run the renderer's Vite server with vite.config.js and use its three export buttons. The buttons save PNGs into this folder. preserveDrawingBuffer is enabled only for this authoring renderer, to support export.

Keepsake now includes these three stocks under Pages → Paper feel, with Texture and Wrinkles sliders saved per page. The app renders each combination once with a shared Paper shader and reuses the cached image in the editor, overview, print, and page-turn capture. Original paper remains available. Static WebP presets provide an immediate fallback while rendering.

For an interactive comparison, start the app's development server and open /material-study.html. It also demonstrates matte, glossy, holographic, and glitter sticker finishes and previews the page-turn image.
