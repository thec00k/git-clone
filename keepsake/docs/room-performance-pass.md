# Room performance pass — September 12

Reviewed the shared room loader, model interactions, camera loop, render profiles,
visibility helpers, scenery loops, sound, and workbench/binder loading paths for
Woodland and Beachfront.

Changes:
- Start downloading only the selected GLB during the room JavaScript load.
- Load binder UI on demand; it is no longer eagerly bundled through WorkbenchBook.
- Remove Woodland's unused whole-model click handler, reducing pointer raycasting.
- Reuse camera vectors and stop rebuilding an unchanged projection matrix.
- Limit camera diagnostic DOM writes to 10 Hz rather than every rendered frame.
- Avoid dispatching unchanged React visibility state for every hotspot every frame.
- Start manual camera drags from the actual visible direction; handle pointer cancellation.
- Cabinet click target is now 22 × 12 × 10 cm, centered on its authored handle,
  replacing the 66 × 96 × 70 cm box that overlapped the cabinet-top photo.

Build comparison: the room JavaScript chunk decreased from approximately 973 KB
to 952 KB uncompressed; binder code/CSS now load separately. This is a download
size comparison, not a measured frame-rate or wall-clock loading improvement.
The existing asset budgets and balanced/high quality options remain intact.

Remaining cost: room assets are approximately 4.6–5.1 MiB balanced and 8.1–8.2 MiB
high quality, plus selected furnishings. Browser/GPU speed and network throughput
still affect load time. Further geometry/texture reduction should be visually
reviewed rather than automatically degrading assets.

## Three-room local measurement

Measured September 12 in an isolated local in-app browser at DPR 1 with the dev
server and warmed local asset cache. “Ready” is navigation until the live room
clock appeared; it is not a cold-network download benchmark.

| Room | Ready | Warm initial view | p95 | Draws | Visible triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Woodland | 2.57 s | 85 fps | 14.3 ms | 485 | 138,636 |
| Beachfront | 2.71 s | 71 fps | 16.7 ms | 552 | 277,926 |
| Neon City | 2.31 s | 93 fps | 12.5 ms | 487 | 266,780 |

Repeated Woodland turns settled at 89 fps / 12.9 ms p95. Neon City varied from
73–150 fps while turning between the full room and heavily culled wall views.
With the Snake poster framed and manual play active it held 150 fps / 6.9 ms p95,
86 draws and 117,730 visible triangles. That result shows no Snake-specific
slowdown, but it is not directly comparable to the full-room view because
frustum culling removes most of the scene. A controlled Beachfront turning sample
was not completed after the isolated browser session stopped responding.

Beachfront is the first optimization candidate: its tested view had the highest
draw count and visible triangle count, and the lowest warmed frame rate. No broad
geometry, lighting or rendering changes were made during this verification pass.

Validation: production build and acceptance suite passed. The focused
`check-room-performance-browser.mjs` passed in both rooms: opening/closing,
page turns, photo dragging, drawing, saving, furniture reload, and camera dragging.
The older full workbench browser script stops at its stale expectation that the
active desk book also appears on the shelf; that separate assertion is not counted
as a pass. Blender inspection found no non-finite object transforms.
