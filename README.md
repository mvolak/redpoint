# Redcord.cz — Next.js renewal (review prototype)

> **CONCEPT FOR OWNER REVIEW — NOT A PRODUCTION SERVICE.**
> Content isn't approved. Forms run in test mode and send nothing. The shop and course registration are external links only. Redpoint Clinic booking is embedded at `/rezervace/` with synthetic data and captured (unsent) e-mail. No analytics are active.
> Built against `docs/Redcord_Nextjs_Redesign_Coding_Prompt_v0.1.md` (v0.1, 1 Nov 2026) for the owner meeting on 2 Nov 2026.

The new Czech Redcord site. Its **business scope comes from redcord.cz** and its **visual direction comes from redcord.com**. Strategy: two public domains on a shared platform. Redcord comes first; Redpoint Clinic joins later.

## Quick start

Requires Node ≥ 22 and pnpm 11 (`corepack enable`).

```bash
pnpm install
cp .env.example apps/redcord-web/.env.local   # optional; defaults are preview/test
pnpm dev                                      # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build && pnpm start` | Production build/serve (still preview mode unless `SITE_ENV=production`) |
| `pnpm test` | Vitest: session states, filters, enquiry validation/failure, redirect map |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm images:harvest` / `images:check` / `images:promote` | Image workflow: collect from redcord.cz → owner decides in `review.csv` → validate → publish (see `docs/ASSET_MANIFEST.md`) |
| `pnpm inventory:old` / `inventory:new` / `inventory:compare` | Page inventories: `old` crawls redcord.cz (1 req/s, cached in `inventory/old/cache/`); `new` crawls the app on :3000 (must be running); `compare` tests every old URL against the new app. Open `inventory/old/index.html`, `inventory/new/index.html` and `inventory/comparison.html` locally. |
| `pnpm db:up` / `db:migrate` / `db:seed` / `worker` / `test:booking` | Embedded clinic booking: local Postgres (Docker), synthetic seed, outbox worker, 62 DB integration tests. See `docs/booking/README.md`. |
| `pnpm review` | With a server on :3000: screenshots at 390/768/1440 into `review-screenshots/`, overflow, H1, keyboard and form checks. Uses the locally installed Chrome. **Restart the server between runs.** The enquiry rate limit (5 attempts / 10 min) is in memory and real. |

Pinned versions (checked 1 Nov 2026): Next.js 16.4.3, React 19.3.1, Tailwind CSS 4.3.3, TypeScript 5.9.3, Vitest 4.0.18. TypeScript 7 exists, but 5.9 is used for Next.js compatibility.

## Repository layout

```
apps/redcord-web        the only website implemented now (Next.js App Router)
  src/config/site.ts      site configuration: identity, nav, endpoints, feature flags
  src/config/redirects.ts machine-readable migration map (drives next.config redirects)
  src/content/copy.ts     page copy records with provenance (proposal / pending)
packages/ui             design tokens (tokens.css, Tailwind v4 @theme) + primitives/sections
packages/content        typed schemas, source-labelled fixtures, repository interface, search
packages/booking        Redpoint Clinic booking (domain, Postgres schema, notifications, UI), served at /rezervace/
packages/integrations   enquiry contract + test adapter, shop/registration/clinic handoffs, analytics contract
docs/                   brief, assumptions, migration map, asset manifest, backlog, verification
scripts/review-check.mjs  QA + screenshot script
```

`apps/redpoint-web` will be added later and will reuse `ui`, `content` and `integrations` with its own tokens and config. No empty second app was created.

## What's real and what isn't

| Area | Status in prototype |
|---|---|
| Contacts, company details, product-family names, course structure, prerequisites | **Real source data from redcord.cz (observed 1 Nov 2026). Unverified (`pending`).** |
| Headlines and intros marked "Návrh textu" | **Proposal** copy that needs native review and approval |
| Upcoming course dates marked "Ilustrační termín" | **Invented** to show the open/full/cancelled/unknown states. Behind the `showIllustrativeSessions` flag and never shown in production. |
| 2020 course programme | Real but historical. **Shown only in the archive.** |
| Metrics (150+, 200+), testimonials, practitioner directory | **Hidden.** Unapproved, and the metrics contradict each other. The blocks disappear cleanly. |
| Photos, video, logo | 3 photos from redcord.cz, assigned as **pending** proposals with a review badge. Every other slot is a labelled placeholder; the logo is a text wordmark. Nothing was taken from redcord.com or Wix. |
| Enquiry form | **Test adapter.** Server validation, honeypot and rate limit are real. **Nothing is stored or delivered.** The UI says so. |
| E-shop (obchod.redcord.cz), course registration | External links only (unverified category URLs). No local cart or prices. |
| Redpoint Clinic booking | **Embedded** (`/rezervace/`, staff at `/rezervace/admin/`). Real booking engine and Postgres schema; **synthetic** catalogue/staff, e-mail captured in the DB and never sent. Without a database it shows a "not connected" notice. |
| Analytics | Event contract only. No vendor, no consent tool, nothing sent. |
| Search | Local index of visible prototype content. Results are noindex. |
| AI features | None |

In **preview** (the default), the site renders `pending` and `proposal` records with review badges, shows a review banner, and sends `noindex` (meta, `X-Robots-Tag`, robots.txt disallow). In **production** (`SITE_ENV=production`), only `approved` records render. That mode isn't launch-ready: see `docs/PRODUCTION_BACKLOG.md`.

## Site configuration (`apps/redcord-web/src/config/site.ts`)

| Key | Purpose |
|---|---|
| `env`, `reviewMode` | From `SITE_ENV`. Review mode shows banners/notes and forces noindex. |
| `origin` | From `SITE_ORIGIN`. Used for the canonical/metadata base and sitemap. |
| `nav`, `primaryCta` | Grouped navigation: Vybavení · Vzdělávání · Neurac · Servis a bezpečnost · O nás · Kontakt, plus E-shop |
| `external.*` | Shop, registration and clinic endpoints; `clinicBooking` links to the embedded `/rezervace/`. |
| `features.*` | `showIllustrativeSessions`, `enquiryAdapter` (`test` only), `heroVideo`, `analytics` |
| `social` | Verified local accounts as listed on redcord.cz |

Design tokens are in `packages/ui/src/tokens.css`. Only `#c8102e` (CTA red) and `#0a0a0a` (near-black) are sampled from the reference; the rest are starting values. The font is Inter Variable, installed locally via `@fontsource-variable/inter` (latin-ext, Czech diacritics). Replace it if a licensed Helvetica-family font is supplied.

## Further documents

- `docs/ASSUMPTIONS_AND_INPUTS.md`: assumptions, missing inputs, owner decisions
- `docs/MIGRATION_MAP.md`: old URL → new URL → reason/status, plus broken-link decisions
- `docs/ASSET_MANIFEST.md`: required media, with brief and status
- `docs/PRODUCTION_BACKLOG.md`: backlog grouped by catalogue, education, shop, support, CMS, SEO, clinic reuse
- `docs/booking/`: embedded clinic booking: setup, paths, open decisions, plus the original booking docs
- `docs/VERIFICATION.md`: what was verified, and known gaps
