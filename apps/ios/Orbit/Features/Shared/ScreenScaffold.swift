import SwiftUI

/// Consistent large-title header + account menu, with bottom inset so content clears the tab bar.
struct ScreenScaffold<Content: View, Trailing: View>: View {
    let title: String
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var content: () -> Content
    @EnvironmentObject private var state: AppState

    init(
        title: String,
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() },
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.trailing = trailing
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 14) {
                Text(title)
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(Theme.foreground)
                Spacer()
                trailing()
                Menu {
                    if let email = state.user?.email {
                        Text(email)
                    }
                    Button("Sign out", role: .destructive) { state.signOut() }
                    Button("Change server") { state.changeServer() }
                } label: {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 12)

            content()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}

/// Centred placeholder for screens that aren't built yet.
struct ComingSoon: View {
    let icon: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 40, weight: .regular))
                .foregroundStyle(Theme.mutedForeground)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.mutedForeground)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 40)
    }
}
