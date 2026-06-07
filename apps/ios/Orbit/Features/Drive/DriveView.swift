import SwiftUI

/// Drive also hosts documents, sheets and presentations (no dedicated tabs — they live here).
struct DriveView: View {
    var body: some View {
        NavigationStack {
            DriveFolderView(parentId: nil, title: "Drive")
        }
        .tint(Theme.primary)
    }
}

private struct DriveFolderView: View {
    let parentId: String?
    let title: String

    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @State private var children: [DriveNode] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        Group {
            if loading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                ComingSoon(icon: "exclamationmark.triangle", message: error)
            } else if children.isEmpty {
                ComingSoon(icon: "folder", message: "This folder is empty.")
            } else {
                List {
                    ForEach(sorted) { node in
                        row(node)
                            .listRowBackground(Theme.background)
                            .listRowSeparatorTint(Theme.border)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(parentId == nil ? .large : .inline)
        .task { await load() }
    }

    private var sorted: [DriveNode] {
        children.sorted { lhs, rhs in
            if lhs.isFolder != rhs.isFolder { return lhs.isFolder }
            return displayName(lhs).localizedCaseInsensitiveCompare(displayName(rhs)) == .orderedAscending
        }
    }

    @ViewBuilder
    private func row(_ node: DriveNode) -> some View {
        if node.isFolder {
            NavigationLink {
                DriveFolderView(parentId: node.id, title: displayName(node))
            } label: {
                rowLabel(node)
            }
        } else {
            rowLabel(node)
        }
    }

    private func rowLabel(_ node: DriveNode) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon(node))
                .font(.system(size: 20))
                .foregroundStyle(node.isFolder ? Theme.primary : Theme.mutedForeground)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName(node))
                    .font(.body)
                    .foregroundStyle(Theme.foreground)
                    .lineLimit(1)
                if let size = node.sizeBytes, !node.isFolder {
                    Text(byteCount(size))
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }

    private func displayName(_ node: DriveNode) -> String {
        if let enc = node.encryptedName, let data = e2e.decryptMeta(enc), let name = String(data: data, encoding: .utf8) {
            return name
        }
        return node.name
    }

    private func icon(_ node: DriveNode) -> String {
        if node.isFolder { return "folder.fill" }
        let mime = node.mimeType ?? ""
        if mime.contains("orbit.doc") || mime.contains("word") { return "doc.text.fill" }
        if mime.contains("sheet") || mime.contains("excel") || mime.contains("csv") { return "tablecells.fill" }
        if mime.contains("presentation") || mime.contains("powerpoint") { return "rectangle.on.rectangle.angled.fill" }
        if mime.hasPrefix("image/") { return "photo.fill" }
        if mime.hasPrefix("video/") { return "film.fill" }
        if mime.hasPrefix("audio/") { return "music.note" }
        if mime.contains("pdf") { return "doc.richtext.fill" }
        if mime.contains("zip") || mime.contains("compressed") { return "archivebox.fill" }
        return "doc.fill"
    }

    private func byteCount(_ bytes: Int) -> String {
        ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .file)
    }

    private func load() async {
        guard let client = state.api() else { return }
        loading = true
        do {
            children = try await client.driveNodes(parent: parentId).children
            error = nil
        } catch {
            self.error = "Couldn't load this folder."
        }
        loading = false
    }
}
