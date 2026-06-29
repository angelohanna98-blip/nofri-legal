import SwiftUI

@main
struct NofriProtectApp: App {
    @StateObject private var store = ProtectionStore()

    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store)
        }
    }
}
