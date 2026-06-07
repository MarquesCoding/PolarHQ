import PhotosUI
import SwiftUI

nonisolated(unsafe) private let isoWithFraction: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()
nonisolated(unsafe) private let isoPlain = ISO8601DateFormatter()

/// Epoch seconds for an asset's capture date (`takenAt` ?? `createdAt`), parsing both ISO-8601
/// forms (with/without fractional seconds). Matches the web's `new Date(...).getTime()` ordering —
/// string compare is wrong because the timestamps mix precisions.
private func assetEpoch(_ asset: PhotoAsset) -> Double {
    let value = asset.takenAt ?? asset.createdAt ?? ""
    return (isoWithFraction.date(from: value) ?? isoPlain.date(from: value))?.timeIntervalSince1970 ?? 0
}

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
            let keyed = try await client.photos(cursor: nil).assets.map { ($0, assetEpoch($0)) }
            assets = keyed
                .sorted { $0.1 != $1.1 ? $0.1 > $1.1 : $0.0.id > $1.0.id }
                .map(\.0)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private enum PhotosTab {
    case library
    case collections
}

/// Immersive, Apple-Photos-style library: full-bleed grid with pinch-to-zoom density and
/// floaty Liquid-Glass chrome (Library/Collections pill + Search), pushed from Home.
struct PhotosView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @EnvironmentObject private var live: LiveEvents
    @Environment(\.dismiss) private var dismiss
    @StateObject private var model = PhotosViewModel()

    @State private var tab: PhotosTab = .library
    @State private var viewer: ViewerSeed?
    @State private var picks: [PhotosPickerItem] = []
    @State private var uploading = false
    @AppStorage("photos.gridCount") private var gridCount = 3
    @State private var pinchBase: Int?

    private let spacing: CGFloat = 2

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.background.ignoresSafeArea()

            if tab == .library {
                libraryGrid
            } else {
                ComingSoon(icon: "rectangle.stack", message: "Albums & collections are coming soon.")
            }

            topChrome
            bottomChrome
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.load(state.api()) }
        .onChange(of: live.photosTick) { Task { await model.load(state.api()) } }
        .onChange(of: picks) { _, items in
            guard !items.isEmpty else { return }
            Task { await upload(items) }
        }
        .fullScreenCover(item: $viewer) { seed in
            PhotoViewer(assets: model.assets, index: seed.index) {
                Task { await model.load(state.api()) }
            }
        }
    }

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: spacing), count: gridCount)
    }

    private var libraryGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: spacing) {
                ForEach(Array(model.assets.enumerated()), id: \.element.id) { offset, asset in
                    Button { viewer = ViewerSeed(index: offset) } label: {
                        PhotoTileView(asset: asset, compact: gridCount >= 6)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, spacing)
            .padding(.top, 96)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .refreshable { await model.load(state.api()) }
        .gesture(
            MagnifyGesture()
                .onChanged { value in
                    let base = pinchBase ?? gridCount
                    if pinchBase == nil { pinchBase = gridCount }
                    gridCount = min(10, max(1, Int((Double(base) / value.magnification).rounded())))
                }
                .onEnded { _ in pinchBase = nil }
        )
        .overlay {
            if model.loading && model.assets.isEmpty {
                ProgressView()
            } else if model.assets.isEmpty {
                ComingSoon(icon: "photo.on.rectangle", message: "No photos yet.")
            }
        }
    }

    private var topChrome: some View {
        VStack {
            HStack(alignment: .center) {
                Button { dismiss() } label: {
                    Image(systemName: "chevron.backward")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .frame(width: 38, height: 38)
                        .glassEffect(in: .circle)
                }
                VStack(alignment: .leading, spacing: 0) {
                    Text("Library").font(.title2.weight(.bold))
                    if let date = model.assets.first?.takenAt ?? model.assets.first?.createdAt {
                        Text(prettyDate(date))
                            .font(.footnote)
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
                .foregroundStyle(Theme.foreground)
                .padding(.leading, 4)

                Spacer()

                PhotosPicker(selection: $picks, matching: .images, photoLibrary: .shared()) {
                    Group {
                        if uploading { ProgressView() } else { Image(systemName: "plus") }
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.foreground)
                    .frame(width: 38, height: 38)
                    .glassEffect(in: .circle)
                }
                .disabled(uploading || e2e.state != .unlocked)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            Spacer()
        }
    }

    private var bottomChrome: some View {
        HStack {
            GlassEffectContainer(spacing: 10) {
                HStack(spacing: 4) {
                    segment("Library", tab: .library)
                    segment("Collections", tab: .collections)
                }
                .padding(4)
                .glassEffect(in: .capsule)
            }
            Spacer()
            Button {
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.foreground)
                    .frame(width: 52, height: 52)
                    .glassEffect(in: .circle)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    private func segment(_ title: String, tab value: PhotosTab) -> some View {
        Button {
            withAnimation(.snappy) { tab = value }
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(tab == value ? Theme.primaryForeground : Theme.foreground)
                .padding(.horizontal, 16)
                .padding(.vertical, 9)
                .background {
                    if tab == value {
                        Capsule().fill(Theme.primary)
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private func prettyDate(_ iso: String) -> String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = parser.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let date else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM yyyy"
        return formatter.string(from: date)
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
    let compact: Bool

    var body: some View {
        ZStack {
            DecryptedThumbnail(asset: asset)

            if asset.stackCount > 1 && !compact {
                badge("square.stack.3d.up.fill", text: "\(asset.stackCount)")
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(4)
            }
            if asset.isFavorite && !compact {
                Image(systemName: "heart.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(.white)
                    .shadow(radius: 1)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .padding(4)
            }
        }
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
