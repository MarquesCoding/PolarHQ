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
- [ ] Separate the app logo from the app dropdown; make the **logo a dropdown for workgroup selection**.
- [ ] **Collapse sidebar** + better mobile support (consider shadcn sidebar).
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
- [ ] **Better upload-failure errors in the frontend**: large uploads (e.g. a 6GB file) can fail with no surfaced reason. Show *why* it failed — server quota/limit (413/507), network/timeout, multipart abort, size-cap — with a clear, localised toast/inline message and a retry. Distinguish backend rejections (mapped error keys) from network errors; consider chunked/resumable upload for very large files.

## Infra
- [x] release-please: workflow already declares `permissions: contents/pull-requests: write` **and** supports a PAT (`secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN`). The earlier failure was the **repo setting** "Allow GitHub Actions to create and approve pull requests" being off — flip that in Settings → Actions → General (or add a `RELEASE_PLEASE_TOKEN` PAT secret to bypass it). No code change needed.
