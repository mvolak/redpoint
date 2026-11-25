# Email (SMTP)

> Czech version: `EMAIL_CZ.md`.

How the project sends email, where it stands now (a simulated / sandbox SMTP), and the plan for switching to real delivery. Feature area 15 in `FEATURE_AREAS.md`.

Last updated: 24 Nov 2026.

## Current status in short

- **Only the booking system sends email.** The site's enquiry form doesn't: it uses the test adapter and sends nothing (see `PRODUCTION_BACKLOG.md`).
- **Local development:** emails are stored in the database and shown in the test inbox at `/rezervace/dev/mailbox/`. Nothing leaves the machine.
- **Staging (Vercel):** emails go over real SMTP to the **Mailtrap sandbox**. The sandbox accepts messages but never delivers them to real recipients. On top of that, `EMAIL_REDIRECT_ALL_TO` readdresses every message to one test inbox.
- **Production:** no real provider chosen yet. Production isn't deployed.

## What the system sends

| Message | Subject | When | How it is sent |
|---|---|---|---|
| Verification code (OTP) | Ověřovací kód – Redpoint Clinic | A patient books, or opens "manage booking" | Directly, during the request. No queue. |
| Booking confirmation | Potvrzení rezervace – Redpoint Clinic | Booking created (automatic services) | Outbox queue, with a `.ics` calendar attachment |
| Time change | Změna termínu – Redpoint Clinic | Booking rescheduled | Outbox queue, with `.ics` |
| Cancellation | Zrušení rezervace – Redpoint Clinic | Booking cancelled | Outbox queue, with `.ics` (cancel) |
| Reminder | Připomínka termínu – Redpoint Clinic | About 24 h before the appointment | Outbox queue |
| Request received | Přijali jsme vaši žádost o termín – Redpoint Clinic | Patient submits a request-only service | Outbox queue |
| Request declined | Vaše žádost o termín – Redpoint Clinic | Reception declines a request | Outbox queue |

Templates live in `packages/booking/src/notifications/templates.ts`: Czech, plain text plus simple HTML, branded "Redpoint Clinic". Confirmations and changes include the link for managing the booking.

### The outbox queue

Everything except the OTP goes through the `notification_outbox` table (`packages/booking/src/notifications/outbox.ts`):

- A booking is saved first, and the email is queued in the same transaction. **An email failure never cancels or blocks a booking.**
- A worker tick sends due messages, retries failures with backoff (1 min, doubling, at most 6 h, up to 8 attempts), then marks them `failed`.
- Outdated messages are skipped. For example, a reminder for a booking that was moved since.
- Duplicates are prevented by a dedupe key per event and booking version.

**Who runs the worker:**
- Locally: `pnpm worker` (a long-running loop, every 30 s) or `pnpm worker -- --once`.
- On Vercel: the endpoint `/api/rezervace/cron/outbox/`, called by an external scheduler every minute with `Authorization: Bearer <CRON_SECRET>`. Vercel's own cron on the Hobby plan can't run that often, so an external service such as cron-job.org is needed. **Not set up yet on staging:** queued confirmations and reminders aren't sent there yet. The OTP still works, because it doesn't use the queue.

## Providers and modes

Chosen with `EMAIL_PROVIDER` (`packages/booking/src/notifications/provider.ts`):

| Value | What it does | Used for |
|---|---|---|
| `capture` | Stores messages in the `captured_email` table and shows them at `/rezervace/dev/mailbox/` | Local development (default) |
| `smtp` | Sends over SMTP via nodemailer, using the `SMTP_*` settings | Staging and production |
| `failing` | Every send fails | Tests and outage drills |

**`EMAIL_REDIRECT_ALL_TO`**, when set, wraps any provider. Every message goes to that single address, and the subject gets the prefix `[TEST → original@address]`. It's the safety net for staging, so no real patient is ever emailed from a test environment.

## Safety guards in code

`packages/booking/src/lib/env.ts` refuses to start when:

- `APP_ENV` is `staging` or `production` and `EMAIL_PROVIDER` isn't `smtp`.
- `APP_ENV` is `development` or `test` outside localhost, or on Vercel. The test inbox shows OTP codes, so it must never be public (PR #2).

## Configuration per environment

| Variable | Local | Staging (now) | Production (target) |
|---|---|---|---|
| `APP_ENV` | `development` | `staging` | `production` |
| `EMAIL_PROVIDER` | `capture` | `smtp` | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | not used | `sandbox.smtp.mailtrap.io` / `2525` | Real provider's host and port (usually 587 STARTTLS or 465 TLS) |
| `SMTP_SECURE` | not used | `false` | `true` for port 465, `false` for 587 |
| `SMTP_USER` / `SMTP_PASSWORD` | not used | Mailtrap sandbox credentials | Real provider credentials, kept in Vercel only |
| `EMAIL_FROM` | default `rezervace@example.invalid` | check the value set in Vercel | Real sender on a verified domain |
| `EMAIL_REDIRECT_ALL_TO` | empty | test inbox address | **empty** |
| `CRON_SECRET` | in `.env.local` | set | set (new value) |

Secrets live only in `apps/redcord-web/.env.local` (gitignored) and in Vercel environment variables. Never commit them.

### Optional: staging-like SMTP on your machine

`packages/booking/docker-compose.yml` has an optional **Mailpit** container (profile `mail`): a local fake SMTP server with a web inbox. Start it with `docker compose --profile mail up -d` in `packages/booking`, and set `EMAIL_PROVIDER=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=54341`. Messages then appear at `http://localhost:54342`. This tests the real SMTP path without any external service.

## Path to real email

### Stage 1: finish staging on the sandbox (now)

1. Set up the external cron for `/api/rezervace/cron/outbox/` so that queued emails are sent.
2. Run a full test booking and read the code in Mailtrap. Check the confirmation arrives, then the reschedule, cancellation and reminder messages.
3. Check how the messages render: Czech characters, links, the `.ics` attachment in a calendar app.

### Stage 2: owner decisions

4. **Sending domain and address.** For example `rezervace@redpoint-clinic.cz` or a redcord.cz address. The clinic is the sender patients know, so its domain is the natural choice. A `Reply-To` pointing to reception is worth adding.
5. **Provider.** A transactional email service with SMTP is the simplest. Selection criteria:
   - EU data processing and a data processing agreement (DPA), because messages contain patient names and appointment details (GDPR);
   - support for SPF, DKIM and DMARC on our domain;
   - delivery logs and bounce reports;
   - price for the expected volume.

   Examples to compare: Brevo, Postmark, Mailgun (EU region), Amazon SES (EU region). The clinic's existing Microsoft 365 / Google Workspace mailbox can also send over SMTP, but it has daily limits and is less suited to automated mail.
6. Who owns the provider account and the DNS for the sending domain.

### Stage 3: switch to real delivery (production)

7. Verify the sending domain with the provider: add the SPF, DKIM and DMARC DNS records it lists, and wait until they validate.
8. In the Vercel **production** environment, set the provider's `SMTP_*` values, the real `EMAIL_FROM`, `APP_ENV=production`, and leave `EMAIL_REDIRECT_ALL_TO` **empty**.
9. Keep staging on the Mailtrap sandbox, with the redirect, so tests never reach real patients.
10. Redeploy, book a test appointment to a staff address, and check delivery, spam placement (e.g. with mail-tester.com), and that the links point to the production domain (`APP_URL`).
11. Watch the provider's delivery and bounce logs during the first weeks. Failed outbox rows are visible in the admin.

### Later

- **Optional real-delivery test on staging:** point staging at the real provider with `EMAIL_REDIRECT_ALL_TO` set to a staff inbox. This tests real delivery before launch without any risk to patients.
- **Monitoring:** alert when outbox messages end up `failed`, or when the cron stops calling (feature area 35).
- **Enquiry form:** if real sending is wanted for the site's enquiry form, it can reuse the same provider (feature area 4).
- **SMS:** the provider interface is ready for an SMS channel later.

## Related

- `booking/README.md`: booking setup and owner decisions
- `booking/DEPLOYMENT.md`: deployment and environment variables
- `.env.example`: all variables with local defaults
