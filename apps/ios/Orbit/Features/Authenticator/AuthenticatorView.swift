import SwiftUI

struct AuthenticatorView: View {
    var body: some View {
        ScreenScaffold(title: "Authenticator") {
            ComingSoon(icon: "lock.shield", message: "Your TOTP codes will live here.")
        }
    }
}
