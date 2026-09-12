import SwiftUI

@main
struct KeepsakeScannerApp: App {
    @StateObject private var scanner = ScannerViewModel()

    var body: some Scene {
        WindowGroup { ScannerHomeView().environmentObject(scanner) }
    }
}
