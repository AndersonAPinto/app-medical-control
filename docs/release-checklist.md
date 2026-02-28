# Release Checklist (Staging -> Production)

## A) Baseline

- [ ] Branch is up to date and reviewed.
- [ ] `env.example` reviewed and platform secrets configured.
- [ ] `eas.json` points staging and production builds to correct API URL.

## B) Infra

- [ ] Railway service deployed from main branch.
- [ ] Neon production database provisioned.
- [ ] Railway variables set: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`, `APP_ALLOWED_ORIGINS`.
- [ ] `GET /api/health` returns `200`.

## C) Schema and persistence

- [ ] Run `npm run db:push` against target database.
- [ ] Run `docs/sql-audit-checks.sql` and confirm expected output.
- [ ] Confirm `session` table is present and being written.

## D) Functional validation

- [ ] Register and login flow works.
- [ ] Medication CRUD works.
- [ ] Dose confirmation and history work.
- [ ] Connection request/accept works.
- [ ] Notification endpoints work.

## E) Go-live

- [ ] Build and submit production app with production API URL.
- [ ] Monitor Railway logs and Neon metrics for 24-48 hours.
- [ ] Rollback command path documented and tested.
