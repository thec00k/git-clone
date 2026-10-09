# Keepsake Scanner for iPhone and iPad

This is the native, LiDAR-first scanner companion for Keepsake. It makes a small, coloured, low-poly GLB on the phone: fast to capture, small enough to live in a Keepsake binder, and private. Nothing is sent to a cloud service.

## What it does

- Uses ARKit scene reconstruction on LiDAR-capable iPhone Pro and iPad Pro devices.
- Combines the ARKit mesh anchors, merges vertices on a selectable 4 mm, 7 mm or 12 mm grid, and coarsens the grid for the whole object if it would exceed 45,000 triangles.
- **Colours each vertex** from up to 48 camera views it keeps while you scan (`ScanColorizer.swift`). LiDAR depth for each view is used to skip surfaces that were hidden in that view, so colour does not bleed from the background. Views are small in-memory copies and are discarded as soon as the model is made.
- Writes a self-contained GLB 2.0 with one matte material and vertex colours, no textures (`GLBExporter.swift`). Worst case at the triangle limit is about 3.1 MB, under Keepsake's 5 MB limit. The file uses iOS complete file protection and is deleted when you retake.
- Shares the file through the iOS share sheet, or sends it **encrypted** to your own computer (`ScanTransfer.swift`).

It is aimed at matte, stationary objects roughly 15 cm to 1.5 m across. It is not photogrammetry: colour detail follows the vertex grid (4–12 mm), and it will not capture clear, mirrored or very thin objects well. Lighting changes while scanning (auto exposure) average out but can leave soft patches.

## Open in Xcode

1. In Xcode, create a new **iOS App** named `KeepsakeScanner`, using SwiftUI and Swift. Use **Swift 5** language mode (Build Settings > Swift Language Version).
2. Set the deployment target to iOS 17 or later.
3. Replace the generated app source with all the Swift files in this folder.
4. Add `Privacy - Camera Usage Description` to the app target's Info settings with: `Keepsake uses the camera and LiDAR to create a private 3D scan.`
5. Add `Privacy - Local Network Usage Description` with: `Keepsake sends a scan directly to your own computer on your local network.`
6. Under `App Transport Security Settings`, add `Allows Local Networking = YES` (`NSAllowsLocalNetworking`). Do **not** enable Allow Arbitrary Loads: scans are encrypted before they leave the phone, so only local-network HTTP needs to be permitted. If iOS still blocks the connection to the computer's IP address, report it; do not fall back to arbitrary loads.
7. Run a **Debug** build once and check the Xcode console for `ScanTransfer self-test passed`. If it fails, the phone and the desktop receiver disagree about the encryption; do not send scans until it passes.

## Phone-to-computer transfer

On the computer, from the `keepsake/` folder run:

```sh
npm run scanner:receive
```

It shows the computer's local addresses and a pairing code like `K7QF-M2XD-9P10`. In the app choose **Send to computer**, enter an address and the code, pick the room, then send. In Keepsake's Card Binders on that computer choose **Receive a scan from your phone → Import latest phone scan**. The receiver also keeps a copy in `keepsake/scanner-imports/` (readable only by your user account, never committed).

How it is protected: the code never crosses the network. The phone turns it into keys (PBKDF2-SHA256 with 600,000 rounds, then HKDF) and seals the scan with AES-256-GCM, so others on the Wi-Fi can neither read nor replace it. The computer confirms receipt with proof that it knows the code. Wrong codes, repeated uploads and old codes are refused; ten wrong attempts or 30 minutes without a scan replace the code. Received scans can be read only on that same computer, and only by pages it serves; set `KEEPSAKE_SCANNER_ORIGINS` to Keepsake's exact address to allow Keepsake alone. The full threat model is in [scanner budget and privacy](../docs/scanner-budget-and-privacy.md).

## Status (2026-10-09, branch `codex/scanner-texture-pipeline`)

- Desktop side (receiver, encryption, import budget, colour validation): implemented and covered by `npm run check:scans`. The phone's encryption is pinned to the same test vectors, verified independently in Python. An independent review found no critical or high issues; its medium and low findings are fixed.
- **The Swift app has not been compiled or run.** It was written without Xcode. Build it, fix any compile errors, run the Debug self-test, then do a real scan.
- To check on a device: scan a household object, confirm it arrives coloured and correctly oriented in a binder, try a wrong code (refused), and scan something large (it should finish at a coarser detail or say there is too much detail, never lose part of the object).
