# Scanner: Xcode handoff

> **STATUS: ON HOLD since 2026-10-09.** The scanner branch is parked, not abandoned. Nothing is half-edited: the branch is green in CI and safe to leave. Pick it up with the "Resume here" list below. Last green CI run: commit `991b5c6`+ fixes, run 37998426620 (the later commits are docs and the CI trigger only).

## Resume here
1. Decide to resume, then restore the push trigger in `.github/workflows/scanner-build.yml` (comment at the top shows it). It is manual-only while on hold.
2. Get a Mac (or cloud Mac) and an iPhone/iPad Pro with LiDAR; follow "With a Mac" and the device checklist below.
3. On the computer run `npm ci && npm run build && npm run lint` for the `.tsx` changes (never type-checked).
4. Fix whatever the device checklist finds (first suspects: `ScanColorizer.swift` `u`/`v` projection; `NSAllowsLocalNetworking` with a LAN IP).
5. Rebase or merge onto the then-current `codex/woodland-composition-proof` (the scanner touches no room assets; expect doc conflicts only), open a PR. `main` is untouched.

Branch `codex/scanner-texture-pipeline`. Written 2026-10-09 for whoever next has a Mac (or a cloud Mac). The Swift app in `KeepsakeScanner/` now compiles and passes its simulator tests in CI, but has **never run on a device**; everything else on the scanner path is done and tested. Design and threat model: [scanner-budget-and-privacy.md](scanner-budget-and-privacy.md). Work record: [scanner-opus-handoff.md](scanner-opus-handoff.md).

## Without a Mac: GitHub Actions compiles and tests it

`.github/workflows/scanner-build.yml` runs on a macOS runner. It generates the Xcode project from `KeepsakeScanner/project.yml` (XcodeGen), builds for the iOS Simulator without signing, runs `KeepsakeScanner/Tests/ScannerTests.swift`, and checks the exported GLB with Keepsake's own importer budget (`scripts/check-swift-export.mjs`). It runs on pushes to `codex/scanner-**` that touch the scanner, or by hand from the Actions tab. The full log is kept as the `xcodebuild-log` artifact.

What a green run proves: the Swift compiles; phone and desktop agree on the encryption (the shared test vectors); a worst-case 45,000-triangle coloured scan is written as a valid GLB under the 5 MB importer budget.

What it cannot prove: anything needing LiDAR, the camera or a real network (the simulator has none). Colour quality, orientation and the actual transfer still need an iPhone Pro.

**Result (2026-10-09, Xcode 16.4, iOS 18.5 simulator): green.** The first run found two compile errors (`ARGeometryElement` has no `offset`; an ambiguous `withUnsafeBytes` call); both are fixed. The app now compiles, the transfer self-test passes against the receiver's vectors, and the Swift-written worst-case GLB passes the importer budget. If a later run fails, the workflow reports compile errors as annotations on the run (the log artifact itself can't always be downloaded). Note that macOS runner minutes are billed at 10x on private repositories.

## With a Mac

1. `brew install xcodegen`, then in `keepsake/KeepsakeScanner/`: `xcodegen generate` and open `KeepsakeScanner.xcodeproj`. This sets Swift 5 mode, iOS 17, the camera and local-network descriptions and `NSAllowsLocalNetworking` for you. (Doing it by hand: see [`KeepsakeScanner/README.md`](../KeepsakeScanner/README.md).)
2. Select your team under Signing & Capabilities, choose your iPhone Pro or iPad Pro (LiDAR is required), build and run.
3. Press Cmd-U once (CI already passes these; this confirms your setup).

## Device checklist (cannot be done in CI)

On the computer: `cd keepsake && npm ci && npm run build && npm run lint` (the `.tsx` changes have not been type-checked), then `npm run scanner:receive`.

1. Scan a matte household object, 15 cm to 1 m. Send it with the code shown on the computer; import it in Card Binders. It should arrive coloured and upright.
2. **Colour correctness.** If colours look mirrored, shifted or on the wrong side, the camera-convention maths in `ScanColorizer.swift` (the lines computing `u` and `v`) is the first suspect.
3. A wrong code is refused; the same scan cannot be sent twice; ten wrong codes replace the code.
4. A large scene (a room corner) finishes at a coarser detail or reports "too much detail", and never silently drops part of the object.
5. **`NSAllowsLocalNetworking` with a LAN IP.** If iOS still blocks `http://192.168.x.x:4318`, report it. Do not enable Allow Arbitrary Loads.
6. Retake deletes the exported file; the phone keeps no copy after sending.

## After it works

- Merge decision: open a PR from `codex/scanner-texture-pipeline` only after a green CI run and the checklist. `main` and `codex/woodland-composition-proof` are untouched.
- Optional: coverage indicator while scanning, exposure normalisation between views, QR pairing, an unsigned `.ipa` from CI for sideloading (not tried).
