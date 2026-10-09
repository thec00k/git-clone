import SwiftUI

@main
struct KeepsakeScannerApp: App {
    @StateObject private var scanner = ScannerViewModel()

    init() {
        #if DEBUG
        // Confirms the phone and the desktop receiver agree on the transfer encryption.
        Task.detached(priority: .background) { ScanTransfer.selfTest() }
        #endif
    }

    var body: some Scene {
        WindowGroup { ScannerHomeView().environmentObject(scanner) }
    }
}
