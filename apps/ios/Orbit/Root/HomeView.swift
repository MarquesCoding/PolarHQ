import SwiftUI

enum AppRoute: Hashable {
    case photos
    case drive
}

private struct AppEntry: Identifiable {
    let id: String
    let name: String
    let icon: String
    let color: Color
    let route: AppRoute?
}

private let apps: [AppEntry] = [
    AppEntry(id: "photos", name: "Photos", icon: "photo.stack.fill", color: Color(hex: 0x288DFF), route: .photos),
    AppEntry(id: "drive", name: "Drive", icon: "folder.fill", color: Color(hex: 0x34C759), route: .drive),
    AppEntry(id: "passwords", name: "Passwords", icon: "key.fill", color: Color(hex: 0xFF9500), route: nil),
    AppEntry(id: "authenticator", name: "Authenticator", icon: "lock.shield.fill", color: Color(hex: 0xAF52DE), route: nil),
]

struct HomeView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager

    private let columns = [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(apps) { app in
                        if let route = app.route {
                            NavigationLink(value: route) { AppCard(app: app) }
                                .buttonStyle(.plain)
                        } else {
                            AppCard(app: app).opacity(0.55)
                        }
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Orbit")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if let email = state.user?.email { Text(email) }
                        Button("Sign out", role: .destructive) { state.signOut() }
                        Button("Change server") { state.changeServer() }
                    } label: {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
            }
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .photos: PhotosView()
                case .drive: DriveView(parentId: nil, title: "Drive")
                }
            }
        }
        .tint(Theme.primary)
        .task {
            if let client = state.api() { await e2e.bootstrap(client: client) }
        }
        .fullScreenCover(isPresented: .constant(e2e.state == .locked)) {
            UnlockView()
        }
    }
}

private struct AppCard: View {
    let app: AppEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(app.color)
                    .frame(width: 52, height: 52)
                Image(systemName: app.icon)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(app.name)
                    .font(.headline)
                    .foregroundStyle(Theme.foreground)
                if app.route == nil {
                    Text("Coming soon")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .frame(height: 150, alignment: .topLeading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Theme.border, lineWidth: 1))
    }
}
