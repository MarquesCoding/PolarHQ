import SwiftUI

/// First-run screen: point the app at a self-hosted Orbit instance (like Immich).
struct ServerSetupView: View {
    @EnvironmentObject private var state: AppState
    @State private var url = "https://"

    var body: some View {
        VStack(spacing: 28) {
            Spacer()

            VStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Theme.primary)
                        .frame(width: 76, height: 76)
                    Image(systemName: "circle.hexagongrid.fill")
                        .font(.system(size: 38, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Text("Connect to Orbit")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Theme.foreground)
                Text("Enter the address of your server instance.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.mutedForeground)
                    .multilineTextAlignment(.center)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Server URL")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Theme.mutedForeground)
                TextField("https://photos.example.com", text: $url)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                    .submitLabel(.go)
                    .onSubmit { state.configureServer(url) }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 13)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
                            .stroke(Theme.border, lineWidth: 1)
                    )
                    .foregroundStyle(Theme.foreground)

                if let error = state.lastError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Theme.destructive)
                }
            }

            Button {
                state.configureServer(url)
            } label: {
                Text("Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.primary, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                    .foregroundStyle(Theme.primaryForeground)
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 28)
    }
}
