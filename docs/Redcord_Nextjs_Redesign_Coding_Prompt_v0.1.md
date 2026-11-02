# Redcord.cz Next.js renewal — coding-bot brief

Version 0.1 · 1 November 2026 · Meeting reference: 2 November 2026

Use with `Redcord_CZ_Current_Site_Inventory_v0.1.md`. This is a proposed build contract. It distinguishes current evidence from proposed features and a meeting prototype from a production service.

## 1. Your task

Build the new Czech Redcord website in Next.js. Its public business scope comes from redcord.cz; its visual direction comes from redcord.com. Preserve Czech regional distribution, equipment enquiries, professional education, individual equipment journeys, installation, safety/support, practitioner information and routes to the reference clinic. Reorganise them into clear, modern customer journeys.

Strategy already selected: **two public domains, shared platform**. Redcord launches first; Redpoint Clinic joins the shared foundation later. Keep both identities and their audiences distinct. The existing standalone clinic booking component is working according to the project owner; do not replace or recreate it.

Deliver a runnable review prototype first, explicitly labelled in the README as a concept for owner review. Follow with a production backlog/implementation plan. Do not deploy, change DNS, send real messages, process payments, or import private records as part of this prompt. Do not rebuild the clinic or the complete shop in this milestone.

## 2. Reference sources and evidence hierarchy

1. Companion inventory: observed Czech pages, routes, link failures, asset metadata and feature boundaries.
2. https://www.redcord.cz/ and relevant Czech pages: source business content, subject to owner validation.
3. https://www.redcord.com/ and https://www.redcord.com/redcord-equipment: visual/compositional reference only.
4. Owner-supplied current catalogue, course sessions, brand guidelines and integration contracts: authoritative once supplied.

Do not turn old course prices, 2020 events, historical qualifications, menu labels, missing safety pages or global Redcord statistics into verified current Czech facts. Preserve a source URL and approval state for migrated records. Never transplant entire global medical/efficacy claims into local marketing without editorial approval.

## 3. Experience and business priorities

Primary audiences: physiotherapists/clinical facilities, trainers/performance facilities, individual equipment buyers. Secondary: existing equipment customers seeking support; patients looking for treatment; professionals finding training or certified practitioners.

Primary conversions: qualified equipment/installation enquiry, course-registration handoff, product-purchase handoff. Support must be easy to reach. Clinic appointment booking is a secondary referral, not the Redcord homepage's dominant action.

Proposed Czech navigation: **Vybavení · Vzdělávání · Neurac · Servis a bezpečnost · O nás · Kontakt**, plus a clearly identified **E-shop** destination. Include a contextual **Redpoint Clinic** link. Mobile navigation must remain usable with this content volume; use grouped subnavigation rather than squeezing every label onto one row.

## 4. Visual direction — what was actually observed

The live desktop reference uses:

- White header with a small red logo, compact dark navigation and a black pill-shaped contact action.
- A broad, inset hero panel with rounded corners; clinical video/photo, dark overlay, large white left-aligned heading, red primary action and outlined secondary action.
- A right-hand stack of proof metrics on desktop, separated by fine rules. Values animate on the reference; initial retrieval briefly exposed zeros. Our version must render valid approved values without relying on animation.
- Generous whitespace and alternating white, pale grey, near-black and strong red sections.
- Large, tightly set sans-serif headings; the observed rendered H1 was about 60px and section headings around 45px at the inspected desktop width. Font families include Helvetica Neue Bold/Helvetica aliases.
- Rounded photo-led application cards with dark bottom overlays and restrained red text highlights.
- Oversized editorial typography separating equipment and method, followed by a dark method section.
- Alternating image/text feature rows, subtle borders/shadows, red vertical quotation rules, dark statistic cards, pill tags and spacious forms.
- A strong red events section, dark testimonials, and a dark multi-column footer.
- The equipment page uses a split text/photo introduction, rounded tall imagery, practical feature explanations and a FAQ accordion.

These are observations from the desktop homepage/equipment page, not a measured global design system or mobile audit. Do not copy rendering failures, spelling mistakes, empty/lazy-loading panels, or Wix code.

### Proposed implementation tokens

The following are starting values for the new implementation; only the CTA red and near-black are directly sampled reference colours. Final brand guidelines override them.

```css
--brand-red: #c8102e; /* sampled reference CTA red */
--ink: #0a0a0a;       /* sampled reference near-black */
--surface: #ffffff;
--surface-muted: #f5f5f5;
--text-muted: #575757;
--border: #e2e2e2;
--radius-card: 20px;
--radius-hero: 24px;
--radius-button: 999px;
--content-max: 1240px;
```

Use an approved/licensed Helvetica-family font if supplied. Otherwise use a suitable Czech-capable open font such as Inter, installed locally and verified for Czech diacritics. Do not extract proprietary font binaries from Wix. Reproduce the typographic character with weight, spacing and composition, not by inheriting unreliable wrapper font sizes.

Proposed responsive scale: H1 clamp(2.25rem, 4.6vw, 4.25rem), H2 clamp(1.75rem, 3.3vw, 3rem), body 16–18px, body line height 1.5–1.65. Use 20px mobile gutters, 32px tablet gutters, 48–72px desktop content gutters as appropriate. Section spacing approximately 56px mobile and 88–112px desktop. Keep body line lengths readable. These are design targets, not measured reference CSS.

Photographic direction: real Redcord equipment, professionals, treatment/training spaces and installation details. Strong editorial cropping and consistent overlays. Avoid generic abstract AI backgrounds, decorative glass panels, unnecessary gradients and medical stock imagery unrelated to the equipment. One restrained pale gradient for an optional lead form is acceptable if it supports the reference direction.

Motion: short opacity/translation transitions, subtle image hover, optional approved muted looping hero video with poster, pause control and reduced-motion fallback. Core content and metrics must be present without animations/JavaScript. Reserve media dimensions to avoid layout shifts. No scrolling hijack or auto-playing audio.

## 5. Translate the reference into the Czech business

| Reference pattern | Czech adaptation |
|---|---|
| Global brand hero | Local Redcord proposition and regional consultation/course actions |
| Global distributor finder | Direct Czech/Slovak sales/support contact; no unnecessary country-selection step |
| Application photo grid | Clinical facilities, trainers/performance, individual/home use; expand only for approved local offers |
| Equipment/method separation | Explain Redcord equipment versus Neurac method in approved Czech copy |
| Global studies/statistics | Only sourced, approved and correctly labelled global/local evidence; hide unapproved metrics |
| Global education pathways | Actual Czech Neurac and Active offerings with prerequisites and verified sessions |
| Webinar/events block | Real local sessions; empty-state enquiry if no current dates exist |
| Publication-pack lead magnet | Optional later feature if an approved pack and delivery workflow exist |
| Global contact/footer | AHAMA regional details, Czech departments, local social accounts and reference-clinic link |
| Equipment FAQ | Approved local purchasing/installation/support answers; do not invent safety specifications |

The result should feel closely related to redcord.com while remaining useful for a Czech customer. It is not a literal translation of the global site.

## 6. Proposed homepage composition

1. **Header:** approved logo; navigation; visible E-shop link; primary consultation/contact action.
2. **Hero:** approved clinical/equipment visual; concise Czech proposition. Suggested working headline: “Redcord vybavení. Neurac metoda. Podpora pro vaši praxi.” Label copy as a proposal in content records. Primary “Prozkoumat vybavení”, secondary “Najít kurz”. Add local representation wording only after approval.
3. **Audience/application cards:** clinical professionals, trainers/performance, individuals/home users. Each opens the relevant equipment/education journey.
4. **Equipment overview:** credible equipment imagery, product-family categories, consultation/quotation action; individual buying path leads to the shop.
5. **Method explanation:** contrasting dark section explaining the relationship between equipment and Neurac with a single informative next step.
6. **Education pathways:** therapy/Neurac, Active/training, approved workshops. Show prerequisites and intended audiences; avoid presenting all courses as open to everyone.
7. **Upcoming sessions:** approved dates only; cards show date, place, lecturer, eligibility, price or enquiry state, and external registration destination. Historical events are archived, never “upcoming”.
8. **Installation and support:** photo/text block; consultation, inspection and safety links.
9. **Reference clinic:** compact Redpoint feature explaining local practice/demonstration and an approved link. Do not overwhelm the distribution website with a long clinician biography.
10. **Credibility:** approved testimonials/practitioner information, optional sourced proof. Do not invent quotations, client logos, accreditations or performance statistics.
11. **Contact routing:** sales/installation, education, equipment support. Clear telephone/email alternative.
12. **Footer:** company details, grouped navigation, safety, privacy/cookie settings, local social links, shop and clinic links.

Keep the page focused; optional proof blocks disappear cleanly when no approved content is available. The prototype must not pad gaps with fabricated numbers or testimonials.

## 7. Route and template plan

Retain working legacy paths where practical. Proposed additions/renames are explicitly indicated; exact URL decisions require the migration map before launch.

| Route | Template and behaviour | Status |
|---|---|---|
| `/` | Homepage composition above | Existing |
| `/vybaveni/` | Catalogue overview; audience filters; consult/buy distinction | Existing, rebuild |
| `/vybaveni/[slug]/` | Approved product family/detail; imagery, use, related education, enquiry/shop link | Proposed |
| `/vybaveni/instalace/` | Installation service, approved process, consultation form | Legacy link 404; proposed restoration |
| `/vzdelavani/` | Education overview and pathway cards | Existing |
| `/vzdelavani/neurac/` | Therapy pathway; levels/prerequisites; matching sessions | Existing |
| `/vzdelavani/treneri/` | Active pathway | Proposed normalisation of `/vzdelavani/vzdelavani/` |
| `/vzdelavani/vzdelavaci-program/` | Current course calendar and filters; archive separation | Existing, replace historical table |
| `/vzdelavani/kurzy/[slug]/` | Course definition, audience, outcomes, prerequisites and verified session links | Proposed |
| `/vzdelavani/workshopy/` | Owner-approved workshops or honest unavailable state | Legacy link 404; proposed restoration |
| `/neurac/` | Dedicated method explainer; links to training/directory/clinic | Proposed repurposing; currently redirects to training |
| `/neurac/kdo-jsou-certified-neurac-practitioners/` | Reviewed directory, city filter and approved profiles | Existing |
| `/jednotlivec/` | Individual/home audience journey | Existing |
| `/bezpecnost/` | Safety/service hub with reviewed documents | Existing |
| `/bezpecnost/technicke-kontroly/` | Inspection enquiry and approved service information | Legacy link 404; proposed restoration |
| `/bezpecnost/[slug]/` | Approved notices, care, safety training | Proposed/recovered content only |
| `/o-nas/` | Regional representation, team and reference workplace | Proposed extraction from homepage |
| `/kontakt/` | Department contacts and enquiry form | Existing, extend |
| `/hledat/` | Accessible public-content search; query results noindex | Proposed replacement for WP search |
| Privacy/cookie policy routes | Owner-approved policies, preference controls | Proposed; exact paths agreed before launch |

Do not publish empty filler pages or create product facts from broken menu items. A review prototype can show an explicitly labelled unavailable-content state and a contact route. Production launches only approved routes/content.

## 8. Functional requirements

### Catalogue and enquiries

- Filter equipment by approved audience/use; product families link to approved shop destinations or request advice.
- Do not mirror live shop stock/prices without a trusted integration. Use “Cena a konfigurace na dotaz” where appropriate, not a made-up price.
- Enquiry form: name, email, optional telephone/company, department, optional product/course reference, concise message, acknowledgement of relevant information. Server validation, length limits, honeypot/rate limiting, clear errors.
- Prototype adapter must explicitly say the request is a test and is not delivered. Production adapter stores/routs the enquiry durably, reports failures, and shows success only after accepted persistence/delivery handoff. No fake email-sent states.
- No health-history collection or file uploads in the first release.

### Education

- Separate course definition from session records. Data fields include course level, eligibility, prerequisites, lecturer, language, location, start/end, timezone, current state, registration URL, optional approved price/currency and capacity source.
- Session state distinguishes open, full, cancelled, past and unknown. Do not infer seats from stale marketing copy. If capacity is not integrated, link to registration for availability.
- Czech formatting; Europe/Prague for session display. Hide/archive past sessions automatically; support relevant date/audience filters.
- First production release links to the existing authoritative registration destination. New enrolment, payments, certificates or learning portal are separately scoped.

### Directory, documents and support

- Approved practitioner records only; city/profession/certification fields with explicit public visibility and review date. Never blindly republish Elementor-hidden entries found in an export.
- Downloads have title, version/date, file type, ownership and approval state. Maintain valid existing download URLs or precise replacements where appropriate.
- Safety material must preserve meaning and critical access. If missing, owners must supply it; do not generate installation limits or substitute AI-written instructions.
- Search indexes public approved records only. Accessible empty states, query limits and no private-system search.

### Shop, clinic, social and measurement

- Existing PrestaShop host remains operational and separate. Preserve meaningful deep links; document external handoffs and return links. Do not build a nonfunctional local cart to imitate old WordPress remnants.
- Clinic/booking URLs come from configuration supplied by the owner. Do not guess the working booking URL. No shared patient/retail authentication in phase 1.
- Retain verified local Facebook/Instagram/YouTube accounts, appropriate share metadata and campaign attribution without patient data. No live-feed embeds by default.
- Events: equipment_viewed, quote_started, enquiry_accepted, course_viewed, registration_handoff, shop_handoff, support_enquiry_accepted. An outbound click is not a sale or completed enrolment. Track actual outcomes only with backend reconciliation/integration.
- Optional tracking/media loads respect the selected consent approach. Do not inherit the old pixel automatically. Public content remains usable when optional tracking is rejected.

## 9. Platform architecture and future Redpoint reuse

Use Next.js App Router, TypeScript, React and Tailwind, with supported stable versions pinned after checking the implementation environment. Use pnpm workspace/monorepo boundaries:

- `apps/redcord-web`: the only website implemented now.
- `packages/ui`: tokens and reusable primitives/sections.
- `packages/content`: typed content schemas, fixtures and repository interfaces.
- `packages/integrations`: shop links/catalogue adapter, enquiry adapter, future education/booking contracts.
- Site configuration owns name, logo, tokens, navigation, department contacts, canonical origin, external endpoints and enabled features.

Later add `apps/redpoint-web`, reusing primitives and content interfaces while allowing different layouts/copy/tokens. Do not implement an empty second app or multi-tenant administration merely to demonstrate future extensibility.

Prototype: typed local records/fixtures are acceptable and should be source-labelled. No database is required just to render the marketing review. Production: choose editable CMS with draft/preview/publish and media ownership after reviewing owner workflow; WordPress as a temporary headless source is possible, but do not render unsanitised Elementor HTML as the final component system. PostgreSQL/Supabase may hold operational enquiry/course records when needed; keep operational roles and patient booking storage separate. Do not create a second appointment database.

Future AI preparation: approved structured public content; typed read operations for products/courses/support and a validated enquiry operation. Later assistants can use them under explicit permissions. AI chat, autonomous clinical guidance and autonomous transactions are outside this build.

## 10. Assets and editorial workflow

- Use the companion inventory's media and rendered-reference appendices as discovery inputs, not a full backup or licence.
- Get approved logo masters, imagery/video, brand guidelines and licensed fonts from owners/global partner. Logo/style inspiration does not establish rights to every asset on redcord.com.
- Store approved media under controlled storage with source, owner/permission, alt text, dimensions, focal point and usage. Recover legacy WEDOS-host images; do not use that hostname as a permanent dependency.
- Prefer master photos for hero backgrounds. Existing small directory portraits remain small; do not upscale them into large lifestyle images.
- Generate modern responsive derivatives with stable dimensions, good cropping and lazy loading below the fold. Optimise the hero/poster for first load.
- While masters are unavailable, use approved existing Czech images where possible and clearly marked local placeholders otherwise. Never imply a generated image depicts an actual clinic/person/product installation.
- Refresh Czech copy with native review; keep headings concise and use accurate local contacts. Do not publish historical event dates/prices as current offers.

## 11. SEO, migration and accessibility

- Produce an explicit old URL → new URL → reason/status map, including query-ID links, education aliases, renamed trainer path, broken audience URLs, downloadable files and fragments. Recover equivalent content before choosing redirects.
- Existing good URLs remain where useful. Use permanent redirects only for decided equivalents. No blanket redirect of every 404 to the homepage.
- Fragments are browser-side: retain old IDs or map them explicitly. Check actual anchors on redirected content.
- Handle `/neurac/` deliberately because its role changes from redirect to method page. Confirm intent and incoming links before launch.
- Preserve the shop host, mail DNS, clinic domain and working booking service. WordPress cart/checkout/account remnants receive an owner-approved disposition; do not silently migrate customer accounts or orders.
- Server-rendered core copy, meaningful metadata, canonical host, social images, sitemap/robots, breadcrumbs, descriptive image alternatives and schema for actual page content. No fake reviews, unsupported ratings or unavailable events in schema.
- Preview is noindex/protected; production indexing configuration must be tested at cutover. Track 404s and search performance after launch.
- WCAG 2.2 AA as implementation target: contrast, visible focus, keyboard menus/dialogues, labelled forms, usable error summaries, semantic heading order, skip link, reduced motion, and sufficient touch targets.
- Avoid reference issues: multiple H1s on inner pages, metrics initially displaying zero, unlabelled interactions, and content that depends on lazy animation to exist.

## 12. Delivery sequence and acceptance

### A. Review prototype for the owners

Implement the homepage, equipment overview/detail template, education/calendar, safety hub and contact template, with representative approved/explicitly illustrative data and functional navigation/search/filter interactions. Keep unsupported operational actions visibly in test mode. Provide a clear README describing real versus fixture data and every unconnected integration.

Check the homepage and at least one inner template at approximately 390px, 768px and 1440px widths. Capture review screenshots in the development workflow. Verify no horizontal overflow, readable Czech headings, working keyboard navigation and meaningful empty states. Visual review should compare composition, typography, photography, contrast and spacing with the reference, not demand pixel equality.

### B. Production completion after business inputs

Integrate the chosen CMS, approved content/assets, real enquiry routing, trusted session/product sources where available, URL mappings, analytics/consent and monitoring. Retain the authoritative shop/registration services unless a separate migration is commissioned. Build, type checks, relevant tests, route/link checks and accessibility review must pass.

Meaningful tests: course dates past/current/cancelled, empty results, wrong department input, failed enquiry persistence/delivery, unavailable external registration, and redirect/anchor mappings. Avoid tests that only mirror markup. Verify external handoff semantics without submitting purchases or real registrations.

### Required outputs from the coding bot

1. Runnable repository and setup instructions, with environment template containing no secrets.
2. Reusable design tokens/components and documented site configuration.
3. Working prototype routes and explicit test-mode boundaries.
4. Source-labelled content records and asset manifest.
5. Route migration map and broken-link decisions still needing owners.
6. Production backlog and dependencies, grouped by catalogue, education, shop, support, CMS, SEO and future clinic reuse.
7. Summary of completed verification and known gaps. Do not describe unconnected forms, checkout or AI as operational.

## 13. Owner decisions to record before production

Approved relationship with the global brand and permitted assets; active product range and current safety documents; CZ/SK audience and language needs; responsible contacts; current courses/prices/eligibility; registration authority; practitioner-list publication; shop backend/API access; CMS editing workflow; existing booking URL/interface; redirects and archive decisions; hosting/data region and enquiry handling; success metrics.

## 14. Start now

Read both documents. Record assumptions and identify missing inputs. Scaffold the modular Next.js project and implement the review prototype in vertical slices: shared shell/tokens → homepage → catalogue → education → support/contact → migration/QA documentation. Use approved source material, explicit empty states and test adapters so the owners can review the direction without mistaking the prototype for a connected production service.
