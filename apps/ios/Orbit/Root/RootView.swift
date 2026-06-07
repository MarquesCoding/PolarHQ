import SwiftUI

struct RootView: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            switch state.phase {
            case .setup:
                ServerSetupView()
            case .signIn:
                SignInView()
            case .authenticated:
                HomeView()
            }
        }
        .animation(.smooth(duration: 0.3), value: state.phase)
    }
}
