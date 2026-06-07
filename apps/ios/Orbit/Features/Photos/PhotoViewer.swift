import SwiftUI
import UIKit

/// Full-screen photo viewer modelled on Apple Photos: paged decrypted originals on black, floaty
/// glass top chrome (back / date / more), a filmstrip scrubber, and a bottom glass action bar
/// (share, favourite, adjust, delete). Tap the photo to hide/show the chrome.
struct PhotoViewer: View {
    let assets: [PhotoAsset]
    @State var index: Int
    let onChanged: () -> Void

    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @Environment(\.dismiss) private var dismiss
    @State private var favourited: [String: Bool] = [:]
    @State private var chromeHidden = false
    @State private var shareURL: URL?

    private var current: PhotoAsset? { assets.indices.contains(index) ? assets[index] : nil }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            TabView(selection: $index) {
                ForEach(Array(assets.enumerated()), id: \.element.id) { offset, asset in
                    DecryptedOriginal(asset: asset)
                        .contentShape(Rectangle())
                        .onTapGesture { withAnimation(.easeInOut(duration: 0.2)) { chromeHidden.toggle() } }
                        .tag(offset)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea()

            if !chromeHidden {
                VStack {
                    topChrome
                    Spacer()
                    bottomChrome
                }
                .transition(.opacity)
            }
        }
        .statusBarHidden(chromeHidden)
        .sheet(item: $shareURL) { url in ActivityView(items: [url]) }
    }

    // MARK: Top

    private var topChrome: some View {
        HStack(alignment: .center) {
            glassCircle("chevron.backward") { dismiss() }
            Spacer()
            if let asset = current {
                VStack(spacing: 1) {
                    Text("Library").font(.footnote.weight(.semibold))
                    Text(dateText(asset)).font(.caption2).foregroundStyle(.secondary)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 7)
                .glassEffect(in: .capsule)
            }
            Spacer()
            Menu {
                if let asset = current {
                    Button { share(asset) } label: { Label("Share", systemImage: "square.and.arrow.up") }
                    Button(role: .destructive) { trash(asset) } label: { Label("Delete", systemImage: "trash") }
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .glassEffect(in: .circle)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    // MARK: Bottom

    private var bottomChrome: some View {
        VStack(spacing: 14) {
            filmstrip
            actionBar
        }
        .padding(.bottom, 8)
    }

    private var filmstrip: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 3) {
                    ForEach(Array(assets.enumerated()), id: \.element.id) { offset, asset in
                        DecryptedThumbnail(asset: asset)
                            .frame(width: offset == index ? 42 : 30, height: 44)
                            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                            .overlay {
                                if offset == index {
                                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                                        .stroke(.white, lineWidth: 2)
                                }
                            }
                            .id(offset)
                            .onTapGesture { withAnimation(.snappy) { index = offset } }
                    }
                }
                .padding(.horizontal, 24)
            }
            .frame(height: 50)
            .onChange(of: index) {
                withAnimation(.snappy) { proxy.scrollTo(index, anchor: .center) }
            }
            .onAppear { proxy.scrollTo(index, anchor: .center) }
        }
    }

    private var actionBar: some View {
        HStack {
            glassCircle("square.and.arrow.up") { if let asset = current { share(asset) } }
            Spacer()
            if let asset = current {
                HStack(spacing: 4) {
                    pillButton(isFav(asset) ? "heart.fill" : "heart", tint: isFav(asset) ? Theme.primary : .white) {
                        toggleFavourite(asset)
                    }
                    pillButton("slider.horizontal.3", tint: .white) {}
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .glassEffect(in: .capsule)
            }
            Spacer()
            glassCircle("trash") { if let asset = current { trash(asset) } }
        }
        .padding(.horizontal, 16)
    }

    private func glassCircle(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .glassEffect(in: .circle)
        }
    }

    private func pillButton(_ icon: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 44, height: 40)
        }
        .buttonStyle(.plain)
    }

    // MARK: Logic

    private func dateText(_ asset: PhotoAsset) -> String {
        let value = asset.takenAt ?? asset.createdAt ?? ""
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = withFraction.date(from: value) ?? ISO8601DateFormatter().date(from: value)
        guard let date else { return "" }
        let out = DateFormatter()
        out.dateFormat = "d MMM  HH:mm"
        return out.string(from: date)
    }

    private func isFav(_ asset: PhotoAsset) -> Bool {
        favourited[asset.id] ?? asset.isFavorite
    }

    private func toggleFavourite(_ asset: PhotoAsset) {
        guard let client = state.api() else { return }
        let next = !isFav(asset)
        favourited[asset.id] = next
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

    private func share(_ asset: PhotoAsset) {
        guard let client = state.api() else { return }
        Task {
            let data: Data?
            if asset.encrypted {
                data = await e2e.decryptedOriginal(assetId: asset.id, client: client)
            } else {
                data = try? await client.data("api/v1/photos/assets/\(asset.id)/original")
            }
            guard let data else { return }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("orbit-\(asset.id).jpg")
            try? data.write(to: url)
            shareURL = url
        }
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
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

/// UIKit share sheet bridge.
private struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
