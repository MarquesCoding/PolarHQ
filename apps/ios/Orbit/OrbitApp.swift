import SwiftUI

@main
struct OrbitApp: App {
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .tint(Theme.primary)
                .task { await state.restoreSession() }
        }
    }
}
