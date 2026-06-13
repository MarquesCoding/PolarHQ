# Vault "web" image — builds the Vite SPA and serves the static bundle with
# `vite preview` (SPA fallback included). Build from the repo root:
#   docker build -f apps/web/Dockerfile .
#
# VITE_* values are baked into the bundle at build time. VITE_API_URL is the URL
# the *browser* uses to reach the API; it defaults to empty (same-origin) so the
# image works behind the bundled reverse proxy on ANY port with no rebuild.
# Only override it if you serve the API on a different origin without the proxy:
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_URL=https://api.example.com .
#
FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile --filter "web..."

ARG VITE_APP_NAME=Vault
ARG VITE_API_URL=
ARG VITE_APP_VERSION=0.3.0
ARG VITE_APP_BUILD=docker
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_API_URL=$VITE_API_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_APP_BUILD=$VITE_APP_BUILD

RUN pnpm --filter web build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
