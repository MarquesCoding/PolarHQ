// AUTO-GENERATED from CHANGELOG.md by scripts/generate.mjs — do not edit by hand.
import type { Release } from "./types"

export const RELEASES: Release[] = [
  {
    "version": "0.5.0-alpha",
    "date": "2026-06-20",
    "title": "PolarHQ Desktop + a shared-everything rebuild",
    "tags": [
      "Release",
      "Desktop",
      "Architecture"
    ],
    "content": "The headline: **PolarHQ Desktop** — a native app for macOS, Windows, and Linux that runs the *exact same code* as the web app. Underneath it is a ground-up re-architecture that lets one codebase power web, desktop, and (soon) mobile, plus a big round of Photos and Drive polish.\n\n### Added\n- **PolarHQ Desktop** — a native Tauri 2 app with proper macOS chrome: a Tahoe-rounded window, a floating sidebar, the traffic-light controls tucked into the sidebar, and a frosted top bar. Downloads for macOS (Intel + Apple Silicon), Windows, and Linux are on the releases page.\n- **Auto-update** — a Discord-style launch updater that checks for new versions, downloads, installs, and relaunches automatically; signed end-to-end.\n- **Pick your server on the sign-in page** — one animated, split-screen sign-in with a *Self-hosted* / *PolarHQ Hosted* (managed storage, coming soon) toggle and server field right above your credentials.\n- **The Photos lightbox, now in Drive** — image previews in the file browser use the exact same viewer as Photos, filmstrip and all.\n- **A reimagined Drive** — a Library Overview dashboard, a Miller-column (cascading) view, smart views for Recents / Favorites / File Kinds, pinned saved searches, a storage treemap, and proper file-type icons.\n- **Inline photo editor** — edit straight inside the lightbox.\n\n### Improved\n- **Re-architected into shared packages** — the i18n, data/crypto core, and the entire UI + feature logic now live in `@workspace/*` packages, so web, desktop, and future mobile are thin shells over one codebase with no duplication.\n- **Migrated the web app from Next.js to Vite + React Router**, for one consistent stack across every shell.\n- **Redesigned the Photos lightbox** — a windowed viewer, an animated filmstrip, an ambient blurred backdrop, a minimal toolbar, and an attached details panel.\n- **Frosted top bar** — content scrolls cleanly under a translucent, blurred header.\n- Migrated every icon to a single Phosphor set.\n- Parallelized encrypted part uploads, so one large file can saturate the connection.\n\n### Fixed\n- The desktop webview no longer prompts for the macOS keychain on every launch (the local-cache key is stored as raw bytes there).\n- Uploads stay alive across in-app navigation, and chunked uploads resume through transient failures.\n- The viewer no longer crashes the tab on very large encrypted videos.\n\n### Notes\n- Still alpha, still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered."
  },
  {
    "version": "0.3.0",
    "date": "2026-06-08",
    "title": "A full office suite — Sheets & Docs",
    "tags": [
      "Release",
      "Docs",
      "Sheets"
    ],
    "content": "The big one: PolarHQ is now a real office suite. Sheets and Docs ship as full-screen, Google-parity editors, with genuine Microsoft and Google file interop.\n\n### Added\n- **Full-screen editors** for Sheets and Docs — each opens in its own tab with a menu bar, toolbar, and (for Sheets) a formula bar.\n- **Office import** — open `.xlsx` and `.docx` files directly.\n- **Office export** — save documents back out to the Microsoft formats.\n- **Open Office files from Drive** — double-click an `.xls`/`.docx` in the file browser and the right editor launches.\n- Correct **file-type icons** per document type across Drive.\n\n### Improved\n- Rebuilt the spreadsheet grid on **Glide Data Grid** (canvas) — smooth scrolling, real resize, right-click menus, copy/paste, and a correct fill handle.\n- Spreadsheets default to 1,000 rows with a button to add more, matching Google Sheets.\n- Migrated all maps to **mapcn** for consistent, reliable rendering.\n- Rebuilt the marketing site to match the app's dark theme.\n\n### Fixed\n- Undo/redo in Sheets after the grid rebuild.\n- Column dropdowns no longer scroll the sheet to the bottom.\n- Spreadsheet text selection no longer triggers on drag-fill."
  },
  {
    "version": "0.2.1",
    "date": "2026-06-06",
    "title": "iOS reliability & photo fidelity",
    "tags": [
      "Patch",
      "iOS",
      "Fix"
    ],
    "content": "A focused round of fixes for the new iOS client, mostly about making the library complete and the timeline correct.\n\n### Fixed\n- **Paginate the full photo library** — earlier builds capped at a single page.\n- Sort photos by **parsed capture date** across mixed-precision timestamps, so mobile matches the web.\n- Persist login and **E2E keys reliably** in the Keychain (with a UserDefaults fallback).\n- Send the `Origin` header so better-auth accepts native sign-in.\n- Surface the **real sign-in error** (status, URL, and server message) instead of a generic failure.\n\n### Improved\n- Refresh upload thumbnails immediately after capture.\n- Broadcast `photos.asset.changed` on upload so other clients update live."
  },
  {
    "version": "0.2.0",
    "date": "2026-06-04",
    "title": "Native iOS app + live sync",
    "tags": [
      "Release",
      "iOS",
      "Mobile"
    ],
    "content": "PolarHQ goes mobile. A native SwiftUI client for iOS 26, built on a libsodium core that matches the web's encryption byte-for-byte.\n\n### Added\n- **Native iOS client** (SwiftUI) — server setup, bearer auth, and an app-launcher home screen.\n- **OrbitCrypto** — a Swift libsodium module with JS parity test vectors; E2E unlock and decrypted Photos thumbnails on-device.\n- **Immersive Photos library** — Liquid Glass chrome, pinch-to-zoom across Years / Months / All, and an Apple-style photo viewer with filmstrip and action bar.\n- **Drive on iOS** — Files-app-style folder browsing with decrypted names and types, plus rename / delete / new folder.\n- **Device & session management** — see and revoke every signed-in client.\n- **Live sync** — Photos and Drive changes broadcast across web and mobile in real time.\n\n### Improved\n- Bearer-token auth enabled for native clients.\n- OrbitCrypto compiles cleanly under Swift 6 strict concurrency."
  },
  {
    "version": "0.1.2",
    "date": "2026-05-28",
    "title": "Photo stacks & the in-depth editor",
    "tags": [
      "Feature",
      "Photos"
    ],
    "content": "Photos grows up: non-destructive editing and Immich-style stacks.\n\n### Added\n- **In-depth photo editor** with non-destructive **before/after stacking** — your original is never overwritten.\n- **Photo stacks (collections)** — group related shots behind a single cover with a count.\n- **Copy image to clipboard** straight from the lightbox.\n- Remember the lightbox **details-panel** preference between sessions.\n\n### Improved\n- Continuous-flow layout so sparse days share a row instead of each taking a lonely line.\n- HEIC + Apple **Live Photo** upload support.\n- Client-side **EXIF** metadata with a location map in the details panel.\n\n### Fixed\n- Use the correct nucleo duplicate icon for the lightbox copy action.\n- Center day labels and harden map sizing."
  },
  {
    "version": "0.1.1",
    "date": "2026-05-18",
    "title": "Grid, selection & lightbox polish",
    "tags": [
      "Patch",
      "Photos",
      "Fix"
    ],
    "content": "Dozens of small fixes that make the Photos grid feel solid.\n\n### Added\n- **Selection keybinds** with on-screen keyboard hints in the quick-actions bar.\n- **NumberFlow** selection count that animates as you select.\n- Videos **play on hover** in the grid.\n\n### Fixed\n- Stop runaway scroll and stabilise pagination.\n- Virtualization range now updates on scroll — no more grid gaps.\n- Drag-select works from the empty grid margins (right and below).\n- Inset selection ring with a white check, no focus-ring overlap.\n- Square-grid corner rounding and continuous-flow row math."
  },
  {
    "version": "0.1.0",
    "date": "2026-05-02",
    "title": "First alpha — Photos, Drive & E2E",
    "tags": [
      "Release",
      "Photos",
      "Drive",
      "Security"
    ],
    "content": "The first public alpha. The foundation of the whole suite: an encrypted library with Photos and Drive on top.\n\n### Added\n- **End-to-end encryption** — a Proton-style single-password model with libsodium; the server only ever stores ciphertext.\n- **Photos** — a virtualized, continuous-flow library with encrypted thumbnails.\n- **Drive** — folders, uploads, versioning, and trash, with encrypted filenames and bytes.\n- **Drive ↔ Photos shared storage** — one stored object, two apps, zero duplication.\n- **Admin console** — users, apps, per-user limits, groups, roles, branding, and an audit log.\n\n### Notes\n- This is alpha software under active development. Keep your **recovery code** somewhere safe — without your password, encrypted data cannot be recovered."
  }
]
