#!/usr/bin/env bash
# Post-deploy smoke checks for production API + browser CORS. Run from CI or your laptop.
set -euo pipefail

API_URL="${WESHARP_PROD_API_URL:-https://api.wesharp.co.uk}"
FRONTEND_URL="${WESHARP_PROD_FRONTEND_URL:-https://www.wesharp.co.uk}"

# Comma-separated browser origins that must receive Access-Control-Allow-Origin from the API.
CORS_ORIGINS="${WESHARP_PROD_CORS_ORIGINS:-https://www.wesharp.co.uk,https://wesharp.co.uk,https://app.wesharp.co.uk}"

log() { echo "[wesharp-prod-smoke] $*"; }
fail() { echo "[wesharp-prod-smoke] ERROR: $*" >&2; exit 1; }

host="$(python3 -c "from urllib.parse import urlparse; print(urlparse('${API_URL}').hostname or '')")"
[[ -n "$host" ]] || fail "Could not parse API hostname from ${API_URL}"

log "TLS certificate SAN check for ${host}"
if ! openssl s_client -connect "${host}:443" -servername "${host}" </dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName 2>/dev/null \
  | grep -qiE "(DNS:\*\.${host//./\\.}|DNS:${host//./\\.})"; then
  echo "[wesharp-prod-smoke] Certificate subjectAltName:" >&2
  openssl s_client -connect "${host}:443" -servername "${host}" </dev/null 2>/dev/null \
    | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null >&2 || true
  fail "TLS cert does not include ${host} — fix SSL in Plesk (Domains → ${host} → SSL/TLS → Let's Encrypt)."
fi

log "API health (strict TLS): ${API_URL}/api/health"
health_body="$(curl -fsS "${API_URL}/api/health")" || fail "API health request failed (TLS or network)"
echo "$health_body" | grep -q '"success"' || fail "API health JSON missing success"
echo "$health_body" | grep -q 'ok' || fail "API health status not ok"

IFS=',' read -r -a origins <<< "$CORS_ORIGINS"
for origin in "${origins[@]}"; do
  origin="$(echo "$origin" | xargs)"
  [[ -n "$origin" ]] || continue
  log "CORS preflight for Origin: ${origin}"
  cors_header="$(
    curl -fsS -o /dev/null -D - -X OPTIONS \
      -H "Origin: ${origin}" \
      -H "Access-Control-Request-Method: GET" \
      -H "Access-Control-Request-Headers: authorization" \
      "${API_URL}/api/v1/me" 2>/dev/null \
      | tr -d '\r' \
      | grep -i '^access-control-allow-origin:' \
      | head -1 \
      || true
  )"
  if [[ -z "$cors_header" ]]; then
    fail "Missing Access-Control-Allow-Origin for ${origin}. Set FRONTEND_ORIGIN / CORS_ALLOWED_ORIGINS on Laravel and run config:cache."
  fi
  if ! echo "$cors_header" | grep -qi "${origin}"; then
    fail "CORS header mismatch for ${origin}: ${cors_header}"
  fi
done

log "Frontend: ${FRONTEND_URL}/"
frontend_code="$(curl -fsS -o /dev/null -w '%{http_code}' "${FRONTEND_URL}/")" || fail "Frontend request failed"
[[ "$frontend_code" == "200" ]] || fail "Frontend returned HTTP ${frontend_code}"

log "All production smoke checks passed."
