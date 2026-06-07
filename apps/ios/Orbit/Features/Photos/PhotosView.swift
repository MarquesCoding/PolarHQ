import PhotosUI
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
    @EnvironmentObject private var e2e: E2EManager
    @StateObject private var model = PhotosViewModel()
    @State private var viewer: ViewerSeed?
    @State private var picks: [PhotosPickerItem] = []
    @State private var uploading = false

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 3)

    var body: some View {
        ScreenScaffold(title: "Photos", trailing: { uploadButton }) {
            if model.loading && model.assets.isEmpty {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = model.error {
                ComingSoon(icon: "exclamationmark.triangle", message: error)
            } else if model.assets.isEmpty {
                ComingSoon(icon: "photo.on.rectangle", message: "No photos yet.")
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 3) {
                        ForEach(Array(model.assets.enumerated()), id: \.element.id) { offset, asset in
                            Button { viewer = ViewerSeed(index: offset) } label: {
                                PhotoTileView(asset: asset)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 110)
                }
            }
        }
        .task { await model.load(state.api()) }
        .refreshable { await model.load(state.api()) }
        .fullScreenCover(item: $viewer) { seed in
            PhotoViewer(assets: model.assets, index: seed.index) {
                Task { await model.load(state.api()) }
            }
        }
        .onChange(of: picks) { _, items in
            guard !items.isEmpty else { return }
            Task { await upload(items) }
        }
    }

    private var uploadButton: some View {
        PhotosPicker(selection: $picks, matching: .images, photoLibrary: .shared()) {
            if uploading {
                ProgressView().tint(Theme.primary)
            } else {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 26))
                    .foregroundStyle(Theme.primary)
            }
        }
        .disabled(uploading || e2e.state != .unlocked)
    }

    private func upload(_ items: [PhotosPickerItem]) async {
        guard let client = state.api() else { return }
        uploading = true
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self) {
                try? await e2e.uploadImage(data, client: client)
            }
        }
        picks = []
        uploading = false
        await model.load(client)
    }
}

private struct ViewerSeed: Identifiable {
    let id = UUID()
    let index: Int
}

private struct PhotoTileView: View {
    let asset: PhotoAsset

    var body: some View {
        ZStack {
            DecryptedThumbnail(asset: asset)

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
