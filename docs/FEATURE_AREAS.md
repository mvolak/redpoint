# Feature areas

Standalone topics in this project, for planning further work. This is a map of areas, not a list of pages or routes. Concrete open tasks live in `PRODUCTION_BACKLOG.md`, owner decisions in `ASSUMPTIONS_AND_INPUTS.md`, and booking specifics in `booking/README.md`. Czech version: `FEATURE_AREAS_CZ.md`.

Last updated: 24 Nov 2026.

## Status legend

| Status | Meaning |
|---|---|
| **Done** | Built and working at the current stage (review prototype / staging). |
| **Partial** | Built in part, or works only with test data or test adapters. |
| **Owner input** | The code is ready; waiting on content, data or a decision from the owner or the clinic. |
| **Deferred** | Deliberately postponed. |
| **Not started** | Nothing built yet. |

"Done" means done for the prototype and staging, not production-ready. Production readiness is tracked in `PRODUCTION_BACKLOG.md`.

## Site and content

| # | Area | Status | Notes |
|---|---|---|---|
| 1 | **Content model and provenance:** source and approval state per record, review badges in preview, approved-only in production | Done | Most records still await owner approval (see 2). |
| 2 | **Content pages:** equipment, education, Neurac, servicing and safety, about us, contact | Partial | Pages built; content is `pending` / `proposal` until the owner reviews it. |
| 3 | **Course catalogue and dates:** the course calendar, illustrative dates, hand-off to external registration | Partial | Calendar UI shows illustrative dates in preview only; real dates missing. |
| 4 | **Enquiry / consultation form:** validation, rate limit, the adapter that will actually send messages | Partial | Test adapter only; in-memory rate limit. |
| 5 | **Search:** the site's own search (`/hledat/`) | Done | |
| 6 | **Navigation and header:** menus, mobile menu, the Konzultace / Rezervace / E-shop buttons | Done | |
| 7 | **Design system / UI kit:** `packages/ui`, Tailwind tokens, components, accessibility | Done | |
| 8 | **Media and images:** media slots, harvesting from the old site, review and promotion, logo | Partial | Harvested to `assets-inbox/`; owner review in `review.csv` and promotion pending. |
| 9 | **Brand identity:** logo, wordmark, colours, fonts | Owner input | No approved logo master; the header uses a text wordmark placeholder. |

## Migration and SEO

| # | Area | Status | Notes |
|---|---|---|---|
| 10 | **Migration map and redirects:** old to new URLs, external redirects, owner decisions | Partial | `needs-owner` entries open; `proposed` redirects (incl. external Neurac) need confirming. |
| 11 | **Page inventory:** crawling the old site, comparing old and new | Done | |
| 12 | **SEO and indexing:** metadata, sitemap, robots, noindex in preview, structured data | Partial | Preview noindex and robots done; production SEO in the backlog. |

## Integrations

| # | Area | Status | Notes |
|---|---|---|---|
| 13 | **E-shop hand-off:** links to obchod.redcord.cz | Done | |
| 14 | **Redpoint Clinic:** links and the relationship between the two sites (redcord.cz and redpoint-clinic.cz) | Partial | Booking embedded on redcord.cz; long-term relationship to the clinic site undecided. |
| 15 | **Email (SMTP):** provider, sender address, templates, test inbox vs production | Partial | Staging sends to the Mailtrap sandbox; production provider and sender not chosen. See `EMAIL.md`. |

## Booking

| # | Area | Status | Notes |
|---|---|---|---|
| 16 | **Booking wizard:** service, time slot, details, summary, email verification | Done | Verified end to end locally; the staging run stopped at the code step and needs a rerun. |
| 17 | **Guest verification (OTP):** codes, limits, guest session | Done | |
| 18 | **Managing a booking:** link from the email, rescheduling, cancellation | Done | Covered by DB tests; not yet tried on staging. |
| 19 | **Booking rules:** automatic vs request-only, booking windows, cancellation rules | Owner input | Rules implemented; the clinic must confirm the values. |
| 20 | **Schedules and availability:** working hours, exceptions, holidays, slot calculation | Owner input | Logic done; real working hours missing. |
| 21 | **Catalogue:** services, prices, durations, therapists, locations | Owner input | Synthetic seed data only. |
| 22 | **Notifications:** outbox, confirmations, reminders, cron worker | Partial | Outbox works; no cron job scheduled on staging, so queued emails aren't sent. |

## Staff and security

| # | Area | Status | Notes |
|---|---|---|---|
| 23 | **Staff authentication:** Supabase Auth, login, password reset | Done | One admin linked; set the Supabase Site URL for reset links. |
| 24 | **Two-factor sign-in (MFA)** for staff | Deferred | Supported in code; `STAFF_REQUIRE_MFA` off on staging. Required before production. |
| 25 | **Authorization / roles:** admin, reception, therapist, and what each can see | Partial | Roles enforced in code; only the admin account exists so far. |
| 26 | **Admin UI:** calendar, bookings, requests, staff, settings, audit log | Done | |
| 27 | **Audit log:** who changed what | Done | |
| 28 | **App security:** CSP and security headers, CSRF origin check, rate limiting, environment guards, secrets | Done | Dev mode is localhost-only (PR #2); review again before production. |

## Data and compliance

| # | Area | Status | Notes |
|---|---|---|---|
| 29 | **Database:** Supabase Postgres, migrations, RLS, seed data | Done | Staging database with synthetic seed. |
| 30 | **Backup and restore:** backups, restore drill | Not started | Procedure documented in `booking/BACKUP_RESTORE.md`; never run. |
| 31 | **GDPR and privacy:** consents, privacy policy, retention and deleting patient data, cookies | Owner input | Needs owner/legal decisions on texts and retention. |
| 32 | **Legal texts:** terms and conditions, company details | Owner input | |

## Operations

| # | Area | Status | Notes |
|---|---|---|---|
| 33 | **Environments:** local, preview / staging, production, and the variables for each | Partial | Local and staging set up; no production environment. |
| 34 | **Deployment:** Vercel, production domain, DNS, cutover from the old site | Partial | Staging on Vercel; domain, DNS and cutover not started. |
| 35 | **Monitoring and logs:** errors, uptime, cron alerts | Not started | |
| 36 | **Analytics:** measuring traffic, consent-dependent | Not started | Feature flag off. |
| 37 | **Testing and QA:** unit tests, booking DB tests, Playwright review, accessibility checks | Done | 54 unit tests, 62 booking DB tests, Playwright review and booking E2E scripts. |
| 38 | **CI / repo workflow:** GitHub, PRs, automatic checks before merge | Not started | Only Vercel builds run on PRs. |
| 39 | **Developer environment:** Windows / Git Bash, pnpm, Node, Docker | Partial | Works; run `corepack enable pnpm` after Node changes. |
| 40 | **Documentation:** README, CLAUDE.md, the docs in `docs/`, owner decisions | Done | Ongoing; keep current with each change. |
