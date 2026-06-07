import Foundation
import OrbitCrypto
import SwiftUI
import UIKit

/// Account metadata-encryption state, mirroring the web's `lib/e2e.ts`. Unlocks the keypair from
/// the password (or restores it from Keychain), unwraps per-asset content keys, and decrypts the
/// bytes the server can only ever store as ciphertext.
@MainActor
final class E2EManager: ObservableObject {
    enum State: Equatable {
        case unknown
        case notEnrolled
        case locked
        case unlocked
    }

    @Published private(set) var state: State = .unknown

    private var keypair: OrbitCrypto.Keypair?
    private var metaKey: Data?
    private var contentKeys: [String: Data] = [:]

    private enum Key {
        static let publicKey = "e2e-public"
        static let privateKey = "e2e-private"
        static let metaKey = "e2e-meta"
    }

    func reset() {
        keypair = nil
        metaKey = nil
        contentKeys.removeAll()
        Keychain.set(nil, for: Key.publicKey)
        Keychain.set(nil, for: Key.privateKey)
        Keychain.set(nil, for: Key.metaKey)
        state = .unknown
    }

    /// On launch / after sign-in: restore cached keys, else determine whether the user is enrolled.
    func bootstrap(client: APIClient) async {
        if state == .unlocked { return }
        if let pub = Keychain.get(Key.publicKey),
           let priv = Keychain.get(Key.privateKey),
           let publicKey = try? OrbitCrypto.fromBase64(pub),
           let privateKey = try? OrbitCrypto.fromBase64(priv) {
            keypair = OrbitCrypto.Keypair(publicKey: publicKey, privateKey: privateKey)
            metaKey = Keychain.get(Key.metaKey).flatMap { try? OrbitCrypto.fromBase64($0) }
            state = .unlocked
            return
        }
        do {
            let bundle = try await client.keyBundle()
            state = bundle == nil ? .notEnrolled : .locked
        } catch {
            state = .unknown
        }
    }

    /// Unlock with the account password. Returns false on a wrong password / no enrolment.
    func unlock(password: String, client: APIClient) async -> Bool {
        guard let bundle = try? await client.keyBundle() else { return false }
        do {
            let (ops, mem) = Self.params(from: bundle.kdfParams)
            let kek = try OrbitCrypto.deriveKey(
                password: password,
                salt: try OrbitCrypto.fromBase64(bundle.kdfSalt),
                ops: ops,
                mem: mem
            )
            let privateKey = try OrbitCrypto.secretboxOpen(try OrbitCrypto.fromBase64(bundle.wrappedPrivateKey), key: kek)
            let pair = OrbitCrypto.Keypair(
                publicKey: try OrbitCrypto.fromBase64(bundle.publicKey),
                privateKey: privateKey
            )
            if let wrappedMeta = bundle.wrappedMetaKey {
                metaKey = try? OrbitCrypto.sealedBoxOpen(try OrbitCrypto.fromBase64(wrappedMeta), keypair: pair)
            }
            keypair = pair
            Keychain.set(bundle.publicKey, for: Key.publicKey)
            Keychain.set(OrbitCrypto.toBase64(privateKey), for: Key.privateKey)
            Keychain.set(metaKey.map(OrbitCrypto.toBase64), for: Key.metaKey)
            state = .unlocked
            return true
        } catch {
            return false
        }
    }

    /// Decrypt an asset's thumbnail into image data (nil if locked / no key / not encrypted on server).
    func decryptedThumbnail(assetId: String, client: APIClient) async -> Data? {
        guard let key = await contentKey(for: assetId, client: client) else { return nil }
        guard let blob = try? await client.data("api/v1/photos/assets/\(assetId)/thumbnail") else { return nil }
        return try? OrbitCrypto.secretboxOpen(blob, key: key)
    }

    /// Decrypt an asset's full-resolution original into image data.
    func decryptedOriginal(assetId: String, client: APIClient) async -> Data? {
        guard let key = await contentKey(for: assetId, client: client) else { return nil }
        guard let blob = try? await client.data("api/v1/photos/assets/\(assetId)/original") else { return nil }
        return try? OrbitCrypto.secretboxOpen(blob, key: key)
    }

    /// Encrypt an image end-to-end and upload it as a new asset (re-encoded to JPEG so every
    /// client can display it): fresh content key → encrypt original + thumbnail → upload → wrap
    /// the content key to the owner. Requires the keypair to be unlocked.
    func uploadImage(_ source: Data, client: APIClient) async throws {
        guard let keypair else { throw OrbitCrypto.CryptoError.decryptFailed }
        guard let ui = UIImage(data: source), let jpeg = ui.jpegData(compressionQuality: 0.95) else {
            throw OrbitCrypto.CryptoError.encryptFailed
        }
        let width = Int(ui.size.width * ui.scale)
        let height = Int(ui.size.height * ui.scale)
        let contentKey = OrbitCrypto.newContentKey()

        let encryptedOriginal = try OrbitCrypto.secretboxSeal(jpeg, key: contentKey)
        let (assetId, mirrorNodeId) = try await client.uploadEncryptedAsset(
            ciphertext: encryptedOriginal,
            mimeType: "image/jpeg",
            width: width,
            height: height,
            takenAtMs: nil
        )

        let wrapped = OrbitCrypto.toBase64(try OrbitCrypto.sealTo(contentKey, recipientPublicKey: keypair.publicKey))
        try await client.storeSelfKey(documentId: assetId, wrappedKey: wrapped)
        if let mirrorNodeId { try? await client.storeSelfKey(documentId: mirrorNodeId, wrappedKey: wrapped) }

        if let thumb = Self.thumbnail(ui, maxDimension: 512) {
            let encryptedThumb = try OrbitCrypto.secretboxSeal(thumb, key: contentKey)
            try? await client.putEncryptedThumbnail(assetId: assetId, ciphertext: encryptedThumb)
        }
    }

    private static func thumbnail(_ image: UIImage, maxDimension: CGFloat) -> Data? {
        let longest = max(image.size.width, image.size.height)
        let scale = min(1, maxDimension / max(longest, 1))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let scaled = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        return scaled.jpegData(compressionQuality: 0.8)
    }

    /// Decrypt an account-meta-key blob (encrypted names, EXIF, locations).
    func decryptMeta(_ base64: String?) -> Data? {
        guard let base64, let metaKey, let blob = try? OrbitCrypto.fromBase64(base64) else { return nil }
        return try? OrbitCrypto.secretboxOpen(blob, key: metaKey)
    }

    private func contentKey(for assetId: String, client: APIClient) async -> Data? {
        if let cached = contentKeys[assetId] { return cached }
        guard let keypair,
              let wrapped = try? await client.wrappedKey(forDocument: assetId),
              let sealed = try? OrbitCrypto.fromBase64(wrapped),
              let key = try? OrbitCrypto.sealedBoxOpen(sealed, keypair: keypair)
        else { return nil }
        contentKeys[assetId] = key
        return key
    }

    private static func params(from json: String?) -> (ops: Int, mem: Int) {
        guard let json, let data = json.data(using: .utf8),
              let parsed = try? JSONDecoder().decode(StoredParams.self, from: data)
        else { return (2, 67_108_864) }
        return (parsed.ops, parsed.mem)
    }

    private struct StoredParams: Decodable { let ops: Int; let mem: Int }
}
