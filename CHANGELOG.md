# Changelog

All notable changes to PolarHQ. This file is the single source of truth for release notes —
it is rendered in-app (the "What's new" dialog) and on the marketing site. New versions are
appended by [release-please](https://github.com/googleapis/release-please) from conventional
commits; you may polish the wording in the Release PR before merging.

Format: each release is `## [version] - date — Title`, an optional `<!-- tags: a, b -->` line,
then Markdown notes.

## [0.7.0](https://github.com/MarquesCoding/PolarHQ/compare/v0.6.0...v0.7.0) (2026-07-20)


### Added

* **devices:** client registers itself on login + heartbeats ([f4c8a94](https://github.com/MarquesCoding/PolarHQ/commit/f4c8a94616bf3949a3c3938ba83a736ebc144fd2))
* **devices:** device registry — web ↔ desktop visibility ([58ccb4a](https://github.com/MarquesCoding/PolarHQ/commit/58ccb4aa00c6db424132bc339eb9c58b7a26d577))
* **devices:** device-registry backend — table, migration, API ([d7889cd](https://github.com/MarquesCoding/PolarHQ/commit/d7889cd0e68d4770d8456eade483453058b03c9c))
* **devices:** show registered devices on the Drive Overview too ([8614205](https://github.com/MarquesCoding/PolarHQ/commit/86142050b464763c8493fac5d2726df9c326d390))
* **devices:** show the account's other devices in the Drive sidebar ([f13d697](https://github.com/MarquesCoding/PolarHQ/commit/f13d69739ce33ea01ba8d7553cdce998af247581))
* **drive:** drop the Details header + close button from the details panel ([c6f7502](https://github.com/MarquesCoding/PolarHQ/commit/c6f75026119bf9e91bc0315786cb99c374b01835))
* **drive:** filter control + shared kind classifier; toolbar cleanup ([62829cd](https://github.com/MarquesCoding/PolarHQ/commit/62829cd08606bd3e904785c0ea678f4335d43b24))
* **drive:** floating rounded details panel (matches the Photos viewer) ([ba8923b](https://github.com/MarquesCoding/PolarHQ/commit/ba8923bdfdcb39b8b313c2daefba0f8cd75c985e))
* **drive:** floating top toolbar, remove the bottom pill (Spacedrive-style) ([35f2abf](https://github.com/MarquesCoding/PolarHQ/commit/35f2abf60ba6bc2dd9d4ac76fafd97211ee50500))
* **drive:** forward navigation in the toolbar ([afaddf3](https://github.com/MarquesCoding/PolarHQ/commit/afaddf3383ce598f068b84bd98fe7025af84d17e))
* **drive:** global sort control + sidebar-matched toolbar bubbles ([6b836f3](https://github.com/MarquesCoding/PolarHQ/commit/6b836f385c2d188d432ab1980a77c83c448f88fa))
* **drive:** pin the toolbar and details panel while the grid scrolls ([9e7bd5f](https://github.com/MarquesCoding/PolarHQ/commit/9e7bd5fb97b5a17f07651759d3e114903949eab5))
* **drive:** remove the LOCATION breadcrumb section from the sidebar ([ec3aba1](https://github.com/MarquesCoding/PolarHQ/commit/ec3aba1167045d545b7c4b89e54486cd6d7f1772))
* **drive:** remove the selection quick-actions bar; tidy the details panel ([5c1ed0a](https://github.com/MarquesCoding/PolarHQ/commit/5c1ed0a469bebb2c3aa6f8514d2c3f4ef47717e9))
* **drive:** remove toolbar sidebar button; solid details-panel card; toolbar top-align ([d428b8e](https://github.com/MarquesCoding/PolarHQ/commit/d428b8e298ee2ae7eeeba6136ea7e473b3465cfe))
* **drive:** shift the toolbar's right controls left when the details panel opens ([c20427c](https://github.com/MarquesCoding/PolarHQ/commit/c20427ce0af104443605e0b82ae02ee853834f1b))
* **drive:** Spacedrive-style chrome — top toolbar, floating details, sync + web fixes ([ece1d77](https://github.com/MarquesCoding/PolarHQ/commit/ece1d77ee22eec30466f67b6677185c679db74f3))
* **drive:** split the top toolbar into separate bubbles (Spacedrive-style) ([e73930d](https://github.com/MarquesCoding/PolarHQ/commit/e73930ddab4cc9455f80c9ee5c697dd23afd0eb5))
* **marketing:** add a copy-paste docker-compose.yml to the install section ([01506ea](https://github.com/MarquesCoding/PolarHQ/commit/01506ea48ae91d4bce5ba5a15ff0e110ec2fc3b0))
* **marketing:** copy-paste docker-compose.yml on the install section ([e575f45](https://github.com/MarquesCoding/PolarHQ/commit/e575f4507b8dd03c1e042168c84e8c3b9fed2273))
* **marketing:** direct platform download + visible ridge parallax ([561372d](https://github.com/MarquesCoding/PolarHQ/commit/561372df038bcb5fd3ab9d1d7370918f30a7c56a))
* **marketing:** syntax-highlight the docker-compose.yml block ([7bc3d2a](https://github.com/MarquesCoding/PolarHQ/commit/7bc3d2aed5f369069bcea9839acb8c51de82f329))


### Fixed

* **ci:** gate macOS code-signing so desktop builds don't fail on a bad cert ([670d6c8](https://github.com/MarquesCoding/PolarHQ/commit/670d6c8cec9a6b2002544309602ca8ab7443799f))
* **ci:** unbreak macOS desktop builds (gate Apple signing) ([c020500](https://github.com/MarquesCoding/PolarHQ/commit/c02050095c9226432c02bba0ae8d1053400c8ab1))
* **desktop:** folder-sync auto-updates the sidebar + honest progress count ([03da09a](https://github.com/MarquesCoding/PolarHQ/commit/03da09adb756274a6cdbb40bd384f704a5adedf3))
* **drive:** add right padding to the top toolbar so the last bubble clears the window edge ([1240f01](https://github.com/MarquesCoding/PolarHQ/commit/1240f013a278135d5a262b09f15af66870d4ea6b))
* **drive:** align the top toolbar with the sidebar content top ([9190c30](https://github.com/MarquesCoding/PolarHQ/commit/9190c306cdbd3241f6634dd77591c32c9207ca5f))
* **drive:** details panel matches the sidebar; align toolbar to the sidebar top ([f2a5f16](https://github.com/MarquesCoding/PolarHQ/commit/f2a5f16d25df8c23263f465d30f1a95dcbbe64d9))
* **drive:** slim the toolbar bubble padding to match the sidebar search height ([30fdd02](https://github.com/MarquesCoding/PolarHQ/commit/30fdd0210ca2fd79a37a16a14e4e2a2017743d1a))
* **marketing:** back out the ridge width-cap + edge-fade ([af48cd8](https://github.com/MarquesCoding/PolarHQ/commit/af48cd82303ac70dc8771ae6435b9ede4778c030))
* **marketing:** cap the parallax ridge width so it scales on large screens ([cc3ee0d](https://github.com/MarquesCoding/PolarHQ/commit/cc3ee0d0d7e2cacc9cb4e4cd6e3ab8cc9cece05f))
* **marketing:** ridge as a full-bleed horizon below the app screenshot ([fc44f02](https://github.com/MarquesCoding/PolarHQ/commit/fc44f02373c7ccadf6dd399e8d64d34ef05fd181))
* **web:** don't reserve macOS traffic-light space in the web sidebar ([45d6c0d](https://github.com/MarquesCoding/PolarHQ/commit/45d6c0ddba1e68cb12e9ea85c0008f63beea600c))

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
