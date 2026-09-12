import SwiftUI
import RealityKit

struct ScannerHomeView: View {
    @EnvironmentObject private var scanner: ScannerViewModel
    @State private var receiver = ReceiverDestination()
    @State private var showingReceiver = false
    @State private var roomTheme: ScannerRoomTheme = .woodland

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                ScannerPreview(arView: scanner.arView)
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                    .overlay(alignment: .bottom) { Text(scanner.status).padding(10).background(.black.opacity(0.6)).foregroundStyle(.white).clipShape(Capsule()).padding() }
                VStack(spacing: 10) {
                    Picker("Scan detail", selection: $scanner.detail) { ForEach(ScanDetail.allCases) { Text($0.title).tag($0) } }
                        .pickerStyle(.segmented).disabled(scanner.isScanning)
                    Button(scanner.isScanning ? "Finish scan" : "Start scan") { scanner.isScanning ? scanner.finish() : scanner.start() }
                        .buttonStyle(.borderedProminent).controlSize(.large).tint(roomTheme.tint)
                    Text("Walk slowly around one still object. Keep it centered and include its top and sides.").font(.footnote).multilineTextAlignment(.center).foregroundStyle(.secondary)
                }
                if let file = scanner.exportedFile {
                    HStack {
                        ShareLink(item: file) { Label("Share GLB", systemImage: "square.and.arrow.up") }.buttonStyle(.bordered)
                        Button { receiver.roomTheme = roomTheme; showingReceiver = true } label: { Label("Send to desktop", systemImage: "desktopcomputer.and.iphone") }.buttonStyle(.bordered)
                        Button("Retake") { scanner.retake() }.buttonStyle(.bordered)
                    }
                }
                if let error = scanner.error { Text(error).foregroundStyle(.red).font(.footnote) }
                Spacer()
            }.padding().navigationTitle("Keepsake Scanner")
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Menu { Picker("Room palette", selection: $roomTheme) { ForEach(ScannerRoomTheme.allCases) { Text($0.title).tag($0) } } } label: { Label("Room palette", systemImage: "paintpalette") }.tint(roomTheme.tint) } }
                .tint(roomTheme.tint)
        }.sheet(isPresented: $showingReceiver) { ReceiverTransferView(destination: $receiver, file: scanner.exportedFile) }
    }
}

struct ScannerPreview: UIViewRepresentable {
    let arView: ARView
    func makeUIView(context: Context) -> ARView { arView.debugOptions = [.showSceneUnderstanding]; return arView }
    func updateUIView(_ view: ARView, context: Context) {}
}
