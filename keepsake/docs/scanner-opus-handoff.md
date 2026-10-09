# Scanner: brief for the next (Opus) session

Branch `codex/scanner-texture-pipeline`, written 2026-10-09. Read [scanner-budget-and-privacy.md](scanner-budget-and-privacy.md) first for the rules and what is already enforced.

Two pieces were deliberately left for a stronger model because mistakes in them are costly and the Swift cannot be compiled where this branch was authored: **(A) putting real colour on the scan** and **(B) a secure pairing and transfer design**. Everything below is context for those two.

## Goal and non-negotiables

A phone companion that captures a real object and delivers a small model to the user's Keepsake room.

- **Privacy:** no cloud processing, no account, no third-party service. Data goes phone -> the user's own desktop -> browser storage.
- **Performance:** every scan must fit `GLB_BUDGET` (`src/lib/glbBudget.ts`) so opening or placing one cannot slow the room. Do not raise a limit without updating that file, its checks and the Swift constant. Woodland draw-call reference: 489/219/85 for Room/Desk/Window (see `docs/art-direction/woodland-quality-pass.md`); a scan must not change them.
- **Data safety:** do not stop existing backups restoring (`validateCardGlb(buffer, false)` on restore).

## State of the code

Done and verified (Node checks, run here): shared budget (`src/lib/glbBudget.ts`), importer and display case use it, restore stays lenient, receiver enforces it before writing and now serves `/latest` correctly (it previously sent a JSON-encoded Buffer, so "Import latest phone scan" could not have worked), `scanner-imports/` is git-ignored. Run `npm run check:scans`.

Done but **not compiled or run** (Swift, no Xcode where it was written): `LowPolyMesh.swift` now coarsens the voxel grid until the whole object fits (it used to cut triangles off the end of the list, deleting part of the object) and stores corners as a flat array; `ScannerError.tooComplex`; the retired `snowy` room is gone from the palette picker. Build these first on a Mac and fix any compile errors before anything else.

Not verified at all: TypeScript `tsc -b`, `vite build` and lint (`npm install` could not reach the registry in the authoring sandbox). Run `npm ci && npm run build && npm run lint && npm run check:acceptance`.

## A. Colour for scans

Current output is geometry only (`GLBExporter.swift`: POSITION + indices, no normals, no colour).

**Recommended order of work:**

1. **Vertex colours first (`COLOR_0`).** Cheapest and most effective: zero texture memory, no UV unwrapping, no seams, no extra draw calls, about 3-4 bytes per vertex. `GLTFLoader` (used by `BinderScan`) applies vertex colours automatically. Quality is limited by vertex density (4-12 mm grid), which suits the low-poly Keepsake look. Likely ships as the default.
2. **Baked atlas only if vertex colour is not good enough**: one texture at most 2048x2048 (or 1024x1024 if the display-case tier is adopted), JPEG, embedded. Needs UVs and a chart/atlas strategy; evaluate Model I/O's UV tools against a simple per-triangle best-view projection before writing anything custom.

**Capture and sampling problems to solve:** which `ARFrame`s to keep (sharpness, parallax, coverage, bounded memory; `capturedImage` is YCbCr), projecting vertices with `ARCamera.projectPoint`, rejecting occluded views (the LiDAR mesh itself can be the depth test), weighting by view angle and distance, blending between frames to avoid seams, exposure/white-balance differences, and colour space (glTF colours are linear sRGB). Colours must be derived on-device only. Discard frames after export.

**Exporter changes:** add `COLOR_0` (normalised UNSIGNED_BYTE) and, if wanted, `NORMAL`; keep one primitive and at most one material; keep `bufferView` alignment valid; update `inspectGlb` only if a new attribute needs checking. Keep the file under budget in the worst case and add a Swift-side size guard.

**Done when:** `node scripts/check-scan-budget.mjs` and `check-scanner-receiver.mjs` pass with fixtures that include `COLOR_0` (add them); a real scan of a household object imports into a binder and looks right in the inspection viewer; a measured import shows no change to the room's draw calls and no leaked textures after closing the viewer (`renderer.info.memory`).

## B. Secure pairing and transfer

Findings from reading `scripts/scanner-receiver.mjs`, `ReceiverTransferView.swift`, `CardBinders.tsx` (~line 63):

1. `GET /latest` and `GET /inbox` need no pairing code and reply with `Access-Control-Allow-Origin: *`. While the receiver runs, any device on the network, and any web page open in the user's browser, can read the latest scan.
2. The pairing code is 8 hex characters (32 bits), **fixed for the whole process**, while the file header comment says it is one-time per upload. There is no attempt limit or lockout.
3. `GET /health` returns the first two characters of the code, leaving 24 bits to guess.
4. Everything is plain HTTP: the code and the model cross the network in the clear. The Xcode setup step even tells developers to allow arbitrary loads.
5. The server listens on `0.0.0.0` the entire time it runs.

**Design questions to settle (pick the simplest that holds up):**

- Authenticate and encrypt: TLS with a per-run self-signed certificate whose fingerprint the phone learns out of band (QR code on the desktop screen), or an application-layer scheme with a per-session secret from the QR code (CryptoKit on iOS; `node:crypto` on the receiver; no npm dependencies).
- Browser read access: the web app also needs to read the scan. Options include allowing unauthenticated reads only on loopback and requiring the secret for any other address, or having the page present the session secret.
- Short-lived sessions, single-use upload tokens, attempt limiting, and not exposing any part of the secret in `/health`.
- Drop the wildcard CORS header; allow only Keepsake's own origin(s) (note the dev port varies, 5174 by default).
- Scope the listening address to what pairing needs, and stop when finished or after a timeout.
- Remove the arbitrary-loads ATS instruction from `KeepsakeScanner/README.md` once the transport is no longer plain HTTP.

**Constraints:** local network only, no external service, no account. This must work without the backend decision your plan still defers; do not claim server-enforced protection (see `docs/v4-decisions.md`).

**Done when:** `check-scanner-receiver.mjs` is extended to cover: read endpoints refuse unauthenticated requests, wrong/expired/reused credentials are refused, attempts are limited, `/health` reveals nothing secret, and the previous budget and room-tag tests still pass. Document the actual threat model (what this protects against and what it does not).

## Later, not blocking

- Owner decision on the stricter display-case tier (see the budget doc).
- A coverage meter while scanning.
- Retire the base64-in-state storage of models if scans grow.
- Photogrammetry for non-LiDAR phones is a separate track and needs a processing pipeline; it is not part of this branch.

## Verification on a Mac and iPhone (Swift)

1. In Xcode follow `KeepsakeScanner/README.md` (new iOS App target, iOS 17+, copy the Swift files). Fix compile errors.
2. `npm run scanner:receive`, scan an object on a LiDAR iPhone/iPad, transfer, then import in Card Binders.
3. Try a very large capture (scan a whole room corner): it should either finish at a coarser detail or show the "too much detail" message, never a model with a missing chunk.
4. Confirm a scan from an older scanner build tagged `snowy` arrives tagged Woodland.
