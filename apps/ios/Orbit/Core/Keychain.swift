import Foundation
import Security

/// Persistent small-secret store: prefers the Keychain, but falls back to UserDefaults when the
/// Keychain is unavailable (e.g. an unsigned simulator build with no keychain entitlement, where
/// `SecItemAdd` silently fails). Writes are verified by read-back so the session genuinely
/// persists across launches.
enum Keychain {
    private static let service = "com.orbit.app"

    static func set(_ value: String?, for key: String) {
        keychainSet(value, for: key)
        if let value {
            if keychainGet(key) == value {
                UserDefaults.standard.removeObject(forKey: defaultsKey(key))
            } else {
                UserDefaults.standard.set(value, forKey: defaultsKey(key))
            }
        } else {
            UserDefaults.standard.removeObject(forKey: defaultsKey(key))
        }
    }

    static func get(_ key: String) -> String? {
        keychainGet(key) ?? UserDefaults.standard.string(forKey: defaultsKey(key))
    }

    private static func defaultsKey(_ key: String) -> String { "store.\(key)" }

    private static func keychainSet(_ value: String?, for key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        guard let value, let data = value.data(using: .utf8) else { return }
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }

    private static func keychainGet(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
