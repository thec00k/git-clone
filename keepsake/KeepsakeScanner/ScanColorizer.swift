import Foundation
import ARKit
import simd

/// One remembered camera view used to colour a scan.
///
/// Only small copies are kept (about 0.7 MB each): the ARFrame itself is never retained,
/// because holding ARFrames stalls ARKit. Views live in memory for the length of one scan
/// and are discarded when the model is made. They are never written to disk or sent.
struct ColorKeyframe {
    let width: Int, height: Int
    /// width * height * 3 bytes, sRGB, row 0 = top of the camera's (landscape-right) image.
    let rgb: [UInt8]
    let depthWidth: Int, depthHeight: Int
    /// Metres along the camera axis; NaN where LiDAR was unsure.
    let depth: [Float]
    let worldToCamera: simd_float4x4
    let position: SIMD3<Float>
    let fx: Float, fy: Float, cx: Float, cy: Float
}

/// Chooses a spread of sharp, distinct views while scanning and copies them off the ARFrame.
/// `offer` is called on the main thread; copying happens on a background queue.
final class ColorCapture {
    static let maxKeyframes = 48               // about 34 MB at most
    static let targetWidth = 480               // colour detail is per vertex (4-12 mm), so this is plenty
    static let minInterval: TimeInterval = 0.2
    static let novelDistance: Float = 0.10     // metres from every view already kept…
    static let novelAngle: Float = 12 * .pi / 180  // …or this much turned
    static let maxAngularSpeed: Float = 45 * .pi / 180  // radians per second; faster frames are blurred

    private let queue = DispatchQueue(label: "keepsake.scan.color", qos: .userInitiated)
    private let lock = NSLock()
    private var keyframes: [ColorKeyframe] = []
    private var poses: [simd_float4x4] = []
    private var busy = false
    private var lastAccepted: TimeInterval = 0
    private var previous: (time: TimeInterval, transform: simd_float4x4)?

    var count: Int { lock.withLock { keyframes.count } }

    func reset() { queue.sync {}; lock.withLock { keyframes = []; poses = []; busy = false; lastAccepted = 0; previous = nil } }

    /// Waits for any copy in progress, then hands over the views and forgets them.
    func drain() -> [ColorKeyframe] {
        queue.sync {}
        return lock.withLock { let taken = keyframes; keyframes = []; poses = []; previous = nil; return taken }
    }

    func offer(_ frame: ARFrame) {
        guard case .normal = frame.camera.trackingState else { return }
        let now = frame.timestamp, transform = frame.camera.transform
        let shouldCapture: Bool = lock.withLock {
            defer { previous = (now, transform) }
            if busy || keyframes.count >= Self.maxKeyframes || now - lastAccepted < Self.minInterval { return false }
            if let previous, now > previous.time, Self.angle(previous.transform, transform) / Float(now - previous.time) > Self.maxAngularSpeed { return false }
            let novel = poses.allSatisfy { pose in
                simd_distance(pose.columns.3.xyz, transform.columns.3.xyz) >= Self.novelDistance || Self.angle(pose, transform) >= Self.novelAngle
            }
            if novel { busy = true }
            return novel
        }
        guard shouldCapture, let depthData = frame.sceneDepth else { lock.withLock { if shouldCapture { busy = false } }; return }

        let image = frame.capturedImage, depthMap = depthData.depthMap, confidence = depthData.confidenceMap
        let intrinsics = frame.camera.intrinsics, resolution = frame.camera.imageResolution
        queue.async { [weak self] in
            let keyframe = ColorCapture.makeKeyframe(image: image, depthMap: depthMap, confidence: confidence, intrinsics: intrinsics, resolution: resolution, transform: transform)
            guard let self else { return }
            self.lock.withLock {
                if let keyframe { self.keyframes.append(keyframe); self.poses.append(transform); self.lastAccepted = now }
                self.busy = false
            }
        }
    }

    /// Angle between two cameras' viewing directions.
    static func angle(_ a: simd_float4x4, _ b: simd_float4x4) -> Float {
        let forwardA = -a.columns.2.xyz, forwardB = -b.columns.2.xyz
        return acos(max(-1, min(1, simd_dot(simd_normalize(forwardA), simd_normalize(forwardB)))))
    }

    private static func makeKeyframe(image: CVPixelBuffer, depthMap: CVPixelBuffer, confidence: CVPixelBuffer?, intrinsics: simd_float3x3, resolution: CGSize, transform: simd_float4x4) -> ColorKeyframe? {
        let format = CVPixelBufferGetPixelFormatType(image)
        let fullRange: Bool
        switch format {
        case kCVPixelFormatType_420YpCbCr8BiPlanarFullRange: fullRange = true
        case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange: fullRange = false
        default: return nil
        }
        guard CVPixelBufferGetPlaneCount(image) == 2, CVPixelBufferGetPixelFormatType(depthMap) == kCVPixelFormatType_DepthFloat32 else { return nil }

        // Colour: box-filter the full-resolution Y and CbCr planes down to about 480 px wide.
        CVPixelBufferLockBaseAddress(image, .readOnly); defer { CVPixelBufferUnlockBaseAddress(image, .readOnly) }
        let sourceWidth = CVPixelBufferGetWidthOfPlane(image, 0), sourceHeight = CVPixelBufferGetHeightOfPlane(image, 0)
        let step = max(1, sourceWidth / targetWidth)
        let width = sourceWidth / step, height = sourceHeight / step
        guard width > 4, height > 4, let lumaBase = CVPixelBufferGetBaseAddressOfPlane(image, 0), let chromaBase = CVPixelBufferGetBaseAddressOfPlane(image, 1) else { return nil }
        let lumaRow = CVPixelBufferGetBytesPerRowOfPlane(image, 0), chromaRow = CVPixelBufferGetBytesPerRowOfPlane(image, 1)
        let chromaWidth = CVPixelBufferGetWidthOfPlane(image, 1), chromaHeight = CVPixelBufferGetHeightOfPlane(image, 1)
        let luma = lumaBase.assumingMemoryBound(to: UInt8.self), chroma = chromaBase.assumingMemoryBound(to: UInt8.self)
        var rgb = [UInt8](repeating: 0, count: width * height * 3)
        rgb.withUnsafeMutableBufferPointer { output in
            for outY in 0..<height {
                for outX in 0..<width {
                    var lumaSum = 0, cbSum = 0, crSum = 0
                    for dy in 0..<step { let row = (outY * step + dy) * lumaRow; for dx in 0..<step { lumaSum += Int(luma[row + outX * step + dx]) } }
                    let cy0 = (outY * step) / 2, cy1 = min(chromaHeight - 1, (outY * step + step - 1) / 2)
                    let cx0 = (outX * step) / 2, cx1 = min(chromaWidth - 1, (outX * step + step - 1) / 2)
                    var chromaCount = 0
                    for cy in cy0...cy1 { for cx in cx0...cx1 { cbSum += Int(chroma[cy * chromaRow + cx * 2]); crSum += Int(chroma[cy * chromaRow + cx * 2 + 1]); chromaCount += 1 } }
                    var y = Float(lumaSum) / Float(step * step)
                    var cb = Float(cbSum) / Float(chromaCount) - 128, cr = Float(crSum) / Float(chromaCount) - 128
                    if !fullRange { y = (y - 16) * (255 / 219); cb *= 255 / 224; cr *= 255 / 224 }
                    // BT.601 full range, as ARKit's camera feed uses.
                    let r = y + 1.402 * cr, g = y - 0.344136 * cb - 0.714136 * cr, b = y + 1.772 * cb
                    let index = (outY * width + outX) * 3
                    output[index] = UInt8(max(0, min(255, r.rounded())))
                    output[index + 1] = UInt8(max(0, min(255, g.rounded())))
                    output[index + 2] = UInt8(max(0, min(255, b.rounded())))
                }
            }
        }

        // Depth: copy LiDAR depth, keeping only medium- or high-confidence values.
        CVPixelBufferLockBaseAddress(depthMap, .readOnly); defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }
        let depthWidth = CVPixelBufferGetWidth(depthMap), depthHeight = CVPixelBufferGetHeight(depthMap), depthRow = CVPixelBufferGetBytesPerRow(depthMap)
        guard let depthBase = CVPixelBufferGetBaseAddress(depthMap) else { return nil }
        var confidenceBase: UnsafeMutableRawPointer?, confidenceRow = 0, confidenceLocked = false
        if let confidence, CVPixelBufferGetWidth(confidence) == depthWidth, CVPixelBufferGetHeight(confidence) == depthHeight,
           CVPixelBufferLockBaseAddress(confidence, .readOnly) == kCVReturnSuccess {
            confidenceLocked = true
            confidenceBase = CVPixelBufferGetBaseAddress(confidence); confidenceRow = CVPixelBufferGetBytesPerRow(confidence)
        }
        defer { if let confidence, confidenceLocked { CVPixelBufferUnlockBaseAddress(confidence, .readOnly) } }
        let minimumConfidence = UInt8(ARConfidenceLevel.medium.rawValue)
        var depth = [Float](repeating: .nan, count: depthWidth * depthHeight)
        for y in 0..<depthHeight {
            let row = (depthBase + y * depthRow).assumingMemoryBound(to: Float32.self)
            let rowConfidence = confidenceBase.map { ($0 + y * confidenceRow).assumingMemoryBound(to: UInt8.self) }
            for x in 0..<depthWidth {
                let value = row[x]
                if value.isFinite, value > 0, rowConfidence.map({ $0[x] >= minimumConfidence }) ?? true { depth[y * depthWidth + x] = value }
            }
        }

        // Intrinsics are for the full camera image; rescale them to the copy (pixel centres aligned).
        // Each copied pixel is exactly `step` source pixels, so scale by 1/step, not width ratios.
        guard Int(resolution.width) == sourceWidth, Int(resolution.height) == sourceHeight else { return nil }
        let scaleX = 1 / Float(step), scaleY = 1 / Float(step)
        return ColorKeyframe(width: width, height: height, rgb: rgb, depthWidth: depthWidth, depthHeight: depthHeight, depth: depth,
                             worldToCamera: transform.inverse, position: transform.columns.3.xyz,
                             fx: intrinsics[0][0] * scaleX, fy: intrinsics[1][1] * scaleY,
                             cx: (intrinsics[2][0] + 0.5) * scaleX - 0.5, cy: (intrinsics[2][1] + 0.5) * scaleY - 0.5)
    }
}

enum ScanColorizer {
    /// One linear-light colour per vertex as normalized 16-bit RGBA (glTF `COLOR_0` is linear).
    /// Returns nil when no view saw the object, so the scan is exported uncoloured
    /// rather than painted a made-up colour.
    static func colors(for mesh: LowPolyMesh, keyframes: [ColorKeyframe]) -> [SIMD4<UInt16>]? {
        // Grid snapping moves vertices off the measured surface by up to ~0.87 x the grid size,
        // and the grid grows for large scans. Allow for that, or coarse scans would lose colour.
        let snapAllowance = 0.9 * mesh.voxelSize
        let count = mesh.positions.count
        guard !keyframes.isEmpty, count > 0 else { return nil }
        let positions = mesh.positions, indices = mesh.indices.map(Int.init)

        // Area-weighted vertex normals. Only used for "how squarely did this view see the surface",
        // with abs() so the result does not depend on triangle winding.
        var normals = [SIMD3<Float>](repeating: .zero, count: count)
        var corner = 0
        while corner + 2 < indices.count {
            let a = indices[corner], b = indices[corner + 1], c = indices[corner + 2]
            let normal = simd_cross(positions[b] - positions[a], positions[c] - positions[a])
            normals[a] += normal; normals[b] += normal; normals[c] += normal
            corner += 3
        }
        normals = normals.map { simd_length($0) > 0 ? simd_normalize($0) : .zero }

        let toLinear: [Float] = (0..<256).map { value in
            let s = Float(value) / 255
            return s <= 0.04045 ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4)
        }
        var sum = [SIMD3<Float>](repeating: .zero, count: count)
        var weight = [Float](repeating: 0, count: count)

        for view in keyframes {
            let width = Float(view.width), height = Float(view.height)
            let edgeBand = 0.1 * width
            for vertex in 0..<count {
                let point = positions[vertex]
                let camera = view.worldToCamera * SIMD4<Float>(point, 1)
                let z = -camera.z
                guard z > 0.05 else { continue }
                let u = view.fx * camera.x / z + view.cx
                let v = -view.fy * camera.y / z + view.cy
                guard u >= 1, v >= 1, u < width - 2, v < height - 2 else { continue }

                // Hidden behind something else in this view? Compare with what LiDAR measured there.
                let depthX = min(view.depthWidth - 1, max(0, Int((u + 0.5) * Float(view.depthWidth) / width)))
                let depthY = min(view.depthHeight - 1, max(0, Int((v + 0.5) * Float(view.depthHeight) / height)))
                let measured = view.depth[depthY * view.depthWidth + depthX]
                guard measured.isFinite, abs(measured - z) <= 0.02 + 0.02 * z + snapAllowance else { continue }

                let toCamera = view.position - point
                let distance = simd_length(toCamera)
                guard distance > 0 else { continue }
                let normal = normals[vertex]
                let facing: Float = normal == .zero ? 0.5 : abs(simd_dot(normal, toCamera / distance))
                guard facing >= 0.25 else { continue }
                let edge = min(1, min(min(u, v), min(width - u, height - v)) / edgeBand)
                let w = facing * facing * edge / (distance * distance)
                sum[vertex] += w * sample(view, u, v, toLinear)
                weight[vertex] += w
            }
        }

        var known = weight.map { $0 > 0 }
        guard known.contains(true) else { return nil }
        var color = (0..<count).map { known[$0] ? sum[$0] / weight[$0] : SIMD3<Float>.zero }

        // Fill vertices no view saw (undersides, crevices) from their coloured neighbours.
        for _ in 0..<16 {
            var accumulated = [SIMD3<Float>](repeating: .zero, count: count), neighbours = [Int](repeating: 0, count: count)
            var corner = 0
            while corner + 2 < indices.count {
                let triangle = [indices[corner], indices[corner + 1], indices[corner + 2]]
                for (from, to) in [(0, 1), (1, 2), (2, 0), (1, 0), (2, 1), (0, 2)] where known[triangle[from]] && !known[triangle[to]] {
                    accumulated[triangle[to]] += color[triangle[from]]; neighbours[triangle[to]] += 1
                }
                corner += 3
            }
            var filled = false
            for vertex in 0..<count where !known[vertex] && neighbours[vertex] > 0 {
                color[vertex] = accumulated[vertex] / Float(neighbours[vertex]); known[vertex] = true; filled = true
            }
            if !filled { break }
        }
        let seen = (0..<count).filter { known[$0] }
        let average = seen.reduce(SIMD3<Float>.zero) { $0 + color[$1] } / Float(seen.count)
        return (0..<count).map { vertex in
            let c = known[vertex] ? color[vertex] : average
            func channel(_ value: Float) -> UInt16 { UInt16(max(0, min(1, value)) * 65535 + 0.5) }
            return SIMD4<UInt16>(channel(c.x), channel(c.y), channel(c.z), 65535)
        }
    }

    /// Bilinear sample, converted to linear light before blending.
    private static func sample(_ view: ColorKeyframe, _ u: Float, _ v: Float, _ toLinear: [Float]) -> SIMD3<Float> {
        let x0 = Int(u), y0 = Int(v), tx = u - Float(x0), ty = v - Float(y0)
        func pixel(_ x: Int, _ y: Int) -> SIMD3<Float> {
            let index = (y * view.width + x) * 3
            return SIMD3(toLinear[Int(view.rgb[index])], toLinear[Int(view.rgb[index + 1])], toLinear[Int(view.rgb[index + 2])])
        }
        let top = pixel(x0, y0) * (1 - tx) + pixel(x0 + 1, y0) * tx
        let bottom = pixel(x0, y0 + 1) * (1 - tx) + pixel(x0 + 1, y0 + 1) * tx
        return top * (1 - ty) + bottom * ty
    }
}

extension simd_float4 { var xyz: SIMD3<Float> { SIMD3(x, y, z) } }
