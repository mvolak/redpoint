# Verification summary (1 November 2026)

## Completed

| Check | Result |
|---|---|
| `pnpm typecheck` (all 4 packages) | Pass |
| `pnpm test`: 34 tests across 3 files | Pass |
| `pnpm build` (Next 16.4.3, Turbopack): 44 pages | Pass |
| HTTP smoke test of all prototype routes | 200 for all routes; unknown slugs → 404 |
| Redirects | Proposed rules → 307 to existing targets; undecided legacy URLs → 404 (no homepage blanket) |
| Preview noindex | `X-Robots-Tag: noindex, nofollow`, meta robots, `robots.txt` disallow |
| `pnpm review` at 390 / 768 / 1440 px, 8 templates | No horizontal overflow; exactly one H1 per page |
| Keyboard | Skip link is first and focuses `<main>`; dropdown toggles open with Enter, Tab enters it, Escape closes it and returns focus |
| Mobile menu | Opens with full-height grouped navigation (works without JS via `<details>`) |
| Catalogue filter | Audience filter works via query string, without JS |
| Calendar | Filters via GET form; invalid location is ignored; empty filter result explained; 2020 sessions only in the archive |
| Enquiry form | Server-side errors with focused error summary; valid submission shows "Testovací režim … nic nebylo odesláno"; rate limit observed after 5 attempts |

What the unit tests cover: past/current/cancelled/full/unknown session states; a running session isn't treated as past; Europe/Prague formatting across UTC midnight; empty results; illustrative data hidden in production; unapproved metrics/testimonials/practitioners never rendered; wrong/tampered department; length limits; honeypot; failed persistence → `failed` (never success); a non-production adapter can't claim acceptance; no guessed booking URL; personal data stripped from analytics props; redirect map integrity and anchors.

A bug was found and fixed during review: the mobile menu panel rendered with zero height, because the header's `backdrop-filter` became the containing block for a fixed panel. The check now asserts real panel height.

## Known gaps

- Companion inventory document was missing, so the migration map is incomplete (see `MIGRATION_MAP.md`).
- No approved content, imagery or logo. Visual comparison with redcord.com is limited to layout, typography, colour and spacing.
- Enquiry delivery, course registration, shop and clinic booking aren't connected. **Nothing here is operational.**
- No consent manager or analytics vendor.
- No screen-reader pass (NVDA/VoiceOver) or automated axe audit yet. Colour contrast was checked by token choice only (brand red on white ≈ 5.9:1; muted text #575757 on #f5f5f5 ≈ 6.6:1).
- The in-memory rate limiter resets on restart and isn't shared between instances.
- Hero video is not implemented (`features.heroVideo` is false) pending an approved asset.
- Preview isn't access-protected (noindex only).

## Embedded booking (2 November 2026)

- `pnpm test:booking`: **62/62** integration tests pass against real PostgreSQL 17 (`booking_test`).
- `pnpm test`: 44/44 (vitest 5.0.5); `pnpm typecheck` clean across 5 packages; `pnpm build` includes 15 booking pages and 41 API routes.
- `node scripts/booking-e2e.mjs` on a production build with the dev DB: 11/11. It covers the booking page in site chrome with the booking CSP and one H1, booking as a new patient, the OTP from the captured mailbox, confirmation, the e-mailed `/rezervace/sprava/#t=…` link, and reception login to the calendar. There were no console errors or failed requests.
- `pnpm review` (site QA, 390/768/1440): all checks still pass after moving pages into the `(site)` route group.
- Without `DATABASE_URL`: `/rezervace/` and `/rezervace/admin/` show a "not connected" H1 and the API returns 503.
- Not verified: Supabase Auth + MFA and SMTP delivery (unchanged from the standalone app; see `docs/booking/README.md`). The admin was checked at 1440 px only.
