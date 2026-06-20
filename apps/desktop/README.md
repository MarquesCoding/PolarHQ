# PolarHQ Desktop

A [Tauri 2](https://v2.tauri.app) shell around the shared PolarHQ app. The entire UI comes from
`@workspace/screens` (the same packages the web app uses) — this app only provides the native window,
the Rust command surface, and a Vite frontend entry. **No screen code is duplicated from web.**

```
apps/desktop
├── src/            # Vite/React entry (App, main, css) — mirrors apps/web/src
├── lib/            # env wiring + native.ts (typed bridge to the Rust commands)
├── index.html      # Vite host document (no-flash theme script)
├── vite.config.ts  # Tauri-tuned Vite config (fixed port 1420)
└── src-tauri/      # the Rust side
    ├── src/
    │   ├── main.rs     # binary entry → lib::run()
    │   ├── lib.rs      # Tauri builder + invoke_handler
    │   └── commands.rs # native command stubs (splat / p2p / sync)
    ├── capabilities/   # window permission grants
    ├── tauri.conf.json # window + bundle config
    └── app-icon.png    # icon source for `tauri icon`
```

## First-time setup

The frontend builds with Node alone, but producing/running the native app needs the Rust toolchain.

1. **Install JS deps** (from the repo root): `pnpm install`
2. **Generate the icon set** from the source logo (Node-only, no Rust needed):
   ```bash
   pnpm --filter desktop tauri icon src-tauri/app-icon.png
   ```
   This writes `src-tauri/icons/{32x32.png,128x128.png,128x128@2x.png,icon.icns,icon.ico,…}`.
3. **Install Rust** (one-time, system-level): https://rustup.rs
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

## Develop

```bash
pnpm --filter desktop tauri dev      # native window with HMR (runs `vite` under the hood)
pnpm --filter desktop dev            # just the Vite frontend in a browser (no native shell)
```

Point the app at an API with `VITE_API_URL` (defaults to `http://localhost:3001`).

## Build

```bash
pnpm --filter desktop tauri build    # produces a native installer/binary in src-tauri/target
```

## Native commands

The Rust side exposes commands over Tauri IPC; the frontend calls them through `lib/native.ts`:

| TS (`lib/native.ts`) | Rust (`src-tauri/src/commands.rs`) | Status |
| --- | --- | --- |
| `generateSplat(path)` | `generate_splat` | stub — gaussian-splat pipeline TODO |
| `p2pStatus()` | `p2p_status` | stub — returns `"offline"` |
| `syncNow()` | `sync_now` | stub — device sync TODO |

These are wired but not implemented; the IPC surface exists so features can target it now.

## Auto-update

The app checks for updates on launch (Discord-style splash — `src/Updater.tsx` → `lib/updater.ts`) and
auto-installs signed updates, then relaunches. Updates are served from **GitHub Releases**: the app
polls `https://github.com/MarquesCoding/PolarHQ/releases/latest/download/latest.json` (set in
`src-tauri/tauri.conf.json` → `plugins.updater.endpoints`).

The **client is done**; to make updates actually flow you need a signing key and a release workflow.

### 1. Generate the signing key (one-time)

```bash
pnpm --filter desktop tauri signer generate -w ~/.tauri/polarhq-updater.key
```

This prints a **public key** and writes a password-protected **private key**. Then:

- Paste the public key into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` (replacing the
  `REPLACE_WITH_OUTPUT_OF_tauri_signer_generate` placeholder).
- Add two **GitHub Actions secrets** (never commit these):
  - `TAURI_SIGNING_PRIVATE_KEY` — the contents of `~/.tauri/polarhq-updater.key`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password you set

`bundle.createUpdaterArtifacts: true` is already set, so builds emit the signed `.sig` + `latest.json`.

### 2. Release workflow (on tag)

Add a workflow that runs [`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action) on a
version tag — it builds per-platform, signs with the secret key, and uploads the installers +
`latest.json` to a GitHub Release. Sketch:

```yaml
# .github/workflows/desktop-release.yml
on:
  push:
    tags: ["desktop-v*"]
jobs:
  release:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          projectPath: apps/desktop
          tagName: ${{ github.ref_name }}
          releaseName: "PolarHQ Desktop ${{ github.ref_name }}"
          includeUpdaterJson: true
```

Bump `version` in `src-tauri/tauri.conf.json`, tag `desktop-vX.Y.Z`, push — the running app picks it
up on next launch. Until a release exists the updater check just finds nothing and proceeds.

