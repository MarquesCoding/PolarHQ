import SwiftUI

/// Full-screen, paged photo viewer showing decrypted originals with favourite/trash actions.
struct PhotoViewer: View {
    let assets: [PhotoAsset]
    @State var index: Int
    let onChanged: () -> Void

    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var favourited: Set<String> = []

    private var current: PhotoAsset? { assets.indices.contains(index) ? assets[index] : nil }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            TabView(selection: $index) {
                ForEach(Array(assets.enumerated()), id: \.element.id) { offset, asset in
                    DecryptedOriginal(asset: asset)
                        .tag(offset)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            VStack {
                toolbar
                Spacer()
            }
        }
        .statusBarHidden()
    }

    private var toolbar: some View {
        HStack(spacing: 18) {
            Button { dismiss() } label: {
                Image(systemName: "xmark").font(.system(size: 16, weight: .semibold))
            }
            Spacer()
            if let asset = current {
                Button { toggleFavourite(asset) } label: {
                    Image(systemName: isFav(asset) ? "heart.fill" : "heart")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(isFav(asset) ? Theme.primary : .white)
                }
                Button { trash(asset) } label: {
                    Image(systemName: "trash").font(.system(size: 17, weight: .semibold))
                }
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.black.opacity(0.001))
    }

    private func isFav(_ asset: PhotoAsset) -> Bool {
        favourited.contains(asset.id) || (asset.isFavorite && !favourited.contains("!\(asset.id)"))
    }

    private func toggleFavourite(_ asset: PhotoAsset) {
        guard let client = state.api() else { return }
        let next = !isFav(asset)
        if next { favourited.insert(asset.id); favourited.remove("!\(asset.id)") }
        else { favourited.remove(asset.id); favourited.insert("!\(asset.id)") }
        Task { try? await client.setFavorite([asset.id], favorite: next); onChanged() }
    }

    private func trash(_ asset: PhotoAsset) {
        guard let client = state.api() else { return }
        Task {
            try? await client.trash([asset.id])
            onChanged()
            dismiss()
        }
    }
}

/// Decrypts and shows an asset's full-resolution original, fit to the screen.
private struct DecryptedOriginal: View {
    let asset: PhotoAsset
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                ProgressView().tint(.white)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task(id: asset.id) { await load() }
    }

    private func load() async {
        let cacheKey = "full:\(asset.id)"
        if let cached = ImageCache.shared.image(cacheKey) {
            image = cached
            return
        }
        guard let client = state.api() else { return }
        let data: Data?
        if asset.encrypted {
            data = await e2e.decryptedOriginal(assetId: asset.id, client: client)
        } else {
            data = try? await client.data("api/v1/photos/assets/\(asset.id)/original")
        }
        if let data, let ui = UIImage(data: data) {
            ImageCache.shared.set(ui, for: cacheKey)
            image = ui
        }
    }
}
