# Blender time capsule chest

Recreated from the five supplied chest screenshots as an original Blender mesh: rounded plank lid, warm oak, brass bands and latch ring, dark side handles, corner stiles and low feet. The finish is an authored approximation of the reference rather than a recovered Tripo texture.

Source: art/furniture/time-capsule.blend. Rebuild: art/pipeline/build-time-capsule.py. Packed wood texture included. Website: public/room/furniture/time-capsule.glb (1.41 MB, eight mesh groups). Lid pivot retained for later physical opening animation; current click opens the existing capsule panel.

Placement: [1.94, 0.002, -1.79] in both room themes, to the right of the filing cabinet near the window. Bounds: X 1.6508–2.2292, Y 0.002–0.384, Z -1.9816–-1.5770. No room resizing required. Blender scene copy: art/reviews/beachfront-time-capsule-review.blend. Original open room file was not overwritten.

Checks: Blender preview rendered and inspected, source scene placement bounds checked through MCP, GLB optimized by finish and lid membership, production build passed, direct chest click and clearance browser checks passed for Woodland and Beachfront. Existing React loading-state warnings remain in development; no runtime test failure.
