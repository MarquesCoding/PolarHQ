// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "OrbitKit",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "OrbitCrypto", targets: ["OrbitCrypto"]),
    ],
    dependencies: [
        .package(url: "https://github.com/jedisct1/swift-sodium.git", from: "0.9.1"),
    ],
    targets: [
        .target(
            name: "OrbitCrypto",
            dependencies: [.product(name: "Sodium", package: "swift-sodium")]
        ),
        .testTarget(
            name: "OrbitCryptoTests",
            dependencies: ["OrbitCrypto"],
            resources: [.process("Resources")]
        ),
    ]
)
