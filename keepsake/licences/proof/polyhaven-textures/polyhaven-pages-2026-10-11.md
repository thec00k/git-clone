# Poly Haven pages, read October 11, 2026

Text record of the Poly Haven asset pages for the textures traced in `trace-textures-2026-10-11.txt`. It was read through Poly Haven's public API (`https://api.polyhaven.com/info/<slug>`) and licence page. The cloud session could not download or screenshot the pages, so this note does not count as a saved copy: a dated screenshot or PDF of each page is still needed to mark these `verified`.

## Licence (https://polyhaven.com/license)
- "Our assets are all licensed as CC0, which is effectively Public Domain"
- "You can use our assets for any purpose, including commercial work."
- No credit required ("attribution is appreciated").

## Textures found in the shipped room files

| Slug | Page | Title | Authors | Published |
| --- | --- | --- | --- | --- |
| wood_floor | https://polyhaven.com/a/wood_floor | Wood Floor | Dimitrios Savva | 2023-10-24 |
| beige_wall_001 | https://polyhaven.com/a/beige_wall_001 | Beige Wall 001 | Dimitrios Savva (photography), Rico Cilliers (processing) | 2021-07-20 |
| beige_wall_002 | https://polyhaven.com/a/beige_wall_002 | Beige Wall 002 | Dimitrios Savva (photography), Rico Cilliers (processing) | 2021-07-15 |
| brown_leather | https://polyhaven.com/a/brown_leather | Brown Leather | Rob Tuytel | 2020-05-25 |
| leather_white | https://polyhaven.com/a/leather_white | Leather White | Rob Tuytel | 2020-06-19 |
| metal_plate_02 | https://polyhaven.com/a/metal_plate_02 | Metal Plate 02 | Rob Tuytel | 2024-08-15 |
| wood_cabinet_worn_long | https://polyhaven.com/a/wood_cabinet_worn_long | Wood Cabinet Worn Long | Dimitrios Savva (photography), Rico Cilliers (processing) | 2022-04-05 |
| ash_veneer | https://polyhaven.com/a/ash_veneer | Ash Veneer | Jenelle van Heerden | 2026-08-11 |
| wool_boucle | https://polyhaven.com/a/wool_boucle | Wool Boucle | colormass (photography), Rico Cilliers (processing) | 2025-09-05 |
| fabric_pattern_05 | https://polyhaven.com/a/fabric_pattern_05 | Fabric Pattern 05 | Rob Tuytel | 2020-05-29 |

`fabric_pattern_05` was used on the first room's beanbag; it is in `art/woodland/woodland.blend` but no shipped file uses it now. `fabric_pattern_07` and `book_pattern` were already in the ledger (`cc0-patterns`).

## Why these are Poly Haven files
- Each `.blend` keeps Poly Haven's own file names (for example `brown_leather_Diffuse.jpg`, `wood_floor_nor_gl.jpg`) as the image names, next to the temporary download path `...\AppData\Local\Temp\tmpXXXXXXXX.jpg`. That is how the Blender MCP add-on's Poly Haven download stores textures; the add-on's settings (`blendermcp_use_polyhaven`, `blendermcp_use_polypizza`, `blendermcp_use_sketchfab`) are saved in the same files.
- The Wool Boucle image still carries Poly Haven's processing metadata (`C:\Users\Rico\Poly Haven Dropbox\Work\Rico\colormass_2025\Wool Boucle...`), matching the page's credits.
- Every slug above exists on Poly Haven with that exact name.
