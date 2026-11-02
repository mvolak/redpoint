# Asset manifest

## Image workflow

Every image position is a **slot** defined in `packages/content/src/media/slots.json` (id, page, brief, ratio, minimum width). Pages render `<Media slot="…">`, which shows the assigned photo, or a labelled placeholder when there isn't one.

| Step | Command | Result |
|---|---|---|
| 1. Collect | `pnpm images:harvest` | Crawls redcord.cz and downloads the largest available version of each image to `assets-inbox/redcord-cz/` (not published, git-ignored). Writes `manifest.json`, `review.csv` (UTF-8, `;`, opens in Czech Excel) and `index.html` (contact sheet). Re-runs keep the owner's columns. |
| 2. Decide | Owner edits `review.csv` | `slot` (one or more slot ids separated by `\|`), `approval` (`approved` / `pending`), `alt_cs` (required), `focal` (`50% 30%`), `credit`, `notes` |
| 3. Validate | `pnpm images:check` | Unknown slots, duplicate slots, missing alt text and resolution problems. A photo narrower than half the slot's minimum width is **refused** (no upscaling); one between half and the full minimum is allowed but flagged. |
| 4. Publish | `pnpm images:promote` | Writes optimised masters (≤ 2560 px, EXIF/GPS removed) to `apps/redcord-web/public/media/redcord-cz/` and regenerates `packages/content/src/media/registry.generated.json` |

Publish rules: **preview** shows `approved` and `pending` photos, with a "Foto: redcord.cz · čeká na schválení" badge on pending ones and "nízké rozlišení" on low-resolution ones. **Production** shows `approved` photos only. Next.js serves resized AVIF/WebP versions automatically.

Supplied originals (WordPress backup, Redcord AS media kit) go through the same sheet. Put the files in `assets-inbox/redcord-cz/files/`, add rows to the sheet, then run the promote step. Slot ids don't change, so no page code changes.

## Harvest result, 2 November 2026

- 37 pages crawled; 45 distinct images referenced.
- **Only 4 usable images could be downloaded.** 31 referenced files return 404 on `www.redcord.cz`, and the legacy host `202499.w99.wedos.ws` doesn't respond. 10 were small (practitioner portraits around 200×250, logo), so they were listed but not downloaded.
- 3 photos are assigned as `pending` proposals: `neurac-vybaveni` (1920×1080 → home clinic card and Workstation product), `slider-2` and `slider-0` (780×420, flagged low resolution → trainer card and Active education card). They look like Redcord AS marketing photos, so credit and permission need checking.
- `mgr-alice-hamackova` (2838×3672, a portrait of a named person) is not assigned; that's the owner's decision.
- After the crawl the site began answering **401/429** (hosting bot protection). Don't re-run the harvest until the owner allows it or whitelists it. The better source is now the **WordPress `wp-content/uploads` backup from WEDOS**, which should also contain the files the live site has lost.

## Slot list

Previously, every slot was a placeholder. The table below lists each slot's brief and status. Nothing was copied from redcord.com or Wix.

Required fields per approved asset: **id, source, owner/permission, alt text (cs), dimensions, focal point, usage, licence expiry**. Store masters in controlled storage and generate responsive derivatives (AVIF/WebP) with reserved dimensions.

| Slot | Where | Brief | Ratio | Status |
|---|---|---|---|---|
| Logo | Header, footer | Approved Redcord logo (SVG), red and white versions | — | **Missing**: text wordmark placeholder |
| Hero background | `/` | Physio with client on a Redcord Workstation in a real facility; optional muted loop video with poster and pause control | 21:9 desktop, crop for mobile | Missing |
| Audience cards ×3 | `/` | Clinic therapy; trainer and athlete; individual at home | 3:4 | Missing |
| Equipment overview | `/` | Installation in a real space: frame, suspension points, ropes | 4:5 | Missing |
| Installation | `/`, `/vybaveni/instalace/` | Technician fixing a ceiling suspension point; clinic and studio examples | 4:3, 3:4 | Missing (legacy installation images may exist; recover from the WEDOS host) |
| Reference clinic | `/` | Large gym at Redpoint Clinic CZ (Praha / Hradec Králové) | 4:3 | Exists on redcord.cz (captions observed); needs masters and permission |
| Product families ×10 | `/vybaveni/*` | See `media.brief` in `packages/content/src/fixtures/products.ts` | 4:3 card, 4:5 detail | Missing |
| Education cards ×3 | `/vzdelavani/` | Neurac course teaching; Active course; small workshop | 4:5 | Missing |
| About / team | `/o-nas/` | AHAMA / Redcord ČR team | 4:3 | Missing |
| Practitioner portraits | Directory | Keep small; do **not** upscale | 1:1 small | Not migrated (consent pending) |
| Social share image | All | 1200×630 brand image | 1.91:1 | Missing |

## Downloads (documents)

From `packages/content/src/fixtures/organisation.ts`:

| id | Title | Version | URL status |
|---|---|---|---|
| letak-fyzioterapeuti | Leták kurzů Neurac pro fyzioterapeuty | 2019-07 | URL observed; currency unverified |
| letak-neurac-3 | Leták kurzu Neurac 3 | 2020 | Filename observed; exact URL to confirm |
| letak-treneri | Leták kurzů Redcord Active | 2019-07 | URL observed; currency unverified |
| program-2020 | Vzdělávací program 2020 (archiv) | 2020-04-15 | Archive only; URL to confirm |
| Safety notices, care guides, inspection documentation | — | — | **Owner must supply** |
