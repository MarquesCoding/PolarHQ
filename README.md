<div align="center">

<img src="apps/web/public/logo.png" width="92" alt="PolarHQ logo" />

# PolarHQ

**Your digital life, under your control.**

An open-source, self-hosted, **end-to-end encrypted** suite — Photos, Drive and Docs —
that you run on your own server. One private home for everything.

<p>
  <img src="https://img.shields.io/badge/status-alpha%20v0.5-f59e0b?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/github/license/MarquesCoding/PolarHQ?style=flat-square&color=2563eb" alt="License" />
  <img src="https://img.shields.io/github/stars/MarquesCoding/PolarHQ?style=flat-square&color=eab308" alt="Stars" />
  <img src="https://img.shields.io/github/last-commit/MarquesCoding/PolarHQ?style=flat-square" alt="Last commit" />
  <img src="https://img.shields.io/badge/encryption-end--to--end-6366f1?style=flat-square" alt="End-to-end encrypted" />
</p>

[Website](https://polarhq.app) · [Blog](https://polarhq.app/blog) · [Changelog](https://polarhq.app/changelog) · [Roadmap](https://polarhq.app/roadmap)

<br />

<img src="image.png" width="100%" alt="PolarHQ" />

</div>

## Features

- **Photos** — an Apple-Photos-grade library: continuous-flow grid, HEIC & Live Photos, EXIF + location maps, a non-destructive editor, stacks, and on-device semantic search (CLIP, runs in your browser).
- **Drive** — folders, versioning, trash and fast uploads, sharing one set of encrypted bytes with Photos (no duplication).
- **Docs & Sheets** — full-screen, Google-parity editors with real Microsoft/Google file import & export and real-time collaboration.
- **End-to-end encrypted** — a Proton-style single-password model on libsodium; the server only ever stores ciphertext. [How it works →](ENCRYPTION.md)
- **Desktop app** — a native Tauri shell (macOS, Windows, Linux) over the same screens as web, with Discord-style auto-updates.
- **Admin console** — users, groups, per-user limits, roles, branding and an audit log.
- **Self-hosted** — your box, your keys, your data. AGPL licensed, no lock-in.

## Tech stack

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React%2019-149ECA?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Next.js%2016-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tauri%202-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Tauri" />
  <img src="https://img.shields.io/badge/Tailwind%20v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/tRPC-2596BE?style=flat-square&logo=trpc&logoColor=white" alt="tRPC" />
  <img src="https://img.shields.io/badge/Drizzle-C5F74F?style=flat-square&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="pgvector" />
  <img src="https://img.shields.io/badge/Redis-FF4438?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/MinIO%20%2F%20S3-C72E49?style=flat-square&logo=minio&logoColor=white" alt="S3 / MinIO" />
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/libsodium-2C2D72?style=flat-square&logo=letsencrypt&logoColor=white" alt="libsodium" />
</p>

- **Monorepo** — Turborepo + pnpm workspaces; shared logic/UI in `@workspace/*` packages
- **Web** — Vite + React 19 + React Router, Tailwind v4, Redux Toolkit, TanStack Query
- **Desktop** — Tauri 2 (Rust) shell rendering the same `@workspace/screens` as web
- **Marketing** — Next.js 16 (the polarhq.app landing site)
- **API** — Hono + tRPC, Drizzle ORM, better-auth, a dumb `/ws` relay for collaboration
- **Data** — PostgreSQL (pgvector), Redis (BullMQ + pub/sub), S3-compatible object storage
- **Crypto** — libsodium everywhere; clients hold the keys, the server holds ciphertext ([details](ENCRYPTION.md))
- **Mobile** — a React Native client is planned, sharing the same `@workspace/*` core

## Quick start

> Requires Node 20+, pnpm 10+, and Docker (for local Postgres, Redis and MinIO).

```bash
# 1. Bring up local infrastructure (Postgres + Redis + MinIO)
pnpm infra:up

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env        # then edit AUTH_SECRET etc.

# 4. Run database migrations
pnpm db:migrate

# 5. Start everything (web, api, workers, marketing)
pnpm dev
```

Then open the web app, complete the first-run **setup** to create the admin account, and you're in.

## Project structure

```
apps/
  web/         Main app (Vite + React Router) — Photos, Drive, Docs, Sheets, Admin
  desktop/     Tauri 2 desktop shell (macOS/Windows/Linux) over the shared screens
  api/         Hono + tRPC API, auth, storage, collaboration relay
  marketing/   polarhq.app landing site (Next.js 16)
services/
  media/       Thumbnailing / media processing worker
  backup/      Scheduled backup worker
packages/
  core/        Framework-agnostic data + E2E crypto layer (the client SDK)
  screens/     Shared React screens/components used by web + desktop
  ui/          Shared shadcn-style component library
  i18n/        Translations + i18next setup
  db/          Drizzle schema + migrations
  auth/        better-auth setup
  storage/     S3 / filesystem storage driver
  jobs/        BullMQ queues + Redis pub/sub events
  config/      Typed env/config
  changelog/   Release notes, shared by the app + marketing
```

## Security

PolarHQ is end-to-end encrypted: keys are derived from your password in the browser, and the server
only ever stores ciphertext. For a full, code-referenced breakdown of **how files are encrypted, how
they're stored, what the server can and cannot see, and the known trade-offs**, read
**[ENCRYPTION.md](ENCRYPTION.md)**.

Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md).

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up the
project, the branch and commit conventions, and how to open a pull request.

## License

[AGPL-3.0](LICENSE.md) — PolarHQ is free software. You can self-host, modify and redistribute it;
if you run a modified version as a network service, you must share your changes.
