# PolarHQ "app" image — runs the API and the background workers (media, backup)
# and the one-shot DB migration. Everything runs from source via tsx, so the
# role is selected by overriding the container command (see docker-compose.yml).
#
FROM node:22-bookworm-slim

# ffmpeg is needed by the media worker; ca-certificates for outbound TLS.
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the whole monorepo (the .dockerignore keeps node_modules/.next out, but
# every workspace package.json stays so --frozen-lockfile validates cleanly).
COPY . .

# Install only what the API + workers + migrations need (and their workspace
# deps). NODE_ENV is forced to development for the install so devDependencies
# such as tsx and sharp are present; the runtime below sets it back.
RUN NODE_ENV=development pnpm install --frozen-lockfile \
  --filter "@workspace/api..." \
  --filter "@workspace/media..." \
  --filter "@workspace/backup..." \
  --filter "@workspace/db..."

# Stamp the running version so the API can report it (and the update check works).
ARG APP_VERSION=0.0.0
ARG APP_BUILD=docker
ENV APP_VERSION=${APP_VERSION}
ENV APP_BUILD=${APP_BUILD}

ENV NODE_ENV=production
EXPOSE 3001

# Default role: the API. Compose overrides `command` for the workers + migrate.
CMD ["pnpm", "--filter", "@workspace/api", "start"]
