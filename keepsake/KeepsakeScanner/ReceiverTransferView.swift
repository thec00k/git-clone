import SwiftUI

enum ScannerRoomTheme: String, CaseIterable, Identifiable {
    case woodland, beachfront, cyberpunk, snowy
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var tint: Color { switch self { case .woodland: .green; case .beachfront: .orange; case .cyberpunk: .purple; case .snowy: .cyan } }
}

struct ReceiverDestination { var address = ""; var pairCode = ""; var roomTheme: ScannerRoomTheme = .woodland }

struct ReceiverTransferView: View {
    @Binding var destination: ReceiverDestination
    let file: URL?
    @Environment(\.dismiss) private var dismiss
    @State private var state = ""
    var body: some View {
        NavigationStack { Form {
            Section("Desktop receiver") { TextField("http://192.168.x.x:4318", text: $destination.address).textInputAutocapitalization(.never).keyboardType(.URL); TextField("Pairing code", text: $destination.pairCode).textInputAutocapitalization(.characters); Picker("Keepsake room", selection: $destination.roomTheme) { ForEach(ScannerRoomTheme.allCases) { Text($0.title).tag($0) } } }
            Section { Button("Transfer scan") { Task { await send() } }.disabled(file == nil || destination.address.isEmpty || destination.pairCode.isEmpty) }
            if !state.isEmpty { Text(state).font(.footnote) }
            Section("How it works") { Text("On the desktop run npm run scanner:receive. Enter the local address and pairing code shown there. Transfer only on a trusted Wi-Fi network.") }
        }.navigationTitle("Send to desktop").toolbar { Button("Done") { dismiss() } } }
    }
    private func send() async {
        guard let file, let url = URL(string: destination.address + "/upload") else { state = "Enter a complete receiver address."; return }
        do { var request = URLRequest(url: url); request.httpMethod = "POST"; request.setValue("model/gltf-binary", forHTTPHeaderField: "Content-Type"); request.setValue(destination.pairCode, forHTTPHeaderField: "X-Keepsake-Pair-Code"); request.setValue(file.deletingPathExtension().lastPathComponent, forHTTPHeaderField: "X-Keepsake-Scan-Name"); request.setValue(destination.roomTheme.rawValue, forHTTPHeaderField: "X-Keepsake-Room-Theme"); let data = try Data(contentsOf: file); request.httpBody = data; request.setValue(String(data.count), forHTTPHeaderField: "Content-Length"); let (_, response) = try await URLSession.shared.data(for: request); guard (response as? HTTPURLResponse)?.statusCode == 201 else { state = "The desktop did not accept this scan. Check the address and pairing code."; return }; state = "Transferred. In Keepsake, choose Receive a scan from your phone → Import latest phone scan." } catch { state = "Transfer failed: \(error.localizedDescription)" }
    }
}
