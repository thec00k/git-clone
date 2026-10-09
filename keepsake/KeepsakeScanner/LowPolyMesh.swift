import Foundation
import ARKit
import simd

struct LowPolyMesh {
    var positions: [SIMD3<Float>]; var indices: [UInt32]
    /// The grid actually used. Vertices sit up to about 0.87 x this from the true surface.
    var voxelSize: Float = 0
}

extension LowPolyMesh {
    /// Keepsake's importer rejects meshes over `GLB_BUDGET.maxTriangles` (50,000, in
    /// src/lib/glbBudget.ts). This keeps headroom under it. scripts/check-scan-budget.mjs
    /// fails if this number is ever raised past the importer's limit.
    static let triangleBudget = 45_000
    private static let maxCoarsenings = 16

    static func make(from anchors: [ARMeshAnchor], voxelSize: Float) throws -> LowPolyMesh {
        // Flat list in world space: every three points are one triangle.
        var corners: [SIMD3<Float>] = []
        for anchor in anchors {
            let geometry = anchor.geometry; let vertices = geometry.vertices
            func point(_ index: Int) -> SIMD3<Float> {
                let address = vertices.buffer.contents().advanced(by: vertices.offset + vertices.stride * index)
                let local = address.assumingMemoryBound(to: SIMD3<Float>.self).pointee
                return (anchor.transform * SIMD4<Float>(local, 1)).xyz
            }
            for face in 0..<geometry.faces.count {
                let address = geometry.faces.buffer.contents().advanced(by: geometry.faces.offset + geometry.faces.bytesPerIndex * face * 3)
                // ARKit may encode faces as either 16- or 32-bit indices. Reading
                // according to bytesPerIndex avoids corrupting captures on devices
                // whose meshes remain small enough to use UInt16.
                let indices: [Int]
                if geometry.faces.bytesPerIndex == MemoryLayout<UInt16>.size {
                    let raw = address.assumingMemoryBound(to: UInt16.self)
                    indices = [Int(raw[0]), Int(raw[1]), Int(raw[2])]
                } else {
                    let raw = address.assumingMemoryBound(to: UInt32.self)
                    indices = [Int(raw[0]), Int(raw[1]), Int(raw[2])]
                }
                guard indices.allSatisfy({ $0 >= 0 && $0 < vertices.count }) else { continue }
                let triangle = [point(indices[0]), point(indices[1]), point(indices[2])]
                // A non-finite point would poison the bounds and make JSONSerialization throw an
                // Objective-C exception that Swift cannot catch.
                guard triangle.allSatisfy({ $0.x.isFinite && $0.y.isFinite && $0.z.isFinite }) else { continue }
                corners.append(contentsOf: triangle)
            }
        }
        guard !corners.isEmpty else { throw ScannerError.noGeometry }

        // If the model is over budget, use a coarser grid for the whole object. Cutting the
        // triangle list short instead would silently delete part of what was scanned.
        var size = voxelSize
        var mesh = quantize(corners, voxelSize: size)
        var attempts = 0
        while mesh.indices.count / 3 > triangleBudget && attempts < maxCoarsenings {
            size *= 1.25
            mesh = quantize(corners, voxelSize: size)
            attempts += 1
        }
        guard mesh.indices.count >= 3 else { throw ScannerError.noGeometry }
        guard mesh.indices.count / 3 <= triangleBudget else { throw ScannerError.tooComplex }
        return mesh
    }

    /// Snap every corner to a voxel grid, merge corners that land together and drop
    /// triangles that collapse, then keep only the vertices the remaining triangles use.
    private static func quantize(_ corners: [SIMD3<Float>], voxelSize: Float) -> LowPolyMesh {
        var points: [SIMD3<Float>] = []; var lookup: [SIMD3<Int32>: UInt32] = [:]; var output: [UInt32] = []
        func index(for point: SIMD3<Float>) -> UInt32 {
            let key = SIMD3<Int32>(Int32((point.x / voxelSize).rounded()), Int32((point.y / voxelSize).rounded()), Int32((point.z / voxelSize).rounded()))
            if let existing = lookup[key] { return existing }
            let next = UInt32(points.count); lookup[key] = next; points.append(SIMD3<Float>(Float(key.x) * voxelSize, Float(key.y) * voxelSize, Float(key.z) * voxelSize)); return next
        }
        var corner = 0
        while corner + 2 < corners.count {
            let a = index(for: corners[corner]), b = index(for: corners[corner + 1]), c = index(for: corners[corner + 2])
            if a != b && b != c && a != c { output += [a, b, c] }
            corner += 3
        }
        // Without this remap a long scan could still produce a huge GLB: collapsed
        // triangles leave their vertices behind in `points`.
        var compacted: [SIMD3<Float>] = []; var remap: [UInt32: UInt32] = [:]
        let compactIndices = output.map { old -> UInt32 in
            if let new = remap[old] { return new }
            let new = UInt32(compacted.count); remap[old] = new; compacted.append(points[Int(old)]); return new
        }
        return LowPolyMesh(positions: compacted, indices: compactIndices, voxelSize: voxelSize)
    }
}

enum ScannerError: LocalizedError {
    case noGeometry, tooComplex, tooLarge
    var errorDescription: String? {
        switch self {
        case .noGeometry: "Not enough LiDAR geometry was captured. Try a larger, matte object with more light."
        case .tooComplex: "This scan has too much detail to keep small. Try Light detail or scan less of the surroundings."
        case .tooLarge: "This scan is larger than Keepsake allows (5 MB). Try Light detail."
        }
    }
}
