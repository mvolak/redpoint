# Decision log

Status: **D** = decided for v1 development · **C** = must be confirmed by the clinic before production (spec §16).

| # | Date | Decision | Status |
|---|---|---|---|
| 1 | 2026-11-01 | **Owned scheduling backend instead of an API-based booking provider.** See below. | D (revisit if clinic prefers SaaS) |
| 2 | 2026-11-01 | Stack: Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind 4, PostgreSQL 17, Drizzle ORM + postgres.js, Zod 4, Luxon. TypeScript 7 deliberately not used yet (tooling compatibility). | D |
| 3 | 2026-11-01 | Explicit SQL migrations (`migrations/*.sql`) are authoritative; `src/db/schema.ts` mirrors them for typed queries. Custom runner (`scripts/migrate.ts`) with advisory lock. | D |
| 4 | 2026-11-01 | Double-booking prevention: `occupancy` table with `EXCLUDE USING gist (resource_id WITH =, during WITH &&)` on half-open `tstzrange`. Appointments (buffered) and manual blocks share it. Writers lock `resource` rows in id order (`SELECT … ORDER BY id FOR UPDATE`) then re-read rules. | D |
| 5 | 2026-11-01 | Buffers: the appointment itself must fit inside working hours; pre/post buffers must not overlap other occupancy but may extend past the window edge. | C — confirm with clinic |
| 6 | 2026-11-01 | Rooms/equipment (e.g. Redcord) modelled as `resource` rows and linked per service (`service_required_resource`). Synthetic seed has one "Redcord room" to exercise it. Whether real rooms are scarce is unknown. | C |
| 7 | 2026-11-01 | "First available": resolves to a concrete therapist atomically inside the booking transaction (candidates in `sort_order`). The review screen says the therapist is assigned at confirmation and the confirmation shows the name. If the clinic reads §5.2 as "must show the specific therapist before submit", switch the UI to submit an explicit therapist. | C |
| 8 | 2026-11-01 | Cancellation cutoff = elapsed hours before start (`booking_policy.cancellation_cutoff_hours`, synthetic 24 h). Working-day semantics not implemented. Patient changes/cancellations after cutoff are refused online and routed to reception. Reception can always change. | C |
| 9 | 2026-11-01 | Public mode feature flag in `clinic_settings.public_mode` (`automatic` / `request_only` / `paused`). **Migration default is `request_only`**; the dev seed sets `automatic` so the full flow can be exercised. Services may also be request-only (`booking_mode`, `requires_review`). | D |
| 10 | 2026-11-01 | Email OTP: 6 digits, 10 min, 5 attempts, HMAC-hashed at rest. Rate limits (Postgres fixed-window): 3 codes/15 min per address, 10/15 min per IP, 30 verify attempts/15 min per IP. Booking session 30 min, max 3 bookings/requests per session. | D |
| 11 | 2026-11-01 | Management link token is placed in the URL **fragment** (`/manage#t=…`): never sent in GET requests, absent from access logs and Referer. Page POSTs it, receives an *unverified* session cookie, removes it from the URL; email OTP required before details or changes. Tokens: 256-bit, HMAC-hashed, expire 24 h after appointment end; a new credential is issued per outgoing email and revoked if that send fails. | D |
| 12 | 2026-11-01 | Notifications: transactional outbox (`notification_outbox`, dedupe key = event/appointment/version/channel). Worker claims with `FOR UPDATE SKIP LOCKED`, exponential backoff 1 min → 6 h, 8 attempts then `failed` (manual retry in admin). Stale confirmations/reminders (version changed or not confirmed) are `skipped`. Reminders 24 h ahead, one per version. Delivered via `npm run worker` (long-running) or `GET /api/cron/outbox` (HTTP cron). OTP emails are sent synchronously (awaited) because they are needed immediately. | D |
| 13 | 2026-11-01 | Staff auth provider interface: `supabase` (Supabase Auth, TOTP MFA, AAL2 enforced when `STAFF_REQUIRE_MFA=true`, mandatory in production) and `dev` (local password from env, refused outside development). Staff ↔ auth mapping via `staff_profile.auth_subject`. **The Supabase path compiles but has not been exercised against a real Supabase project.** | D / verify on staging |
| 14 | 2026-11-01 | Reception may book off the public slot grid and inside the public lead time, but never in the past, outside working hours, or overlapping. Working hours changes are admin-only (spec §4 "opening hours"); exceptions and blocks are reception. | D |
| 15 | 2026-11-01 | Schedule changes (hours, exceptions) are applied inside the transaction and then all future confirmed appointments of affected therapists are re-validated; any violation aborts the change with a list of affected references. Whole-clinic exceptions may only be closures. | D |
| 16 | 2026-11-01 | Reschedule keeps the booking-time snapshot (duration, buffers, price, policy version). Staff may reassign to another eligible therapist. | D |
| 17 | 2026-11-01 | Analytics: only a local `rp-analytics` browser event with aggregate names is emitted; no third-party script is loaded. Wire to a privacy-safe collector only after approval. | D |
| 18 | 2026-11-01 | Patient contact rows are stored per booking/request (no cross-linking or patient accounts in v1). | D |

## 1. Owned backend vs. API-based booking provider

| | Owned (chosen) | Provider (e.g. a hosted scheduling SaaS with API) |
|---|---|---|
| Appointment truth | Our Postgres | Provider; we must not keep a competing slot ledger |
| Czech-first UX, request-only mode, reception workflows | Fully under our control | Limited to provider features; request-only usually missing or bolted on |
| Integrity guarantees | DB exclusion constraints + tests we own | Provider's; harder to test conflicts |
| Data residency / GDPR | EU-region Postgres of our choice | Depends on vendor DPA/region |
| Reuse in later Clinic–Academy–Shop platform | Domain services reusable directly | Integration layer only |
| Cost / effort | Higher build + operating effort (this codebase) | Subscription; faster start |
| Risk | We operate it (backups, monitoring) | Vendor lock-in; previous provider (Memberzone) already failed the clinic |

Rationale: the clinic needs request-only operation during cutover, reception-centric workflows, Czech templates, and future reuse in its own platform; the previous hosted provider became unavailable. If the clinic prefers a provider, keep `src/domain` interfaces but replace `booking.ts`/`schedule.ts` internals with provider calls and drop the local `occupancy` ledger.

## Open items for the clinic (spec §16)

Active locations · service/therapist matrix · real durations and buffers · prices · new-patient restrictions · capacity status · shared room/equipment constraints · lead time/horizon · cancellation policy wording and semantics · existing appointment source (Memberzone export?) · staff permissions · notification sender domain · retention periods · hosting/DB provider and region · backup responsibility.
