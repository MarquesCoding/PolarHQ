# TODO

Tracking the batch of frontend + infra changes. Checked = done & committed.

## ⭐ TOP PRIORITY — Localisation (do before any other list item)
- [x] Stand up i18n infrastructure (react-i18next: catalogs + `t()` + I18nProvider + namespaces).
- [x] **No hardcoded user-facing strings in the web app** — Photos, Drive, Docs, Sheets, Whiteboard, Collab, Admin, shared components, Launcher, Setup, SignIn, lib toasts, and the 6 app shell layouts all use keys (~1,000 keys across 13 namespaces). All 110 t()-using files verified to resolve; tsc clean.
- [x] Backend returns **stable error keys**, never English prose; `apiErrorMessage()` maps them (shared HTTP keys + area-scoped domain keys + errorParams interpolation). 25 error keys; api+web tsc clean.
- [x] Lint guard: `react/jsx-no-literals` (with a symbol/shortcut allowlist) + a `no-restricted-syntax` rule banning literal `toast()` text, scoped to apps/web. App passes clean (0 violations). 1,131 catalog keys total; all 117 t()-using files resolve.
- [x] **Language selector + My Account page** (`/account`), reachable from the account menu; lazy-loads non-English catalogs via dynamic import; `<html lang/dir>` synced (RTL for Arabic).
- [x] **21 languages translated** (fr, de, es, es-MX, fr-CA, it, pt, nl, sv, pl, cs, mk, ru, uk, tr, hi, ar, ja, ko, zh, vi) — 273 catalog files, locale-correct CLDR plurals (Slavic _few/_many, Arabic _zero/_two/_few/_many), all validated for JSON + key coverage + placeholders.

## Quick UI wins
- [x] **Trash page**: move "Empty trash" to the top bar, remove the top gap, tell users photos auto-delete after 30 days. — via shared TopBarActions portal + a notice banner.
- [x] **Empty trash** button: destructive style (primary variant, but red). — new `destructive-solid` Button variant.
- [x] **Favourites page**: nicer empty state (nucleo icon + text). — shared `EmptyState` component.
- [x] **Albums page**: move "New album" to the top bar.
- [x] Album cover images not generating correctly — covers are E2E ciphertext; now decrypted client-side (API returns `coverAssetId`/`coverEncrypted`).
- [x] **Landing page**: remove the app-grid launcher, auto-redirect `/` → `/photos` (Home screen deleted).
- [x] Remove **Admin** from the apps list in the account/app dropdown.
- [x] Photo viewer **Share** button → nucleo `open-external` glyph (prefers `IconOpenExternalOutlineDuo18`, falls back to the installed `IconOpenExternalFillDuo18`).

## Shell / navigation
- [x] **Collapse sidebar** + better mobile support — adopted the shadcn `Sidebar`: `FlatShell` wraps the app in `SidebarProvider`, `FlatSidebar` is a `Sidebar collapsible="offcanvas"` (renders a Sheet drawer below `md`, collapsible in-flow column at `md+`), and `FlatTopBar` uses a single `SidebarTrigger` (toggles the drawer on mobile / collapses on desktop, ⌘B shortcut). Mobile drawer auto-closes on route change.
- [x] Nicer **dark/light mode** transition — View Transitions circular reveal from the toggle; expands on, contracts on off (`fill: forwards` to avoid the end-of-animation flash).

## Dialogs / onboarding
- [x] **Storage dialog**: largest file, which app uses most storage, breakdown. — `GET /api/v1/drive/storage` (per-app breakdown + largest files from the canonical Drive node table); `StorageDialog` opened from the sidebar storage card (segmented usage bar, by-app legend, largest-files list with decrypted names).
- [x] **First-run onboarding card** (bottom-right, full-app scrim), animated demos of three flows using the real `PhotoTile`/`Button` components + a fake cursor that taps; dismiss persisted in localStorage; "Replay intro" in the account menu.

## Larger features
- [ ] **Picture book / collage**: canvas to position + rotate photos, slide-in sheet of all photos, shareable link.
- [ ] **Facial recognition** on upload → group photos by face.
- [ ] **Suggestive albums** on the albums page.
- [x] **S3 / MinIO** option for docker-compose — prod compose gains an opt-in `minio` profile (+ bucket init) and a commented S3 env block; fs stays default. Backend already supported `STORAGE_DRIVER=s3`. Pick one: disk / bundled MinIO / external S3.

## Reliability / errors
- [x] **Better upload-failure errors in the frontend** — uploads now go through `lib/xhrUpload.ts` (`postFormWithProgress`), which parses the backend's `{ error, errorParams }` into an `ApiError` and tags network failures. `runJob` surfaces the localised reason via `apiErrorMessage` (e.g. the 6GB case → `uploads.tooLarge` "File exceeds the N upload limit"), and silently ignores user-aborts. (Chunked/resumable upload for very large files still TODO — see below.)
- [x] **Upload progress: percentage + speed + ETA** — threaded real progress through the E2E upload paths (they used `fetch`, which can't report upload progress; now XHR via `postFormWithProgress`). The UploadPanel shows `percent · speed/s · Ns left` per file.
- [~] **Chunked uploads for large files — Phase 1 (Drive) done.** Files ≥ 64 MB now upload in streaming 8 MB chunks: client reads `file.slice`, secretstream-seals each chunk (versioned `PSS1` magic), POSTs it as one multipart part; the server assembles via storage multipart (S3 native; FS appends to a `.uploading` temp file then atomic-renames — Docker-mount-friendly, 1× disk). Redis-backed upload sessions (`drive:upload:*`). Never holds the whole file/ciphertext in memory. Download detects the format and secretstream-decrypts.
- [x] **Phase 2a — streaming decrypt-to-disk download (Drive).** `downloadEncryptedDriveFileStreaming` reads the response `body` stream, reframes arbitrary network chunks into exact cipher chunks, `secretstream`-decrypts each, and writes straight to disk via the File System Access API — never holding the whole plaintext in memory. Falls back to the in-memory path when unsupported/legacy. Framing validated with a 40-case Node roundtrip test (empty → multi-chunk, network splits down to 1 byte). (No progress UI on the streamed download yet.)
- [x] **Phase 2b — streamed-download progress in the tray.** Drive downloads now register an upload-tray item; the streaming download reports bytes-read/content-length + speed, and the panel shows `percent · speed/s · Ns left` (shared `progressText` with uploads). New `useUploadManager().downloadFile(name, total, run)`.
- [x] **Phase 2c — Photos chunked upload.** Large photos/videos (≥64 MB) upload the same streaming way: `analyzeMedia` extracts thumbnail/dimensions/duration/EXIF (no whole-file read), then the encrypted original streams as multipart parts to `POST /photos/assets/upload/{initiate,part,complete,abort}` (Redis sessions, `ingestEncryptedAssetFromStorage` builds the asset + Drive mirror at completion). Shared `lib/streamDownload.ts` (`streamDecryptToDisk`) extracted from the Drive path; `fetchDecryptedPhotoOriginal` now detects the stream format. Decrypts whole-buffer for now.
- [x] **Phase 2d — size-gated streaming download for Photos.** `downloadDecryptedPhoto` streams large (≥64 MB) encrypted originals straight to disk via the shared `streamDecryptToDisk` (with tray progress); files below the threshold keep the in-memory auto-download so batch/small downloads stay frictionless (no per-file save dialog). Required adding `sizeBytes` to the grid serialization + `GridAsset` and threading it through `DownloadItem`.
- [~] **Phase 2e — large-video viewer: stop the crash + offer download-to-play.** The lightbox no longer whole-buffer-decrypts an encrypted video above 1.5 GB (which OOM'd/crashed the tab) — it shows a "Too large to play in the browser → Download to play" panel wired to the Phase 2d streaming download. Videos ≤ the cap still decrypt-to-blob and play as before.
- [ ] **True in-browser streaming playback** of multi-GB encrypted video (the real fix): a Service Worker decrypt-proxy serving the `<video>` Range requests — needs libsodium in the worker (bundle step) *or* a main-thread MessageChannel relay, and seeking is O(n) because secretstream is sequential (re-decrypt from the start). Large, browser-API-heavy; do when the dev server's up to verify.
- [x] **Phase 2f — resume on transient failure (automatic part retry).** A flaky network no longer kills a long chunked upload: each part POST is wrapped in `retryOnTransient` (network/5xx → exponential backoff, 4 tries; 4xx like quota fails immediately). The in-memory secretstream sealer survives a failed `fetch`, so the same already-sealed part is re-sent. Made parts **idempotent** for safe retry: the FS driver now writes per-part files (re-upload overwrites) + streaming-concats on complete deleting each part as written (~1× disk); S3's `uploadPart` is already idempotent; the routes dedup parts by number and don't double-count bytes. FS multipart validated by a Node test (out-of-order assembly, overwrite-wins, abort cleanup). **Note:** secretstream's `init_push` makes a fresh random header with no way to reconstruct a push state, so resume is same-execution only — a page reload / dead tab can't resume (would need a per-chunk-independent format).
- [x] **Phase 2g — iOS secretstream support (crypto-parity gate).** `OrbitCrypto` gains `isStreamBlob` + `secretstreamOpen` (libsodium `secretStream.xchacha20poly1305`, same `PSS1` magic + 8 MB framing as the web); `E2EManager.decryptedOriginal` detects the format and stream-decrypts, so chunk-uploaded files are now readable on iOS. **Validated cross-platform for real:** added a `secretstreamOpen` vector to `gen-crypto-vectors.ts` (web seals it) and `OrbitCryptoVerify` decrypts it — `swift run OrbitCryptoVerify` prints `✅ secretstreamOpen … all parity checks passed`. (Single-chunk vector; multi-chunk framing is a direct port of the web logic already validated by the 40-case test. iOS decrypts whole-buffer; streaming-to-disk on iOS is a later nicety. Full Orbit app target not compiled here — needs xcodebuild.)

## Code hygiene
- [x] **Remove all inline comments that aren't TSDoc** — stripped 125 non-TSDoc comments across 31 files via `scripts/strip-comments.cjs` (parser-anchored over the TS AST so it never touches `//` inside strings/regexes/URLs; preserves `/** … */` TSDoc, `eslint-disable`/`@ts-*` directives, and empty-`catch` placeholders). tsc clean across all packages.

## Infra
- [x] release-please: workflow already declares `permissions: contents/pull-requests: write` **and** supports a PAT (`secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN`). The earlier failure was the **repo setting** "Allow GitHub Actions to create and approve pull requests" being off — flip that in Settings → Actions → General (or add a `RELEASE_PLEASE_TOKEN` PAT secret to bypass it). No code change needed.

## Spacedrive-inspired (community references)
Ideas the community surfaced from [Spacedrive](https://spacedrive.com) (cross-platform file explorer). Mapped to our Drive + Photos apps; ✓-marked sub-notes are things we already have in some form to build on, not blockers. None of these are committed scope yet — they're a research backlog to triage.

### Drive — browsing & views
- [ ] **Miller-column (cascading) view** for Drive: macOS-style multi-pane column browser where selecting a folder opens its children in the next column, with the full path visible at a glance. Add as a view mode beside the existing grid/list (`viewToggle`). Each column reuses `NodeCard`/`NodeTable` rows; the rightmost selection drives the inspector.
- [ ] **Tabbed browsing**: multiple location tabs in one window (`Downloads | /home/… | Overview | +`), each with its own folder/scroll/selection state. Lets you keep Drive, an album, and the overview open at once.
- [~] **Richer grid view**: name + size under each tile and per-kind glyphs are **already done** (`NodeCard` renders both). Remaining: generated previews for non-image/video types (PDF/doc thumbnails) — deferred.
- [~] **Smart/saved views in the sidebar**: **Recents** (`/drive/recent`), **Favorites** (`/drive/favorites`) and **File Kinds** (`/drive/kind/[kind]` — images/videos/documents/audio/archives) ship as sidebar entries. New `GET /api/v1/drive/library?view=recent|favorites|kind&kind=` returns a flat, cross-folder listing; Browser gained an optional parentless `source` so the smart views reuse all of its open/selection/inspector/context-menu behaviour (folder chrome — upload/new-folder/drag-to-parent/breadcrumbs — auto-disabled). Favorites added a `favorited_at` column (migration 0005) + `POST /nodes/:id/favorite`; a star toggle lives in the context menu + selection bar, with a star badge on favourited cards; folders can be favourited too. _Remaining: saved searches._

### Inspector panel (right-hand details)
- [ ] **Unify into a tabbed inspector** across Drive + Photos: tabs for Info, Media preview, Location (map), Comments/Activity, History/Versions, More (⋯) — Spacedrive's `info · image · location · chat · history · ⋯` rail. We already have a Photos `InfoPanel` (file/date/camera/location/EXIF) and Drive versions — fold them into one shared component.
- [~] **Richer metadata sections**: the Photos InfoPanel now shows **Kind** (Image/Video/Audio) and **Duration** (video/audio), with megapixels gated to images; dimensions + full EXIF camera info + location map already present. The Drive DetailsPanel gained matching **Kind** + **Extension** rows for selection parity. _Remaining: a captured-vs-created date split, a Storage section (path/"Local"), and Tags._
- [ ] **Generated-derivatives panel**: list the artefacts we create for an asset (multiple thumbnail tiers — `grid@1x`, `grid@2x`, `detail@1x` — plus future ones), each with kind + size. Ties into our E2E thumbnail pipeline; would also house novelty derivatives (see 3D below).

### Storage visualisation & library overview
- [x] **"Space" storage map** (Spacedrive's signature): a squarified treemap of the largest files sized by bytes, coloured by owning app, on the Library Overview. Layout core in `lib/treemap.ts` (Node-tested: no overlaps, areas proportional, in-bounds); `GET /api/v1/drive/storage` now returns the top 24 files for it. _Backlog: zoom, folder-tree aggregation, circle-pack variant._
- [x] **Library Overview dashboard** — now the **default Drive landing** (`/drive`); the file browser moved to `/drive/files`, nav order is Overview → My Drive → Trash. Headline stats (library size, capacity, free space, total files), a usage bar segmented by **file kind** with a legend + per-kind bars, a by-app breakdown of cards, and the largest files. Extended `GET /api/v1/drive/storage` with a by-kind aggregation (image/video/audio/document/archive/other). Verified `/drive` + `/drive/files` serve 200.
- [ ] **Per-device & per-location cards**: storage gauges per device and per indexed location ("18.1 GB free of 31.5 GB", `LOCAL` badge). Maps loosely onto our device list + a future "locations" concept.

### Photos / media
- [x] **Immersive viewer keyboard nav**: the Lightbox now closes on `Escape` and navigates with `←/→` (skips when typing in an input). It already had Shift+D to trash and `i` for info; the edge-to-edge chrome was already in place. (Left `Space`-to-close unbound on purpose — it's play/pause for video.)
- [ ] **Date-grouped "all media" view across sources**: Spacedrive's Photos-style grid groups by capture date across every location. We already group Photos by day — consider a unified media view that also pulls media out of Drive folders.
- [ ] **3D / Gaussian-splat derivative** (stretch/novelty): generate a `.ply` gaussian splat from suitable photos and show a 3D viewer toggle in the viewer. Pure exploration — low priority, high wow-factor.

### Background jobs
- [ ] **Jobs panel**: a first-class queue of background work (uploads, thumbnail/preview generation, ML embedding/indexing, facial recognition) with per-job progress, pause/resume/retry — Spacedrive's `Sync / Jobs` sidebar. Directly complements the upload-progress + ML/embedding work already in flight.

### Notes / fit
- Spacedrive is a *local, multi-device* VDFS; we are a *server-hosted, E2E* suite — so device/volume/NAS-indexing concepts (`All Devices`, `Volumes`, `Locations`, offline-device badges) map only loosely. The **views, inspector, storage visualisation, overview dashboard, and jobs panel** are the directly-transferable wins; the distributed-filesystem parts are mostly out of scope.
