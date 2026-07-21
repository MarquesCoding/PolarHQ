# Changelog

All notable changes to PolarHQ. This file is the single source of truth for release notes —
it is rendered in-app (the "What's new" dialog) and on the marketing site. New versions are
appended by [release-please](https://github.com/googleapis/release-please) from conventional
commits; you may polish the wording in the Release PR before merging.

Format: each release is `## [version] - date — Title`, an optional `<!-- tags: a, b -->` line,
then Markdown notes.

## [0.8.0](https://github.com/MarquesCoding/PolarHQ/compare/v0.7.0...v0.8.0) (2026-07-21)


### Added

* **api:** Drive tags CRUD + apply/remove + tags on node DTOs ([6e1eb66](https://github.com/MarquesCoding/PolarHQ/commit/6e1eb665168a890d5d3c96ad800a1d513aeee322))
* **app:** accent color themes + picker in Appearance ([0d2d33f](https://github.com/MarquesCoding/PolarHQ/commit/0d2d33f0f07d7841d23864833defbcc5fd4200e2))
* **app:** full palette themes (Sand, Slate) alongside the accent ([fb334bd](https://github.com/MarquesCoding/PolarHQ/commit/fb334bd55feb29b2a06688ef94a3c11dee01e76c))
* **core:** Drive tag client (fetch/create/update/delete/apply/remove) ([23d8fca](https://github.com/MarquesCoding/PolarHQ/commit/23d8fca6291f536494be21664a4db4c4b6fff26f))
* **db:** drive.tags + node_tags tables (E2E tag names, colours) ([e5fd6cd](https://github.com/MarquesCoding/PolarHQ/commit/e5fd6cdb0dc44f3ec51d49ae99c6c7d886c12cfd))
* **desktop:** in-app SHARP setup instead of bundling ~5GB ([0c56c67](https://github.com/MarquesCoding/PolarHQ/commit/0c56c675ace7d44225053ed3274217040dd62e80))
* **drive:** tag chips in details panel + /drive/tag/:id filter view ([9e289e9](https://github.com/MarquesCoding/PolarHQ/commit/9e289e92da26d9d933af2727c00772395b7d5298))
* **drive:** tags sidebar section + right-click Tags submenu ([2108fbc](https://github.com/MarquesCoding/PolarHQ/commit/2108fbc1511e577bf8d34e494ed9dfd72e19f354))
* image→3D (Apple SHARP), Drive tags, app themes, marketing security + scroll ([7e347f6](https://github.com/MarquesCoding/PolarHQ/commit/7e347f6d96c1cb04e6fbfcdcc5b6ed998f49b0ef))
* **marketing:** 3D splat spotlight section ([36c5a6e](https://github.com/MarquesCoding/PolarHQ/commit/36c5a6ee59540cdeb83a59b4120923091fc10449))
* **marketing:** dedicated /security page ([816c770](https://github.com/MarquesCoding/PolarHQ/commit/816c7703aa0ff21f97defda05aa82da77720f72a))
* **marketing:** per-platform download links under the hero CTA ([76d96b5](https://github.com/MarquesCoding/PolarHQ/commit/76d96b58048837804ea6c0e300a68f72cecc7543))
* **marketing:** scroll-pinned feature showcase ([af0e981](https://github.com/MarquesCoding/PolarHQ/commit/af0e9813d28c834333b686a67aa7b4e54a9c5d5a))
* **photos:** adaptive splat-viewer chrome from source-photo brightness ([183ea8c](https://github.com/MarquesCoding/PolarHQ/commit/183ea8c171f4c3a677a3dc64facd3e53e829aa1f))
* **photos:** generate a 3D splat from the photo viewer (desktop) ([63a7992](https://github.com/MarquesCoding/PolarHQ/commit/63a7992d7506f60b5f918ca95ca748d1f529f322))
* **photos:** persist splats as synced encrypted derivatives ([9f0132e](https://github.com/MarquesCoding/PolarHQ/commit/9f0132e6dd8b0d8668e153fed6029b5e0454ac27))
* **photos:** real image-&gt;3D via Apple SHARP + Gaussian-splat viewer ([57bd376](https://github.com/MarquesCoding/PolarHQ/commit/57bd3765257c95b23b3bb20bb5fbaf7f61254411))
* **photos:** show stored 3D splat in the details panel ([4fa4251](https://github.com/MarquesCoding/PolarHQ/commit/4fa42518bc96061499d0e35649b18b66d54c288c))


### Fixed

* **core:** authenticate media fetches with the bearer token ([796170c](https://github.com/MarquesCoding/PolarHQ/commit/796170c71334d3218b796bf40e9ab0e50636ec5e))
* **core:** authenticate media fetches with the bearer token (desktop against remote) ([f3679f2](https://github.com/MarquesCoding/PolarHQ/commit/f3679f22bc5f13dfc4d3bffa6d509b5c4694ec6e))
* **devices:** only native apps are devices; hide offline + browsers ([e2ad84d](https://github.com/MarquesCoding/PolarHQ/commit/e2ad84d8a686d608ebef33f844f0f83b28efd373))
* **devices:** only native apps are devices; hide offline + browsers ([f08f22d](https://github.com/MarquesCoding/PolarHQ/commit/f08f22dd283360c97ccc075953969eb8063d759d))
* **marketing:** drop em-dashes from new copy; remove Terms/Privacy nav links ([ac8e9a9](https://github.com/MarquesCoding/PolarHQ/commit/ac8e9a9ec4c03d7180084551d31e2c7db3debb4d))
* **photos:** show Generate 3D splat in the workspace viewer pill ([7ded4f0](https://github.com/MarquesCoding/PolarHQ/commit/7ded4f08f684c385f8926b9f1fcf27007c315b19))
* **photos:** splat viewer follows the app theme (light/dark) ([fc7770a](https://github.com/MarquesCoding/PolarHQ/commit/fc7770ac617c2e3f1bad158b1edd5a19ba0b9255))


### Improved

* **drive:** replace raster file-type icons with Phosphor glyphs ([e41a565](https://github.com/MarquesCoding/PolarHQ/commit/e41a5656fbc6ce208e05c4fe9a8094414f712b5f))

## [0.7.0] - 2026-07-20 — A reimagined Drive, and devices that see each other
<!-- tags: Release, Drive, Devices -->

This release reimagines the Drive interface around a floating, modern chrome and finally makes your devices aware of each other — sign in on the web and your desktop app shows up, and vice-versa. Plus a polished marketing site with one-command and copy-paste install.

### Added
- **Your devices, all in one place** — every client signed into your account (the desktop app, other browsers, your phone) now appears in Drive's **Devices** section on both the sidebar and the Overview, each with a platform icon and a live online/offline dot. Clients register themselves on sign-in and heartbeat to stay current, so the web app sees your desktop and the desktop sees the web — through the Cloud, with no setup.
- **A floating Drive toolbar** — the bottom pill is gone; browsing controls now live in a row of floating pills at the top: back/forward navigation, the folder breadcrumb, view switcher, thumbnail size, and a **create** menu.
- **Sort and filter** — order files by name, size, date modified or kind (ascending or descending), and filter the view down to specific file kinds or just your favourites.
- **A redesigned details panel** — the inspector is now a floating, rounded card that matches the Photos viewer and pins itself in place as the grid scrolls behind it.
- **One-command and copy-paste self-hosting on the site** — the marketing page now offers a `curl … | sh` installer (with a Windows PowerShell option) *and* a copy-paste `docker-compose.yml` for Dockge/Portainer users, with syntax highlighting.

### Improved
- **Folder sync is clearer and self-updating** — adding a synced folder now refreshes the sidebar and Overview immediately, progress shows an honest count instead of sitting at 0/0, and the indexer no longer skips your files because of a stray `.gitignore`.
- **A sharper marketing hero** — a real multi-layer parallax mountain scene, a platform-aware **Download** button that links straight to the right installer for your OS, and a cleaner, more readable landing page.

### Fixed
- The **web** app no longer reserves empty space for the macOS traffic lights it doesn't have, so its sidebar sits flush at the top.
- **macOS desktop builds** no longer fail on a misconfigured signing certificate — code-signing is now opt-in, so the build always succeeds (un-notarized until real Apple credentials are set).

### Notes
- Still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered.
- Real peer-to-peer device *transfer* is still a future layer; this release makes devices *visible* to each other through the Cloud.

## [0.6.0] - 2026-07-18 — PolarHQ Mobile, a reimagined Photos & Drive, and one-command self-hosting
<!-- tags: Release, Mobile, Photos, Drive -->

The big one this round: **PolarHQ Mobile** — a native iOS and Android app — alongside a ground-up reimagining of Photos and Drive on desktop, one-command self-hosting, a real admin console, and the whole interface in 21 languages.

### Added
- **PolarHQ Mobile (iOS & Android)** — a native app built on the same encrypted core as web and desktop. Your camera roll backs up automatically (photos *and* video), everything is decrypted on-device, and you get a Google-Photos-style grid with albums and search, a swipeable viewer with pinch-to-zoom, multi-select, and a full Drive browser (folder navigation, upload, new folder / rename / delete) with live updates and push notifications. iOS uses real Liquid Glass controls; end-to-end crypto runs natively on the device.
- **Self-host in one command** — a `curl … | sh` installer (and a PowerShell one for Windows) that checks Docker, asks for your domain, sets up Caddy with automatic HTTPS — or a self-signed cert for localhost — and brings the whole stack up. Front and centre on the site now.
- **Import from Google** — bring your Google Photos and Drive across in a guided migration.
- **Admin console** — inline, Discord-style editors for Users, Groups and Roles: create accounts, edit and delete custom roles, per-user storage usage (usage only — never your contents or devices), and a demo / read-only mode. Settings and admin now open as an overlay over the live app.
- **Photos, reimagined** — a new workspace with **Grid**, **Canvas** (drag-to-arrange with saved positions) and **Infinity** modes; a focus viewer with a filmstrip, an ambient blurred backdrop, floating chrome that adapts to each image's brightness, drag-to-pan when zoomed, a proper video/audio player, and a download button that morphs into a spinner then a "Saved" check.
- **A device-first Drive** — the sidebar leads with an Overview, then your Devices: the Cloud (My Drive / Recents / Favorites / Trash), this device and its synced folders, and P2P peers, each tagged CLOUD / LOCAL / P2P. A redesigned Overview dashboard (storage hero, file-kind breakdown, a space treemap, largest files) and the same floating, top-bar-free chrome as Photos.
- **Desktop folder sync** — a Rust indexer + file watcher with live background auto-upload, plus offline **image→3D** generation (monocular-depth point clouds you can view in-app) and native video playback.
- **21 languages** — the entire UI is translated (Arabic, Chinese, Czech, Dutch, French, German, Hindi, Italian, Japanese, Korean, and more), with dates, numbers and app names localised too.

### Improved
- **A big performance pass.** Large media decrypts in a **Web Worker**, off the main thread; a shared thumbnail store decrypts once and dedupes across the grid and filmstrip; the grid uses lightweight CSS entities with deferred decrypt for fast scrolling; pinch/wheel resize is coalesced to one relayout per frame; and the Docs/Sheets/Whiteboard editors lazy-load out of the initial bundle. Drive got the same care — cached, deduped thumbnails and memoised cards so selection and drag only re-render what changed.
- Optimistic favourite / trash in Photos (no full-feed refetch) and lazier feed paging on scroll.

### Fixed
- **Desktop** builds and runs reliably — the folder-sync UI freeze and folder-picker crash are gone (indexing is async, the picker is native), the real bundle version shows, and the keypair stays unlocked across launches.
- **No more nags** — the macOS keychain isn't touched on every launch, and there's no per-refresh encryption-unlock prompt.
- **iOS** stability — logins and E2E keys persist, the library paginates fully, photos order by capture date, and auto-unlock works.
- **Localisation** — dates, times and day labels now follow the selected language everywhere.

### Notes
- Still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered.

## [0.5.0] - 2026-06-20 — PolarHQ Desktop + a shared-everything rebuild
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
