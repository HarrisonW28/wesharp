# Staging branch & Plesk deployment

Operational guide for **`staging`** → **`staging.wesharp.co.uk`** (Next.js) and **`api-staging.wesharp.co.uk`** (Laravel).

Use this for testing from mobile, QA, and pre-production checks before promoting to **`main`**.

---

## Branch workflow

| Branch | Deploys to | CI |
| --- | --- | --- |
| **`staging`** | Plesk staging | GitHub Actions `Staging deploy (Plesk)` + optional GitLab deploy job |
| **`main`** | Production (manual / separate runbook) | Tests only (CI workflow) |
| **`cursor/*` / feature branches | Nothing automatically | CI on pull requests |

**Recommended flow:**

```
feature branch  →  PR into staging  →  auto-deploy staging  →  test on phone
                              ↓
                         PR into main  →  manual production deploy
```

---

## One-time Plesk server setup

### 1. DNS & TLS

Create A/AAAA records (or CNAME) pointing at your Plesk server:

| Host | Purpose |
| --- | --- |
| `staging.wesharp.co.uk` | Next.js marketing + app shell |
| `api-staging.wesharp.co.uk` | Laravel API (`apps/backend/public`) |

Enable **Let’s Encrypt** in Plesk for both domains.

### 2. Clone the repository on the server

SSH in as a deploy user (e.g. `wesharp-deploy`):

```bash
sudo mkdir -p /var/www/vhosts/staging.wesharp.co.uk
sudo chown "$USER" /var/www/vhosts/staging.wesharp.co.uk

git clone https://github.com/HarrisonW28/wesharp.git \
  /var/www/vhosts/staging.wesharp.co.uk/wesharp

cd /var/www/vhosts/staging.wesharp.co.uk/wesharp
git checkout staging
chmod +x scripts/deploy/*.sh
```

Adjust `WESHARP_APP_ROOT` if your path differs.

### 3. Backend domain (Laravel)

In Plesk → **api-staging.wesharp.co.uk**:

| Setting | Value |
| --- | --- |
| Document root | `{WESHARP_APP_ROOT}/apps/backend/public` |
| PHP | 8.3 |
| `open_basedir` | Allow `storage/` and `bootstrap/cache/` writes |

Create **`apps/backend/.env`** on the server (never commit). Minimum:

```env
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://api-staging.wesharp.co.uk
FRONTEND_URL=https://staging.wesharp.co.uk
FRONTEND_ORIGIN=https://staging.wesharp.co.uk

# Staging DB (dedicated — not production)
DB_CONNECTION=pgsql
DB_HOST=...
DB_DATABASE=wesharp_staging
DB_USERNAME=...
DB_PASSWORD=...

# Staging Clerk app (separate from production)
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://....clerk.accounts.dev/.well-known/jwks.json
CLERK_JWT_ISSUER=https://....clerk.accounts.dev
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Stripe test mode
STRIPE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Run once:

```bash
cd apps/backend
php artisan key:generate
php artisan migrate --force
php artisan storage:link
```

**Clerk webhooks (staging):** point to `https://api-staging.wesharp.co.uk/api/webhooks/clerk`  
**Stripe webhooks (test):** point to `https://api-staging.wesharp.co.uk/api/webhooks/stripe`

### 4. Frontend domain (Next.js)

In Plesk → **staging.wesharp.co.uk** → **Node.js**:

| Setting | Value |
| --- | --- |
| Application mode | Production |
| Document root | `{WESHARP_APP_ROOT}/apps/frontend` |
| Application startup file | `node_modules/next/dist/bin/next` |
| Custom environment | see below |

Create **`apps/frontend/.env.production.local`** on the server:

```env
NEXT_PUBLIC_API_ORIGIN=https://api-staging.wesharp.co.uk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=https://staging.wesharp.co.uk
```

Plesk Node.js **Application startup** arguments (typical):

```text
start -p 3000 -H 127.0.0.1
```

Enable **Proxy mode** so nginx forwards HTTPS to the Node port.

### 5. Server deploy config

```bash
sudo mkdir -p /etc/wesharp
sudo cp scripts/deploy/plesk-staging.env.example /etc/wesharp/staging-deploy.env
sudo nano /etc/wesharp/staging-deploy.env   # set WESHARP_APP_ROOT, PHP paths, domain names
sudo chmod 600 /etc/wesharp/staging-deploy.env
```

Test a manual deploy:

```bash
bash /var/www/vhosts/staging.wesharp.co.uk/wesharp/scripts/deploy/plesk-staging.sh
```

---

## GitHub Actions CI/CD (recommended)

Workflows in **`.github/workflows/`**:

| Workflow | Trigger | Action |
| --- | --- | --- |
| **`ci.yml`** | PRs + push to `main` / `staging` / `develop` | PHPUnit, typecheck, lint, build |
| **`staging-deploy.yml`** | Push to **`staging`** | Tests → SSH deploy → external smoke |

### GitHub repository secrets

**Settings → Secrets and variables → Actions → Secrets**

| Secret | Example | Purpose |
| --- | --- | --- |
| `STAGING_SSH_HOST` | `203.0.113.10` or `staging.wesharp.co.uk` | Plesk server |
| `STAGING_SSH_USER` | `wesharp-deploy` | SSH user |
| `STAGING_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----…` | Deploy key (read + run script) |
| `STAGING_APP_ROOT` | `/var/www/vhosts/staging.wesharp.co.uk/wesharp` | Git root on server |

Optional:

| Secret | Purpose |
| --- | --- |
| `STAGING_SSH_PORT` | Non-default SSH port (workflow defaults to 22 if omitted — add `port:` to workflow if needed) |
| `STAGING_DEPLOY_ENV_FILE` | Override env file path (default `/etc/wesharp/staging-deploy.env`) |

### GitHub environment

**Settings → Environments → New environment → `staging`**

Optional protection rules (required reviewers) before production-like deploys.

### Repository variables (optional)

**Settings → Secrets and variables → Actions → Variables**

| Variable | Default |
| --- | --- |
| `STAGING_API_URL` | `https://api-staging.wesharp.co.uk` |
| `STAGING_FRONTEND_URL` | `https://staging.wesharp.co.uk` |

### SSH key setup on Plesk

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/wesharp-staging-deploy
```

On the server (`~/.ssh/authorized_keys` for deploy user):

```text
command="/bin/bash -c 'exec $SSH_ORIGINAL_COMMAND'" ssh-ed25519 AAAA... github-actions-staging
```

Paste the **private** key into GitHub secret `STAGING_SSH_PRIVATE_KEY`.

Ensure the deploy user can:

- `git pull` in `WESHARP_APP_ROOT`
- run `composer`, `php`, `npm`
- restart Node.js app (Plesk `nodemanager` or PM2)

---

## Alternative: Plesk Git webhook (no GitHub Actions SSH)

If you prefer Plesk to pull on push instead of Actions SSH:

1. Plesk → **Domains** → **Git** → Add repository  
   - URL: `https://github.com/HarrisonW28/wesharp.git`  
   - Branch: **`staging`**  
   - Deploy: **Automatic**

2. Copy the **Webhook URL** from Plesk.

3. GitHub → **Settings → Webhooks → Add webhook**  
   - Payload URL: Plesk webhook URL  
   - Content type: `application/json`  
   - Events: **Just the push event**  
   - Branch filter: `staging` (if using GitHub webhook config)

4. Plesk **Additional deploy actions** (after pull):

   ```bash
   export WESHARP_SKIP_GIT_PULL=1
   export WESHARP_DEPLOY_ENV_FILE=/etc/wesharp/staging-deploy.env
   bash /var/www/vhosts/staging.wesharp.co.uk/wesharp/scripts/deploy/plesk-staging.sh
   ```

Keep **`ci.yml`** on GitHub for tests on PRs; disable the SSH `deploy` job in `staging-deploy.yml` if you only use Plesk Git.

### Plesk REST API (optional)

Plesk Obsidian exposes REST API on port 8443. You can trigger Git pull or run commands from CI:

```bash
curl -k -u "admin:PASSWORD" \
  -X POST "https://SERVER:8443/api/v2/cli/git/pull" \
  -H "Content-Type: application/json" \
  -d '{"domain":"staging.wesharp.co.uk","name":"wesharp"}'
```

Prefer the **SSH + `plesk-staging.sh`** path unless you already automate Plesk via API.

---

## GitLab CI (optional)

If you mirror to GitLab, **`.gitlab-ci.yml`** includes **`deploy:staging`** after tests when branch is **`staging`**.

Required **GitLab CI/CD variables** (protected, masked):

- `STAGING_SSH_HOST`
- `STAGING_SSH_USER`
- `STAGING_SSH_PRIVATE_KEY`
- `STAGING_APP_ROOT`
- Optional: `STAGING_API_URL`, `STAGING_DEPLOY_ENV_FILE`

---

## Creating the `staging` branch

From your machine (once CI files are on `main` or merged):

```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

Protect the branch in GitHub: **Settings → Branches → Add rule** for `staging` (require PR, require CI).

---

## Testing from Cursor mobile

After a push to **`staging`**:

1. Wait for GitHub Actions **Staging deploy (Plesk)** to finish (green).
2. Open **`https://staging.wesharp.co.uk`** on your phone.
3. Spot-check:
   - `/service-areas/manchester`
   - `/service-areas/liverpool`
   - scroll for floating knives
   - `/book` (postcode checker)

---

## Rollback

On the server:

```bash
cd "$WESHARP_APP_ROOT"
git log --oneline -5
git checkout staging
git reset --hard <previous-sha>
bash scripts/deploy/plesk-staging.sh
```

If migrations broke the DB, restore from pre-deploy backup (see **`production-deployment-readiness.md`**).

---

## Related docs

- `docs/operations/gitlab-environments-and-deployment.md` — env tiers & variable reference  
- `docs/operations/deployment.md` — build commands  
- `docs/operations/production-deployment-readiness.md` — smoke tests & launch gate  
- `scripts/deploy/plesk-staging.env.example` — server-side deploy config template  
