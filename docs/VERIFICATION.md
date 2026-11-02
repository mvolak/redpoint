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
