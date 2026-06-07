import PhotosUI
import SwiftUI

nonisolated(unsafe) private let isoWithFraction: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()
nonisolated(unsafe) private let isoPlain = ISO8601DateFormatter()

/// Epoch seconds for an asset's capture date (`takenAt` ?? `createdAt`), parsing both ISO-8601
/// forms (with/without fractional seconds), matching the web's Date-based ordering.
private func assetEpoch(_ asset: PhotoAsset) -> Double {
    let value = asset.takenAt ?? asset.createdAt ?? ""
    return (isoWithFraction.date(from: value) ?? isoPlain.date(from: value))?.timeIntervalSince1970 ?? 0
}

private func assetDate(_ asset: PhotoAsset) -> Date {
    Date(timeIntervalSince1970: assetEpoch(asset))
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
            var all: [PhotoAsset] = []
            var cursor: String?
            var pages = 0
            repeat {
                let page = try await client.photos(cursor: cursor)
                all.append(contentsOf: page.assets)
                pages += 1
                if page.assets.isEmpty || page.nextCursor == cursor { break }
                cursor = page.nextCursor
            } while cursor != nil && pages < 200
            assets = all
                .map { ($0, assetEpoch($0)) }
                .sorted { $0.1 != $1.1 ? $0.1 > $1.1 : $0.0.id > $1.0.id }
                .map(\.0)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private enum Zoom: String, CaseIterable {
    case years = "Years"
    case months = "Months"
    case all = "All"
}

private struct PhotoGroup: Identifiable {
    let key: String
    let title: String
    var items: [PhotoAsset]
    var id: String { key }
}

/// Immersive Apple-Photos library: Years / Months / All zoom levels with sticky date headers,
/// pinch-to-zoom density in All, and floaty Liquid-Glass chrome.
struct PhotosView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @EnvironmentObject private var live: LiveEvents
    @Environment(\.dismiss) private var dismiss
    @StateObject private var model = PhotosViewModel()

    @State private var zoom: Zoom = .all
    @State private var viewer: ViewerSeed?
    @State private var picks: [PhotosPickerItem] = []
    @State private var uploading = false
    @AppStorage("photos.gridCount") private var gridCount = 3
    @State private var pinchBase: Int?

    private let spacing: CGFloat = 2

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.background.ignoresSafeArea()

            if model.loading && model.assets.isEmpty {
                ProgressView()
            } else if model.assets.isEmpty {
                ComingSoon(icon: "photo.on.rectangle", message: "No photos yet.")
            } else {
                switch zoom {
                case .all: allView
                case .months: monthsView
                case .years: yearsView
                }
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

    // MARK: Grouping

    private var indexById: [String: Int] {
        Dictionary(model.assets.enumerated().map { ($1.id, $0) }, uniquingKeysWith: { a, _ in a })
    }

    private func groups(_ granularity: (Date) -> (key: String, title: String)) -> [PhotoGroup] {
        var result: [PhotoGroup] = []
        for asset in model.assets {
            let info = granularity(assetDate(asset))
            if result.last?.key == info.key {
                result[result.count - 1].items.append(asset)
            } else {
                result.append(PhotoGroup(key: info.key, title: info.title, items: [asset]))
            }
        }
        return result
    }

    // MARK: Layouts

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: spacing), count: gridCount)
    }

    private var allView: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 8, pinnedViews: [.sectionHeaders]) {
                ForEach(groups(dayKey)) { group in
                    Section {
                        grid(group.items)
                    } header: {
                        sectionHeader(group.title)
                    }
                }
            }
            .padding(.top, 88)
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
    }

    private var monthsView: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                ForEach(groups(monthKey)) { group in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(group.title).font(.title2.weight(.bold)).foregroundStyle(Theme.foreground)
                            .padding(.horizontal, 12)
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: spacing), count: 3), spacing: spacing) {
                            ForEach(group.items) { tile($0) }
                        }
                        .padding(.horizontal, spacing)
                    }
                }
            }
            .padding(.top, 88)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
    }

    private var yearsView: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                ForEach(groups(yearKey)) { group in
                    Button { withAnimation(.snappy) { zoom = .months } } label: {
                        ZStack(alignment: .bottomLeading) {
                            if let cover = group.items.first {
                                DecryptedThumbnail(asset: cover)
                                    .frame(height: 200)
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                            LinearGradient(colors: [.black.opacity(0.6), .clear], startPoint: .bottom, endPoint: .center)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            VStack(alignment: .leading, spacing: 1) {
                                Text(group.title).font(.title2.weight(.bold))
                                Text("\(group.items.count) items").font(.caption)
                            }
                            .foregroundStyle(.white)
                            .padding(12)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 88)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
    }

    private func grid(_ items: [PhotoAsset]) -> some View {
        LazyVGrid(columns: columns, spacing: spacing) {
            ForEach(items) { tile($0) }
        }
        .padding(.horizontal, spacing)
    }

    private func tile(_ asset: PhotoAsset) -> some View {
        Button {
            if let index = indexById[asset.id] { viewer = ViewerSeed(index: index) }
        } label: {
            PhotoTileView(asset: asset, compact: gridCount >= 6)
        }
        .buttonStyle(.plain)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(Theme.foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial)
    }

    // MARK: Chrome

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
                Text("Library").font(.title2.weight(.bold)).foregroundStyle(Theme.foreground)
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
                HStack(spacing: 2) {
                    ForEach(Zoom.allCases, id: \.self) { value in
                        segment(value)
                    }
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

    private func segment(_ value: Zoom) -> some View {
        Button {
            withAnimation(.snappy) { zoom = value }
        } label: {
            Text(value.rawValue)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(zoom == value ? Theme.primaryForeground : Theme.foreground)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background {
                    if zoom == value { Capsule().fill(Theme.primary) }
                }
        }
        .buttonStyle(.plain)
    }

    // MARK: Date keys

    private func dayKey(_ date: Date) -> (key: String, title: String) {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month, .day], from: date)
        let key = "\(comps.year ?? 0)-\(comps.month ?? 0)-\(comps.day ?? 0)"
        let title: String
        if cal.isDateInToday(date) { title = "Today" }
        else if cal.isDateInYesterday(date) { title = "Yesterday" }
        else {
            let f = DateFormatter()
            f.dateFormat = cal.isDate(date, equalTo: .now, toGranularity: .year) ? "EEEE, d MMMM" : "d MMMM yyyy"
            title = f.string(from: date)
        }
        return (key, title)
    }

    private func monthKey(_ date: Date) -> (key: String, title: String) {
        let comps = Calendar.current.dateComponents([.year, .month], from: date)
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return ("\(comps.year ?? 0)-\(comps.month ?? 0)", f.string(from: date))
    }

    private func yearKey(_ date: Date) -> (key: String, title: String) {
        let year = Calendar.current.component(.year, from: date)
        return ("\(year)", "\(year)")
    }

    // MARK: Upload

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
