# WeSharp Sprint 22 — Deployment Hardening, Migration Cleanup and Pilot Readiness

## Context

Sprint 22 prepares the platform for a controlled real-world pilot.

This is not a big feature sprint. It is about stability, deployment confidence, backups, monitoring and support readiness.

## Sprint principles

- Do not add large new features.
- Fix pilot blockers.
- Make operations observable.
- Make rollback possible.
- Protect customer data.
- Document known limitations.
- Prefer small, safe improvements over big rewrites.

---

## 22.1 — Migration, Seeder and Demo Data Cleanup

### Goal

Ensure migrations, seeders and demo data are safe and reliable.

### Check

- migrations run cleanly
- no duplicate index/key issues
- seeders do not fail in production accidentally
- demo seeders are clearly dev-only
- no fake data needed for production
- no destructive commands in production docs

### Acceptance criteria

- Fresh/staged DB migration path works.
- Production migrate path is safe.
- Seeders are documented and optional.
- Known migration issues are fixed or documented.

---

## 22.2 — Environment and Deployment Hardening

### Goal

Make deploys repeatable and safe.

### Check/docs

- required env variables
- frontend/backend env separation
- Clerk dev/prod separation
- Stripe dev/prod separation
- API origins/CORS
- Plesk backend deploy commands
- Vercel frontend deploy notes
- queue/scheduler notes if used
- storage/log permissions
- /api/health JSON check

### Acceptance criteria

- Deployment docs are usable.
- Env requirements are clear.
- CORS/API origin checks are documented.
- No secrets are committed.

---

## 22.3 — Monitoring, Logs and Alerts

### Goal

Make pilot issues visible early.

### Monitor

- failed jobs
- failed emails
- failed webhooks
- 500 errors
- permission errors
- payment/invoice issues
- storage/photo upload failures
- queue/scheduler issues
- suspicious auth/access issues

### Acceptance criteria

- Pilot issues can be spotted quickly.
- Developer-only details remain developer-only.
- Business admins see operational alerts only where useful.
- Docs explain where logs live.

---

## 22.4 — Backup and Rollback Confidence

### Goal

Ensure backups and rollback are understood before pilot.

### Document/verify

- database backups
- file/upload backups
- restore process
- pre-deploy backup
- rollback process
- Plesk/server-specific steps
- frontend rollback if applicable
- environment backup
- storage permissions

### Acceptance criteria

- Backup process is documented.
- Restore process is documented.
- Rollback process is documented.
- Pre-pilot backup step exists.
- No destructive production command is recommended casually.

---

## 22.5 — Pilot Launch Checklist and Staff Help

### Goal

Prepare for controlled pilot with real staff/customers.

### Create/check

- pilot launch checklist
- test customer list
- internal staff checklist
- supported workflows
- known limitations
- support contact/process
- rollback plan
- go/no-go checklist
- staff help docs for core workflows

### Help topics

- create booking
- use POS
- assign route
- add knives
- capture/upload photos
- issue invoice
- handle damage report
- invite customer
- check work queue
- resolve common issues

### Acceptance criteria

- Pilot checklist exists.
- Staff help exists.
- Known limitations are documented.
- Go/no-go criteria are clear.

---

## 22.6 — Pilot Readiness QA

### Goal

Final pilot readiness check.

### Check

- migration/deploy safety
- env config
- backups
- rollback
- monitoring/logs
- staff help
- support intake
- customer booking
- admin operations
- POS
- route workflow
- photo upload
- invoice/payment
- subscriptions if piloted
- emails
- permissions
- mobile usability

### Required output

At the end, provide:
- QA checks completed
- pilot blockers found
- pilot blockers fixed
- files changed
- deferred issues
- final verdict: READY FOR PILOT / NOT READY
