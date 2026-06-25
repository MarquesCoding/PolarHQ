# PolarHQ mobile (Expo SDK 56)

Expo SDK 56 · React 19 · expo-router. Native (React Native) shell over the shared
`@workspace/core` data/crypto layer. The visual layer is built fresh (RN primitives) —
`@workspace/ui`/`@workspace/screens` are DOM/Tailwind and don't render here.

Expo HAS CHANGED — check the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/
before writing native/config code.

## This needs a custom DEV BUILD, not Expo Go

E2E crypto (`@workspace/core/crypto`) is libsodium, which is WASM — Hermes has no WebAssembly.
We route it to the native JSI module `react-native-libsodium` via a Metro alias
(`metro.config.js`: `libsodium-wrappers(-sumo)` → `react-native-libsodium`). Native modules
can't run in Expo Go, so build a dev client.

## Build gotchas (verified)

- **JDK 17 required.** The machine default may be JDK 25/26, which breaks Gradle with
  `JvmVendorSpec ... IBM_SEMERU`. Build with:
  `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
- **react-native-libsodium postinstall** extracts prebuilt `libsodium/build.tgz`. pnpm blocks
  dep build scripts by default → allowlisted in root `pnpm-workspace.yaml` (`allowBuilds`).
  If `libsodium/build/.../libsodium.so` is missing, run `pnpm rebuild react-native-libsodium`.

## Run

```sh
# iOS sim (Xcode active dir may be CLT — override): DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
JAVA_HOME=/opt/homebrew/opt/openjdk@17/.../Home pnpm --filter mobile exec expo run:android
# JS-only changes hot-reload; re-run only when native deps/config change.
```

The Android emulator reaches the host API at `10.0.2.2` (not `localhost`) — `lib/config.ts`
auto-rewrites this.
