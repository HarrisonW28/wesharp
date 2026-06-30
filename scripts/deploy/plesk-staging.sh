#!/usr/bin/env bash
# Deploy WeSharp to Plesk staging (backend + frontend build).
# Run on the server via SSH (GitHub Actions) or as a Plesk Git post-deploy hook.
set -euo pipefail

ENV_FILE="${WESHARP_DEPLOY_ENV_FILE:-/etc/wesharp/staging-deploy.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

APP_ROOT="${WESHARP_APP_ROOT:?Set WESHARP_APP_ROOT (see scripts/deploy/plesk-staging.env.example)}"
BRANCH="${WESHARP_DEPLOY_BRANCH:-staging}"
PHP_BIN="${WESHARP_PHP_BIN:-php}"
COMPOSER_BIN="${WESHARP_COMPOSER_BIN:-composer}"
SKIP_GIT_PULL="${WESHARP_SKIP_GIT_PULL:-0}"

log() { echo "[wesharp-deploy $(date -u +%H:%M:%S)] $*"; }
die() { echo "[wesharp-deploy] ERROR: $*" >&2; exit 1; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT does not exist: $APP_ROOT"
cd "$APP_ROOT"

if [[ "$SKIP_GIT_PULL" != "1" ]]; then
  log "Updating git (${BRANCH})..."
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  log "Skipping git pull (WESHARP_SKIP_GIT_PULL=1)."
fi

log "Commit: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

maintenance_up() {
  if [[ "${WESHARP_USE_MAINTENANCE:-0}" == "1" ]]; then
    (cd apps/backend && "$PHP_BIN" artisan up) || true
  fi
}
trap maintenance_up EXIT

if [[ "${WESHARP_USE_MAINTENANCE:-0}" == "1" ]]; then
  log "Enabling maintenance mode..."
  (cd apps/backend && "$PHP_BIN" artisan down --retry=60 --refresh=15) || true
fi

log "Backend: composer install..."
(
  cd apps/backend
  "$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-progress
)

log "Backend: migrate..."
(
  cd apps/backend
  "$PHP_BIN" artisan migrate --force
)

log "Backend: cache..."
(
  cd apps/backend
  "$PHP_BIN" artisan config:cache
  "$PHP_BIN" artisan route:cache
  "$PHP_BIN" artisan view:cache
)

if [[ -n "${WESHARP_PHP_FPM_SERVICE:-}" ]] && command -v systemctl >/dev/null 2>&1; then
  log "Reloading PHP-FPM (${WESHARP_PHP_FPM_SERVICE})..."
  sudo systemctl reload "$WESHARP_PHP_FPM_SERVICE" || true
fi

log "Frontend: install + build..."
(
  cd apps/frontend
  if [[ ! -f .env.production.local ]]; then
    log "WARN: apps/frontend/.env.production.local missing — NEXT_PUBLIC_* may be wrong at build time."
  fi
  npm ci --no-audit --no-fund
  npm run build
)

if [[ -n "${WESHARP_FRONTEND_RESTART_CMD:-}" ]]; then
  log "Restarting frontend (custom command)..."
  eval "$WESHARP_FRONTEND_RESTART_CMD"
elif [[ -n "${WESHARP_PLESK_NODE_DOMAIN:-}" ]] && command -v plesk >/dev/null 2>&1; then
  log "Restarting Plesk Node.js app (${WESHARP_PLESK_NODE_DOMAIN})..."
  plesk bin extension --exec nodemanager --restart -domain "$WESHARP_PLESK_NODE_DOMAIN" || \
    log "WARN: Plesk Node restart failed — restart manually in Plesk UI."
else
  log "WARN: No frontend restart configured. Set WESHARP_FRONTEND_RESTART_CMD or WESHARP_PLESK_NODE_DOMAIN."
fi

log "Running smoke checks..."
bash "$APP_ROOT/scripts/deploy/plesk-smoke-staging.sh"

log "Staging deploy complete."
