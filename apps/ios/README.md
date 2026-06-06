# Orbit — iOS app

Native SwiftUI client for a self-hosted Orbit instance. Targets **iOS 26**.

## Build

```bash
brew install xcodegen        # one-time
cd apps/ios
xcodegen generate            # writes Orbit.xcodeproj (gitignored)
open Orbit.xcodeproj          # build + run in Xcode 26
```

The `.xcodeproj` is generated from `project.yml`; edit `project.yml`, not the
project file, and re-run `xcodegen generate`.

## What works now

- **Server setup** — point the app at your instance URL (Immich-style); stored in Keychain.
- **Sign in** — email/password against better-auth; the session token (from the
  `bearer` plugin's `set-auth-token` header) is stored in Keychain and sent as
  `Authorization: Bearer …` on every call.
- **Floating Liquid-Glass tab bar** — Photos / Drive / Passwords / Authenticator,
  in the suite's colour scheme (brand `#288dff`).
- **Photos** — real authenticated fetch of the timeline; tiles render with stack
  count + favourite badges. Thumbnails are placeholders until the crypto module
  lands (the bytes are E2E-encrypted).

## Next

1. **`OrbitCrypto`** — libsodium parity with `apps/web/lib/crypto.ts` (Argon2id,
   `secretbox`, sealed box), validated against JSON test vectors exported from
   the web crypto. Unlocks thumbnail/original decryption + encrypted upload.
2. **Photo upload** from the camera roll via PhotoKit (Live Photos + HEIC natively).
3. **Drive** (incl. docs/sheets/presentations — no separate tabs), **Passwords**,
   **Authenticator** screens.
4. **Device management + sync** surfaced in the web admin (active sessions, last sync).

## Notes

- Auth is the `bearer` plugin (DB-backed, revocable from `/admin`) — not the
  stateless `jwt` plugin, which is reserved for future cross-service/SSO use.
- iOS 26's `.glassEffect()` can replace the `.ultraThinMaterial` fill in
  `FloatingTabBar` for the true Liquid Glass material.
