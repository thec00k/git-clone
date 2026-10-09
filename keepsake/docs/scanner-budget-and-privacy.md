# Scanner model budget and privacy rules

Updated 2026-10-09 on `codex/scanner-texture-pipeline`. Applies to phone scans and any other GLB imported into Keepsake binders or the display case.

## Principles

- **Private by default.** Scans are made on the phone, encrypted there, sent only to the user's own computer, and stored in the browser. No cloud reconstruction service, account, analytics or upload is involved.
- **The room does not pay for scans.** Colour is stored per vertex, not as textures: no extra GPU texture memory and no extra draw call. A scan renders in the single inspection viewer (`BinderScan`) with demand-driven frames and is disposed on close. A budget keeps every scan small.
- **Never lose kept memories.** Tightening limits must not stop an existing backup from restoring.

## Budget enforced today

One module, `src/lib/glbBudget.ts` (`GLB_BUDGET`), is the source of truth. The browser importer, the display case and the desktop receiver all call `inspectGlb`, so a scan that would be refused on import is refused at transfer and never written to disk.

| Limit | Value | Notes |
| --- | --- | --- |
| File size | 5 MB | Scanner worst case at its triangle limit: 3.09 MB with colour (colour adds at most 1.03 MB) |
| Triangles | 50,000 | The scanner targets 45,000; a check fails if its constant drifts past the limit |
| Nodes | 200 | |
| Mesh parts (primitives) | 16 | Each is a draw call. The scanner writes 1 |
| Materials | 8 | The scanner writes 1 matte material |
| Images | 4 | The scanner writes none |
| Texture side | 2048 px | |
| Texture pixels, total | 4,194,304 | One 2048x2048 or four 1024x1024; about 22 MB of GPU memory with mipmaps |
| Texture format | PNG or JPEG, embedded | No `uri` references, no required extensions |
| Vertex colours (`COLOR_0`) | One per vertex; RGB/RGBA; float, or normalized 8/16-bit; stored in a buffer view, not sparse | The scanner writes normalized 16-bit RGBA in linear colour |

Image sizes are read from PNG/JPEG headers; nothing is decoded to check them.

**Backups.** `parseRoomBackup` validates saved scans with `strict: false`, which skips the newer checks (parts, materials, texture size and pixels, vertex colours). Older saved models still restore. Network references and required extensions are still refused on restore.

**Display of older scans.** Scans made before the scanner wrote a material used glTF's default, fully metallic material and looked almost black. The binder viewer and display case now show those as matte (`src/lib/scanDisplay.ts`). Stored models are unchanged.

## Transfer protection (protocol 1)

Implemented in `scripts/scanner-receiver.mjs`, `scripts/scan-envelope.mjs` and `KeepsakeScanner/ScanTransfer.swift`.

- The receiver shows a 12-character pairing code (60 bits). The phone derives a 256-bit master key with PBKDF2-HMAC-SHA256 (600,000 rounds, per-session random salt), then separate encryption and receipt keys with HKDF-SHA256. It seals the scan, its name and its room with AES-256-GCM, bound to the session. The code never crosses the network.
- The receiver answers with an HMAC receipt, so the phone knows the scan reached the computer that knows the code.
- One upload at a time (others are told to retry), and the code is stretched off the receiver's event loop, so a flood of uploads or forced code changes cannot exhaust memory or stall it.
- Each upload id is accepted once. Ten failed unlocks, 30 minutes without a scan, or a restart replace the code and end the session.
- The phone refuses receivers that offer weaker key settings (fewer than 200,000 rounds or a salt under 16 bytes).
- Received scans can be read (`/latest`, `/inbox`) only from the same computer, only through its own host names (blocks DNS rebinding) and only by allowed origins: by default any page served from this computer, since the Keepsake dev server's port varies. Set `KEEPSAKE_SCANNER_ORIGINS` to Keepsake's exact origin to allow Keepsake alone, or to add a deployed origin. No wildcard CORS. Requests without an Origin are served only when they did not come from a web page (`Sec-Fetch-Site` absent or `none`), which blocks `<img>`/`<script>`/no-cors reads from other sites.
- `/health` and `/pairing` reveal nothing secret. New scans are written owner-only (0600) in a folder made owner-only (0700) and are git-ignored. Files saved by the earlier receiver keep the permissions they had.

**What it does not protect against:** other pages served from this computer, unless `KEEPSAKE_SCANNER_ORIGINS` is set; software already running as the user on the computer (it can read the saved files, as it can read browser storage); someone who can see the terminal; a person on the network forcing the code to change by failing on purpose, or pretending to be the receiver (neither reveals a scan; the phone reports that the scan was not confirmed). A 60-bit code stretched with PBKDF2 at 600,000 rounds puts offline guessing from captured traffic in the range of very many GPU-years; that is strong for a home network, but it is not a substitute for a full-length key.

**Interoperability.** `scripts/check-scanner-receiver.mjs` pins test vectors (code normalisation, master key, both HKDF keys, envelope hash, receipt). The same values are checked independently in Python and by the Swift `ScanTransfer.selfTest()` in Debug builds.

## Proposed, not enforced: stricter budget for scans placed in the room

The binder budget is for an inspection viewer. The display case renders scans in the room. A suggested starting point for the owner to confirm and for profiling to tune: about 20,000 triangles, one texture no larger than 1024x1024 (or vertex colours only) and about 2 MB.

## Known gaps

- The Swift app has not been compiled or run; see `KeepsakeScanner/README.md` for the device checklist.
- The browser-side TypeScript in `CardBinders.tsx`, `BinderScan.tsx`, `ArtifactDisplayCase.tsx` and `scanDisplay.ts` has not been type-checked (the authoring environment could not install `react`/`three`). Run `npm run build`.
- Scans are stored in app state as base64 data URLs (about 4/3 of file size). Unchanged.

## Checks

```sh
npm run check:scans        # budget + receiver (also part of check:acceptance)
node scripts/check-card-binders.mjs
```
