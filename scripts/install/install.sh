#!/bin/sh
# PolarHQ — self-host installer for Linux & macOS.
#
#   curl -fsSL https://dl.polarhq.app | sh
#
# Non-interactive (headless) install:
#   POLARHQ_DOMAIN=cloud.example.com POLARHQ_EMAIL=you@example.com \
#     sh -c "$(curl -fsSL https://dl.polarhq.app)"
#
# Environment overrides:
#   POLARHQ_DIR     install directory        (default: $HOME/polarhq)
#   POLARHQ_DOMAIN  domain for auto-HTTPS    (blank = local https://localhost, self-signed)
#   POLARHQ_EMAIL   Let's Encrypt contact    (optional)
set -eu

APP_NAME="PolarHQ"
APP_IMAGE="ghcr.io/marquescoding/polarhq-app:latest"
WEB_IMAGE="ghcr.io/marquescoding/polarhq-web:latest"
INSTALL_DIR="${POLARHQ_DIR:-$HOME/polarhq}"

# ---------------------------------------------------------------- output helpers
if [ -t 1 ]; then
  B=$(printf '\033[1m'); D=$(printf '\033[2m'); R=$(printf '\033[31m')
  G=$(printf '\033[32m'); Y=$(printf '\033[33m'); C=$(printf '\033[36m'); Z=$(printf '\033[0m')
else
  B=; D=; R=; G=; Y=; C=; Z=
fi
say()  { printf '%s\n' "$*"; }
info() { printf '%s➜%s %s\n' "$C" "$Z" "$*"; }
ok()   { printf '%s✓%s %s\n' "$G" "$Z" "$*"; }
warn() { printf '%s!%s %s\n' "$Y" "$Z" "$*"; }
die()  { printf '%s✗ %s%s\n' "$R" "$*" "$Z" >&2; exit 1; }

# Read from the controlling terminal even when this script is piped through `curl | sh`
# (stdin is the script itself in that case, so plain `read` would see EOF).
ask() { # ask VAR_NAME "Prompt text" "default"
  _var=$1; _prompt=$2; _def=${3:-}; _ans=
  if [ -r /dev/tty ]; then
    if [ -n "$_def" ]; then printf '%s %s[%s]%s ' "$_prompt" "$D" "$_def" "$Z" >/dev/tty
    else printf '%s ' "$_prompt" >/dev/tty; fi
    IFS= read -r _ans </dev/tty || _ans=
  fi
  [ -z "$_ans" ] && _ans=$_def
  eval "$_var=\$_ans"
}

rand_b64()   { if command -v openssl >/dev/null 2>&1; then openssl rand -base64 32 | tr -d '\n'
               else dd if=/dev/urandom bs=1 count=48 2>/dev/null | base64 | tr -d '\n' | cut -c1-44; fi; }
rand_alnum() { if command -v openssl >/dev/null 2>&1; then openssl rand -hex 24 | tr -d '\n'
               else dd if=/dev/urandom bs=1 count=48 2>/dev/null | base64 | tr -dc 'A-Za-z0-9' | cut -c1-32; fi; }

say ""
say "${B}  PolarHQ${Z} ${D}— self-host installer${Z}"
say "${D}  Photos · Drive · Docs · Sheets — end-to-end encrypted, on your own server.${Z}"
say ""

# ---------------------------------------------------------------- prerequisites
OS=$(uname -s 2>/dev/null || echo unknown)
case "$OS" in
  Linux|Darwin) : ;;
  *) die "Unsupported OS '$OS'. On Windows run the PowerShell installer:  irm https://dl.polarhq.app/install.ps1 | iex" ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  warn "Docker is not installed."
  if [ "$OS" = "Linux" ]; then
    ask DO_INSTALL "Install Docker Engine now via get.docker.com? (y/N)" "n"
    case "$DO_INSTALL" in
      [Yy]*) info "Installing Docker…"; curl -fsSL https://get.docker.com | sh || die "Docker install failed — see https://docs.docker.com/engine/install/" ;;
      *)     die "Install Docker, then re-run this script:  https://docs.docker.com/engine/install/" ;;
    esac
  else
    die "Install Docker Desktop for Mac, start it, then re-run:  https://docs.docker.com/desktop/install/mac-install/"
  fi
fi

if ! docker info >/dev/null 2>&1; then
  die "Docker is installed but not reachable. Start Docker (and ensure your user can run it — e.g. the 'docker' group), then re-run."
fi
ok "Docker is running"

if docker compose version >/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"
else die "Docker Compose v2 not found. Update Docker — Compose ships with modern Docker (docs.docker.com/compose/install/)."; fi
ok "Compose available ($DC)"

# ---------------------------------------------------------------- configuration
DOMAIN="${POLARHQ_DOMAIN:-}"
EMAIL="${POLARHQ_EMAIL:-}"
if [ -z "$DOMAIN" ]; then
  say ""
  say "${B}Where will $APP_NAME run?${Z}"
  say "  • Enter a ${B}domain${Z} you control (its DNS already points here) for automatic HTTPS."
  say "  • Leave ${B}blank${Z} to run locally on ${C}https://localhost${Z} with a self-signed certificate."
  ask DOMAIN "Domain" ""
fi

if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
  MODE=domain; PUBLIC_URL="https://$DOMAIN"
  [ -z "$EMAIL" ] && ask EMAIL "Email for Let's Encrypt renewals (optional)" ""
else
  MODE=local; DOMAIN=localhost; PUBLIC_URL="https://localhost"
fi

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Preserve existing secrets on re-run — rotating AUTH_SECRET would orphan encrypted
# data and changing the DB password would lock the app out of Postgres.
AUTH_SECRET=""; POSTGRES_PASSWORD=""
if [ -f .env ]; then
  AUTH_SECRET=$(sed -n 's/^AUTH_SECRET=//p' .env | head -n1)
  POSTGRES_PASSWORD=$(sed -n 's/^POSTGRES_PASSWORD=//p' .env | head -n1)
fi
[ -n "$AUTH_SECRET" ] || AUTH_SECRET=$(rand_b64)
[ -n "$POSTGRES_PASSWORD" ] || POSTGRES_PASSWORD=$(rand_alnum)

# ---------------------------------------------------------------- .env (secrets)
umask 077
cat > .env <<EOF
# Generated by the PolarHQ installer — keep this file private (it holds your secrets).
APP_NAME=$APP_NAME
PUBLIC_URL=$PUBLIC_URL
DOMAIN=$DOMAIN
AUTH_SECRET=$AUTH_SECRET
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
APP_IMAGE=$APP_IMAGE
WEB_IMAGE=$WEB_IMAGE
EOF
umask 022
ok "Wrote .env"

# ---------------------------------------------------------------- Caddyfile (TLS)
emit_routes() {
  cat <<'ROUTES'
	encode zstd gzip
	@api path /api/* /ws /ws/* /health /_sodium.js /s/*
	handle @api {
		reverse_proxy api:3001
	}
	handle {
		reverse_proxy web:3000
	}
ROUTES
}
if [ "$MODE" = domain ]; then
  {
    [ -n "$EMAIL" ] && printf '{\n\temail %s\n}\n\n' "$EMAIL"
    printf '%s {\n' "$DOMAIN"; emit_routes; printf '}\n'
  } > Caddyfile
else
  {
    printf '{\n\tauto_https disable_redirects\n}\n\n'
    printf 'https://localhost {\n\ttls internal\n'; emit_routes; printf '}\n'
  } > Caddyfile
fi
ok "Wrote Caddyfile (${MODE} TLS)"

# ---------------------------------------------------------------- docker-compose
cat > docker-compose.yml <<'COMPOSE'
name: polarhq

x-app-env: &app-env
  NODE_ENV: production
  APP_NAME: ${APP_NAME:-PolarHQ}
  AUTH_SECRET: ${AUTH_SECRET}
  API_URL: ${PUBLIC_URL}
  WEB_URL: ${PUBLIC_URL}
  DATABASE_URL: postgres://orbit:${POSTGRES_PASSWORD}@postgres:5432/orbit
  REDIS_URL: redis://redis:6379
  STORAGE_DRIVER: fs
  STORAGE_FS_ROOT: /data/storage

services:
  postgres:
    image: pgvector/pgvector:pg17
    restart: unless-stopped
    environment:
      POSTGRES_USER: orbit
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: orbit
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orbit -d orbit"]
      interval: 5s
      timeout: 5s
      retries: 20

  redis:
    image: redis:8-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data

  migrate:
    image: ${APP_IMAGE}
    environment: *app-env
    command: ["pnpm", "--filter", "@workspace/db", "db:migrate"]
    restart: "no"
    depends_on:
      postgres:
        condition: service_healthy

  api:
    image: ${APP_IMAGE}
    restart: unless-stopped
    environment: *app-env
    volumes:
      - storage-data:/data/storage
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
      migrate:
        condition: service_completed_successfully

  media:
    image: ${APP_IMAGE}
    restart: unless-stopped
    environment: *app-env
    command: ["pnpm", "--filter", "@workspace/media", "start"]
    volumes:
      - storage-data:/data/storage
    depends_on:
      redis:
        condition: service_started
      migrate:
        condition: service_completed_successfully

  backup:
    image: ${APP_IMAGE}
    restart: unless-stopped
    environment: *app-env
    command: ["pnpm", "--filter", "@workspace/backup", "start"]
    volumes:
      - storage-data:/data/storage
    depends_on:
      redis:
        condition: service_started
      migrate:
        condition: service_completed_successfully

  web:
    image: ${WEB_IMAGE}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PUBLIC_URL: ${PUBLIC_URL}
    depends_on:
      - api

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - web
      - api

volumes:
  postgres-data:
  redis-data:
  storage-data:
  caddy-data:
  caddy-config:
COMPOSE
ok "Wrote docker-compose.yml"

# ---------------------------------------------------------------- launch
say ""
info "Pulling images (first run downloads a few hundred MB, please wait)..."
$DC pull
say ""
info "Starting ${APP_NAME}..."
$DC up -d

# ---------------------------------------------------------------- done
say ""
ok "${B}$APP_NAME is up.${Z}"
say ""
say "  ${B}Open${Z}     $C$PUBLIC_URL$Z"
say "  ${B}Folder${Z}   $INSTALL_DIR"
say "  ${B}Logs${Z}     cd $INSTALL_DIR && $DC logs -f"
say "  ${B}Stop${Z}     cd $INSTALL_DIR && $DC down"
say "  ${B}Update${Z}   cd $INSTALL_DIR && $DC pull && $DC up -d"
say ""
if [ "$MODE" = local ]; then
  warn "Local mode uses a self-signed certificate — your browser will warn once; accept it to continue."
else
  info "Ensure ${B}$DOMAIN${Z} resolves to this server and ports 80/443 are open — Caddy fetches a certificate automatically (this can take ~30s on first load)."
fi
say ""
