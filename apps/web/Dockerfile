# syntax=docker/dockerfile:1
#
# PolarHQ "web" image — builds the Next.js app and serves it with `next start`.
# Build from the repo root:  docker build -f apps/web/Dockerfile .
#
# NEXT_PUBLIC_* values are baked at build time. NEXT_PUBLIC_API_URL must be the
# URL the *browser* uses to reach the API, so override it for a real domain:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.polarhq.app .
#
FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile --filter "web..."

ARG NEXT_PUBLIC_APP_NAME=PolarHQ
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_VERSION=0.3.0
ARG NEXT_PUBLIC_APP_BUILD=docker
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NEXT_PUBLIC_APP_BUILD=$NEXT_PUBLIC_APP_BUILD

RUN pnpm --filter web build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
