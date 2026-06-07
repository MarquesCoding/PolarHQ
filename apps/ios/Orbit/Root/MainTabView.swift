import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @State private var selection: OrbitTab = .photos

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selection {
                case .photos: PhotosView()
                case .drive: DriveView()
                case .passwords: PasswordsView()
                case .authenticator: AuthenticatorView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            FloatingTabBar(selection: $selection)
                .padding(.bottom, 6)
        }
        .background(Theme.background.ignoresSafeArea())
        .task {
            if let client = state.api() { await e2e.bootstrap(client: client) }
        }
        .fullScreenCover(isPresented: .constant(e2e.state == .locked)) {
            UnlockView()
        }
    }
}
