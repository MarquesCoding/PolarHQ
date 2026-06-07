import SwiftUI

@main
struct OrbitApp: App {
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .environmentObject(state.e2e)
                .environmentObject(state.live)
                .tint(Theme.primary)
                .task { await state.restoreSession() }
        }
    }
}
