# Changelog

All notable changes to PolarHQ. This file is the single source of truth for release notes —
it is rendered in-app (the "What's new" dialog) and on the marketing site. New versions are
appended by [release-please](https://github.com/googleapis/release-please) from conventional
commits; you may polish the wording in the Release PR before merging.

Format: each release is `## [version] - date — Title`, an optional `<!-- tags: a, b -->` line,
then Markdown notes.

## [0.5.0-alpha] - 2026-06-20 — PolarHQ Desktop + a shared-everything rebuild
<!-- tags: Release, Desktop, Architecture -->

The headline: **PolarHQ Desktop** — a native app for macOS, Windows, and Linux that runs the *exact same code* as the web app. Underneath it is a ground-up re-architecture that lets one codebase power web, desktop, and (soon) mobile, plus a big round of Photos and Drive polish.

### Added
- **PolarHQ Desktop** — a native Tauri 2 app with proper macOS chrome: a Tahoe-rounded window, a floating sidebar, the traffic-light controls tucked into the sidebar, and a frosted top bar. Downloads for macOS (Intel + Apple Silicon), Windows, and Linux are on the releases page.
- **Auto-update** — a Discord-style launch updater that checks for new versions, downloads, installs, and relaunches automatically; signed end-to-end.
- **Pick your server on the sign-in page** — one animated, split-screen sign-in with a *Self-hosted* / *PolarHQ Hosted* (managed storage, coming soon) toggle and server field right above your credentials.
- **The Photos lightbox, now in Drive** — image previews in the file browser use the exact same viewer as Photos, filmstrip and all.
- **A Spacedrive-style Drive** — a Library Overview dashboard, a Miller-column (cascading) view, smart views for Recents / Favorites / File Kinds, pinned saved searches, a storage treemap, and proper file-type icons.
- **Inline photo editor** — edit straight inside the lightbox.

### Improved
- **Re-architected into shared packages** — the i18n, data/crypto core, and the entire UI + feature logic now live in `@workspace/*` packages, so web, desktop, and future mobile are thin shells over one codebase with no duplication.
- **Migrated the web app from Next.js to Vite + React Router**, for one consistent stack across every shell.
- **Redesigned the Photos lightbox** — a windowed viewer, an animated filmstrip, an ambient blurred backdrop, a minimal toolbar, and an attached details panel.
- **Frosted top bar** — content scrolls cleanly under a translucent, blurred header.
- Migrated every icon to a single Phosphor set.
- Parallelized encrypted part uploads, so one large file can saturate the connection.

### Fixed
- The desktop webview no longer prompts for the macOS keychain on every launch (the local-cache key is stored as raw bytes there).
- Uploads stay alive across in-app navigation, and chunked uploads resume through transient failures.
- The viewer no longer crashes the tab on very large encrypted videos.

### Notes
- Still alpha, still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered.

## [0.3.0] - 2026-06-08 — A full office suite — Sheets & Docs
<!-- tags: Release, Docs, Sheets -->

The big one: PolarHQ is now a real office suite. Sheets and Docs ship as full-screen, Google-parity editors, with genuine Microsoft and Google file interop.

### Added
- **Full-screen editors** for Sheets and Docs — each opens in its own tab with a menu bar, toolbar, and (for Sheets) a formula bar.
- **Office import** — open `.xlsx` and `.docx` files directly.
- **Office export** — save documents back out to the Microsoft formats.
- **Open Office files from Drive** — double-click an `.xls`/`.docx` in the file browser and the right editor launches.
- Correct **file-type icons** per document type across Drive.

### Improved
- Rebuilt the spreadsheet grid on **Glide Data Grid** (canvas) — smooth scrolling, real resize, right-click menus, copy/paste, and a correct fill handle.
- Spreadsheets default to 1,000 rows with a button to add more, matching Google Sheets.
- Migrated all maps to **mapcn** for consistent, reliable rendering.
- Rebuilt the marketing site to match the app's dark theme.

### Fixed
- Undo/redo in Sheets after the grid rebuild.
- Column dropdowns no longer scroll the sheet to the bottom.
- Spreadsheet text selection no longer triggers on drag-fill.

## [0.2.1] - 2026-06-06 — iOS reliability & photo fidelity
<!-- tags: Patch, iOS, Fix -->

A focused round of fixes for the new iOS client, mostly about making the library complete and the timeline correct.

### Fixed
- **Paginate the full photo library** — earlier builds capped at a single page.
- Sort photos by **parsed capture date** across mixed-precision timestamps, so mobile matches the web.
- Persist login and **E2E keys reliably** in the Keychain (with a UserDefaults fallback).
- Send the `Origin` header so better-auth accepts native sign-in.
- Surface the **real sign-in error** (status, URL, and server message) instead of a generic failure.

### Improved
- Refresh upload thumbnails immediately after capture.
- Broadcast `photos.asset.changed` on upload so other clients update live.

## [0.2.0] - 2026-06-04 — Native iOS app + live sync
<!-- tags: Release, iOS, Mobile -->

PolarHQ goes mobile. A native SwiftUI client for iOS 26, built on a libsodium core that matches the web's encryption byte-for-byte.

### Added
- **Native iOS client** (SwiftUI) — server setup, bearer auth, and an app-launcher home screen.
- **OrbitCrypto** — a Swift libsodium module with JS parity test vectors; E2E unlock and decrypted Photos thumbnails on-device.
- **Immersive Photos library** — Liquid Glass chrome, pinch-to-zoom across Years / Months / All, and an Apple-style photo viewer with filmstrip and action bar.
- **Drive on iOS** — Files-app-style folder browsing with decrypted names and types, plus rename / delete / new folder.
- **Device & session management** — see and revoke every signed-in client.
- **Live sync** — Photos and Drive changes broadcast across web and mobile in real time.

### Improved
- Bearer-token auth enabled for native clients.
- OrbitCrypto compiles cleanly under Swift 6 strict concurrency.

## [0.1.2] - 2026-05-28 — Photo stacks & the in-depth editor
<!-- tags: Feature, Photos -->

Photos grows up: non-destructive editing and Immich-style stacks.

### Added
- **In-depth photo editor** with non-destructive **before/after stacking** — your original is never overwritten.
- **Photo stacks (collections)** — group related shots behind a single cover with a count.
- **Copy image to clipboard** straight from the lightbox.
- Remember the lightbox **details-panel** preference between sessions.

### Improved
- Continuous-flow layout so sparse days share a row instead of each taking a lonely line.
- HEIC + Apple **Live Photo** upload support.
- Client-side **EXIF** metadata with a location map in the details panel.

### Fixed
- Use the correct nucleo duplicate icon for the lightbox copy action.
- Center day labels and harden map sizing.

## [0.1.1] - 2026-05-18 — Grid, selection & lightbox polish
<!-- tags: Patch, Photos, Fix -->

Dozens of small fixes that make the Photos grid feel solid.

### Added
- **Selection keybinds** with on-screen keyboard hints in the quick-actions bar.
- **NumberFlow** selection count that animates as you select.
- Videos **play on hover** in the grid.

### Fixed
- Stop runaway scroll and stabilise pagination.
- Virtualization range now updates on scroll — no more grid gaps.
- Drag-select works from the empty grid margins (right and below).
- Inset selection ring with a white check, no focus-ring overlap.
- Square-grid corner rounding and continuous-flow row math.

## [0.1.0] - 2026-05-02 — First alpha — Photos, Drive & E2E
<!-- tags: Release, Photos, Drive, Security -->

The first public alpha. The foundation of the whole suite: an encrypted library with Photos and Drive on top.

### Added
- **End-to-end encryption** — a Proton-style single-password model with libsodium; the server only ever stores ciphertext.
- **Photos** — a virtualized, continuous-flow library with encrypted thumbnails.
- **Drive** — folders, uploads, versioning, and trash, with encrypted filenames and bytes.
- **Drive ↔ Photos shared storage** — one stored object, two apps, zero duplication.
- **Admin console** — users, apps, per-user limits, groups, roles, branding, and an audit log.

### Notes
- This is alpha software under active development. Keep your **recovery code** somewhere safe — without your password, encrypted data cannot be recovered.
