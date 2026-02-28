# Data Governance Guide

This document defines what is stored on the server versus locally on device.

## Server-side persistence (PostgreSQL / Neon)

The backend is the source of truth for customer data:

- `users`
- `medications`
- `dose_schedules`
- `connections`
- `notifications`
- `push_tokens`
- `session` (managed by `connect-pg-simple`)

## Device-side persistence (React Native)

Only non-sensitive UX preferences should be stored on device:

- onboarding completion flag
- theme preference

Do not store passwords, session ids, medication history snapshots, or full profile payloads in local device storage.

## Security controls

- Authentication: server-side session with `httpOnly` cookie.
- Passwords: bcrypt hash in database.
- Transport: HTTPS in production.
- Origin policy: allow-listed web origins via `APP_ALLOWED_ORIGINS`.

## Operational controls

- Keep `DATABASE_URL` and `SESSION_SECRET` in platform secrets (Railway variables).
- Use staging and production databases separately.
- Validate schema before releases using Drizzle commands.
