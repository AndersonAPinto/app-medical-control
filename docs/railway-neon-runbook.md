# Railway + Neon Runbook

This runbook migrates the API from Replit to Railway while keeping PostgreSQL on Neon.

## 1) Environments

Create two Railway environments:

- `staging`
- `production`

Set these variables in both environments:

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=<neon_connection_string>`
- `SESSION_SECRET=<long_random_secret>`
- `APP_ALLOWED_ORIGINS=<comma_separated_https_origins>`

Set app variables in EAS or local env:

- `EXPO_PUBLIC_API_URL=https://<your-railway-domain>`

Reference template: `env.example`.

## 2) Deploy API

1. Connect this repository to Railway.
2. Ensure `railway.json` is detected.
3. Railway deploy command uses:
   - `npm run server:start`
4. Verify health check:
   - `GET /api/health` returns `{ "status": "ok" }`.

## 3) Schema / migrations

Run schema sync from CI/CD or local machine with production variables:

```bash
npm ci
npm run db:push
```

Validate tables:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected app tables:

- `users`
- `medications`
- `dose_schedules`
- `connections`
- `notifications`
- `push_tokens`
- `session` (created by `connect-pg-simple`)

## 4) Security hardening checks

- `SESSION_SECRET` is set and not default.
- Cookies are secure in production (`secure=true`, `sameSite=none`, `httpOnly=true`).
- CORS only allows origins listed in `APP_ALLOWED_ORIGINS`.
- Logs do not include sensitive fields (password/token).

## 5) Functional validation checklist

Run these end-to-end tests against staging before production:

1. Register and login.
2. Update profile and role.
3. Create/edit/delete medications.
4. Confirm doses and verify schedule history.
5. Create and accept connections.
6. Trigger stock low/empty notifications.
7. Register push token.
8. Logout and confirm session invalidation.

## 6) Go-live and rollback

Go-live:

1. Update app config/env to production API URL.
2. Publish app build.
3. Monitor Railway logs and Neon metrics for 24-48h.

Rollback:

1. Repoint `EXPO_PUBLIC_API_URL` to the previous API endpoint.
2. Re-deploy previous backend release on Railway.
3. Keep DB untouched; application is backward compatible at schema level.
