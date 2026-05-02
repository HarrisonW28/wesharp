# WeSharp Sprint Roadmap

Current status: Completed up to Sprint 10.2.

Use this roadmap one sprint at a time. The roadmap is context; the Cursor chat prompt is the command.

## Rules for Cursor

- Do not rewrite the whole app.
- Implement one sprint at a time.
- Do not implement later sprints unless explicitly asked.
- Laravel is the source of truth for roles, permissions, pricing, charges, invoices, subscriptions and workflow state.
- Clerk handles authentication only.
- Keep controllers thin.
- Use Actions, Services, Requests, Resources and Events/Notifications where appropriate.
- Do not expose raw UUIDs in customer/admin UI unless unavoidable.
- Use readable references and lookup fields.
- Use GBP formatting everywhere, e.g. £12.50.
- Store money safely, preferably in minor units.
- Customer-facing copy should be warm, clear and simple.
- Admin-facing UI should be operational and efficient.
- Update docs when workflows, env vars, deployment, auth, webhooks or architecture change.
- End every sprint with files changed, QA checklist and known limitations.

## Files

- sprint-10.md — notification, pricing and subscription revenue sprints
- sprint-11.md — trust polish, admin polish, route/photo, reporting, webhooks and deployment workflow
- sprint-12.md — audit, bug fixing, QA, production cleanup and launch readiness
