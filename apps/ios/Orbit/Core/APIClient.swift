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

    func driveNodes(parent: String?) async throws -> DriveListing {
        var path = "api/v1/drive/nodes"
        if let parent, let encoded = parent.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "?parent=\(encoded)"
        }
        return try await getJSON(path, as: DriveListing.self)
    }

    /// The current user's E2E key bundle (null if they've never set up encryption).
    func keyBundle() async throws -> KeyBundle? {
        try await getJSON("api/v1/docs/keys/me", as: KeyBundleEnvelope.self).keys
    }

    /// The wrapped (sealed-box) content key for a doc/asset, or nil if none is stored.
    func wrappedKey(forDocument id: String) async throws -> String? {
        try await getJSON("api/v1/docs/documents/\(id)/key", as: WrappedKeyEnvelope.self).wrappedKey
    }

    @discardableResult
    func postJSON<T: Encodable>(_ path: String, body: T) async throws -> Data {
        let payload = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request(path, method: "POST", body: payload))
        guard let http = response as? HTTPURLResponse else { throw APIError.decoding }
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(http.statusCode) }
        return data
    }

    func setFavorite(_ assetIds: [String], favorite: Bool) async throws {
        try await postJSON("api/v1/photos/assets/actions/favorite", body: FavoriteBody(assetIds: assetIds, favorite: favorite))
    }

    func trash(_ assetIds: [String]) async throws {
        try await postJSON("api/v1/photos/assets/actions/trash", body: AssetIdsBody(assetIds: assetIds))
    }

    /// Upload an already-encrypted asset (multipart). Returns the new asset id + Drive mirror id.
    func uploadEncryptedAsset(
        ciphertext: Data,
        mimeType: String,
        width: Int,
        height: Int,
        takenAtMs: Int?
    ) async throws -> (assetId: String, mirrorNodeId: String?) {
        let boundary = "orbit-\(UUID().uuidString)"
        var fields: [String: String] = ["encrypted": "true", "mimeType": mimeType, "width": String(width), "height": String(height)]
        if let takenAtMs { fields["mtime"] = String(takenAtMs) }

        var body = Data()
        let dash = "--\(boundary)\r\n"
        for (name, value) in fields {
            body.append(dash.data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        body.append(dash.data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"encrypted\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(ciphertext)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        var req = request("api/v1/photos/assets", method: "POST")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        let (data, response) = try await URLSession.shared.upload(for: req, from: body)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        let parsed = try JSONDecoder().decode(UploadResponse.self, from: data)
        return (parsed.asset.id, parsed.mirrorNodeId)
    }

    /// Store the (sealed) content key for an asset/document, wrapped to the owner.
    func storeSelfKey(documentId: String, wrappedKey: String) async throws {
        try await postJSON("api/v1/docs/documents/\(documentId)/self-key", body: WrappedKeyBody(wrappedKey: wrappedKey))
    }

    /// Upload an encrypted thumbnail blob for an asset.
    func putEncryptedThumbnail(assetId: String, ciphertext: Data) async throws {
        var req = request("api/v1/photos/assets/\(assetId)/thumbnail", method: "PUT")
        req.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        let (_, response) = try await URLSession.shared.upload(for: req, from: ciphertext)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.http((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
    }

    /// Authenticated raw bytes for a path (e.g. an encrypted thumbnail/original).
    func data(_ path: String) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request(path))
        guard let http = response as? HTTPURLResponse else { throw APIError.decoding }
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(http.statusCode) }
        return data
    }

    private struct TokenBody: Decodable { let token: String? }
}

struct SessionEnvelope: Decodable, Sendable {
    let user: SessionUser?
}

struct KeyBundleEnvelope: Decodable, Sendable {
    let keys: KeyBundle?
}

struct KeyBundle: Decodable, Sendable {
    let publicKey: String
    let wrappedPrivateKey: String
    let kdfSalt: String
    let kdfParams: String?
    let recoveryWrapped: String?
    let wrappedMetaKey: String?
}

struct WrappedKeyEnvelope: Decodable, Sendable {
    let wrappedKey: String?
}

struct DriveListing: Decodable, Sendable {
    let parent: DriveNode
    let breadcrumb: [DriveNode]
    let children: [DriveNode]
}

struct DriveNode: Decodable, Identifiable, Sendable {
    let id: String
    let parentId: String?
    let kind: String
    let name: String
    let encryptedName: String?
    let mimeType: String?
    let sizeBytes: Int?
    let thumbnailUrl: String?

    var isFolder: Bool { kind == "folder" }
}

struct FavoriteBody: Encodable, Sendable {
    let assetIds: [String]
    let favorite: Bool
}

struct WrappedKeyBody: Encodable, Sendable {
    let wrappedKey: String
}

struct UploadResponse: Decodable, Sendable {
    struct AssetRef: Decodable, Sendable { let id: String }
    let asset: AssetRef
    let mirrorNodeId: String?
}

struct AssetIdsBody: Encodable, Sendable {
    let assetIds: [String]
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
