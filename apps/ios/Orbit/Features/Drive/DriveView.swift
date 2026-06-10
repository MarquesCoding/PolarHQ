import SwiftUI

private enum DriveSort: String, CaseIterable {
    case name = "Name"
    case recent = "Recent"
}

/// Files-app-style Drive: an inset list of folders/files with type icons + metadata, swipe and
/// context actions (rename, delete), a New Folder + sort menu, pushed navigation for folders.
/// Documents and sheets live here too — no separate apps.
struct DriveView: View {
    let parentId: String?
    let title: String

    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var e2e: E2EManager
    @EnvironmentObject private var live: LiveEvents
    @State private var children: [DriveNode] = []
    @State private var loading = true
    @State private var error: String?
    @AppStorage("drive.sort") private var sortRaw = DriveSort.name.rawValue

    @State private var renameTarget: DriveNode?
    @State private var renameText = ""
    @State private var newFolderShown = false
    @State private var newFolderText = ""

    private var sort: DriveSort { DriveSort(rawValue: sortRaw) ?? .name }

    var body: some View {
        Group {
            if loading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                ComingSoon(icon: "exclamationmark.triangle", message: error)
            } else if children.isEmpty {
                ComingSoon(icon: "folder", message: "This folder is empty.")
            } else {
                list
            }
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(parentId == nil ? .large : .inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { startNewFolder() } label: { Label("New Folder", systemImage: "folder.badge.plus") }
                    Picker("Sort", selection: $sortRaw) {
                        ForEach(DriveSort.allCases, id: \.self) { Text($0.rawValue).tag($0.rawValue) }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task { await load() }
        .onChange(of: live.driveTick) { Task { await load() } }
        .alert("Rename", isPresented: Binding(get: { renameTarget != nil }, set: { if !$0 { renameTarget = nil } })) {
            TextField("Name", text: $renameText)
            Button("Cancel", role: .cancel) { renameTarget = nil }
            Button("Rename") { commitRename() }
        }
        .alert("New Folder", isPresented: $newFolderShown) {
            TextField("Name", text: $newFolderText)
            Button("Cancel", role: .cancel) {}
            Button("Create") { commitNewFolder() }
        }
    }

    private var list: some View {
        List {
            ForEach(sorted) { node in
                row(node)
                    .listRowBackground(Theme.card)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) { trash(node) } label: { Label("Delete", systemImage: "trash") }
                        Button { startRename(node) } label: { Label("Rename", systemImage: "pencil") }.tint(.gray)
                    }
                    .contextMenu {
                        Button { startRename(node) } label: { Label("Rename", systemImage: "pencil") }
                        Button(role: .destructive) { trash(node) } label: { Label("Delete", systemImage: "trash") }
                    }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    @ViewBuilder
    private func row(_ node: DriveNode) -> some View {
        if node.isFolder {
            NavigationLink {
                DriveView(parentId: node.id, title: displayName(node))
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
                .font(.system(size: 22))
                .foregroundStyle(node.isFolder ? Theme.primary : Theme.mutedForeground)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName(node))
                    .font(.body)
                    .foregroundStyle(Theme.foreground)
                    .lineLimit(1)
                Text(subtitle(node))
                    .font(.caption)
                    .foregroundStyle(Theme.mutedForeground)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }

    // MARK: Data

    private var sorted: [DriveNode] {
        children.sorted { lhs, rhs in
            if lhs.isFolder != rhs.isFolder { return lhs.isFolder }
            switch sort {
            case .name:
                return displayName(lhs).localizedCaseInsensitiveCompare(displayName(rhs)) == .orderedAscending
            case .recent:
                return (rhs.updatedAt ?? "") < (lhs.updatedAt ?? "")
            }
        }
    }

    private func displayName(_ node: DriveNode) -> String {
        if let enc = node.encryptedName, let data = e2e.decryptMeta(enc), let name = String(data: data, encoding: .utf8) {
            return name
        }
        return node.name
    }

    private func subtitle(_ node: DriveNode) -> String {
        if node.isFolder {
            return "Folder"
        }
        if let size = node.sizeBytes {
            return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
        }
        return "File"
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

    // MARK: Actions

    private func trash(_ node: DriveNode) {
        guard let client = state.api() else { return }
        Task { try? await client.trashNode(node.id); await load() }
    }

    private func startRename(_ node: DriveNode) {
        renameText = displayName(node)
        renameTarget = node
    }

    private func commitRename() {
        guard let node = renameTarget, let client = state.api() else { return }
        let name = renameText.trimmingCharacters(in: .whitespaces)
        renameTarget = nil
        guard !name.isEmpty else { return }
        let enc = e2e.encryptName(name)
        Task { try? await client.renameNode(node.id, name: enc.placeholder, encryptedName: enc.encrypted); await load() }
    }

    private func startNewFolder() {
        newFolderText = ""
        newFolderShown = true
    }

    private func commitNewFolder() {
        guard let client = state.api() else { return }
        let name = newFolderText.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        let enc = e2e.encryptName(name)
        Task { try? await client.createFolder(parentId: parentId, name: enc.placeholder, encryptedName: enc.encrypted); await load() }
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
