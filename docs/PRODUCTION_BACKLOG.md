# Production backlog and dependencies

Phase B of the brief. Every item depends on owner inputs (see `ASSUMPTIONS_AND_INPUTS.md`). "Dep" lists what blocks the item.

## Catalogue
- [ ] Approved product range, copy (uses, audiences), imagery per family. Dep: owner/global partner.
- [ ] Product family → shop deep-link mapping (replace category links). Dep: shop access.
- [ ] Accessories (`/vybaveni/doplnky/`) decision.
- [ ] Optional trusted catalogue adapter (`packages/integrations`) for availability; prices only from a trusted source.
- [ ] Approved purchasing/installation FAQ.

## Education
- [ ] Session source of truth (CMS collection or registration system API) implementing the `CourseSession` contract. Dep: registration authority.
- [ ] Verified registration URLs per session; capacity only if integrated (`capacitySource`).
- [ ] Remove `illustrativeSessions` fixtures; production already hides them.
- [ ] Course outcomes, lecturers, accreditation statements (law 96/2004 Sb.) after verification.
- [ ] Workshops/conference decisions; archive policy for past sessions.

## Shop
- [ ] Keep PrestaShop (obchod.redcord.cz) separate; document handoffs and return links.
- [ ] Campaign attribution on outbound links (no personal data).
- [ ] WordPress cart/checkout/account remnants: owner-approved disposition.

## Support, enquiries, safety
- [ ] **Production enquiry adapter**: durable persistence (e.g. PostgreSQL/Supabase in the agreed region) + delivery hand-off to department mailboxes + failure alerting. Report `accepted` only after persistence. Retention policy. Dep: hosting/data decision.
- [ ] Shared-store rate limiting and bot protection (replace in-memory limiter).
- [ ] Safety content, documents with version/owner/approval. Dep: owner/manufacturer.
- [ ] Inspection scope/interval page content.
- [ ] Practitioner directory: consented records, review dates, city filter (UI ready).

## CMS and content operations
- [ ] Choose CMS with draft/preview/publish, roles, media ownership; implement `ContentRepository` against it. WordPress-as-headless possible temporarily; never render raw Elementor HTML.
- [ ] Migrate `pending` records with approval workflow; `proposal` copy through native Czech review.
- [ ] Asset pipeline per `ASSET_MANIFEST.md`.
- [ ] Privacy policy and cookie texts; agree final paths.

## SEO, migration, analytics, accessibility
- [ ] Finalise `redirects.ts` with the companion inventory (query-ID links, uploads, fragments); flip agreed rules to `decided`.
- [ ] WordPress `?s=` → `/hledat/` query redirect at cutover.
- [ ] Production metadata: canonical host, OG images, schema.org (Organization, Course/Event only for real sessions, Product only with real data). No ratings/reviews.
- [ ] Preview protection (auth) in addition to noindex; test production indexing at cutover.
- [ ] Consent management, analytics vendor wired to the existing event contract; respect rejection. Do not inherit the old pixel.
- [ ] 404 monitoring and Search Console after launch.
- [ ] Full WCAG 2.2 AA audit (screen reader pass, contrast on final imagery, zoom 400 %).
- [ ] CI: typecheck, tests, build, link check, `pnpm review` against a preview deployment.

## Future clinic reuse (Redpoint)
- [ ] `apps/redpoint-web` with own `site.ts` and token file; reuse `ui`, `content` interfaces, `integrations`.
- [ ] Keep the existing working booking component; integrate by configured URL/embed only. No second appointment database, no shared patient/retail auth.
- [ ] Separate operational roles and data stores for patient booking.

## Explicitly out of scope until separately commissioned
New enrolment/payments/certificates/learning portal, local cart, AI chat or autonomous guidance/transactions.
