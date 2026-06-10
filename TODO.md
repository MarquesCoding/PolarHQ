# TODO

Tracking the batch of frontend + infra changes. Checked = done & committed.

## ⭐ TOP PRIORITY — Localisation (do before any other list item)
- [ ] Stand up i18n infrastructure (catalog + `t()` + provider).
- [ ] **No hardcoded user-facing strings anywhere** — every component, screen, hook, toast, dialog, aria-label uses a key.
- [ ] Backend returns **stable message/error keys**, never English prose; frontend translates.
- [ ] Sweep EVERY file iteratively until zero inline strings remain (web + api).
- [ ] Add a lint guard so new literal JSX/toast strings get caught.

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
- [ ] **Storage dialog**: largest file, which app uses most storage, breakdown.
- [x] **First-run onboarding card** (bottom-right, full-app scrim), animated demos of three flows using the real `PhotoTile`/`Button` components + a fake cursor that taps; dismiss persisted in localStorage; "Replay intro" in the account menu.

## Larger features
- [ ] **Picture book / collage**: canvas to position + rotate photos, slide-in sheet of all photos, shareable link.
- [ ] **Facial recognition** on upload → group photos by face.
- [ ] **Suggestive albums** on the albums page.
- [x] **S3 / MinIO** option for docker-compose — prod compose gains an opt-in `minio` profile (+ bucket init) and a commented S3 env block; fs stays default. Backend already supported `STORAGE_DRIVER=s3`. Pick one: disk / bundled MinIO / external S3.

## Infra
- [ ] release-please: confirm workflow declares `contents`/`pull-requests: write` (or switch to a PAT) so the release PR opens.
