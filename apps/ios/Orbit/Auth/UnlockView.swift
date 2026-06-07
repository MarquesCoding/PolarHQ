import SwiftUI

/// Prompts for the account password to unlock the E2E keypair (Proton-style single password).
struct UnlockView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @State private var password = ""
    @State private var busy = false
    @State private var failed = false

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            ZStack {
                Circle().fill(Theme.primary.opacity(0.15)).frame(width: 72, height: 72)
                Image(systemName: "lock.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(Theme.primary)
            }
            VStack(spacing: 6) {
                Text("Unlock your library")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
                Text("Enter your password to decrypt your photos on this device.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.mutedForeground)
                    .multilineTextAlignment(.center)
            }

            SecureField("Password", text: $password)
                .textContentType(.password)
                .padding(.horizontal, 14)
                .padding(.vertical, 13)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
                        .stroke(failed ? Theme.destructive : Theme.border, lineWidth: 1)
                )
                .foregroundStyle(Theme.foreground)

            if failed {
                Text("Incorrect password.")
                    .font(.caption)
                    .foregroundStyle(Theme.destructive)
            }

            Button {
                unlock()
            } label: {
                Group {
                    if busy { ProgressView().tint(.white) } else { Text("Unlock").font(.headline) }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                .foregroundStyle(Theme.primaryForeground)
            }
            .disabled(busy || password.isEmpty)

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 28)
        .background(Theme.background.ignoresSafeArea())
    }

    private func unlock() {
        guard let client = state.api() else { return }
        busy = true
        failed = false
        Task {
            let ok = await e2e.unlock(password: password, client: client)
            busy = false
            failed = !ok
            password = ok ? "" : password
        }
    }
}
