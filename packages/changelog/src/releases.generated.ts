// AUTO-GENERATED from CHANGELOG.md by scripts/generate.mjs — do not edit by hand.
import type { Release } from "./types"

export const RELEASES: Release[] = [
  {
    "version": "0.8.0",
    "date": "2026-07-21",
    "title": "Photos in 3D, Drive tags, and a themeable app",
    "tags": [
      "Release",
      "Photos",
      "Drive"
    ],
    "content": "Turn a photo into a real 3D scene, tag and colour-code your files, and make the whole app your own with themes. Plus a richer marketing site with a dedicated security page, and fixes so the desktop app works against a remote server.\n\n### Added\n- **Photos in 3D** — turn any photo into a real 3D Gaussian splat with **Apple SHARP**, running on your own GPU (macOS, Windows and Linux), fully offline. Orbit it in a proper viewer that opens at the original angle and follows your theme; the result is saved as an **end-to-end-encrypted derivative** that syncs to your other devices and shows in the photo's details. The heavy model isn't bundled — a one-time in-app setup provisions it on demand.\n- **Drive tags** — Spacedrive-style coloured tags for files and folders: a **Tags** section in the sidebar, a **right-click Tags** menu to apply, remove or create tags, tag **chips in the details panel**, and a per-tag filter view. Tag names are end-to-end encrypted like everything else.\n- **Make the app yours** — new **accent colours** (Violet, Blue, Emerald, Rose, Amber) and full **neutral palettes** (Sand, Slate) that compose with light/dark, chosen from **Account → Appearance** and applied instantly.\n- **A richer site** — a scroll-reveal feature showcase with pinned media, direct **per-platform download** links, a dedicated **Security** page (how your data stays end-to-end encrypted and zero-knowledge), and a 3D spotlight section.\n\n### Fixed\n- **The desktop app now works against a remote server** — thumbnails, originals and downloads authenticate with your session token instead of a cookie, so images load when the app connects to a self-hosted instance.\n- **Only real devices are shown** — browser tabs no longer register as devices, and offline devices drop off the list; the Devices section shows your desktop and mobile apps, synced folders and the Cloud.\n\n### Notes\n- Still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered.\n- Generating 3D needs the one-time SHARP setup (a few GB, downloaded on first use); it then runs entirely on your device."
  },
  {
    "version": "0.7.0",
    "date": "2026-07-20",
    "title": "A reimagined Drive, and devices that see each other",
    "tags": [
      "Release",
      "Drive",
      "Devices"
    ],
    "content": "This release reimagines the Drive interface around a floating, modern chrome and finally makes your devices aware of each other — sign in on the web and your desktop app shows up, and vice-versa. Plus a polished marketing site with one-command and copy-paste install.\n\n### Added\n- **Your devices, all in one place** — every client signed into your account (the desktop app, other browsers, your phone) now appears in Drive's **Devices** section on both the sidebar and the Overview, each with a platform icon and a live online/offline dot. Clients register themselves on sign-in and heartbeat to stay current, so the web app sees your desktop and the desktop sees the web — through the Cloud, with no setup.\n- **A floating Drive toolbar** — the bottom pill is gone; browsing controls now live in a row of floating pills at the top: back/forward navigation, the folder breadcrumb, view switcher, thumbnail size, and a **create** menu.\n- **Sort and filter** — order files by name, size, date modified or kind (ascending or descending), and filter the view down to specific file kinds or just your favourites.\n- **A redesigned details panel** — the inspector is now a floating, rounded card that matches the Photos viewer and pins itself in place as the grid scrolls behind it.\n- **One-command and copy-paste self-hosting on the site** — the marketing page now offers a `curl … | sh` installer (with a Windows PowerShell option) *and* a copy-paste `docker-compose.yml` for Dockge/Portainer users, with syntax highlighting.\n\n### Improved\n- **Folder sync is clearer and self-updating** — adding a synced folder now refreshes the sidebar and Overview immediately, progress shows an honest count instead of sitting at 0/0, and the indexer no longer skips your files because of a stray `.gitignore`.\n- **A sharper marketing hero** — a real multi-layer parallax mountain scene, a platform-aware **Download** button that links straight to the right installer for your OS, and a cleaner, more readable landing page.\n\n### Fixed\n- The **web** app no longer reserves empty space for the macOS traffic lights it doesn't have, so its sidebar sits flush at the top.\n- **macOS desktop builds** no longer fail on a misconfigured signing certificate — code-signing is now opt-in, so the build always succeeds (un-notarized until real Apple credentials are set).\n\n### Notes\n- Still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered.\n- Real peer-to-peer device *transfer* is still a future layer; this release makes devices *visible* to each other through the Cloud."
  },
  {
    "version": "0.6.0",
    "date": "2026-07-18",
    "title": "PolarHQ Mobile, a reimagined Photos & Drive, and one-command self-hosting",
    "tags": [
      "Release",
      "Mobile",
      "Photos",
      "Drive"
    ],
    "content": "The big one this round: **PolarHQ Mobile** — a native iOS and Android app — alongside a ground-up reimagining of Photos and Drive on desktop, one-command self-hosting, a real admin console, and the whole interface in 21 languages.\n\n### Added\n- **PolarHQ Mobile (iOS & Android)** — a native app built on the same encrypted core as web and desktop. Your camera roll backs up automatically (photos *and* video), everything is decrypted on-device, and you get a Google-Photos-style grid with albums and search, a swipeable viewer with pinch-to-zoom, multi-select, and a full Drive browser (folder navigation, upload, new folder / rename / delete) with live updates and push notifications. iOS uses real Liquid Glass controls; end-to-end crypto runs natively on the device.\n- **Self-host in one command** — a `curl … | sh` installer (and a PowerShell one for Windows) that checks Docker, asks for your domain, sets up Caddy with automatic HTTPS — or a self-signed cert for localhost — and brings the whole stack up. Front and centre on the site now.\n- **Import from Google** — bring your Google Photos and Drive across in a guided migration.\n- **Admin console** — inline, Discord-style editors for Users, Groups and Roles: create accounts, edit and delete custom roles, per-user storage usage (usage only — never your contents or devices), and a demo / read-only mode. Settings and admin now open as an overlay over the live app.\n- **Photos, reimagined** — a new workspace with **Grid**, **Canvas** (drag-to-arrange with saved positions) and **Infinity** modes; a focus viewer with a filmstrip, an ambient blurred backdrop, floating chrome that adapts to each image's brightness, drag-to-pan when zoomed, a proper video/audio player, and a download button that morphs into a spinner then a \"Saved\" check.\n- **A device-first Drive** — the sidebar leads with an Overview, then your Devices: the Cloud (My Drive / Recents / Favorites / Trash), this device and its synced folders, and P2P peers, each tagged CLOUD / LOCAL / P2P. A redesigned Overview dashboard (storage hero, file-kind breakdown, a space treemap, largest files) and the same floating, top-bar-free chrome as Photos.\n- **Desktop folder sync** — a Rust indexer + file watcher with live background auto-upload, plus offline **image→3D** generation (monocular-depth point clouds you can view in-app) and native video playback.\n- **21 languages** — the entire UI is translated (Arabic, Chinese, Czech, Dutch, French, German, Hindi, Italian, Japanese, Korean, and more), with dates, numbers and app names localised too.\n\n### Improved\n- **A big performance pass.** Large media decrypts in a **Web Worker**, off the main thread; a shared thumbnail store decrypts once and dedupes across the grid and filmstrip; the grid uses lightweight CSS entities with deferred decrypt for fast scrolling; pinch/wheel resize is coalesced to one relayout per frame; and the Docs/Sheets/Whiteboard editors lazy-load out of the initial bundle. Drive got the same care — cached, deduped thumbnails and memoised cards so selection and drag only re-render what changed.\n- Optimistic favourite / trash in Photos (no full-feed refetch) and lazier feed paging on scroll.\n\n### Fixed\n- **Desktop** builds and runs reliably — the folder-sync UI freeze and folder-picker crash are gone (indexing is async, the picker is native), the real bundle version shows, and the keypair stays unlocked across launches.\n- **No more nags** — the macOS keychain isn't touched on every launch, and there's no per-refresh encryption-unlock prompt.\n- **iOS** stability — logins and E2E keys persist, the library paginates fully, photos order by capture date, and auto-unlock works.\n- **Localisation** — dates, times and day labels now follow the selected language everywhere.\n\n### Notes\n- Still moving fast. Keep your **recovery code** safe — without your password, encrypted data can't be recovered."
  },
  {
    "version": "0.5.0",
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
