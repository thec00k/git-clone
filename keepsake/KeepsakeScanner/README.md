# Keepsake Scanner for iPhone and iPad

This is the native, LiDAR-first scanner companion for Keepsake. It intentionally produces a small, untextured low-poly GLB: that is fast to capture, small enough to live in a Keepsake binder, and avoids sending private scans to a cloud service.

## What the first build does

- Uses ARKit scene reconstruction on LiDAR-capable iPhone Pro and iPad Pro devices.
- Combines the ARKit mesh anchors, removes duplicate vertices, and reduces them with a selectable 4 mm, 7 mm, or 12 mm voxel grid.
- Writes a self-contained GLB 2.0 file with clean, lightweight geometry. Texture baking is intentionally a later milestone.
- Shares the file through the iOS share sheet, or transfers it to the desktop receiver over a trusted local Wi-Fi network.

It is aimed at matte, stationary objects roughly 15 cm to 1.5 m across. It is not a replacement for detailed photogrammetry and will not accurately capture clear, mirrored, or very thin objects.

## Open in Xcode

1. In Xcode, create a new **iOS App** named `KeepsakeScanner`, using SwiftUI and Swift.
2. Set the deployment target to iOS 17 or later.
3. Replace the generated app source with the Swift files in this folder.
4. Add `Privacy - Camera Usage Description` to the app target's Info settings with: `Keepsake uses the camera and LiDAR to create a private 3D scan.`
5. Add `Privacy - Local Network Usage Description` with: `Keepsake sends a scan directly to your selected desktop on your local network.`
6. For local desktop transfer during development, add `App Transport Security Settings > Allow Arbitrary Loads = YES`. Before distribution, replace this with a local-network exception or HTTPS receiver.

## Phone-to-desktop transfer

On the desktop, from the `keepsake/` folder run:

```sh
npm run scanner:receive
```

It displays a local receiver address and fresh pairing code. In the iOS app choose **Send to desktop**, enter them, select the room palette, then transfer. In Keepsake’s Card Binders choose **Receive a scan from your phone → Import latest phone scan** to add it directly. The receiver also writes a GLB backup to `keepsake/scanner-imports/`.

This is direct device-to-device traffic on the same Wi-Fi network. The pairing code prevents accidental uploads on that network, but it is not encrypted; do not use it on public Wi-Fi. The selected room palette travels as lightweight metadata so the desktop can present a consistent destination, while the GLB itself remains a portable, untextured model.
