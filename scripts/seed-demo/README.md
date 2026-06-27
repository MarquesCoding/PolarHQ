# seed-demo

Bulk-populate a PolarHQ account with **end-to-end-encrypted** demo media (photos + videos), with a
synthesized timeline, bursts, and GPS so Library / map / bursts all look real. Uploads go through
the app's exact crypto (`@workspace/core`), so seeded content decrypts in the app like any other.

## Prerequisites

- Node 20+ and `pnpm install` at the repo root.
- **ffmpeg + ffprobe** on PATH (video posters/dimensions). Photos work without it. `brew install ffmpeg`.
- A **dedicated demo user account** on the target instance. Create one in **Admin → Users → New user**
  (you can do this now that admin user-creation exists). The seeded content belongs to *this* user.
- **Demo mode must be OFF while seeding** — uploads by a non-admin are blocked when it's on. Turn it
  on afterwards (Admin → Settings) to freeze the demo.

## 1. Get media (~25 GB)

```sh
# Pexels = photos AND videos (free key: https://www.pexels.com/api/)
PROVIDER=pexels PEXELS_API_KEY=xxxx TARGET_GB=25 \
  pnpm --filter @workspace/seed-demo fetch
```

Files land in `scripts/seed-demo/media/` (override with `MEDIA_DIR`). Re-running resumes (skips files
already on disk).

**Unsplash:** photos only, no video, no bursts, and the demo API is capped at ~50 req/hr — fine for a
few hundred photos (`PROVIDER=unsplash UNSPLASH_ACCESS_KEY=xxx`), not for 25 GB. For bulk Unsplash,
download their [Lite/Full dataset](https://unsplash.com/data), drop the images into `media/`, and skip
straight to step 2. You can also just point `MEDIA_DIR` at any folder of your own media.

## 2. Seed (encrypt + upload)

```sh
# Preview the plan + test thumbnailing, no upload:
MEDIA_DIR=./scripts/seed-demo/media DRY_RUN=1 \
  pnpm --filter @workspace/seed-demo seed

# For real:
API_URL=https://demo.polarhq.app \
EMAIL=demo@yourdomain.com PASSWORD='the-demo-password' \
MEDIA_DIR=./scripts/seed-demo/media \
  pnpm --filter @workspace/seed-demo seed
```

First run sets up the account's E2E keys and prints a **recovery code** — save it. The run is
**resumable**: a `media/.seeded.json` ledger records uploads, so re-running after an interruption
continues where it stopped.

## 3. Freeze it

In **Admin → Settings**, switch **Demo mode (read-only)** on. Now visitors signed in as the demo user
can browse everything but can't upload, edit, or delete.

## Knobs (env)

| var | default | meaning |
|-----|---------|---------|
| `MEDIA_DIR` | `./media` | where media lives / is fetched to |
| `TARGET_GB` | `25` | fetch target |
| `VIDEO_RATIO` | `0.18` | share of fetched items that are video (Pexels) |
| `MONTHS` | `24` | timeline span the dates are spread across |
| `CONCURRENCY` | `4` | parallel uploads |
| `DRY_RUN` | – | `1` = plan + thumbnail test only |

## How realism is faked

- **Timeline:** each file gets a synthetic `mtime` spread across `MONTHS`; the server uses it as the
  capture date. No EXIF needed.
- **Bursts:** ~1-in-6 anchor frames expand into a 3–7 shot cluster a few hundred ms apart.
- **GPS:** ~40% of photos get coordinates jittered around real city centers (clustered into "trips"),
  encrypted under the account meta key — so the map populates.
