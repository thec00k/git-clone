import Foundation
import simd

enum GLBExporter {
    static func write(mesh: LowPolyMesh, named: String) throws -> URL {
        var binary = Data(); let positionOffset = 0
        mesh.positions.forEach { point in [point.x, point.y, point.z].forEach { binary.append($0.littleEndianData) } }
        while binary.count % 4 != 0 { binary.append(0) }
        let indexOffset = binary.count; mesh.indices.forEach { binary.append($0.littleEndianData) }; while binary.count % 4 != 0 { binary.append(0) }
        let min = mesh.positions.reduce(SIMD3<Float>(repeating: .greatestFiniteMagnitude), simd.min); let max = mesh.positions.reduce(SIMD3<Float>(repeating: -.greatestFiniteMagnitude), simd.max)
        let json: [String: Any] = ["asset": ["version": "2.0", "generator": "Keepsake Scanner"], "scene": 0, "scenes": [["nodes": [0]]], "nodes": [["mesh": 0]], "meshes": [["primitives": [["attributes": ["POSITION": 0], "indices": 1]]]], "buffers": [["byteLength": binary.count]], "bufferViews": [["buffer": 0, "byteOffset": positionOffset, "byteLength": indexOffset, "target": 34962], ["buffer": 0, "byteOffset": indexOffset, "byteLength": binary.count - indexOffset, "target": 34963]], "accessors": [["bufferView": 0, "componentType": 5126, "count": mesh.positions.count, "type": "VEC3", "min": [min.x,min.y,min.z], "max": [max.x,max.y,max.z]], ["bufferView": 1, "componentType": 5125, "count": mesh.indices.count, "type": "SCALAR"]]]
        var jsonData = try JSONSerialization.data(withJSONObject: json, options: []); while jsonData.count % 4 != 0 { jsonData.append(0x20) }
        var file = Data(); file.append(UInt32(0x46546C67).littleEndianData); file.append(UInt32(2).littleEndianData); file.append(UInt32(12 + 8 + jsonData.count + 8 + binary.count).littleEndianData); file.append(UInt32(jsonData.count).littleEndianData); file.append(UInt32(0x4E4F534A).littleEndianData); file.append(jsonData); file.append(UInt32(binary.count).littleEndianData); file.append(UInt32(0x004E4942).littleEndianData); file.append(binary)
        let output = FileManager.default.temporaryDirectory.appendingPathComponent("\(named)-\(Int(Date().timeIntervalSince1970)).glb"); try file.write(to: output, options: .atomic); return output
    }
}

private extension FixedWidthInteger { var littleEndianData: Data { withUnsafeBytes(of: self.littleEndian, Data.init) } }
private extension Float { var littleEndianData: Data { bitPattern.littleEndian.littleEndianData } }
