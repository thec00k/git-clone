import Foundation
import ARKit
import simd

struct LowPolyMesh { var positions: [SIMD3<Float>]; var indices: [UInt32] }

extension LowPolyMesh {
    static func make(from anchors: [ARMeshAnchor], voxelSize: Float) throws -> LowPolyMesh {
        var points: [SIMD3<Float>] = []; var triangles: [[SIMD3<Float>]] = []
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
                triangles.append([point(indices[0]), point(indices[1]), point(indices[2])])
            }
        }
        guard !triangles.isEmpty else { throw ScannerError.noGeometry }
        var lookup: [SIMD3<Int32>: UInt32] = [:]; var output: [UInt32] = []
        func index(for point: SIMD3<Float>) -> UInt32 {
            let key = SIMD3<Int32>(Int32((point.x / voxelSize).rounded()), Int32((point.y / voxelSize).rounded()), Int32((point.z / voxelSize).rounded()))
            if let existing = lookup[key] { return existing }
            let next = UInt32(points.count); lookup[key] = next; points.append(SIMD3<Float>(Float(key.x) * voxelSize, Float(key.y) * voxelSize, Float(key.z) * voxelSize)); return next
        }
        for triangle in triangles { let a = index(for: triangle[0]), b = index(for: triangle[1]), c = index(for: triangle[2]); if a != b && b != c && a != c { output += [a,b,c] } }
        guard output.count >= 3 else { throw ScannerError.noGeometry }
        // Keepsake's browser importer caps meshes at 50k triangles. Preserve headroom.
        if output.count / 3 > 45_000 { output = Array(output.prefix(45_000 * 3)) }
        // Only keep vertices referenced by the surviving triangles. Without this
        // remap, an object scanned for too long can still create a huge GLB even
        // after its index list has been simplified.
        var compacted: [SIMD3<Float>] = []; var remap: [UInt32: UInt32] = [:]
        let compactIndices = output.map { old -> UInt32 in
            if let new = remap[old] { return new }
            let new = UInt32(compacted.count); remap[old] = new; compacted.append(points[Int(old)]); return new
        }
        return LowPolyMesh(positions: compacted, indices: compactIndices)
    }
}

enum ScannerError: LocalizedError { case noGeometry; var errorDescription: String? { "Not enough LiDAR geometry was captured. Try a larger, matte object with more light." } }
private extension simd_float4 { var xyz: SIMD3<Float> { SIMD3(x, y, z) } }
