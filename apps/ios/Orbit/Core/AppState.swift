import Foundation
import SwiftUI

/// Top-level app phases: choose a server, sign in, then the main experience.
enum AppPhase {
    case setup
    case signIn
    case authenticated
}

@MainActor
final class AppState: ObservableObject {
    @Published private(set) var phase: AppPhase = .setup
    @Published private(set) var serverURL: URL?
    @Published private(set) var user: SessionUser?
    @Published var lastError: String?

    let e2e = E2EManager()
    private var token: String?
    private var client: APIClient?

    private enum Key {
        static let server = "server-url"
        static let token = "session-token"
    }

    init() {
        if let stored = Keychain.get(Key.server), let url = URL(string: stored) {
            serverURL = url
            token = Keychain.get(Key.token)
            client = APIClient(baseURL: url, token: token)
            phase = token == nil ? .signIn : .authenticated
        }
    }

    func api() -> APIClient? { client }

    /// Persist the chosen server and move on to sign-in. Trims a trailing slash.
    func configureServer(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        let normalized = trimmed.hasSuffix("/") ? String(trimmed.dropLast()) : trimmed
        guard let url = URL(string: normalized), url.scheme != nil, url.host != nil else {
            lastError = "Enter a full URL, e.g. https://photos.example.com"
            return
        }
        serverURL = url
        Keychain.set(normalized, for: Key.server)
        client = APIClient(baseURL: url, token: nil)
        phase = .signIn
    }

    func changeServer() {
        signOut()
        Keychain.set(nil, for: Key.server)
        serverURL = nil
        client = nil
        phase = .setup
    }

    func signIn(email: String, password: String) async {
        guard let client else { return }
        lastError = nil
        do {
            let token = try await client.signIn(email: email, password: password)
            await client.setToken(token)
            self.token = token
            Keychain.set(token, for: Key.token)
            user = try await client.currentUser()
            _ = await e2e.unlock(password: password, client: client)
            phase = .authenticated
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// On launch with a cached token, trust the stored session and restore the unlocked keys.
    /// User refresh is best-effort — a transient failure must NOT sign the user out (only an
    /// explicit, user-initiated sign-out or a server-rejected request should).
    func restoreSession() async {
        guard phase == .authenticated, let client else { return }
        await e2e.bootstrap(client: client)
        user = try? await client.currentUser()
    }

    func signOut() {
        token = nil
        user = nil
        Keychain.set(nil, for: Key.token)
        e2e.reset()
        Task { await client?.setToken(nil) }
        if serverURL != nil { phase = .signIn }
    }
}
