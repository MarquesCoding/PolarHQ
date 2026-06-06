import SwiftUI

struct MainTabView: View {
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
    }
}
