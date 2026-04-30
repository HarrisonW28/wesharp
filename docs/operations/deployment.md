# Deployment notes (WeSharp MVP)

Minimal guidance for standing up **frontend** + **API** environments. Tune for your infra (Vercel, Fly, Kubernetes, VPS).

---

## Environment variables

### Laravel (`apps/backend`)

Configure via `.env` / platform secret store:

| Variable | Purpose |
| --- | --- |
| **`APP_URL`**, **`APP_KEY`** | Canonical base URL & encryption |
| **Database** | `DB_*` connection Laravel expects |
| **`CLERK_*`** | Issuer, JWKS, optional local bypass (see **`config/clerk.php`**) |
| **`STRIPE_*`** | Keys + **`STRIPE_WEBHOOK_SECRET`** for **`POST /api/webhooks/stripe`** |
| **`CORS`** | Restrict origins beyond `*` in production (**`config/cors.php`**) |

### Next.js (`apps/frontend`)

| Variable | Purpose |
| --- | --- |
| **`NEXT_PUBLIC_API_ORIGIN`** | Laravel base **without** trailing slash — browser calls **`${ORIGIN}/api/...`** |
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** | Clerk publishable key. **Production** must use **your** key. If omitted during **`next build`**, the codebase falls back to a structural **`pk_test_...`** placeholder so CI builds succeed — see **`env.local.example`**. |

---

## Build & migrate

### Backend

```bash
cd apps/backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan migrate --force
# Optional demo data (non-prod): php artisan migrate --seed
```

Run **`php artisan test`** in CI before promote.

### Frontend

```bash
cd apps/frontend
npm ci
npx tsc --noEmit
npm run lint
npm run build
```

---

## Health checks

- **`GET ${API_ORIGIN}/api/health`** — should return **200** JSON from Laravel.

---

## Related documents

- **`docs/product/mvp-scope.md`** — feature list & known gaps  
- **`docs/testing/qa-checklist.md`** — pre-release checklist  
- **`docs/security/`** — auth, uploads, Stripe, permissions matrix  
