import Foundation
import Sodium

/// Client-side cryptography for Orbit, byte-compatible with the web suite
/// (`apps/web/lib/crypto.ts`). All primitives are stock libsodium:
/// Argon2id (`crypto_pwhash`), `secretbox` (XSalsa20-Poly1305, layout `nonce‖ciphertext`),
/// and anonymous sealed boxes (`crypto_box_seal`). Base64 uses the standard
/// padded alphabet, matching libsodium's `ORIGINAL` variant.
public enum OrbitCrypto {
    public enum CryptoError: Error {
        case kdfFailed
        case decryptFailed
        case encryptFailed
        case badBase64
    }

    nonisolated(unsafe) private static let sodium = Sodium()

    public struct Keypair: Sendable {
        public let publicKey: Data
        public let privateKey: Data
        public init(publicKey: Data, privateKey: Data) {
            self.publicKey = publicKey
            self.privateKey = privateKey
        }
    }

    /// A fresh random 32-byte symmetric content key (for encrypting a new asset).
    public static func newContentKey() -> Data { Data(sodium.secretBox.key()) }

    public static func toBase64(_ data: Data) -> String { data.base64EncodedString() }

    public static func fromBase64(_ value: String) throws -> Data {
        guard let data = Data(base64Encoded: value) else { throw CryptoError.badBase64 }
        return data
    }

    /// Argon2id key-encryption-key derivation. `ops`/`mem` come from the account's stored
    /// `kdfParams` (default ops 3 / mem 128 MiB; legacy ops 2 / mem 64 MiB).
    public static func deriveKey(password: String, salt: Data, ops: Int, mem: Int) throws -> Data {
        guard let key = sodium.pwHash.hash(
            outputLength: 32,
            passwd: Array(password.utf8),
            salt: [UInt8](salt),
            opsLimit: ops,
            memLimit: mem,
            alg: .Argon2ID13
        ) else { throw CryptoError.kdfFailed }
        return Data(key)
    }

    /// Decrypt a `nonce‖ciphertext` secretbox blob with a 32-byte key.
    public static func secretboxOpen(_ blob: Data, key: Data) throws -> Data {
        guard let plain = sodium.secretBox.open(
            nonceAndAuthenticatedCipherText: [UInt8](blob),
            secretKey: [UInt8](key)
        ) else { throw CryptoError.decryptFailed }
        return Data(plain)
    }

    /// Encrypt with a 32-byte key, returning `nonce‖ciphertext` (random nonce).
    public static func secretboxSeal(_ message: Data, key: Data) throws -> Data {
        let sealed: [UInt8]? = sodium.secretBox.seal(message: [UInt8](message), secretKey: [UInt8](key))
        guard let sealed else { throw CryptoError.encryptFailed }
        return Data(sealed)
    }

    /// Open an anonymous sealed box addressed to a keypair (used to unwrap the meta key
    /// and per-asset content keys).
    public static func sealedBoxOpen(_ sealed: Data, keypair: Keypair) throws -> Data {
        guard let plain = sodium.box.open(
            anonymousCipherText: [UInt8](sealed),
            recipientPublicKey: [UInt8](keypair.publicKey),
            recipientSecretKey: [UInt8](keypair.privateKey)
        ) else { throw CryptoError.decryptFailed }
        return Data(plain)
    }

    /// Wrap a key/message to a recipient's public key (anonymous sealed box).
    public static func sealTo(_ message: Data, recipientPublicKey: Data) throws -> Data {
        guard let sealed = sodium.box.seal(
            message: [UInt8](message),
            recipientPublicKey: [UInt8](recipientPublicKey)
        ) else { throw CryptoError.encryptFailed }
        return Data(sealed)
    }
}
