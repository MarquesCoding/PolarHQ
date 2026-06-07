import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager

    var body: some View {
        TabView {
            Tab("Photos", systemImage: "photo.stack.fill") {
                PhotosView()
            }
            Tab("Drive", systemImage: "folder.fill") {
                DriveView()
            }
            Tab("Passwords", systemImage: "key.fill") {
                PasswordsView()
            }
            Tab("Authenticator", systemImage: "lock.shield.fill") {
                AuthenticatorView()
            }
        }
        .task {
            if let client = state.api() { await e2e.bootstrap(client: client) }
        }
        .fullScreenCover(isPresented: .constant(e2e.state == .locked)) {
            UnlockView()
        }
    }
}
