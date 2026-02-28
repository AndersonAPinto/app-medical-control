-- Run in Neon SQL editor or psql after deploying migrations.

-- 1) Confirm required tables exist.
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'medications',
    'dose_schedules',
    'connections',
    'notifications',
    'push_tokens',
    'session'
  )
ORDER BY tablename;

-- 2) Row counts by domain.
SELECT 'users' AS table_name, COUNT(*)::bigint AS total FROM users
UNION ALL
SELECT 'medications', COUNT(*)::bigint FROM medications
UNION ALL
SELECT 'dose_schedules', COUNT(*)::bigint FROM dose_schedules
UNION ALL
SELECT 'connections', COUNT(*)::bigint FROM connections
UNION ALL
SELECT 'notifications', COUNT(*)::bigint FROM notifications
UNION ALL
SELECT 'push_tokens', COUNT(*)::bigint FROM push_tokens
UNION ALL
SELECT 'session', COUNT(*)::bigint FROM session;

-- 3) Quick integrity checks.
SELECT COUNT(*)::bigint AS users_without_email
FROM users
WHERE email IS NULL OR email = '';

SELECT COUNT(*)::bigint AS medications_without_owner
FROM medications
WHERE owner_id IS NULL OR owner_id = '';
