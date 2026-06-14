# @polarhq/mobile — Vault mobile (React Native + Swift) · planned

> **Status: not started.** This is the one remaining TODO item that needs a real
> device toolchain (Xcode + the React Native/Expo CLI) and a native crypto module,
> none of which were available where the re-platform was done. It is intentionally
> a **plan**, not a half-built scaffold, so it isn't shipped broken. The old
> SwiftUI client (`apps/ios`) was deleted earlier; this replaces it.

## Shape

A React Native app (Expo, bare workflow if a custom libsodium native module is
needed) that **reuses the framework-agnostic packages** and rebuilds only the UI:

| Reuse as-is | Rebuild for native |
| --- | --- |
| `@polarhq/sdk` — fetch-based, runs in RN unchanged (`configureSdk({ apiUrl })`) | The screens — RN components, not `@polarhq/interface` (that's react-dom/web) |
| `@polarhq/i18n` — i18next works in RN | Navigation — React Navigation (not TanStack Router) |
| `@polarhq/core` formatting/changelog | Crypto — see the gate below |

## The gate: crypto parity

`@polarhq/core/crypto` uses `libsodium-wrappers-sumo` (WASM). RN has no WASM, so the
crypto must be backed by a native module (e.g. `react-native-libsodium` or a Swift/
Kotlin bridge) exposing the **same** primitives: `secretbox` seal/open and the
`crypto_secretstream_xchacha20poly1305` chunked format with the `PSS1` magic. Until
the native side byte-for-byte matches `core/crypto`, E2E files written on web won't
open on mobile. **This parity is the first milestone** — validate it against the
crypto test vectors (`apps/web/scripts/gen-crypto-vectors.ts`) before any UI.

## Milestones

1. **Auth + crypto parity** — custom server URL (Immich-style), bearer auth via
   `@polarhq/sdk/authClient` equivalent, native libsodium passing the vectors.
2. **Browse** — the unified Vault explorer (folders + media), read-only, decrypting
   client-side. Reuse `@polarhq/vault` fetchers where they don't touch DOM/web APIs.
3. **Capture + upload** — camera roll → encrypted upload (mirrors `driveE2e`/`photosE2e`).
4. **Offline + sync, device management** — deferred.

## Why Expo + a config plugin

Expo gives OTA updates and a clean RN setup; a config plugin (or bare workflow)
adds the native libsodium module. Metro must be configured for the pnpm workspace
(`watchFolders` + `resolver.nodeModulesPaths`) so it resolves `@polarhq/*` from the
monorepo.
