import Foundation
import simd

/// Writes a self-contained glTF 2.0 binary that passes Keepsake's import budget
/// (`src/lib/glbBudget.ts`): one mesh part, one material, no textures, no extensions.
enum GLBExporter {
    static let maxBytes = 5 * 1024 * 1024

    static func write(mesh: LowPolyMesh, colors: [SIMD4<UInt16>]?, named: String) throws -> URL {
        var binary = Data()
        var bufferViews: [[String: Any]] = [], accessors: [[String: Any]] = []
        func align() { while binary.count % 4 != 0 { binary.append(0) } }
        func view(from offset: Int, target: Int) -> Int {
            bufferViews.append(["buffer": 0, "byteOffset": offset, "byteLength": binary.count - offset, "target": target])
            return bufferViews.count - 1
        }

        let positionOffset = binary.count
        mesh.positions.forEach { point in [point.x, point.y, point.z].forEach { binary.append($0.littleEndianData) } }
        let low = mesh.positions.reduce(SIMD3<Float>(repeating: .greatestFiniteMagnitude), simd.min)
        let high = mesh.positions.reduce(SIMD3<Float>(repeating: -.greatestFiniteMagnitude), simd.max)
        accessors.append(["bufferView": view(from: positionOffset, target: 34962), "componentType": 5126, "count": mesh.positions.count, "type": "VEC3", "min": [low.x, low.y, low.z], "max": [high.x, high.y, high.z]])
        var attributes: [String: Int] = ["POSITION": 0]

        // Vertex colours: linear light, normalized 16-bit RGBA (8 bytes, keeps 4-byte alignment).
        // No texture means no extra GPU memory and no extra draw call in the room.
        if let colors, colors.count == mesh.positions.count {
            align(); let colorOffset = binary.count
            colors.forEach { color in [color.x, color.y, color.z, color.w].forEach { binary.append($0.littleEndianData) } }
            accessors.append(["bufferView": view(from: colorOffset, target: 34962), "componentType": 5123, "normalized": true, "count": colors.count, "type": "VEC4"])
            attributes["COLOR_0"] = accessors.count - 1
        }

        align(); let indexOffset = binary.count
        mesh.indices.forEach { binary.append($0.littleEndianData) }
        accessors.append(["bufferView": view(from: indexOffset, target: 34963), "componentType": 5125, "count": mesh.indices.count, "type": "SCALAR"])
        let indexAccessor = accessors.count - 1
        align()

        // An explicit matte material. Without one, glTF viewers use the default material,
        // which is fully metallic and looks almost black without an environment map.
        let material: [String: Any] = ["name": "Keepsake scan", "pbrMetallicRoughness": ["baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 0.85]]
        let json: [String: Any] = [
            "asset": ["version": "2.0", "generator": "Keepsake Scanner"],
            "scene": 0, "scenes": [["nodes": [0]]], "nodes": [["mesh": 0]],
            "meshes": [["primitives": [["attributes": attributes, "indices": indexAccessor, "material": 0, "mode": 4]]]],
            "materials": [material],
            "buffers": [["byteLength": binary.count]], "bufferViews": bufferViews, "accessors": accessors,
        ]
        var jsonData = try JSONSerialization.data(withJSONObject: json, options: [])
        while jsonData.count % 4 != 0 { jsonData.append(0x20) }

        var file = Data()
        file.append(UInt32(0x46546C67).littleEndianData); file.append(UInt32(2).littleEndianData)
        file.append(UInt32(12 + 8 + jsonData.count + 8 + binary.count).littleEndianData)
        file.append(UInt32(jsonData.count).littleEndianData); file.append(UInt32(0x4E4F534A).littleEndianData); file.append(jsonData)
        file.append(UInt32(binary.count).littleEndianData); file.append(UInt32(0x004E4942).littleEndianData); file.append(binary)
        guard file.count <= maxBytes else { throw ScannerError.tooLarge }

        let output = FileManager.default.temporaryDirectory.appendingPathComponent("\(named)-\(Int(Date().timeIntervalSince1970)).glb")
        // Complete file protection: unreadable while the phone is locked.
        try file.write(to: output, options: [.atomic, .completeFileProtection])
        return output
    }
}

private extension FixedWidthInteger { var littleEndianData: Data { var value = self.littleEndian; return withUnsafeBytes(of: &value) { Data($0) } } }
private extension Float { var littleEndianData: Data { bitPattern.littleEndian.littleEndianData } }
