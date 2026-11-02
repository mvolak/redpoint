# Deployment guide — booking.redpoint-clinic.cz

> Nothing here has been deployed. `booking.redpoint-clinic.cz` is a **proposed** hostname; DNS, hosting and the database do not exist yet. Deploy **staging first** with synthetic data and test recipients.

## Topology

```
redpoint-clinic.cz (WordPress/Divi, unchanged host)  ──link──▶  booking.redpoint-clinic.cz (Next.js)
                                                                 ├─ PostgreSQL (EU region, e.g. Supabase)
                                                                 ├─ Supabase Auth (staff only, MFA)
                                                                 ├─ SMTP / transactional email provider
                                                                 └─ outbox worker (cron or long-running)
```

No shared cookies, database, or SSO with WordPress. No CORS configuration is needed.

## 1. Prerequisites

- Authorised access: WordPress admin, DNS for `redpoint-clinic.cz`, hosting account, database, email sending domain.
- Clinic decisions from `docs/DECISIONS.md` → "Open items".

## 2. Database

1. Create a PostgreSQL 15+ instance in an EU region (Supabase: project in `eu-central-1`/Frankfurt or similar).
2. Use a **direct** or **session-mode** connection for migrations. For the app on serverless hosting use the transaction pooler and set `DATABASE_PREPARE=false`.
3. `btree_gist` must be available (it is on Supabase and standard Postgres).
4. Run migrations from a trusted machine/CI: `DATABASE_URL=… APP_ENV=staging npm run db:migrate`.
5. The migration enables RLS on all tables and revokes `anon`/`authenticated` grants, so the Supabase Data API cannot read booking tables. Keep the Data API disabled for this schema if possible. The app connects with a server-only role.
6. **Do not run `npm run db:seed` outside development** (it refuses to). Enter real services, therapists, hours and staff via the admin UI after the clinic confirms them.

## 3. Staff authentication (Supabase Auth)

1. Enable email+password, disable public sign-ups; invite staff users from the Supabase dashboard.
2. Enable TOTP MFA. Set `STAFF_REQUIRE_MFA=true` (mandatory in production; the app refuses to start otherwise).
3. Site URL / redirect URLs: `https://booking.redpoint-clinic.cz` (staging: its own URL).
4. For each staff user, create a `staff_profile` (admin UI → Personál) with `auth_subject` = Supabase user id and the right role (`therapist` linked to a therapist, `reception`, `admin`). Bootstrap the first admin with SQL:
   ```sql
   INSERT INTO staff_profile (email, display_name, role, auth_subject) VALUES ('owner@…', 'Jméno', 'admin', '<supabase-user-uuid>');
   ```

## 4. Hosting (any Node 22 host; Vercel shown)

- Framework: Next.js; build `npm run build`; start `npm start`.
- Environment variables: see `.env.example`. Set `APP_ENV=staging|production`, `APP_URL`, `DATABASE_URL`, `APP_SECRET` (32+ random bytes), `AUTH_PROVIDER=supabase`, Supabase URL/anon key, `EMAIL_PROVIDER=smtp` + SMTP credentials, `EMAIL_FROM`, `CRON_SECRET`, `ROBOTS_NOINDEX=true` on staging. On staging also set `EMAIL_REDIRECT_ALL_TO=<test inbox>`.
- Worker: schedule `GET /api/cron/outbox` every 1–5 minutes with header `Authorization: Bearer $CRON_SECRET` (e.g. `vercel.json` crons, or an external scheduler). On a VM/container host, run `npm run worker` as a separate long-lived process instead. Both are safe concurrently.
- Protect staging from unintended public use (hosting password protection / IP allow-list) in addition to `noindex`.

## 5. Domain & HTTPS

1. In the host, add domain `booking.redpoint-clinic.cz`; it will show the exact record (usually `CNAME booking → <host target>`).
2. In DNS add **only that record**. Do not modify apex/`www`, `MX`, SPF/DKIM/DMARC records of the main site.
3. Verify the certificate is issued and auto-renews; check `https://booking.redpoint-clinic.cz/` loads.

## 6. Email sender

1. Choose the sender (e.g. `rezervace@redpoint-clinic.cz`) with the clinic.
2. Add the provider's DKIM records; **merge** the provider into the existing SPF record (`v=spf1 … include:<provider> ~all`) — never replace it; keep a single SPF record. Check DMARC alignment.
3. Send test messages to Gmail/Seznam/Outlook; check spam placement and Czech diacritics.

## 7. Go-live checklist

- [ ] Clinic-approved services, prices, durations, buffers, therapists, hours, policy text entered (no invented values).
- [ ] Existing appointments imported/reconciled (spec §14); reception sign-off recorded.
- [ ] Public mode stays **`request_only`** until sign-off; switch to `automatic` in Nastavení afterwards.
- [ ] MFA enforced for all staff; dev auth impossible (`AUTH_PROVIDER=supabase`).
- [ ] Cron/worker running; a test confirmation delivered; failed-delivery retry verified.
- [ ] Synthetic booking, reception visibility, confirmation, cancellation, conflict and request-only submission verified on staging.
- [ ] Backup + restore drill done (`docs/BACKUP_RESTORE.md`).
- [ ] WordPress CTAs switched (`docs/WORDPRESS_INTEGRATION.md`).

## Rollback

If the app fails, point WordPress CTAs to the reception contact/request fallback (do not restore Memberzone). Keep the database online so reception can still see confirmed appointments (admin UI or SQL export).
