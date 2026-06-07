import SwiftUI

/// Loads an asset's thumbnail — decrypting client-side when the asset is E2E-encrypted — and
/// renders it, caching the decoded image. Falls back to a typed placeholder while loading or
/// when no key is available (locked).
struct DecryptedThumbnail: View {
    let asset: PhotoAsset
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @State private var image: UIImage?

    var body: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    ZStack {
                        Theme.card
                        Image(systemName: placeholderIcon)
                            .font(.system(size: 18))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
            }
            .clipped()
            .task(id: "\(asset.id)|\(asset.thumbnailUrl ?? "")") { await load() }
    }

    private var placeholderIcon: String {
        if asset.encrypted && e2e.state != .unlocked { return "lock.fill" }
        return asset.type == "video" ? "play.fill" : "photo"
    }

    private func load() async {
        let cacheKey = "thumb:\(asset.id)"
        if let cached = ImageCache.shared.image(cacheKey) {
            image = cached
            return
        }
        guard asset.thumbnailUrl != nil, let client = state.api() else { return }
        let data: Data?
        if asset.encrypted {
            data = await e2e.decryptedThumbnail(assetId: asset.id, client: client)
        } else {
            data = try? await client.data("api/v1/photos/assets/\(asset.id)/thumbnail")
        }
        if let data, let ui = UIImage(data: data) {
            ImageCache.shared.set(ui, for: cacheKey)
            image = ui
        }
    }
}
