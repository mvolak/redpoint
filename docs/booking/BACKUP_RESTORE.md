# Backup & restore runbook

Backups must be **restorable**, not merely enabled (spec §12). Responsibility, retention and provider arrangements must be agreed with the clinic before production.

## What to back up

- The booking PostgreSQL database (all tables). It contains personal contact data → backups are personal data: encrypted at rest, access restricted, retention agreed.
- Configuration (env vars) lives in the hosting secret store — keep a sealed copy of the non-derivable secrets (`APP_SECRET`, `CRON_SECRET`, SMTP credentials). Losing `APP_SECRET` invalidates outstanding management links and OTPs only (no data loss).

## Automated backups

- Managed Postgres (e.g. Supabase): enable daily backups; enable Point-in-Time Recovery for production if the plan allows.
- Additionally, a weekly logical dump to separate storage (different account/region within the EU):
  ```bash
  pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL_DIRECT" > booking-$(date +%F).dump
  ```

## Restore drill (do before go-live, then quarterly)

1. Create an empty disposable database (never restore over production during a drill).
2. Restore:
   ```bash
   pg_restore --no-owner --no-privileges --dbname "$DRILL_DATABASE_URL" booking-YYYY-MM-DD.dump
   ```
3. Verify:
   ```sql
   SELECT count(*) FROM appointment;
   SELECT count(*) FROM appointment WHERE state = 'confirmed' AND starts_at > now();
   SELECT name FROM schema_migrations ORDER BY name;          -- latest migration present
   SELECT conname FROM pg_constraint WHERE conname = 'occupancy_no_overlap';  -- exclusion constraint present
   ```
4. Point a local app at it (`DATABASE_URL=$DRILL_DATABASE_URL APP_ENV=development EMAIL_PROVIDER=capture`) and open the admin calendar to check upcoming appointments render. **Do not run the worker against a restored copy with real email** (it would re-send pending messages).
5. Record date, dump used, counts and operator in the ops log; delete the drill database.

## Real incident restore

1. Pause public booking: Admin → Nastavení → *Pozastaveno* (or switch WordPress CTAs to the reception fallback if the app is down).
2. Restore to a new database (PITR to just before the incident if available); verify as above.
3. Repoint `DATABASE_URL`, redeploy. Reconcile appointments created between the restore point and the incident with reception (outbox/email history, captured confirmations).
4. Resume public mode.
