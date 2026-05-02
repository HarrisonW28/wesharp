# Production deployment readiness

Controlled **production** deploy, backup, rollback, smoke tests, monitoring, and launch gating. Pair with **`deployment.md`** (build commands, env tables) and **`gitlab-environments-and-deployment.md`** (GitLab workflow, staging checklist).

**Rule:** Never run `migrate:fresh`, destructive seeders, or test credentials against production.

---

## 1. Repeatable production deploy (application)

Order may vary slightly by host (Docker vs bare metal vs Plesk); keep this sequence conceptually.

| Step | Action |
| --- | --- |
| 1 | **Backup** — database + uploaded files + confirm env secrets are in your vault (§2). |
| 2 | **Maintenance (optional)** — `php artisan down --render="errors::503" --retry=60` or use platform maintenance; for zero-downtime deploys, skip if your stack supports rolling updates. |
| 3 | **Code** — deploy the chosen **tag** or release commit (`git pull` / artifact extract); no uncommitted changes on the server. |
| 4 | **Backend dependencies** — `cd apps/backend && composer install --no-dev --optimize-autoloader` |
| 5 | **Migrations** — `php artisan migrate --force` (do **not** use `--seed` in production; demo seed is skipped anyway when `APP_ENV=production`). |
| 6 | **Caches** — `php artisan config:cache` and, if you use them in prod, `php artisan route:cache` and `php artisan view:cache`. |
| 7 | **Storage link** — run `php artisan storage:link` once per server if the public disk serves uploads via `public/storage`. |
| 8 | **Frontend** — on the build host or CI: `cd apps/frontend && npm ci && npm run build`; deploy `.next`/static assets per your Next.js hosting (Vercel, Node server, etc.). Ensure **`NEXT_PUBLIC_API_ORIGIN`** and **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** match **this** production API + Clerk app at build time. |
| 9 | **Workers / schedule** — restart queue workers after code deploy; ensure **cron** runs `* * * * * cd /path/to/apps/backend && php artisan schedule:run` (see `bootstrap/app.php` for scheduled commands). |
| 10 | **Web server** — reload **PHP-FPM** / **Apache** / **nginx** so opcache picks up changes. |
| 11 | **Lift maintenance** — `php artisan up` if you used `down`. |

### Web server (nginx / Plesk) — Laravel

- Document root must be **`apps/backend/public`** (not project root).
- Pass `Authorization` and other headers to PHP; typical PHP-FPM `.try_files` → `index.php` pattern.
- TLS termination at proxy; set **`APP_URL`** and **`FRONTEND_URL`** to `https://…` consistently.

---

## 2. Backup before deploy

| Asset | What to do |
| --- | --- |
| **Database** | Logical dump **before** `migrate --force` on production (e.g. PostgreSQL: `pg_dump … > backup-YYYYMMDD.sql` or host-managed snapshot). |
| **Uploaded files** | If using **local** `storage/app` / `public` disk, archive the directory or rely on volume snapshots. If using **S3-compatible** storage, rely on provider versioning/replication — still snapshot DB that references paths. |
| **Environment** | Store **`/path/to/.env`** (or platform env export) in a **secrets manager** — never rely on only the server copy. After rollback, env should still match the restored app version. |

Restore drill: practise restore to a **non-production** database at least once before first live deploy.

---

## 3. Rollback

| Step | Action |
| --- | --- |
| 1 | Pause further deploy automation. |
| 2 | **Application** — redeploy the **previous** known-good release artifact / Git tag. |
| 3 | **Database** — if the failed deploy ran **breaking** migrations, prefer **restore DB from pre-deploy backup** over `migrate:rollback` unless rollbacks are tested. |
| 4 | **Caches** — `php artisan config:clear` then `config:cache` if you cache config; clear opcode cache / restart PHP-FPM. |
| 5 | **Verify** — `GET /api/health` and one authenticated journey (§4). |
| 6 | **Record** — incident note: cause, resolution, follow-up ticket. |

---

## 4. Post-deploy smoke tests

Run after every production deploy (or promote). Replace `$API` and `$FRONTEND` with production URLs; obtain a real **Clerk session JWT** for tenant and staff tests (browser devtools or Clerk test user).

| # | Check | Pass criteria |
| --- | --- | --- |
| 1 | API liveness | `curl -sS "$API/api/health"` → **200** JSON with `success: true` and `data.status` = `ok`. |
| 2 | Frontend | Open `$FRONTEND` — marketing/home loads without console **errors** (warnings acceptable). |
| 3 | Auth | Clerk **sign-in** completes; app shell loads (**/account** or **/admin** as appropriate). |
| 4 | API + JWT | `curl -sS -H "Authorization: Bearer $JWT" "$API/api/v1/me"` → **200**, `success: true`, user payload. |
| 5 | Tenant portal | Dashboard/bookings (or empty state); **no** admin routes reachable as customer. |
| 6 | Admin portal | One list page (e.g. companies or bookings) loads for staff. |
| 7 | Booking flow | Create or view booking (smallest path that proves API + UI for your release). |
| 8 | Pricing / order | Open order or flow that hits pricing rules as applicable. |
| 9 | Invoice | List or detail invoice; if release touches billing, exercise **draft** path in a safe account. |
| 10 | Email | Trigger or verify a notification path (e.g. invoice reminder in **log** driver, or provider dashboard). |
| 11 | Webhooks | Clerk/Stripe dashboard: test or recent delivery to `$API/api/webhooks/...` → **2xx** (no leaked 5xx from misconfiguration). |
| 12 | Mobile | Resize browser or device: primary nav + one account screen usable. |

**Note:** `GET /api/v1/admin/smoke` and `GET /api/v1/account/smoke` are **not** registered when `APP_ENV=production` — do not use them in prod; use **`/api/health`** and real routes above.

---

## 5. Monitoring and logs

| Source | What to watch |
| --- | --- |
| Laravel | `storage/logs/laravel.log` (or `LOG_CHANNEL` stack); errors after deploy window (first **30–60 minutes** especially). |
| Web server | nginx/Apache/PHP-FPM error logs — 5xx spikes, upstream timeouts. |
| Queue | Failed jobs table / `php artisan queue:failed`; retry or fix after root cause. |
| Webhooks | Admin **Webhook inbox** (`/api/admin/webhooks/inbox`) or DB `webhook_inbox` — failed Clerk rows after user sync changes. |
| Stripe | Stripe Dashboard → Webhooks — recent delivery failures for `$API/api/webhooks/stripe`. |
| Public errors | **`APP_DEBUG=false`** in production so customers never see stack traces. |

---

## 6. Launch checklist (go / no-go)

Use this as a final gate before **first** production launch or a major cutover.

- [ ] **Clerk** — production application; production **publishable** + **secret** keys; JWT issuer/JWKS match `config/clerk.php`; webhook signing secret for `POST …/api/webhooks/clerk`.
- [ ] **Database** — production instance; migrations applied; **backups** automated + restore tested.
- [ ] **Secrets** — all `apps/backend/.env` and frontend build vars set; **no** test Stripe/Clerk keys in prod.
- [ ] **CORS** — `FRONTEND_ORIGIN` / `CORS_ALLOWED_ORIGINS` set (`config/cors.php`); not `*` in production.
- [ ] **Stripe** — live mode only when finance approves; `STRIPE_WEBHOOK_SECRET` matches live endpoint.
- [ ] **Rollback** — previous release artifact + DB backup retention verified.
- [ ] **Staging** — recent deploy tested on staging with **staging** Clerk/Stripe/DB.
- [ ] **P0 / P1** — none open for launch scope (see audit/QA docs).
- [ ] **Demo / debug** — `APP_DEBUG=false`, `APP_ENV=production`; demo seed not required; smoke routes disabled in prod (12.6).
- [ ] **Scheduler / queue** — cron + workers running if you rely on scheduled invoice/reminder commands.

---

## 7. Launch blockers log

Track open items explicitly (copy into issue tracker or edit as you close).

| ID | Blocker | Owner | Status |
| --- | --- | --- | --- |
| LB-1 | *(example: production Stripe webhook not registered)* | | Open / Done |
| LB-2 | *(example: backup restore not tested)* | | Open / Done |

---

## 8. Production readiness verdict

- **Verdict:** *Pending* / *Ready for controlled production use* / *Not ready — see launch blockers*.
- **Signed off:** *(name/role, date)*  
- **Notes:** *(e.g. known P2 follow-ups documented in `mvp-scope.md`)*

---

## Related documents

- **`docs/operations/deployment.md`** — env tables; backend/frontend build snippets  
- **`docs/operations/gitlab-environments-and-deployment.md`** — GitLab, staging checklist, related links  
- **`docs/testing/qa-checklist.md`** — deeper functional QA  
- **`docs/security/permission-matrix.md`** — roles and API segments  
