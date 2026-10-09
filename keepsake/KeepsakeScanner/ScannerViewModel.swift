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
    /// Camera views for colouring. In memory only; discarded when the model is made.
    private let colorCapture = ColorCapture()

    override init() { super.init(); session.delegate = self }

    func start() {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else { error = "This first version needs an iPhone Pro or iPad Pro with LiDAR."; return }
        anchors.removeAll(); colorCapture.reset(); discardExport(); error = nil; isScanning = true; status = "Scanning… move slowly around the object"
        let configuration = ARWorldTrackingConfiguration()
        configuration.sceneReconstruction = .mesh
        configuration.planeDetection = []
        // LiDAR depth per frame lets colouring skip surfaces hidden in a given view.
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) { configuration.frameSemantics.insert(.sceneDepth) }
        session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    }

    func finish() {
        isScanning = false; session.pause(); status = "Making a small Keepsake model…"
        let captured = Array(anchors.values)
        let views = colorCapture.drain()
        let voxelSize = detail.voxelSize
        // Heavy work off the main thread so the screen stays responsive.
        Task.detached(priority: .userInitiated) { [weak self] in
            do {
                let mesh = try LowPolyMesh.make(from: captured, voxelSize: voxelSize)
                let colors = ScanColorizer.colors(for: mesh, keyframes: views)
                let destination = try GLBExporter.write(mesh: mesh, colors: colors, named: "keepsake-scan")
                await MainActor.run {
                    self?.exportedFile = destination
                    self?.status = colors == nil ? "Ready to keep or send (no colour: hold the phone steadier next time)" : "Ready to keep or send"
                }
            } catch { await MainActor.run { self?.error = error.localizedDescription; self?.status = "Scan could not be made" } }
        }
    }

    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { update(anchors) }
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) { update(anchors) }
    func session(_ session: ARSession, didUpdate frame: ARFrame) { if isScanning { colorCapture.offer(frame) } }
    func retake() { discardExport(); colorCapture.reset(); error = nil; status = "Ready to scan" }

    /// The exported model is a private memory: delete it from the phone once it is replaced.
    private func discardExport() {
        if let file = exportedFile { try? FileManager.default.removeItem(at: file) }
        exportedFile = nil
    }

    private func update(_ incoming: [ARAnchor]) {
        guard isScanning else { return }
        for case let mesh as ARMeshAnchor in incoming { anchors[mesh.identifier] = mesh }
        let views = colorCapture.count
        status = anchors.count < 12 ? "Scanning… circle the object for more coverage" : "Scanning… \(anchors.count) surfaces, \(views) colour views"
    }
}

enum ScanDetail: String, CaseIterable, Identifiable {
    case light, balanced, detailed
    var id: String { rawValue }
    var voxelSize: Float { switch self { case .light: 0.012; case .balanced: 0.007; case .detailed: 0.004 } }
    var title: String { switch self { case .light: "Light"; case .balanced: "Balanced"; case .detailed: "Detailed" } }
}
