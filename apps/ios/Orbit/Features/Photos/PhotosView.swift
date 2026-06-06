import SwiftUI

@MainActor
final class PhotosViewModel: ObservableObject {
    @Published var assets: [PhotoAsset] = []
    @Published var loading = false
    @Published var error: String?

    func load(_ client: APIClient?) async {
        guard let client, !loading else { return }
        loading = true
        defer { loading = false }
        do {
            assets = try await client.photos(cursor: nil).assets
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct PhotosView: View {
    @EnvironmentObject private var state: AppState
    @StateObject private var model = PhotosViewModel()

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 3)

    var body: some View {
        ScreenScaffold(title: "Photos") {
            if model.loading && model.assets.isEmpty {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = model.error {
                ComingSoon(icon: "exclamationmark.triangle", message: error)
            } else if model.assets.isEmpty {
                ComingSoon(icon: "photo.on.rectangle", message: "No photos yet.")
            } else {
                ScrollView {
                    if model.assets.contains(where: \.encrypted) {
                        Label("End-to-end encrypted — thumbnails decrypt on-device (coming next).",
                              systemImage: "lock.fill")
                            .font(.caption)
                            .foregroundStyle(Theme.mutedForeground)
                            .padding(.horizontal, 20)
                            .padding(.bottom, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    LazyVGrid(columns: columns, spacing: 3) {
                        ForEach(model.assets) { asset in
                            PhotoTileView(asset: asset)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 110)
                }
            }
        }
        .task { await model.load(state.api()) }
        .refreshable { await model.load(state.api()) }
    }
}

private struct PhotoTileView: View {
    let asset: PhotoAsset

    var body: some View {
        ZStack {
            Rectangle().fill(Theme.card)
            Image(systemName: asset.encrypted ? "lock.fill" : (asset.type == "video" ? "play.fill" : "photo"))
                .font(.system(size: 18))
                .foregroundStyle(Theme.mutedForeground)

            if asset.stackCount > 1 {
                badge("square.stack.3d.up.fill", text: "\(asset.stackCount)")
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(5)
            }
            if asset.isFavorite {
                Image(systemName: "heart.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(.white)
                    .shadow(radius: 1)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .padding(5)
            }
        }
        .aspectRatio(1, contentMode: .fill)
        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
    }

    private func badge(_ icon: String, text: String) -> some View {
        HStack(spacing: 2) {
            Image(systemName: icon).font(.system(size: 9, weight: .bold))
            Text(text).font(.system(size: 10, weight: .semibold))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 5)
        .padding(.vertical, 2)
        .background(.black.opacity(0.5), in: Capsule())
    }
}
