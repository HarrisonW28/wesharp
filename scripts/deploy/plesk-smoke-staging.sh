#!/usr/bin/env bash
# Post-deploy smoke checks for staging. Safe to run from CI or on the server.
set -euo pipefail

ENV_FILE="${WESHARP_DEPLOY_ENV_FILE:-/etc/wesharp/staging-deploy.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

API_URL="${WESHARP_STAGING_API_URL:-https://api-staging.wesharp.co.uk}"
FRONTEND_URL="${WESHARP_STAGING_FRONTEND_URL:-https://staging.wesharp.co.uk}"

log() { echo "[wesharp-smoke] $*"; }
fail() { echo "[wesharp-smoke] ERROR: $*" >&2; exit 1; }

log "API health: ${API_URL}/api/health"
health_body="$(curl -fsS "${API_URL}/api/health")" || fail "API health request failed"
echo "$health_body" | grep -q '"success"' || fail "API health JSON missing success"
echo "$health_body" | grep -q 'ok' || fail "API health status not ok"

log "Frontend: ${FRONTEND_URL}/"
frontend_code="$(curl -fsS -o /dev/null -w '%{http_code}' "${FRONTEND_URL}/")" || fail "Frontend request failed"
[[ "$frontend_code" == "200" ]] || fail "Frontend returned HTTP ${frontend_code}"

log "Marketing page: ${FRONTEND_URL}/service-areas/manchester"
area_code="$(curl -fsS -o /dev/null -w '%{http_code}' "${FRONTEND_URL}/service-areas/manchester")" || fail "Area page request failed"
[[ "$area_code" == "200" ]] || fail "Area page returned HTTP ${area_code}"

log "All staging smoke checks passed."
