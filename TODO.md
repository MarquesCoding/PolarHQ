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
- [ ] **Chunked / resumable uploads for very large files**: single-shot uploads hold the whole (encrypted) file in memory and can't resume on failure. Add chunked upload + resume (and stream encryption) for multi-GB files.

## Code hygiene
- [x] **Remove all inline comments that aren't TSDoc** — stripped 125 non-TSDoc comments across 31 files via `scripts/strip-comments.cjs` (parser-anchored over the TS AST so it never touches `//` inside strings/regexes/URLs; preserves `/** … */` TSDoc, `eslint-disable`/`@ts-*` directives, and empty-`catch` placeholders). tsc clean across all packages.

## Infra
- [x] release-please: workflow already declares `permissions: contents/pull-requests: write` **and** supports a PAT (`secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN`). The earlier failure was the **repo setting** "Allow GitHub Actions to create and approve pull requests" being off — flip that in Settings → Actions → General (or add a `RELEASE_PLEASE_TOKEN` PAT secret to bypass it). No code change needed.

## Spacedrive-inspired (community references)
Ideas the community surfaced from [Spacedrive](https://spacedrive.com) (cross-platform file explorer). Mapped to our Drive + Photos apps; ✓-marked sub-notes are things we already have in some form to build on, not blockers. None of these are committed scope yet — they're a research backlog to triage.

### Drive — browsing & views
- [ ] **Miller-column (cascading) view** for Drive: macOS-style multi-pane column browser where selecting a folder opens its children in the next column, with the full path visible at a glance. Add as a view mode beside the existing grid/list (`viewToggle`). Each column reuses `NodeCard`/`NodeTable` rows; the rightmost selection drives the inspector.
- [ ] **Tabbed browsing**: multiple location tabs in one window (`Downloads | /home/… | Overview | +`), each with its own folder/scroll/selection state. Lets you keep Drive, an album, and the overview open at once.
- [ ] **Richer grid view**: thumbnail tiles with the file **name + size** under each (Spacedrive's Downloads grid), generated previews for many file types (already have image/video thumbs — extend to PDFs/docs), and per-item kind glyphs.
- [ ] **Smart/saved views in the sidebar**: first-class `Recents`, `Favorites`, `File Kinds` (filter by image/video/document/audio/archive), and saved searches — surfaced as sidebar entries like Spacedrive's `Overview / Recents / Favorites / File Kinds`.

### Inspector panel (right-hand details)
- [ ] **Unify into a tabbed inspector** across Drive + Photos: tabs for Info, Media preview, Location (map), Comments/Activity, History/Versions, More (⋯) — Spacedrive's `info · image · location · chat · history · ⋯` rail. We already have a Photos `InfoPanel` (file/date/camera/location/EXIF) and Drive versions — fold them into one shared component.
- [ ] **Richer metadata sections**: Details (size/kind/extension), Dates (Taken/Captured/Created/Modified), **Image info** (dimensions, camera — we have EXIF), **Video info** (resolution, duration, captured date), Storage (path, "Local" indicator), Tags.
- [ ] **Generated-derivatives panel**: list the artefacts we create for an asset (multiple thumbnail tiers — `grid@1x`, `grid@2x`, `detail@1x` — plus future ones), each with kind + size. Ties into our E2E thumbnail pipeline; would also house novelty derivatives (see 3D below).

### Storage visualisation & library overview
- [ ] **"Space" storage bubble view** (Spacedrive's signature): an interactive circle-pack / treemap of files & folders sized by bytes, zoomable, to *see* what's eating space — a visual companion to the new Storage dialog. Could live as a tab in `StorageDialog` or a dedicated `/drive/space` route. (We already compute per-app + largest-files via `GET /api/v1/drive/storage` — extend it to a folder-tree size aggregation.)
- [ ] **Library Overview dashboard**: a landing dashboard with headline stats — library size, total capacity, free space, index size, preview-media size — a usage bar segmented by **file kind** (image/text/folder/other/unknown) with a legend, a by-kind histogram, and an "N total files / M unidentified" count. (Reuses the storage-stats endpoint; complements the per-app breakdown we already show.)
- [ ] **Per-device & per-location cards**: storage gauges per device and per indexed location ("18.1 GB free of 31.5 GB", `LOCAL` badge). Maps loosely onto our device list + a future "locations" concept.

### Photos / media
- [ ] **Immersive fullscreen viewer polish**: edge-to-edge media viewer with keyboard nav (`ESC`/`Space` to close, `←/→` to navigate) and a clean overlaid control cluster — align our photo viewer with this. (We have a viewer; check the keyboard affordances + chrome.)
- [ ] **Date-grouped "all media" view across sources**: Spacedrive's Photos-style grid groups by capture date across every location. We already group Photos by day — consider a unified media view that also pulls media out of Drive folders.
- [ ] **3D / Gaussian-splat derivative** (stretch/novelty): generate a `.ply` gaussian splat from suitable photos and show a 3D viewer toggle in the viewer. Pure exploration — low priority, high wow-factor.

### Background jobs
- [ ] **Jobs panel**: a first-class queue of background work (uploads, thumbnail/preview generation, ML embedding/indexing, facial recognition) with per-job progress, pause/resume/retry — Spacedrive's `Sync / Jobs` sidebar. Directly complements the upload-progress + ML/embedding work already in flight.

### Notes / fit
- Spacedrive is a *local, multi-device* VDFS; we are a *server-hosted, E2E* suite — so device/volume/NAS-indexing concepts (`All Devices`, `Volumes`, `Locations`, offline-device badges) map only loosely. The **views, inspector, storage visualisation, overview dashboard, and jobs panel** are the directly-transferable wins; the distributed-filesystem parts are mostly out of scope.
