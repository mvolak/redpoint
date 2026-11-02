# Assumptions, missing inputs and owner decisions

Status as of 1 November 2026, for the owner meeting on 2 November 2026.

## Missing inputs

| Input | Impact | Workaround in prototype |
|---|---|---|
| **`Redcord_CZ_Current_Site_Inventory_v0.1.md`** (companion inventory, referenced by the brief). **Not present in the repository.** | Route list, link failures, asset metadata and exact legacy paths couldn't be cross-checked | 10 key redcord.cz pages were read directly on 1 Nov 2026. Paths for conference, photo-education and WooCommerce remnants are marked "verify in inventory". |
| Approved logo master, brand guidelines, licensed fonts | Visual fidelity | Text wordmark placeholder; Inter Variable |
| Approved photography/video | Composition can't be judged with real imagery | Labelled placeholders with a photographic brief (`docs/ASSET_MANIFEST.md`) |
| Current product range and product copy | Detail pages have no "uses" content | Names from the redcord.cz navigation, neutral summaries, "Popis použití připravujeme" |
| Current course sessions, prices and registration authority | No real upcoming dates | 2020 programme archived. Illustrative sessions (flagged) demonstrate the UI. |
| Safety documents (notices, care, inspection scope, training) | Safety pages have no body | Unavailable state plus service contact. No generated safety instructions. |
| Practitioner publication consent | Directory is empty | Empty state; observed count and cities in a reviewer note only |
| Real clinic catalogue for booking (services, prices, therapists, hours, terms) | Booking runs on synthetic seed data | Embedded booking at `/rezervace/` with synthetic data and captured e-mail only (`docs/booking/README.md`) |
| Privacy policy / cookie texts and paths | Placeholder pages | `/ochrana-osobnich-udaju/` and `/cookies/` as placeholders. Final paths still to agree. |
| Enquiry handling (who receives, storage region, retention) | No production adapter | Test adapter only |

## Assumptions made

1. **Language:** Czech only (`lang="cs"`). The CZ/SK audience is served by a Czech site. Slovak needs a decision.
2. **Department routing:** the form offers Obchod a instalace / Vzdělávání / Servis. "Servis" as a separate target is a proposal; on the current site, servicing sits under the sales department (same email, different phone).
3. **Audience model:** `klinika` / `trener` / `jednotlivec`, matching the three current redcord.cz tiles.
4. **Shop links** point to the observed category URLs (`/7-vybaveni`, `/6-vzdelavani`), not product deep links. They are unverified.
5. **Trainer path** normalised to `/vzdelavani/treneri/`, with temporary (307) redirects from `/vzdelavani/vzdelavani/` and `/vzdelavani/trener/` in preview only.
6. **`/neurac/`** becomes a method page (today it redirects to training). Incoming links need checking before launch.
7. **Workshops** listed in the 2020 programme are modelled as course definitions with "Upřesní vlastník" eligibility. Whether they still exist is unknown.
8. **Course price display:** 2020 prices appear only on archived cards, labelled "Cena 2020". Upcoming cards show "Na dotaz" unless an approved price exists.
9. **Rate limiting** is in-memory per instance (prototype). Production needs a shared store.
10. **Hero:** right-hand proof metrics are replaced by a list of services, because no metric is approved. Local-representation wording ("výhradní zastoupení") isn't used in the hero, only in the footer and contact details, which quote the current site.
11. **Clinic booking embedded (decision, 2 Nov 2026).** The project lead chose to embed the existing Redpoint Booking v1 app in this site (`packages/booking`, `/rezervace/`) instead of linking to it externally, as brief §6 originally specified. It's the same booking app and database schema, moved rather than rebuilt. Domain and brand placement still need the owner's answer (`docs/booking/README.md`, "Open decisions").

## Source inconsistencies found (need owner answers)

- Trainees per year: "více jak 200" (home statistics) vs. "přibližně 250" (home CV).
- Neurac teaching since 2000 (timeline) vs. "od roku 2002" (CV).
- Course name: "Active Pro" (page heading) vs. "Active Pro Specialist" (navigation).
- `/jednotlivec/` has the title "REDCORD ACTIVE/SPORT PROFESSIONALS", which doesn't match its content.
- `/jednotlivec/` claims "Studie ukazují…" without a source. Omitted.
- Neurac 2 package dates "Květen - Listopad 2020 Říjen – Listopad 2020" are contradictory.
- A practitioner entry carries a stray "SCHOVÁNO" (hidden) label. Hidden entries must never be republished.
- The Neurac 1 and Neurac 2 leaflets share one PDF from 2019.

## Owner decisions to record before production (brief §13)

- [ ] Relationship with Redcord AS / global brand; permitted logo, imagery and claims
- [ ] Active product range; current safety documents and owners
- [ ] CZ/SK audience and language needs
- [ ] Responsible contacts per department (names, phones, emails)
- [ ] Current courses, prices, eligibility, lecturers; **registration authority**
- [ ] Practitioner list: consent, fields, review cadence
- [ ] Shop backend/API access (PrestaShop) and deep-link policy
- [ ] CMS editing workflow (draft/preview/publish, media ownership)
- [ ] Booking: domain/brand placement (redcord.cz/rezervace vs. booking.redpoint-clinic.cz), real catalogue, production stack, patient-data notice
- [ ] Redirect and archive decisions (`docs/MIGRATION_MAP.md`)
- [ ] Hosting and data region; enquiry handling and retention
- [ ] Success metrics and consent approach
