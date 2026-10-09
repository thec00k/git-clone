# Scanner work record

Branch `codex/scanner-texture-pipeline`. Rules, budget and threat model: [scanner-budget-and-privacy.md](scanner-budget-and-privacy.md). Phone setup and device checklist: [`KeepsakeScanner/README.md`](../KeepsakeScanner/README.md).

## 2026-10-09, part 2: colour and secure pairing (done; Swift not yet compiled)

**Secure transfer, protocol 1.** Replaced the reusable 32-bit header code over plain HTTP. The phone now encrypts and authenticates each scan with a key derived from a 60-bit pairing code that never crosses the network, and the receiver proves receipt. Reads are limited to pages on the same computer, or Keepsake alone when `KEEPSAKE_SCANNER_ORIGINS` is set. The previous design let any device on the network, or any web page open in the user's browser, read the latest scan. It also leaked part of the code from `/health` and had no lockout. Old plaintext clients get a "please update" reply (426). See the budget doc for the full design and its limits.

**Colour.** Vertex colours (`COLOR_0`, normalized 16-bit linear RGBA) chosen over a baked texture atlas. They need no UV unwrapping, cause no seams, use no texture memory and add no draw call; the worst-case file stays at 3.09 MB. While scanning, `ColorCapture` keeps up to 48 sharp, distinct views (small copies, never the ARFrame). After scanning, `ScanColorizer` projects each vertex into each view and rejects views where LiDAR depth shows the vertex was hidden. It weights the remaining views by viewing angle, distance and distance from the image edge, blends in linear light and fills unseen vertices from their neighbours. If no view saw the object the scan is exported uncoloured rather than in a made-up colour. A texture atlas remains possible later if vertex density proves too coarse.

**Also fixed.** Scans now carry an explicit matte material (glTF's default is fully metallic and renders almost black); older scans display as matte too. Mesh building moved off the main thread (the previous `Task {}` inherited the main actor and froze the screen). The exported file uses complete file protection and is deleted on retake.

**Independent review.** A separate review with no part in writing this code found no critical or high issues. Fixed from its findings: colour was lost on scans whose grid was coarsened (the depth tolerance now includes the grid offset); the encryption and receipt keys are now split with HKDF; one upload at a time, and code changes no longer block the receiver; no-Origin reads must not come from a web page; Keepsake can now read why a read was refused; the scan folder is made private; colour accessors must be real, non-sparse buffer views; and several smaller Swift fixes (non-finite points skipped, exact intrinsics scaling, a missed unlock). Wording that overstated which pages can read scans was corrected. Not changed here (pre-existing): display-case scans in a restored backup are not run through the model budget (`roomBackup.ts`).

**Verified here.** `npm run check:scans`, `check-card-binders` and the rest of the runnable acceptance suite pass. Protocol test vectors match an independent Python implementation. A JS fixture reproduces `GLBExporter.swift`'s exact layout; it and a worst-case 45,000-triangle coloured scan pass the budget and the receiver. The changed library modules (`glbBudget.ts`, `cardBinders.ts`, `roomBackup.ts`) type-check under the project's strict flags.

**Not verified.**
1. Swift: not compiled or run; build in Xcode (Swift 5 mode), run the Debug self-test, then the device checklist in the scanner README.
2. `npm ci && npm run build && npm run lint` for the `.tsx` changes.
3. Visual quality of colour on real objects, and whether ARKit's camera-space conventions match the projection used (if colours look mirrored or shifted, check `ScanColorizer` lines that compute `u`/`v`).
4. `NSAllowsLocalNetworking` permitting HTTP to a LAN IP address on current iOS.

## 2026-10-09, part 1: budget and receiver hardening

Shared GLB budget, lenient backup restore, receiver validation before write, `/latest` byte fix, Snowy → Woodland tag mapping, scan truncation fix, `scanner-imports/` git-ignored. Commit `9518525`.

## Later, not blocking

- Owner decision on the stricter display-case tier.
- A coverage indicator while scanning; exposure normalisation between views.
- A QR code for pairing (needs a QR encoder on the computer and a scanner view on the phone) if typing the code proves tiresome.
- Retire base64-in-state storage of models if scans grow.
- Photogrammetry for non-LiDAR phones is a separate track.
