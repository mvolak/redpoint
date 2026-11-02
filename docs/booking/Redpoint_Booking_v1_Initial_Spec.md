# Redpoint Booking v1 — initial implementation specification

Version: 0.1 · 1 November 2026 · Status: proposed scope for coding

## 1. Objective

Create a Czech-first, mobile-friendly booking application for Redpoint Clinic. Launch it independently of the existing WordPress website, connect the site's booking buttons to it, and reuse the application and booking domain in the later Clinic–Academy–Shop platform.

First release: clinic appointments and reception administration. Academy enrolments and commerce remain separate future modules with their own rules.

No production changes, real patient imports, or live messages are part of the coding task. Deliver a working local application, migrations, synthetic seed data, tests, and deployment instructions. Use staging and test email recipients until a deliberate production cutover.

## 2. Context and assumptions

- Public site inspection identified WordPress and Divi. Booking buttons currently lead to Memberzone; the clinic reports service unavailability.
- A published WordPress booking page contains `[bookingpress_form]`. Do not assume a working plugin or usable booking database exists.
- WordPress normally uses MySQL/MariaDB. The clinic's exact database engine/version is unverified and is not required for this integration.
- Default planning scope: one clinic location in Hradec Králové; confirm active locations before configuring production.
- Booking has its own database. No access to WordPress database tables, WordPress cookies, or Memberzone is required for normal operation.
- Existing appointments must be recovered or manually reconciled before automatic public confirmation is enabled.
- If authoritative availability is unknown, launch in request-only mode: reception confirms requests manually. A request is never presented as a confirmed appointment.

## 3. Proposed implementation stack

- Next.js App Router, React, TypeScript, Tailwind; pin supported stable versions at implementation time.
- PostgreSQL, preferably a managed instance in an agreed EU region; Supabase Postgres is a suitable proposed choice.
- Drizzle ORM with explicit SQL migrations for constraints. Use postgres.js server-side; configure connection pooling/prepared statements for the selected deployment.
- Managed staff authentication; Supabase Auth is the default if Supabase is selected. No WordPress SSO in v1.
- Schema validation at every server boundary, e.g. Zod.
- Email behind a provider interface, with a local capture/test implementation.
- Durable notification outbox and scheduled worker. A request handler must not rely on an in-memory timer or unawaited background task.
- Small modular application: booking domain, persistence, notifications, UI. A single repository/app is sufficient; do not build a general multi-tenant SaaS framework.

This spec assumes an owned scheduling backend. Before implementing scheduling, record a short decision comparing it against an established API-based booking provider. If a provider is chosen, it owns appointment truth; do not maintain a competing local slot ledger. Domain interfaces may remain, but provider semantics must replace the custom transaction design below.

## 4. Roles

| Role | Access |
|---|---|
| Visitor/patient | View public catalogue/availability; submit booking or request; manage one appointment after verification |
| Therapist | View own schedule and minimum necessary appointment/contact details; record completed/no-show status |
| Reception | Manage appointments across therapists; manage working-time exceptions and requests |
| Administrator | Reception access plus staff roles, catalogue, policies, opening hours, configuration |

Enforce roles and therapist scope on the server for every operation. A hidden button is not authorisation. Require MFA for staff before production.

## 5. Patient journey

1. Choose a service; show duration, published price or clearly labelled price range, and first-visit requirements.
2. Select an eligible therapist or “first available”. Explicitly assigned therapist appears before final submission.
3. Select date/time, displayed in Europe/Prague. Availability is indicative until the server commits the booking.
4. Enter name, email, and telephone; indicate new/existing patient. No medical history, diagnosis, attachments, or unrestricted clinical text in v1.
5. Review service, therapist, location, time, price, and cancellation terms; acknowledge the relevant terms. Marketing subscription must be separate and optional, if included later.
6. Verify the email using an expiring OTP; verification establishes contact control, not a reservation. Rate-limit requests and attempts. A verified session is short-lived and may book only within its allowed scope.
7. Submit using an idempotency key. Server revalidates all rules and atomically creates the appointment and notification event.
8. Show either a confirmed reservation with reference, or a clearly labelled appointment request awaiting reception. If a slot has gone, preserve form data and offer refreshed options.

Patient accounts and online payments are out of scope. Services with clinically restricted eligibility must use reception review unless eligibility can be safely established without clinical inference.

## 6. Reception and therapist UI

- Day/week view, filters by therapist and appointment state; usable list view on small screens.
- Create appointments, view details, reschedule, cancel, mark completed/no-show.
- Resolve appointment requests by selecting a valid slot and confirming, or declining with an appropriate message.
- Working hours, leave, breaks, one-off closures, manual time blocks.
- No silent overrides of overlapping appointments. Show conflicts and require a valid alternative.
- Show notification delivery state and retry failures without recreating appointments.
- Configurable public mode: automatic booking, request-only, or temporarily paused with reception contact details.
- Audit trail for appointment changes, scheduling changes, and role changes.

## 7. Scheduling rules

- Service configuration: active state, duration, pre/post buffers, therapist eligibility, new-patient eligibility, minimum lead time, booking horizon, booking mode, and price configuration.
- Therapist/service overrides for duration or price must be explicit; resolve a final configuration before returning available slots.
- Weekly working hours are local Europe/Prague rules, with dated exceptions. Store actual appointment instants as UTC/timestamptz.
- Slot generation respects buffers, hours, leave, existing appointments, and occupied resources.
- Default is one patient per therapist at a time. Confirm whether rooms/Redcord equipment are capacity constraints; if shared scarce resources matter, include them in v1 before launch.
- Generate a bounded date range and cap query sizes. Public availability returns free slots only, never the identities or reasons behind occupied time.
- Skip nonexistent local times during daylight-saving changes; handle repeated local times unambiguously. Display offset where needed.
- First-available selection must atomically resolve and reserve a specific eligible therapist; never promise a pooled capacity that cannot be assigned.
- Cancellation deadline is configurable. Confirm whether it means elapsed hours or working-day rules; do not hardcode the existing website wording as an approved policy.
- Late cancellation is routed to reception. No automated penalty charges in v1.

## 8. Data model

All core records carry IDs and creation/update timestamps. Use UUIDs and foreign keys.

| Entity | Key fields/purpose |
|---|---|
| Location | Name, address, timezone, contact details |
| StaffProfile | Auth subject, role, optional therapist ID, active state |
| Therapist | Public name/profile, active state, location |
| Service | Name, description, default duration/buffers, price/range, booking rules |
| TherapistService | Eligibility and explicit duration/price overrides |
| WorkingHours / Exception | Recurring local windows and dated availability overrides |
| PatientContact | Name, verified email, phone; minimal scheduling data only |
| AppointmentRequest | Preferred service/therapist/time window, contact, pending/resolved/declined state |
| Appointment | Patient, service, therapist, location, start/end, state, version, source |
| Occupancy | Resource ID, buffered time range, source appointment or manual block |
| IdempotencyRecord | Key, request fingerprint, actor/session scope, committed response/reference |
| NotificationOutbox | Event, appointment version, channel, retry state, next attempt |
| ManagementCredential | Hashed random token, appointment scope, expiry, revocation state |
| AuditEvent | Actor, operation, record reference, time; avoid unnecessary personal payloads |

Snapshot appointment duration, buffers, price/range, and policy version at booking time. Catalogue edits must not silently change prior commitments. Store money in integer minor units with currency CZK.

Appointment states: confirmed → completed, no_show, or cancelled. Rescheduling changes time/resources atomically and records an audit event; it is not a terminal state. Requests are separate records and do not reserve capacity. Past occupancy remains protected for confirmed/completed/no-show appointments; cancellation releases its occupancy.

## 9. Integrity and concurrency — mandatory

- Use PostgreSQL range exclusion constraints on resource occupancy, e.g. resource equality plus overlapping `tstzrange` intervals, using half-open `[start,end)` ranges and an appropriate GiST operator class/extension.
- Put therapist time blocks and appointment occupancy in the same constraint domain. If rooms/equipment are included, reserve every required resource in the same transaction.
- Acquire resource locks in consistent order for all booking, block, hours-change, and rescheduling writes. Re-read relevant rules after obtaining locks. Reject hours/leave changes that would invalidate appointments until explicitly resolved.
- Booking: validate verified session and inputs; resolve authoritative service configuration; lock; recheck schedule; insert appointment, occupancy, idempotency result, and outbox event; commit. Send email afterward.
- Different submissions for the same interval must produce at most one conflicting resource reservation. Return a conflict response for the loser.
- Retrying the same idempotency key/payload returns the existing result, even after an uncertain network response. A changed payload with the same key is rejected. Scope keys to the actor/session and handle concurrent identical requests.
- Rescheduling is transactional: either every new resource is secured and the old time released, or the original reservation remains intact.
- Concurrent edits use a version check; return a stale-record conflict instead of overwriting changes.
- Do not introduce temporary slot holds in v1. Email verification does not hold a slot; state this clearly in the UI.

## 10. Domain operations and API contract

Keep validation and business rules in typed domain services used by route handlers and future agents. External agents must never execute raw SQL.

| Operation | Contract |
|---|---|
| listServices / listTherapists | Public active catalogue only |
| findAvailability | Service, optional therapist, bounded date range → resolved free slots |
| requestEmailVerification / verifyEmail | Rate-limited OTP → short-lived verified booking session |
| createAppointment | Verified session, service, therapist, start, terms version, idempotency key → confirmation or conflict |
| createAppointmentRequest | Verified contact and bounded preferences → pending request |
| getManagedAppointment | Appointment-scoped verified management session → minimal details |
| cancelAppointment | Valid management/staff session, expected version → cancelled or policy rejection |
| rescheduleAppointment | Valid session, expected version, chosen slot → updated appointment or conflict |
| staff administration | Role-protected catalogue, schedule, requests, and appointment operations |

Suggested route families: `/api/catalogue/*`, `/api/availability`, `/api/verification/*`, `/api/appointments/*`, `/api/requests`, `/api/admin/*`. Document exact request/response schemas before implementation. Reject client-supplied prices, duration, role, ownership, or confirmation state. Availability responses are not cached as guaranteed inventory. Mutation/private responses use no-store policies.

## 11. Notifications and appointment management

- Czech confirmation, reschedule, cancellation, and reminder templates; include essential logistics and reception contact.
- Transactional outbox retries with backoff. Never roll back a committed appointment because email failed.
- Deduplicate by event/version/channel; check current appointment state/version before reminders so cancelled/rescheduled appointments do not receive stale reminders.
- No diagnosis or sensitive visit detail in email subjects or calendar descriptions. Optional calendar file contains minimum logistics.
- A management link uses a high-entropy, scoped, expiring token stored only as a hash. Landing via GET never cancels or changes an appointment.
- Exchange the link for a secure session and remove the token from the visible URL; require email OTP before revealing personal details or allowing changes. Redact tokens from logs; use no-referrer and no third-party scripts on management pages.
- SMS is deferred; retain a notification interface for later.

## 12. Operational and privacy requirements

- Minimal contact/scheduling data only; this is not an electronic medical record.
- Credentials and privileged database keys stay server-side. Staff sessions use secure cookie settings, CSRF/origin protection where relevant, and server-side authorisation.
- If Supabase Data API is enabled, configure deny-by-default/RLS so anonymous clients cannot access private booking tables. Direct server connections must still implement role/scope checks.
- Rate-limit availability scraping, verification, request creation, and mutation attempts. Use generic verification responses where practical; do not expose patient existence.
- Staff access is separate from public guest verification. No shared WordPress cookies or broad parent-domain authentication cookies.
- Audit access/changes as appropriate; redact contact data, tokens, and request bodies from routine logs and error telemetry.
- Agree retention periods, provider arrangements, backup/restore responsibility, and authorised staff access before production. Backups must be restorable, not merely enabled.
- Analytics may record aggregate flow events: booking_started, availability_shown, verification_completed, booking_confirmed, booking_failed. No names, contact values, appointment IDs, management tokens, or medical details in marketing tools. Transactional truth comes from database records.

## 13. WordPress integration guide

### Recommended launch topology

Existing site: `https://redpoint-clinic.cz/` (WordPress).
Proposed new booking host: `https://booking.redpoint-clinic.cz/` (Next.js).

This is a proposed address; DNS and deployment have not been created. WordPress remains on its existing host. The booking app uses its own deployment, database, staff authentication, and email configuration.

### Deployment prerequisites

1. Obtain authorised WordPress admin access, DNS access, booking hosting, database, sender email/domain access, and clinic operational input.
2. Deploy staging with synthetic data; keep it noindex and protected from unintended public use. Configure secrets through the hosting environment.
3. After testing, attach the booking hostname. Add only the exact CNAME/A records required by the selected host. Preserve the apex/www records and existing mail records. Verify HTTPS and renewal.
4. Configure sender authentication using provider-supplied DNS values; merge required settings rather than blindly overwriting existing SPF/mail configuration.
5. Set production public URL, clinic timezone, authorised callback URLs, staff accounts, and real services/schedules. No production seed with invented prices or availability.

### Connect Divi buttons

1. Back up the WordPress site/database and export affected Divi layouts. Record all current booking destinations.
2. Open the homepage in the Divi Visual Builder. Locate each booking Button module, edit its link/URL setting, and replace the Memberzone destination with the verified booking URL. Keep navigation in the same tab for a continuous journey.
3. Repeat for booking buttons on therapist, method, service, and pricing pages, plus header/footer, global Divi modules, Theme Builder templates, pop-ups, and mobile variants.
4. If useful, add non-sensitive deep links such as `/?service=initial-visit` or `/?therapist=approved-slug`. Slugs are proposed identifiers; create them in the catalogue first and validate all query parameters. Do not put patient data in links.
5. Update the published `/book-appointment/` page: remove the unusable shortcode and provide a clear booking link and reception fallback, or configure a tested server-side redirect to the new app. Use a temporary redirect during rollout; do not redirect the entire site.
6. Check whether the existing capacity pop-up is still valid. Replace it with approved wording and the appropriate booking/request mode; do not automatically assume capacity is open.
7. Save changes, clear relevant WordPress/CDN caches, and check published pages while logged out, on desktop and mobile.

No WordPress plugin, database integration, REST API write, iframe, or browser cross-origin fetch is needed. Following an ordinary link is navigation and requires no CORS setup. The booking browser talks to its own origin. Do not add permissive CORS as a workaround.

Divi setting labels may differ by version; inspect the installed Divi 4 UI rather than upgrading Divi as part of this change. A generic HTML link can be used in an appropriate content module if needed:

```html
<a href="https://booking.redpoint-clinic.cz/">Rezervovat termín</a>
```

The example URL must resolve to the production app before publication. Build a matching Redpoint header/logo and a clear return-to-clinic link inside the booking app.

### Acceptance and rollback

- Crawl public links and confirm no patient-facing Memberzone destination remains unintentionally.
- Verify a synthetic booking, reception visibility, confirmation, cancellation, and conflict case. Verify a request-only submission is labelled correctly.
- Keep admin/management/confirmation pages out of search indexing; the marketing website retains its current URLs. Avoid duplicating marketing pages on the booking host.
- If the new app fails, switch WordPress CTAs to a reception contact/request fallback. Keep confirmed appointment records accessible to reception. Do not roll back by restoring a known unavailable booking provider.
- Later, the full Next.js website can continue linking to this hostname or reuse the domain services. Do not operate two independent appointment databases. Preserve issued management links during any route move.

## 14. Existing appointment cutover

1. Establish who currently holds the authoritative calendar and whether Memberzone has an export or vendor-supported recovery route.
2. Define fields, mapping, deduplication, and an audit trail. Do not scrape or invent appointment data.
3. Import into staging or reconcile manually; verify date/time interpretation and therapist assignment with reception.
4. Resolve conflicts, reconcile per-therapist daily counts, and confirm all future occupied time is represented.
5. Agree a cutover time and pause old booking writes where possible; handle changes arriving during the transition explicitly.
6. Enable automatic confirmation only after reception signs off. Until then use request-only mode.

## 15. Tests and definition of done

Use a real disposable PostgreSQL instance for concurrency, constraints, and transaction tests; mocked persistence is insufficient for these checks.

- Two verified patients request overlapping time: one succeeds; the other receives a conflict.
- Duplicate network retries create one appointment and one logical notification event.
- Buffers and manual blocks prevent conflicts; adjacent non-overlapping intervals remain bookable.
- Failed rescheduling retains the original appointment. Stale edits are rejected.
- Hours/leave updates cannot race a booking into an invalid schedule.
- Prague daylight-saving transitions, minimum lead time, horizon, and cancellation cutoff work correctly.
- Cancelled/rescheduled appointments receive no obsolete reminders; email outage does not lose reservations.
- Anonymous users cannot list patients; therapists cannot read another therapist's private schedule details; reception/admin boundaries hold.
- Expired/revoked tokens and failed OTPs cannot expose or change appointments. Link scanners cannot trigger changes.
- Mobile and keyboard journeys cover booking, request-only, conflict, cancellation, and error recovery; use accessible labels and understandable Czech messages.
- WordPress integration works logged out with all booking destinations verified.
- Deployment guide, environment variable template without secrets, migrations, synthetic fixtures, and backup/restore runbook are included.

## 16. Decisions to confirm with the clinic

Before production: active locations; service/therapist matrix; actual durations and buffers; prices; new-patient restrictions; capacity status; shared room/equipment constraints; lead time/horizon; cancellation policy; existing appointment source; staff permissions; notification sender; retention/hosting arrangements.

For development use clearly labelled synthetic values. Maintain a decision log and feature flags for request-only versus automatic confirmation. Do not block local implementation on every unknown, but do not silently turn assumptions into production policy.

## 17. Coding bot starting instruction

Implement the spec in vertical slices: (1) project, migrations, staff auth, synthetic catalogue; (2) availability and transaction-safe booking domain with integrity tests; (3) patient verification/booking UI and reception administration; (4) outbox worker, reminders, management flow; (5) staging deployment documentation and WordPress integration checklist. Keep domain logic independent of UI so future AI tools can call the same validated operations. Deliver the first slice with a runnable README, then continue through the remaining slices. Do not build the full marketing website, Academy, Shop, payments, AI chat, or a generic SaaS platform in this milestone.

## Sources and evidence limits

- WordPress database requirements: https://wordpress.org/about/requirements/
- Divi button documentation (current page describes Divi 5; installed site publicly advertised Divi 4, so labels require verification): https://help.elegantthemes.com/en/articles/10259665-the-button-module-divi-5
- PostgreSQL range constraints: https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT
- Existing published booking page: https://redpoint-clinic.cz/book-appointment/

Public inspection cannot establish the clinic's installed server/database versions, private plugin settings, appointment records, or actual capacity. This is a proposed implementation contract, not an audit of the private operational systems.
