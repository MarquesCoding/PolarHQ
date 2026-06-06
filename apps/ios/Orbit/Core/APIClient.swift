import Foundation

enum APIError: Error, LocalizedError {
    case notConfigured
    case http(Int)
    case decoding
    case message(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "No server configured."
        case let .http(code): return "Server returned \(code)."
        case .decoding: return "Couldn't read the server response."
        case let .message(text): return text
        }
    }
}

/// Talks to a self-hosted Orbit instance. The base URL is user-supplied (Immich-style),
/// and authenticated calls carry the better-auth session token as a bearer header.
actor APIClient {
    private let baseURL: URL
    private var token: String?

    init(baseURL: URL, token: String?) {
        self.baseURL = baseURL
        self.token = token
    }

    func setToken(_ token: String?) {
        self.token = token
    }

    private func request(_ path: String, method: String = "GET", body: Data? = nil) -> URLRequest {
        let full = URL(string: "\(baseURL.absoluteString)/\(path)") ?? baseURL
        var request = URLRequest(url: full)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("Orbit-iOS/0.1.0", forHTTPHeaderField: "User-Agent")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    /// Sign in with email/password; returns the bearer token from the `set-auth-token` header.
    func signIn(email: String, password: String) async throws -> String {
        let payload = try JSONEncoder().encode(["email": email, "password": password])
        let (data, response) = try await URLSession.shared.data(
            for: request("api/auth/sign-in/email", method: "POST", body: payload)
        )
        guard let http = response as? HTTPURLResponse else { throw APIError.decoding }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.message(http.statusCode == 401 ? "Invalid email or password." : "Sign-in failed (\(http.statusCode)).")
        }
        if let header = http.value(forHTTPHeaderField: "set-auth-token"), !header.isEmpty {
            return header
        }
        if let parsed = try? JSONDecoder().decode(TokenBody.self, from: data), let value = parsed.token {
            return value
        }
        throw APIError.message("Server did not return a session token. Is the bearer plugin enabled?")
    }

    func getJSON<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request(path))
        guard let http = response as? HTTPURLResponse else { throw APIError.decoding }
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(http.statusCode) }
        let decoder = JSONDecoder()
        guard let value = try? decoder.decode(T.self, from: data) else { throw APIError.decoding }
        return value
    }

    /// Validate the stored token and return the signed-in user (better-auth session).
    func currentUser() async throws -> SessionUser {
        let session = try await getJSON("api/auth/get-session", as: SessionEnvelope.self)
        guard let user = session.user else { throw APIError.http(401) }
        return user
    }

    func photos(cursor: String?) async throws -> PhotoPage {
        var path = "api/v1/photos/assets?limit=120"
        if let cursor, let encoded = cursor.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&cursor=\(encoded)"
        }
        return try await getJSON(path, as: PhotoPage.self)
    }

    private struct TokenBody: Decodable { let token: String? }
}

struct SessionEnvelope: Decodable, Sendable {
    let user: SessionUser?
}

struct SessionUser: Decodable, Sendable {
    let id: String
    let email: String
    let name: String
}

struct PhotoPage: Decodable, Sendable {
    let assets: [PhotoAsset]
    let nextCursor: String?
}

struct PhotoAsset: Decodable, Identifiable, Sendable {
    let id: String
    let type: String
    let encrypted: Bool
    let width: Int?
    let height: Int?
    let thumbnailUrl: String?
    let motion: Bool
    let stackCount: Int
    let isFavorite: Bool
}
