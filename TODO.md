# TODO

Tracking the batch of frontend + infra changes. Checked = done & committed.

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
- [x] **First-run onboarding card** (bottom-right), carousel of flow examples (privacy / upload / albums+share), dismiss persisted in localStorage, mounted in FlatShell.

## Larger features
- [ ] **Picture book / collage**: canvas to position + rotate photos, slide-in sheet of all photos, shareable link.
- [ ] **Facial recognition** on upload → group photos by face.
- [ ] **Suggestive albums** on the albums page.
- [ ] **S3 / MinIO** option for docker-compose (one or the other).

## Infra
- [ ] release-please: confirm workflow declares `contents`/`pull-requests: write` (or switch to a PAT) so the release PR opens.
