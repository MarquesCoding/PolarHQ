import SwiftUI

enum OrbitTab: String, CaseIterable, Identifiable {
    case photos, drive, passwords, authenticator
    var id: String { rawValue }

    var title: String {
        switch self {
        case .photos: return "Photos"
        case .drive: return "Drive"
        case .passwords: return "Passwords"
        case .authenticator: return "Auth"
        }
    }

    var icon: String {
        switch self {
        case .photos: return "photo.stack.fill"
        case .drive: return "folder.fill"
        case .passwords: return "key.fill"
        case .authenticator: return "lock.shield.fill"
        }
    }
}

/// Frosted, floating capsule tab bar — the modern "Liquid Glass" pill look. On iOS 26 the
/// `.ultraThinMaterial` fill can be swapped for `.glassEffect()` for the true Liquid Glass.
struct FloatingTabBar: View {
    @Binding var selection: OrbitTab
    @Namespace private var highlight

    var body: some View {
        HStack(spacing: 4) {
            ForEach(OrbitTab.allCases) { tab in
                let active = tab == selection
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { selection = tab }
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 18, weight: .semibold))
                        Text(tab.title)
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(active ? Theme.primaryForeground : Theme.mutedForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background {
                        if active {
                            Capsule(style: .continuous)
                                .fill(Theme.primary)
                                .matchedGeometryEffect(id: "active", in: highlight)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(5)
        .background(.ultraThinMaterial, in: Capsule(style: .continuous))
        .overlay(Capsule(style: .continuous).stroke(Theme.border, lineWidth: 1))
        .shadow(color: .black.opacity(0.18), radius: 18, y: 8)
        .padding(.horizontal, 22)
    }
}
