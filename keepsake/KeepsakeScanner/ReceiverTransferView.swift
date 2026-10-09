import SwiftUI

enum ScannerRoomTheme: String, CaseIterable, Identifiable {
    case woodland, beachfront, cyberpunk
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var tint: Color { switch self { case .woodland: .green; case .beachfront: .orange; case .cyberpunk: .purple } }
}

/// Kept in memory only while the app is open; never saved to the phone.
struct ReceiverDestination { var address = ""; var pairCode = ""; var roomTheme: ScannerRoomTheme = .woodland }

struct ReceiverTransferView: View {
    @Binding var destination: ReceiverDestination
    let file: URL?
    @Environment(\.dismiss) private var dismiss
    @State private var state = ""
    @State private var sending = false
    @State private var sent = false

    var body: some View {
        NavigationStack { Form {
            Section("Your computer") {
                TextField("192.168.1.20:4318", text: $destination.address)
                    .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL).textContentType(.URL)
                TextField("Pairing code (XXXX-XXXX-XXXX)", text: $destination.pairCode)
                    .textInputAutocapitalization(.characters).autocorrectionDisabled().font(.body.monospaced())
                Picker("Keepsake room", selection: $destination.roomTheme) { ForEach(ScannerRoomTheme.allCases) { Text($0.title).tag($0) } }
            }
            Section {
                Button { Task { await send() } } label: {
                    HStack { Text(sent ? "Sent" : "Send scan"); if sending { Spacer(); ProgressView() } }
                }.disabled(file == nil || sending || sent || destination.address.isEmpty || PairingCode.normalize(destination.pairCode) == nil)
            }
            if !state.isEmpty { Section { Text(state).font(.footnote) } }
            Section("How it works") {
                Text("On the computer, run npm run scanner:receive in the Keepsake folder and enter the address and pairing code it shows. The scan is encrypted on this phone before it is sent and only that computer can open it. Nothing is uploaded to the internet.")
            }
        }.navigationTitle("Send to computer").toolbar { Button("Done") { dismiss() } } }
    }

    private func send() async {
        guard let file else { return }
        sending = true; state = "Securing the transfer…"
        defer { sending = false }
        do {
            try await ScanTransfer.send(file: file, name: file.deletingPathExtension().lastPathComponent, roomTheme: destination.roomTheme.rawValue, address: destination.address, code: destination.pairCode)
            sent = true
            state = "Sent and confirmed. In Keepsake on the computer, choose Receive a scan from your phone → Import latest phone scan."
        } catch {
            state = error.localizedDescription
        }
    }
}
