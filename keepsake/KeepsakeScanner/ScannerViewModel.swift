import Foundation
import ARKit
import RealityKit

@MainActor
final class ScannerViewModel: NSObject, ObservableObject, ARSessionDelegate {
    let arView = ARView(frame: .zero)
    var session: ARSession { arView.session }
    @Published var isScanning = false
    @Published var status = "Ready to scan"
    @Published var error: String?
    @Published var exportedFile: URL?
    @Published var detail: ScanDetail = .balanced
    private var anchors: [UUID: ARMeshAnchor] = [:]

    override init() { super.init(); session.delegate = self }

    func start() {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else { error = "This first version needs an iPhone Pro or iPad Pro with LiDAR."; return }
        anchors.removeAll(); exportedFile = nil; error = nil; isScanning = true; status = "Scanning… move slowly around the object"
        let configuration = ARWorldTrackingConfiguration()
        configuration.sceneReconstruction = .mesh
        configuration.planeDetection = []
        session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    }

    func finish() {
        isScanning = false; session.pause(); status = "Making a small Keepsake model…"
        let captured = Array(anchors.values)
        Task { [weak self] in
            do {
                let mesh = try LowPolyMesh.make(from: captured, voxelSize: detail.voxelSize)
                let destination = try GLBExporter.write(mesh: mesh, named: "keepsake-scan")
                await MainActor.run { self?.exportedFile = destination; self?.status = "Ready to keep or send" }
            } catch { await MainActor.run { self?.error = error.localizedDescription; self?.status = "Scan could not be made" } }
        }
    }

    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { update(anchors) }
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) { update(anchors) }
    func retake() { exportedFile = nil; error = nil; status = "Ready to scan" }
    private func update(_ incoming: [ARAnchor]) { guard isScanning else { return }; for case let mesh as ARMeshAnchor in incoming { anchors[mesh.identifier] = mesh }; status = anchors.count < 12 ? "Scanning… circle the object for more coverage" : "Scanning… \(anchors.count) surfaces collected" }
}

enum ScanDetail: String, CaseIterable, Identifiable {
    case light, balanced, detailed
    var id: String { rawValue }
    var voxelSize: Float { switch self { case .light: 0.012; case .balanced: 0.007; case .detailed: 0.004 } }
    var title: String { switch self { case .light: "Light"; case .balanced: "Balanced"; case .detailed: "Detailed" } }
}
