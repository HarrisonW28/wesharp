# Production API troubleshooting — “Failed to fetch” / Laravel profile

When sign-in succeeds in Clerk but `/auth/continue` shows **“We Sharp could not attach your Laravel profile (Failed to fetch…)”**, the browser never got a valid response from **`${NEXT_PUBLIC_API_ORIGIN}/api/v1/me`**.

## Which host is actually broken?

Run from any machine:

```bash
for host in www.wesharp.co.uk wesharp.co.uk api.wesharp.co.uk mail.wesharp.co.uk; do
  echo "=== $host ==="
  echo | openssl s_client -connect "${host}:443" -servername "$host" 2>/dev/null \
    | openssl x509 -noout -subject -ext subjectAltName
done
```

**Expected (as of last check):**

| Host | Hosting | Certificate | Browser |
| --- | --- | --- | --- |
| `www.wesharp.co.uk` | Vercel | Valid Let’s Encrypt for `www.wesharp.co.uk` | Secure padlock |
| `wesharp.co.uk` | Vercel | Valid Let’s Encrypt for `wesharp.co.uk` | Secure padlock |
| `api.wesharp.co.uk` | Plesk `217.154.54.237` | **Wrong** — serves `*.gigastudios.info` | **“Connection not private”** |
| `mail.wesharp.co.uk` | Plesk | **Wrong** — serves `giganode.co.uk` | **“Connection not private”** |
| `webmail.wesharp.co.uk` | Plesk | Valid for `mail` + `webmail` | Secure padlock |

If Vercel → Domains shows **Valid** but you still see **Not secure**, check the **exact URL** in the address bar:

- **`https://www.wesharp.co.uk`** should be secure (Vercel cert is fine).
- **`https://api.wesharp.co.uk`** will **always** warn until Plesk SSL is fixed — this also breaks sign-in and `/api/backend-health`.
- **`http://`** (no **s**) always shows **Not secure** — use **`https://`** or clear old HTTP bookmarks.

**Namecheap DNS cleanup (optional but recommended):**

- Remove stale **`_acme-challenge`** TXT on `@` if you are not actively issuing a cert on Plesk for the apex (Vercel owns apex SSL).
- Remove **`www.api`** A record unless you intentionally host something there on Plesk.

## Quick diagnosis

1. **In the same browser tab**, open **`https://api.wesharp.co.uk/api/health`** (replace with your API host).
   - **Certificate warning / “connection not private”** → TLS is wrong (see §1). CORS and Clerk are not the problem yet.
   - **200 JSON** with `"status":"ok"` → TLS is fine; check CORS (§2) and Clerk (§3).

2. **From the deployed frontend**, open **`/api/backend-health`** (Next.js diagnostic route). It reports TLS, reachability, and configured `NEXT_PUBLIC_API_ORIGIN`.

3. **On the server or CI**, run:

   ```bash
   bash scripts/deploy/plesk-smoke-production.sh
   ```

---

## 1. TLS certificate (most common)

**Symptom:** Browser shows “Failed to fetch”; opening the API URL in the tab shows a certificate error.

**Cause:** The API vhost is serving a **default certificate** for another domain (e.g. `*.gigastudios.info`) instead of **`api.wesharp.co.uk`**.

**Fix (Plesk) — `api.wesharp.co.uk`:**

1. Log in to Plesk on **`217.154.54.237`**.
2. **Websites & Domains** → confirm **`api.wesharp.co.uk`** exists as its **own** subscription/vhost (not an alias on `gigastudios.info` or another default site).
3. **SSL/TLS Certificates** → **Install** (Let’s Encrypt) → select **`api.wesharp.co.uk`** only → **Get it free**.
4. **Hosting Settings** → enable **SSL/TLS support** and assign the new certificate to this domain.
5. **Apache & nginx Settings** (if present) → ensure SNI uses this cert, not the server default.
6. Reload web server if prompted.

**Fix (Plesk) — `mail.wesharp.co.uk`:**

Same steps on the **mail** vhost — issue Let’s Encrypt for **`mail.wesharp.co.uk`** (currently serving **`giganode.co.uk`**).

Verify:

```bash
curl -fsS https://api.wesharp.co.uk/api/health
# must succeed without -k
```

---

## 2. CORS (after TLS works)

**Symptom:** `/api/health` loads in the browser tab, but sign-in still fails with “Failed to fetch” and the Network tab shows a blocked cross-origin request or missing `Access-Control-Allow-Origin`.

**Fix (Laravel `apps/backend/.env`):**

```env
APP_URL=https://api.wesharp.co.uk
FRONTEND_ORIGIN=https://www.wesharp.co.uk
CORS_ALLOWED_ORIGINS=https://www.wesharp.co.uk,https://wesharp.co.uk,https://app.wesharp.co.uk
```

Then on the API server:

```bash
cd apps/backend && php artisan config:cache
```

**Rules:**

- Origins must match **exactly** (scheme + host, no trailing slash).
- Include **every** hostname where the Next.js app runs (marketing domain, `app.` subdomain, Vercel preview URLs if needed).
- nginx must **pass OPTIONS** through to `public/index.php` (do not return 404/405 for preflight).

Verify:

```bash
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://www.wesharp.co.uk" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  https://api.wesharp.co.uk/api/v1/me | grep -i access-control
```

Expect: `Access-Control-Allow-Origin: https://www.wesharp.co.uk`

---

## 3. Frontend build env (Vercel)

**Symptom:** API is healthy and CORS is correct, but the app calls the wrong host or HTTP from an HTTPS page.

**Fix (Vercel → Project → Settings → Environment Variables):**

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_API_ORIGIN` | `https://api.wesharp.co.uk` (no trailing slash) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key |

Redeploy after changing **`NEXT_PUBLIC_*`** (they are baked in at build time).

---

## 4. Clerk secrets (API returns 401, not “Failed to fetch”)

If the browser **reaches** the API but `/api/v1/me` returns **401**:

- **`CLERK_JWKS_URL`**, **`CLERK_JWT_ISSUER`**, and optional **`CLERK_JWT_AUDIENCE`** on Laravel must match the **same Clerk application** as the frontend publishable key.
- **`CLERK_SECRET_KEY`** must be the production secret for that app.

---

## Checklist

| Check | Pass |
| --- | --- |
| `https://api.wesharp.co.uk/api/health` — no cert warning in browser | ☐ |
| `plesk-smoke-production.sh` exits 0 | ☐ |
| `FRONTEND_ORIGIN` / `CORS_ALLOWED_ORIGINS` include your live SPA origin | ☐ |
| Vercel `NEXT_PUBLIC_API_ORIGIN=https://api.wesharp.co.uk` + redeploy | ☐ |
| Clerk prod keys on API + frontend | ☐ |
| Sign-in → `/auth/continue` → dashboard | ☐ |
