# Redpoint Clinic booking — embedded in the Redcord site

The standalone **Redpoint Booking v1** app (`C:\repo\booking`, commit `9fde9a9`) was moved into this monorepo on 2 November 2026 and is now served by `apps/redcord-web` under `/rezervace/`. The other documents in this folder come from that repo. They still describe it as a standalone app on `booking.redpoint-clinic.cz` with paths like `/manage` and `/api/...`. The **path table below takes precedence** over them.

> All seed data is **synthetic** (services, therapists, prices, hours, staff). Nothing is deployed and no e-mail is sent: the `capture` provider stores mail in the database.

## Quick start

Requires Docker. The booking scripts read `apps/redcord-web/.env.local`; copy `.env.example` there and set `APP_SECRET` and `CRON_SECRET`.

```bash
pnpm db:up          # Postgres 17 on localhost:54340 (+ booking_test DB)
pnpm db:migrate
pnpm db:seed        # synthetic catalogue, therapists, hours, staff
pnpm dev            # http://localhost:3000/rezervace/
pnpm worker         # second terminal: delivers queued e-mails/reminders (to the capture mailbox)
```

- Patient booking: `/rezervace/` (deep link: `/rezervace/?service=vstupni-vysetreni&therapist=<slug>`)
- Captured e-mails (OTP codes, confirmations, management links): `/rezervace/dev/mailbox/`
- Reception/admin: `/rezervace/admin/`. Dev logins `admin@`, `recepce@`, `jana@`, `petr@example.invalid`; password from `DEV_STAFF_PASSWORD` (`redpoint-dev`).
- Fresh data: `pnpm db:reset`
- `pnpm db:up` creates a container named `redpoint_booking_db`. If the old standalone repo's container already runs, it's the same database on the same port: reuse it.

Without `DATABASE_URL` and `APP_SECRET` the site still builds and runs. `/rezervace/` and the admin show a "not connected" notice, and the API answers 503.

## Tests

| Command | What |
|---|---|
| `pnpm test:booking` | 62 integration tests against a real disposable PostgreSQL (`booking_test`, recreated each run): double-booking races, DST, idempotency, OTP/token security, authorisation. Needs `pnpm db:up`. |
| `node scripts/booking-e2e.mjs [baseUrl]` | Browser journey: book as a new patient → OTP from the dev mailbox → confirmation → management link → reception login. Needs a running server, the worker and the dev DB. **Writes one synthetic appointment** (`e2e+…@example.invalid`). |

## Paths (old standalone → embedded)

| Standalone | Embedded |
|---|---|
| `/` | `/rezervace/` |
| `/manage#t=…` (e-mailed link) | `/rezervace/sprava/#t=…` |
| `/admin/…` | `/rezervace/admin/…` |
| `/dev/mailbox` | `/rezervace/dev/mailbox/` |
| `/api/…` | `/api/rezervace/…/` (trailing slash; the client adds it) |
| `/api/cron/outbox` | `/api/rezervace/cron/outbox/` |

## Structure

```
packages/booking/            @redcord/booking
  src/domain|db|notifications|auth|lib   unchanged business logic (imports made relative)
  src/components/            patient wizard, manage view, reception UI (Header removed: site chrome is used)
  migrations/ scripts/ tests/ docker-compose.yml
apps/redcord-web/src/app/
  (site)/rezervace/          patient pages inside the Redcord header/footer
  (booking)/rezervace/       admin + dev mailbox: own layout, no public chrome, noindex
  api/rezervace/             thin route handlers → @redcord/booking
```

## What changed compared with the standalone app

- **Layout:** patient pages use the Redcord header, footer and review banner. The booking `Header` and root layout were dropped. The design tokens (`brand`, `ink`, `muted`, `line`, `surface`) map onto Redcord's tokens, so the booking UI picks up Redcord colours and Inter.
- **Headers:** the booking CSP, `X-Frame-Options: DENY`, `no-referrer` on `/rezervace/sprava/` and `noindex` for admin/dev/API are applied **only to booking paths** (`next.config.ts`).
- **Environment:** shared with the site, in one `.env.local`. Booking variables (`APP_URL`, `APP_ENV`, `DATABASE_URL`, `APP_SECRET`, …) don't collide with the site's (`SITE_ENV`, `SITE_ORIGIN`, …).
- **Dev mode is localhost-only.** `APP_ENV=development|test` turns on dev staff login and the captured-mail inbox (which shows OTP codes). `env()` refuses it unless `APP_URL` is `localhost`/`127.0.0.1`/`[::1]` and `VERCEL` is unset, so a deployment that forgets `APP_ENV` fails with an error instead of exposing the inbox. Deployments set `APP_ENV=staging` or `production`.
- **No database:** `bookingConfigured()` gates pages and API routes when the database or secret is missing.
- **Tooling:** vitest moved from 4.0.18 to 5.0.5 workspace-wide to match the booking tests. npm was replaced by pnpm.
- **Unchanged:** domain logic, the SQL schema and the tests. Only URL strings were rewritten.

## Open decisions for the owner

1. **Domain and brand.** The clinic's booking now lives on redcord.cz, while the UI and e-mails say "Redpoint Clinic". Should redpoint-clinic.cz link here, or should `booking.redpoint-clinic.cz` point at this deployment (a host-based rewrite would be needed)?
2. **Real catalogue.** Services, durations, prices, therapists, hours and terms come from the clinic, replacing the synthetic seed.
3. **Production stack.** This needs hosted Postgres, Supabase Auth with MFA for staff, SMTP, and a worker or cron. Until then it stays `APP_ENV=development` with captured e-mail only (see `DEPLOYMENT.md`; adapt hostnames).
4. **Privacy.** The patient-data processing notice and retention need clinic sign-off before any real booking.
