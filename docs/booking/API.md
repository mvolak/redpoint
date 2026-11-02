# API contract (v1)

All endpoints are same-origin JSON. Mutations (`POST/PUT/PATCH/DELETE`) require an `Origin` header equal to `APP_URL` (CSRF protection). All responses are `Cache-Control: no-store` except `GET /api/catalogue` (`public, max-age=30`). Request schemas are defined in `src/lib/api-schemas.ts` (Zod, `.strict()` — unknown fields are rejected, so clients **cannot** send price, duration, role, ownership or state).

Errors: `{"error": {"code", "message" (Czech), "details"}}`

| code | HTTP | meaning |
|---|---|---|
| `validation` | 400 | bad input (`details.issues[]`) or invalid OTP |
| `unauthenticated` | 401 | no/expired session |
| `forbidden` | 403 | role/scope or Origin check |
| `not_found` | 404 | |
| `slot_unavailable` | 409 | slot taken or no longer valid — refresh availability |
| `stale_version` | 409 | optimistic concurrency failure — reload |
| `schedule_conflict` | 409 | change would invalidate appointments (`details.appointments[]`) |
| `idempotency_mismatch` | 422 | same key, different payload |
| `policy` | 422 | `details.reason`: `request_only`, `terms_changed`, `late_change`, `existing_only`, `new_only`, `session_quota`, `not_confirmed` |
| `rate_limited` | 429 | |
| `booking_paused` | 503 | public mode paused |

## Public

| Method & path | Body / query | Response |
|---|---|---|
| `GET /api/catalogue` | – | `{services[], therapists[], mode, pausedMessage, reception, terms:{version,cancellationCutoffHours,text}, location}` |
| `GET /api/availability` | `serviceId, therapistId?, from, to` (local dates; clamped to 14 days and the service horizon) | `{slots:[{start,end}], from, to, indicative:true}` — free slots only |
| `POST /api/verification/request` | `{email}` | `{challengeId}` (generic) |
| `POST /api/verification/verify` | `{challengeId, code}` | `{verified, email, expiresAt}` + `rp_bs` cookie (httpOnly, SameSite=Strict, 30 min) |
| `GET /api/verification/session` | – | `{verified, email?, expiresAt?}` |
| `POST /api/appointments` | `{serviceId, therapistId\|null, start (ISO instant), termsVersion, termsAccepted:true, contact:{name, phone, isNewPatient}, idempotencyKey}` | `201 {kind:"confirmed", appointmentId, reference, startsAt, endsAt, therapistId, therapistName, serviceName, priceMinMinor, priceMaxMinor, version, replayed:false}`; replay → `200 …replayed:true` |
| `POST /api/requests` | `{serviceId, therapistId\|null, preferredFrom, preferredTo, preferredTimeOfDay, preferredStart\|null, termsVersion, termsAccepted, contact, idempotencyKey}` | `201 {kind:"request", requestId, reference}` |

Email for bookings/requests always comes from the verified session, never from the body.

## Appointment management (patient)

| Method & path | Body | Notes |
|---|---|---|
| `POST /api/appointments/manage/session` | `{token}` (from URL fragment) | sets `rp_ms` (unverified); returns `{maskedEmail}` |
| `POST /api/appointments/manage/verification/request` | `{}` | OTP to the appointment's email → `{challengeId}` |
| `POST /api/appointments/manage/verification/verify` | `{challengeId, code}` | session becomes verified |
| `GET /api/appointments/manage` | – | minimal details incl. `version`, `canChangeOnline` |
| `POST /api/appointments/manage/cancel` | `{expectedVersion}` | |
| `POST /api/appointments/manage/reschedule` | `{expectedVersion, start}` | same therapist & service; slots via `/api/availability` |

## Staff (`/api/admin/*`, staff session required; roles enforced in `src/domain`)

| Path | Methods | Min role |
|---|---|---|
| `auth/login`, `auth/logout`, `auth/me`, `auth/mfa` | POST/POST/GET/POST | – |
| `appointments?from&to&therapistId&states` | GET (therapist: own only, no emails) · POST create | therapist · reception |
| `appointments/:id` | GET | therapist (own) |
| `appointments/:id/reschedule` `{expectedVersion, start, therapistId?}` | POST | reception |
| `appointments/:id/cancel` `{expectedVersion}` | POST | reception |
| `appointments/:id/outcome` `{expectedVersion, outcome}` | POST | therapist (own) |
| `availability` (staff view, includes `therapistIds`) | GET | reception |
| `requests?state`, `requests/:id/resolve` `{expectedVersion, therapistId, start}`, `requests/:id/decline` `{expectedVersion, message}` | GET/POST | reception |
| `therapists` | GET | therapist |
| `schedule/:therapistId` | GET · PUT `{rules[]}` | therapist (own) · admin |
| `schedule/exceptions`, `schedule/exceptions/:id` | POST · DELETE | reception |
| `schedule/blocks`, `schedule/blocks/:id` | POST · DELETE | reception |
| `settings` | GET · PUT (mode/contact) · POST (publish policy) | reception · reception · admin |
| `notifications?status`, `notifications/:id/retry` | GET/POST | reception |
| `audit` | GET | admin |
| `staff`, `staff/:id` | GET/POST/PUT | admin |
| `catalogue`, `catalogue/services/:id` | GET · PUT matrix · PATCH | reception · admin · admin |

## Worker

`GET|POST /api/cron/outbox` with `Authorization: Bearer $CRON_SECRET` → `{reminders, sent, skipped, retry, failed}`.

## For future agents / tools

Call the typed functions in `src/domain/*` (they take an `Actor` and validate everything). Never execute raw SQL against booking tables.
