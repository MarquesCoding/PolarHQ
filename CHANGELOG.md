# Changelog

All notable changes to PolarHQ. This file is the single source of truth for release notes —
it is rendered in-app (the "What's new" dialog) and on the marketing site. New versions are
appended by [release-please](https://github.com/googleapis/release-please) from conventional
commits; you may polish the wording in the Release PR before merging.

Format: each release is `## [version] - date — Title`, an optional `<!-- tags: a, b -->` line,
then Markdown notes.

## [0.6.0-alpha](https://github.com/MarquesCoding/PolarHQ/compare/v0.5.0-alpha...v0.6.0-alpha) (2026-06-26)


### Added

* **api:** content-less push notifications for mobile sync ([60d9008](https://github.com/MarquesCoding/PolarHQ/commit/60d9008a0dee8edf213742d4b53e6b697c02e27b))
* **desktop:** folder-sync engine foundation (Rust indexer + watcher) ([729e011](https://github.com/MarquesCoding/PolarHQ/commit/729e011c90fb16fa87387e91503df6c5e8892658))
* **desktop:** native video playback (untested — needs Tauri build) ([3ca9700](https://github.com/MarquesCoding/PolarHQ/commit/3ca9700ac2fc27715fc9300f311f479d19867fa2))
* migrate from Google (Photos + Drive) ([#4](https://github.com/MarquesCoding/PolarHQ/issues/4)) ([c6becd6](https://github.com/MarquesCoding/PolarHQ/commit/c6becd6737e390e50267f0ad679cf6d48af148b6))
* **mobile:** background auto-sync, video backup, notifications, Drive file upload ([2d6b9f9](https://github.com/MarquesCoding/PolarHQ/commit/2d6b9f968d831ac02247afd041a1e93971f2bf6d))
* **mobile:** branded auth — bear logo, violet gradient hero, form sheet ([ba3be45](https://github.com/MarquesCoding/PolarHQ/commit/ba3be454e4ba4a76217976ffe134a50450a1c50d))
* **mobile:** camera-roll auto-backup (Photos) ([2b5a3a1](https://github.com/MarquesCoding/PolarHQ/commit/2b5a3a1fb0b07018e6e6bf52d308835f844cb6e4))
* **mobile:** collapsing glass top bar + floating date badge (Google-style) ([38e79b2](https://github.com/MarquesCoding/PolarHQ/commit/38e79b2f236cb3997813d95e5dd411ea44794fe0))
* **mobile:** Drive actions — new folder, rename, delete ([2de7c99](https://github.com/MarquesCoding/PolarHQ/commit/2de7c99571f4c9d68329c51ed1b5747f4bdad163))
* **mobile:** Drive browser — folder drill-down, decrypted names, type icons ([2b5bdea](https://github.com/MarquesCoding/PolarHQ/commit/2b5bdeae3a846576017edd531e0af757623b1ed7))
* **mobile:** E2E unlock wired end-to-end ([#1](https://github.com/MarquesCoding/PolarHQ/issues/1) + [#2](https://github.com/MarquesCoding/PolarHQ/issues/2)) ([2f1ab28](https://github.com/MarquesCoding/PolarHQ/commit/2f1ab289bb3545882f75b122619324b3b992ffbd))
* **mobile:** encrypted photo upload ([97c20d8](https://github.com/MarquesCoding/PolarHQ/commit/97c20d82cdbca08cbdd47f3d215199f1a824cc75))
* **mobile:** Expo app foundation — connect, sign-in, tab shell ([572a7ee](https://github.com/MarquesCoding/PolarHQ/commit/572a7ee1aa1b3af824742e5d7f7c535bb715c08b))
* **mobile:** Google-Photos-influenced Photos screen ([52c148e](https://github.com/MarquesCoding/PolarHQ/commit/52c148e0a57f73dd83cd4ca87fcdf36457831b76))
* **mobile:** Google-style photo viewer + native menus & sheets ([e2b2ffc](https://github.com/MarquesCoding/PolarHQ/commit/e2b2ffc820f2fc39709b42be6eeed34543d132b2))
* **mobile:** in-place Drive folder navigation with a persistent top bar ([ba5200a](https://github.com/MarquesCoding/PolarHQ/commit/ba5200ada8fcd8b6b4619dcd811e36e9d241b008))
* **mobile:** Liquid-Glass photo viewer (Apple-style) + glass on Photos page ([8816de7](https://github.com/MarquesCoding/PolarHQ/commit/8816de75b828bbbbd1fc495ad7bd95d5c7553115))
* **mobile:** Liquid-Glass top-bar controls on iOS ([c4cb491](https://github.com/MarquesCoding/PolarHQ/commit/c4cb491ae5768845e5e6e31ff5c07bec6e7c74cc))
* **mobile:** live updates over /ws ([abc7907](https://github.com/MarquesCoding/PolarHQ/commit/abc79070c3144274b76697fd0014aafd593c5c48))
* **mobile:** multi-select on Drive ([d3919fa](https://github.com/MarquesCoding/PolarHQ/commit/d3919fa1aaec5f420240f976021910cf43a3313b))
* **mobile:** multi-select on the Photos grid ([51287a2](https://github.com/MarquesCoding/PolarHQ/commit/51287a25c72486790335d2dd505ba0eec8535a15))
* **mobile:** native crypto wiring + Android emulator host fix ([3d1ce91](https://github.com/MarquesCoding/PolarHQ/commit/3d1ce916a219739f1b972dab85541a7ca4986b07))
* **mobile:** native E2E crypto proven on device (dev build) ([a706b1f](https://github.com/MarquesCoding/PolarHQ/commit/a706b1f1c68ecf5310ee95a5fe7b5816570562e5))
* **mobile:** native iOS Liquid Glass tab bar; Android keeps custom pill ([14d6ff0](https://github.com/MarquesCoding/PolarHQ/commit/14d6ff09cf3d829ea84c54fa95486d44abfd0c94))
* **mobile:** Photos albums + library search ([5313f20](https://github.com/MarquesCoding/PolarHQ/commit/5313f200d738310d45b65f508c3aafafdc5deb23))
* **mobile:** Photos grid — encrypted library + on-device thumbnail decrypt ([b87524c](https://github.com/MarquesCoding/PolarHQ/commit/b87524c9de70bdc3a7c3aae08ce8c5210ee8530a))
* **mobile:** Photos viewer — tap to full-res decrypt ([59eb81e](https://github.com/MarquesCoding/PolarHQ/commit/59eb81ee7138a385d31ec83ffc4a0d134918bcad))
* **mobile:** Photos views (All/Favourites/Trash) + viewer favourite/trash actions ([8c546be](https://github.com/MarquesCoding/PolarHQ/commit/8c546be0751ffdc90f50b3b695f9a538aab15385))
* **mobile:** pinch-to-zoom in the photo viewer + delete confirmation ([ec8fc45](https://github.com/MarquesCoding/PolarHQ/commit/ec8fc45036b30335727618b2c0b4ca838614ea14))
* **mobile:** polish foundation — design tokens, motion, materials, gestures ([5210b2a](https://github.com/MarquesCoding/PolarHQ/commit/5210b2a8fc3b15e3092b8efc391c9155969e72f0))
* **mobile:** real iOS 26 Liquid Glass top-bar controls (expo-glass-effect) ([ddf3bab](https://github.com/MarquesCoding/PolarHQ/commit/ddf3bab01aa0bd444382b6a062d9b7ee8d3ea060))
* **mobile:** restructure nav — Photos/Albums/Drive bottom bar, account card, no titles ([d9da345](https://github.com/MarquesCoding/PolarHQ/commit/d9da3453818b32c06a4ec9b13a705c39266b4cf1))
* **mobile:** shared floating top bar + Drive media thumbnails ([70fa789](https://github.com/MarquesCoding/PolarHQ/commit/70fa789bb5b1c8991bef304799ef4aa5cbd967e1))
* **mobile:** swipe between photos in the viewer ([f23ed5e](https://github.com/MarquesCoding/PolarHQ/commit/f23ed5ee1872ccd3889ec5d6bb460f298c41ea48))
* **mobile:** top-bar avatar + timeline motion (Google-Photos influence) ([4b8fbd3](https://github.com/MarquesCoding/PolarHQ/commit/4b8fbd373e11fb455b4e493031b36ced11d33d65))
* **mobile:** video playback (expo-video) ([5a67015](https://github.com/MarquesCoding/PolarHQ/commit/5a67015a3e1b6f5aaa747385bb645eb2377b24b5))
* **photos:** right-click context menu in the Lightbox ([#6](https://github.com/MarquesCoding/PolarHQ/issues/6)) ([18047e2](https://github.com/MarquesCoding/PolarHQ/commit/18047e215b19d2aee68dde885596f3c399f27467))
* **shortcuts:** ⌘K command palette, central registry & global key chords ([#7](https://github.com/MarquesCoding/PolarHQ/issues/7)) ([746570b](https://github.com/MarquesCoding/PolarHQ/commit/746570b2f0aaa5112157d1ad4f27f1c6ca70ceea))
* **sync:** desktop folder sync — local→Drive push (Phase 2) ([#8](https://github.com/MarquesCoding/PolarHQ/issues/8)) ([dfe9c6c](https://github.com/MarquesCoding/PolarHQ/commit/dfe9c6c06080f7f429e8818fce520add3ad64153))


### Fixed

* **core:** stop the per-refresh encryption-unlock prompt ([ca93100](https://github.com/MarquesCoding/PolarHQ/commit/ca93100c9b8e4fd5fee866d3dd23817307730cc8))
* **desktop:** pnpm dev launches the native app, not just Vite ([7d44934](https://github.com/MarquesCoding/PolarHQ/commit/7d44934b3f2212388f39fcc2916fabcc1e0b0835))
* **desktop:** shrink app icon art to ~72% for native macOS sizing ([6245926](https://github.com/MarquesCoding/PolarHQ/commit/624592615673a26258ae36845e763afaafc7daf8))
* **mobile:** account sheet avatar no longer overlaps the grabber on iOS ([2bf82e2](https://github.com/MarquesCoding/PolarHQ/commit/2bf82e27d9892c4d511a93037b2d51febdfec47a))
* **mobile:** account sheet opens full-height (single detent) ([b427fb1](https://github.com/MarquesCoding/PolarHQ/commit/b427fb1b2cbf560903abc684bd7c119f907022f3))
* **mobile:** add iOS top clearance on formSheets (account, details) ([db40dbe](https://github.com/MarquesCoding/PolarHQ/commit/db40dbed839b78a0d8875477f13d3b75866abbc8))
* **mobile:** clearer top gap under the grabber on the iOS account sheet ([f6e5946](https://github.com/MarquesCoding/PolarHQ/commit/f6e59469e3b9d4381f6db673036883ac218b045c))
* **mobile:** correct top spacing on iOS form sheets ([f741941](https://github.com/MarquesCoding/PolarHQ/commit/f74194185bc7a502eb704a13524414f2364b4962))
* **mobile:** Drive folder loading state no longer jumps mid-slide ([0da454b](https://github.com/MarquesCoding/PolarHQ/commit/0da454b8617c858bcf1c71237534511a6df22294))
* **mobile:** Drive folder slide works on iOS + keep avatar in subfolders ([b83c0c5](https://github.com/MarquesCoding/PolarHQ/commit/b83c0c5a38568a3df04621e20de92842c52b7be7))
* **mobile:** photo viewer top bar clears the notch/Dynamic Island on iOS ([c9c46ff](https://github.com/MarquesCoding/PolarHQ/commit/c9c46ffeadb6a06d75af269f4ce3b5d7b19ebbf3))
* **mobile:** remove unlock prompt — unlock automatically at sign-in ([09800b7](https://github.com/MarquesCoding/PolarHQ/commit/09800b7e190c01a4c51b4d545f1a76eab1b1c149))
* **mobile:** unlock prompt for locked sessions ([1711085](https://github.com/MarquesCoding/PolarHQ/commit/1711085ccca4b6e69d9b064bddc9014b9400c05a))
* **mobile:** use expo-media-library/legacy for saveToLibraryAsync ([1778f02](https://github.com/MarquesCoding/PolarHQ/commit/1778f02659a86caf2765b1a6febeafd100d109ff))
* **shell:** show the real app version in the sidebar ([3a1af58](https://github.com/MarquesCoding/PolarHQ/commit/3a1af588140566815cdfd5ec34d7a49209119f2f))
* **video:** analyzeVideo timeout + host nativeMediaUrl hook ([1f79027](https://github.com/MarquesCoding/PolarHQ/commit/1f790273ad6dde66276872e502fe0ac1341718b0))


### Improved

* **mobile:** account + details sheets use @gorhom/bottom-sheet ([47c5b74](https://github.com/MarquesCoding/PolarHQ/commit/47c5b74bcf71b8f58f9e46b0cdf0f5810c960566))

## [0.5.0-alpha] - 2026-06-20 — PolarHQ Desktop + a shared-everything rebuild
<!-- tags: Release, Desktop, Architecture -->

The headline: **PolarHQ Desktop** — a native app for macOS, Windows, and Linux that runs the *exact same code* as the web app. Underneath it is a ground-up re-architecture that lets one codebase power web, desktop, and (soon) mobile, plus a big round of Photos and Drive polish.

### Added
- **PolarHQ Desktop** — a native Tauri 2 app with proper macOS chrome: a Tahoe-rounded window, a floating sidebar, the traffic-light controls tucked into the sidebar, and a frosted top bar. Downloads for macOS (Intel + Apple Silicon), Windows, and Linux are on the releases page.
- **Auto-update** — a Discord-style launch updater that checks for new versions, downloads, installs, and relaunches automatically; signed end-to-end.
- **Pick your server on the sign-in page** — one animated, split-screen sign-in with a *Self-hosted* / *PolarHQ Hosted* (managed storage, coming soon) toggle and server field right above your credentials.
- **The Photos lightbox, now in Drive** — image previews in the file browser use the exact same viewer as Photos, filmstrip and all.
- **A reimagined Drive** — a Library Overview dashboard, a Miller-column (cascading) view, smart views for Recents / Favorites / File Kinds, pinned saved searches, a storage treemap, and proper file-type icons.
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
