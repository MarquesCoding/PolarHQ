import SwiftUI

@main
struct OrbitApp: App {
    @StateObject private var state = AppState()
    @StateObject private var e2e = E2EManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .environmentObject(e2e)
                .tint(Theme.primary)
                .task { await state.restoreSession() }
        }
    }
}
