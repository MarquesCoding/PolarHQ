import Foundation
import OrbitCrypto

/// Command-line parity check: runs the same assertions as the XCTest suite against the JS
/// vectors, for environments without XCTest/Testing. Exits non-zero on any mismatch.
/// Usage: `swift run OrbitCryptoVerify [path/to/vectors.json]`

struct Vectors: Decodable {
    struct Derive: Decodable {
        let password: String, salt: String, ops: Int, mem: Int, expected: String
    }
    struct SecretboxOpen: Decodable { let key: String, blob: String, expected: String }
    struct SecretstreamOpen: Decodable { let key: String, blob: String, expected: String }
    struct SealedBoxOpen: Decodable { let publicKey, privateKey, sealed, expected: String }
    struct UnlockChain: Decodable {
        let password, salt: String
        let ops, mem: Int
        let publicKey, wrappedPrivateKey, expectedPrivateKey: String
        let wrappedMetaKey, expectedMetaKey, wrappedContentKey, thumbBlob, expectedThumb: String
    }
    let deriveKey: [Derive]
    let secretboxOpen: SecretboxOpen
    let secretstreamOpen: SecretstreamOpen
    let sealedBoxOpen: SealedBoxOpen
    let unlockChain: UnlockChain
}

var failures = 0
@MainActor
func check(_ name: String, _ got: String, _ want: String) {
    if got == want {
        print("  ✅ \(name)")
    } else {
        print("  ❌ \(name)\n     got:  \(got)\n     want: \(want)")
        failures += 1
    }
}

let path = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "Tests/OrbitCryptoTests/Resources/vectors.json"

let data = try Data(contentsOf: URL(fileURLWithPath: path))
let v = try JSONDecoder().decode(Vectors.self, from: data)
print("OrbitCrypto parity vs JS vectors (\(path))")

for (i, d) in v.deriveKey.enumerated() {
    let key = try OrbitCrypto.deriveKey(password: d.password, salt: try OrbitCrypto.fromBase64(d.salt), ops: d.ops, mem: d.mem)
    check("deriveKey[\(i)] ops=\(d.ops) mem=\(d.mem)", OrbitCrypto.toBase64(key), d.expected)
}

let sb = v.secretboxOpen
check("secretboxOpen",
      OrbitCrypto.toBase64(try OrbitCrypto.secretboxOpen(try OrbitCrypto.fromBase64(sb.blob), key: try OrbitCrypto.fromBase64(sb.key))),
      sb.expected)

let ss = v.secretstreamOpen
check("secretstreamOpen",
      OrbitCrypto.toBase64(try OrbitCrypto.secretstreamOpen(try OrbitCrypto.fromBase64(ss.blob), key: try OrbitCrypto.fromBase64(ss.key))),
      ss.expected)

let sealed = v.sealedBoxOpen
let pair = OrbitCrypto.Keypair(
    publicKey: try OrbitCrypto.fromBase64(sealed.publicKey),
    privateKey: try OrbitCrypto.fromBase64(sealed.privateKey)
)
check("sealedBoxOpen",
      OrbitCrypto.toBase64(try OrbitCrypto.sealedBoxOpen(try OrbitCrypto.fromBase64(sealed.sealed), keypair: pair)),
      sealed.expected)

do {
    let key = try OrbitCrypto.fromBase64(sb.key)
    let message = Data("orbit round trip ✅".utf8)
    let roundTrip = try OrbitCrypto.secretboxOpen(try OrbitCrypto.secretboxSeal(message, key: key), key: key)
    check("secretbox round trip", OrbitCrypto.toBase64(roundTrip), OrbitCrypto.toBase64(message))
}

let u = v.unlockChain
let kek = try OrbitCrypto.deriveKey(password: u.password, salt: try OrbitCrypto.fromBase64(u.salt), ops: u.ops, mem: u.mem)
let privateKey = try OrbitCrypto.secretboxOpen(try OrbitCrypto.fromBase64(u.wrappedPrivateKey), key: kek)
check("unlock → privateKey", OrbitCrypto.toBase64(privateKey), u.expectedPrivateKey)

let unlockedPair = OrbitCrypto.Keypair(publicKey: try OrbitCrypto.fromBase64(u.publicKey), privateKey: privateKey)
let metaKey = try OrbitCrypto.sealedBoxOpen(try OrbitCrypto.fromBase64(u.wrappedMetaKey), keypair: unlockedPair)
check("unlock → metaKey", OrbitCrypto.toBase64(metaKey), u.expectedMetaKey)

let contentKey = try OrbitCrypto.sealedBoxOpen(try OrbitCrypto.fromBase64(u.wrappedContentKey), keypair: unlockedPair)
let thumb = try OrbitCrypto.secretboxOpen(try OrbitCrypto.fromBase64(u.thumbBlob), key: contentKey)
check("unlock → thumbnail bytes", OrbitCrypto.toBase64(thumb), u.expectedThumb)

if failures == 0 {
    print("\n✅ all parity checks passed")
} else {
    print("\n❌ \(failures) check(s) failed")
    exit(1)
}
