import XCTest
import simd
@testable import KeepsakeScanner

/// Run on the simulator by CI (`.github/workflows/scanner-build.yml`) and by Cmd-U in Xcode.
final class ScannerTests: XCTestCase {
    /// The phone and the desktop receiver must agree on the encryption. `selfTest()` asserts
    /// the shared test vectors from scripts/check-scanner-receiver.mjs.
    func testTransferMatchesReceiverVectors() {
        ScanTransfer.selfTest()
    }

    func testPairingCodeNormalisation() {
        XCTAssertEqual(PairingCode.normalize("k7qf-m2xd-9pl0"), "K7QFM2XD9P10")
        XCTAssertNil(PairingCode.normalize("K7QF-M2XD"))
        XCTAssertNil(PairingCode.normalize("K7QF-M2XD-9PU0"), "U is not in the alphabet")
    }

    /// Exports a worst-case scan (45,000 triangles, colour on every vertex). When
    /// KEEPSAKE_GLB_OUT is set (CI passes it as TEST_RUNNER_KEEPSAKE_GLB_OUT), the file is
    /// copied there so scripts/check-swift-export.mjs can run Keepsake's own importer budget on it.
    func testWorstCaseExportFitsBudget() throws {
        let n = 150  // 150 x 150 quads = 45,000 triangles
        var positions: [SIMD3<Float>] = []
        var colors: [SIMD4<UInt16>] = []
        for y in 0...n { for x in 0...n {
            positions.append(SIMD3(Float(x) * 0.004, Float(y) * 0.004, sin(Float(x) * 0.1) * 0.01))
            colors.append(SIMD4(UInt16(x * 400), UInt16(y * 400), 20_000, 65_535))
        } }
        var indices: [UInt32] = []
        let stride = UInt32(n + 1)
        for y in 0..<UInt32(n) { for x in 0..<UInt32(n) {
            let a = y * stride + x
            indices += [a, a + 1, a + stride, a + 1, a + stride + 1, a + stride]
        } }
        XCTAssertEqual(indices.count / 3, LowPolyMesh.triangleBudget)
        let mesh = LowPolyMesh(positions: positions, indices: indices, voxelSize: 0.004)
        let url = try GLBExporter.write(mesh: mesh, colors: colors, named: "budget-test")
        let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        XCTAssertLessThan(size, 5 * 1024 * 1024)
        if let out = ProcessInfo.processInfo.environment["KEEPSAKE_GLB_OUT"] {
            let destination = URL(fileURLWithPath: out)
            try? FileManager.default.removeItem(at: destination)
            try FileManager.default.copyItem(at: url, to: destination)
        }
        try? FileManager.default.removeItem(at: url)
    }
}
