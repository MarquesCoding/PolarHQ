# Contributing to PolarHQ

Thanks for your interest in PolarHQ. This guide covers how to get the project running,
the conventions we follow, and how to land a change.

PolarHQ is alpha software and moving quickly — issues, ideas, and pull requests are all welcome.

## Prerequisites

- **Node** 20 or newer
- **pnpm** 10 or newer (`corepack enable` will pin the right version)
- **Docker** — for local Postgres (pgvector), Redis and MinIO

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/MarquesCoding/PolarHQ.git
cd PolarHQ
pnpm install

# 2. Bring up local infrastructure (Postgres + Redis + MinIO)
pnpm infra:up

# 3. Configure environment
cp .env.example .env        # then set AUTH_SECRET and review the rest

# 4. Run database migrations
pnpm db:migrate

# 5. Start the dev servers (web, api, workers, marketing)
pnpm dev
```

Open the web app and complete the first-run setup to create the admin account.

Useful scripts:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run all apps and workers in watch mode |
| `pnpm build` | Build everything via Turborepo |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm lint` | Lint every workspace |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm infra:down` | Stop the local infrastructure |

## Project layout

```
apps/web        Main app — Photos, Drive, Docs, Sheets, Admin
apps/api        Hono + tRPC API, auth, storage, collaboration relay
apps/marketing  Landing site (polarhq.app)
apps/ios        Native SwiftUI client
services/*      Background workers (media, backup)
packages/*      Shared libraries (db, auth, config, jobs, storage, ui)
```

## Conventions

- **TypeScript** throughout, in strict mode. Keep things typed; avoid `any`.
- **UI components** come from `@workspace/ui`. Do not use raw `button`, `input`, or
  `select` elements — use the shared components so styling and accessibility stay consistent.
- **Styling** is Tailwind. Reuse the existing tokens and the shared chrome rather than
  re-implementing layout per app.
- **Encryption is the contract.** Anything user content must stay end-to-end encrypted —
  the server only ever sees ciphertext. Do not add server-side reads of user data.
- Run `pnpm typecheck` and `pnpm lint` before opening a pull request.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>

feat(photos): add burst-stack covers
fix(drive): correct trash restore for nested folders
docs(readme): document the quick-start flow
```

Common types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `style`.
Keep each commit focused and the summary in the imperative mood.

## Pull requests

1. Branch off `main` (`git switch -c feat/short-description`).
2. Keep the change scoped to one thing; smaller PRs review faster.
3. Make sure `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
4. Describe what changed and why, and include screenshots for UI changes.
5. Link any related issue.

## Reporting bugs and ideas

Open a [GitHub issue](https://github.com/MarquesCoding/PolarHQ/issues) with clear steps to
reproduce, what you expected, and what happened. Feature ideas and design feedback are
welcome too — check the [roadmap](https://polarhq.app/roadmap) first to see what's planned.

## Security

If you find a security or cryptography issue, please do not open a public issue.
Report it privately to the maintainer so it can be fixed before disclosure.

## License

By contributing, you agree that your contributions are licensed under the
[AGPL-3.0](LICENSE.md), the same license as the project.
