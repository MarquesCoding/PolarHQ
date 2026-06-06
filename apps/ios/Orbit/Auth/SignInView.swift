import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var state: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 8) {
                Text("Sign in")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
                if let host = state.serverURL?.host() {
                    Text(host)
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                }
            }

            VStack(spacing: 12) {
                field("Email", text: $email, keyboard: .emailAddress)
                secureField("Password", text: $password)
                if let error = state.lastError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Theme.destructive)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            Button {
                busy = true
                Task {
                    await state.signIn(email: email, password: password)
                    busy = false
                }
            } label: {
                Group {
                    if busy { ProgressView().tint(.white) } else { Text("Sign in").font(.headline) }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                .foregroundStyle(Theme.primaryForeground)
            }
            .disabled(busy || email.isEmpty || password.isEmpty)

            Button("Change server") { state.changeServer() }
                .font(.subheadline)
                .foregroundStyle(Theme.mutedForeground)

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 28)
    }

    private func field(_ placeholder: String, text: Binding<String>, keyboard: UIKeyboardType) -> some View {
        TextField(placeholder, text: text)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(keyboard)
            .styledField()
    }

    private func secureField(_ placeholder: String, text: Binding<String>) -> some View {
        SecureField(placeholder, text: text).styledField()
    }
}

private extension View {
    func styledField() -> some View {
        padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .foregroundStyle(Theme.foreground)
    }
}
