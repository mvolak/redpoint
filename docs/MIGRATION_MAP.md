# Route migration map (draft)

The machine-readable source is `apps/redcord-web/src/config/redirects.ts`, tested in `redirects.test.ts`: unique sources, existing targets, no chains, no homepage blanket, and declared anchors.
In preview, `proposed` rules become **temporary (307)** redirects. Only `decided` rules become permanent (308). Unknown URLs return 404, never the homepage.

A target is either an app path or an **absolute https URL** on a host listed in `EXTERNAL_REDIRECT_HOSTS` (currently `www.redpoint-clinic.cz`, `obchod.redcord.cz`). Tests reject any other host, non-https targets and protocol-relative `//…` targets. Add a host only after the owner confirms it. External fragments (e.g. `#neurac`) can't be checked from here; verify them by hand. `pnpm inventory:compare` reports external redirects without following them.

| Old URL | New URL | Status | Reason |
|---|---|---|---|
| `/` | `/` | keep | New composition |
| `/vybaveni/` | `/vybaveni/` | keep | Rebuilt with audience filter |
| `/vybaveni/fyzioterapeut/` | `/vybaveni/?pro=klinika` | proposed | Audience tile replaced by catalogue filter; check existing page content first |
| `/vybaveni/trener/` | `/vybaveni/?pro=trener` | proposed | As above |
| `/vybaveni/jednotlivec/` | `/jednotlivec/` | proposed | Individual journey page |
| `/vybaveni/doplnky/` | — | **needs owner** | Accessories content not verified; possibly a direct shop category |
| `/vybaveni/instalace/` | `/vybaveni/instalace/` | keep | **Linked but 404 today**: restored |
| `/vybaveni/<product>/` (per-product legacy pages) | `/vybaveni/<slug>/` | **needs owner** | Legacy product URLs not fetched; map one by one from the inventory |
| `/vzdelavani/` | `/vzdelavani/` | keep | |
| `/vzdelavani/neurac/` | `/vzdelavani/neurac/` | keep | |
| `/vzdelavani/vzdelavani/` | `/vzdelavani/treneri/` | proposed | Path normalisation |
| `/vzdelavani/trener/` | `/vzdelavani/treneri/` | proposed | Linked from the /vzdelavani/ tile |
| `/vzdelavani/jednotlivec/` | `/jednotlivec/` | proposed | Linked from the /vzdelavani/ tile |
| `/vzdelavani/vzdelavaci-program/` | `/vzdelavani/vzdelavaci-program/` | keep | 2020 table moved to archive |
| `/vzdelavani/workshopy/` | `/vzdelavani/workshopy/` | keep | **404 today**: restored with honest state |
| `/vzdelavani/konference/` | — | **needs owner** | Confirm exact path and whether to archive |
| Foto vzdělávání (path TBC) | — | **needs owner** | Gallery out of scope |
| `/neurac/` | `/neurac/` | keep (role change) | Was a redirect to training; now the method page. Check incoming links. |
| `/neurac/certified-neurac-practitioner/` | `/neurac/#certifikace` | proposed | Merged; anchor `certifikace` is guaranteed |
| `/neurac/kdo-jsou-certified-neurac-practitioners/` | same | keep | Approved records only |
| Nav "Léčba Neurac" → `redpoint-clinic.cz/fyzioterapie/#neurac` | unchanged external | keep | Clinic domain untouched; anchor not verified |
| `/neurac/lecba-neurac/` | `https://www.redpoint-clinic.cz/fyzioterapie/#neurac` | proposed (external) | Already a 301 to the clinic today; same target kept. Anchor not verified |
| `/jednotlivec/` | `/jednotlivec/` | keep | |
| `/bezpecnost/` | `/bezpecnost/` | keep | |
| `/bezpecnost/bezpecnostni-oznameni/` | same | keep | Content from owner |
| `/bezpecnost/technicke-kontroly/` | same | keep | **404 today**: restored with service form |
| `/bezpecnost/pece-a-udrzba/` | same | keep | Content from owner |
| `/bezpecnost/skoleni-bezpecnosti/` | same | keep | Content from owner |
| `/kontakt/` | `/kontakt/` | keep | Extended with routing and form (`#poptavka`) |
| `/kontaktujte-nas/` | `/kontakt/#poptavka` | proposed | Form merged |
| `/novinky/` | — | **needs owner** | Archive vs. retire |
| `/?s=…` (WordPress search) | `/hledat/?q=…` | **needs owner** | Implement as a query-matched redirect at cutover |
| `/?p=…` / `/?page_id=…` (query-ID links) | per ID | **needs owner** | Resolve each ID from the inventory/WordPress export; no blanket rule |
| `/wp-content/uploads/…` (PDF leaflets, programme) | same or mapped | **needs owner** | Keep valid files at the same URL or map precisely |
| WordPress cart / checkout / account | — | **needs owner** | WooCommerce remnants: no migration of accounts or orders |

## Page inventory findings (2 November 2026)

`pnpm inventory:old` crawled 39 URLs on redcord.cz: **14 working pages, 10 redirects, 15 × 404**. See `inventory/comparison.html` for each URL.

- **Broken redirect chains:** `/vybaveni/trener/` → `/vybaveni/active/` → `/vybaveni/vybaveni-4/` → 404, and `/vybaveni/jednotlivec/` → `/vybaveni/vybaveni-3/` → 404.
- **Live WooCommerce leftovers:** `/obchod/`, `/kosik/`, `/pokladna/`, `/muj-ucet/`. They're now in the map as `needs-owner`.
- **All 4 linked PDFs return 404:** both course leaflets, the Neurac 3 leaflet and the 2020 programme. Together with the missing images, this suggests a damaged `wp-content/uploads` folder; recover it from the WEDOS backup.
- **The homepage has no H1.** One page links to an email address as if it were a URL (`/neurac/kdo-jsou-certified-neurac-practitioners/skamilla@seznam.cz/`).
- **`/neurac/lecba-neurac/`** is an external 301 to the clinic site. It's now in the map as a proposed external redirect to the same URL.

## Fragments

Fragments never reach the server. The anchors that pages must keep are declared in `REQUIRED_ANCHORS`: `/neurac/#certifikace`, `/kontakt/#poptavka`. Other incoming fragments (e.g. `#neurac` on the clinic site) need to be listed from the inventory.

## Broken links still needing owners

- `/vybaveni/instalace/`, `/vzdelavani/workshopy/`, `/bezpecnost/technicke-kontroly/`: restored, but they need **approved content**.
- `/vybaveni/doplnky/`, `/vzdelavani/konference/`, foto-vzdělávání, `/novinky/`: no destination chosen.
