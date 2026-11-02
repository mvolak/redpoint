# WordPress (Divi) integration checklist

The booking app is a separate site. WordPress only **links** to it — no plugin, no iframe, no REST writes, no CORS, no shared cookies.

## Before you start

- [ ] Production booking URL resolves over HTTPS and passed staging acceptance.
- [ ] Full WordPress backup (files + DB) taken; affected Divi layouts exported (Divi → Library / Portability).
- [ ] Spreadsheet of every current booking destination (page, module, current URL → new URL).

## Replace booking buttons

1. Homepage: open in Divi Visual Builder → each booking **Button** module → *Content → Link → Button Link URL* (labels may differ in the installed Divi 4) → replace the Memberzone URL with `https://booking.redpoint-clinic.cz/`. Keep "open in same window".
2. Repeat on therapist, method, service and pricing pages; header/footer; Global modules; Theme Builder templates; pop-ups; mobile-specific variants/visibility duplicates.
3. Optional deep links (only after creating the slugs in the booking catalogue):
   - `https://booking.redpoint-clinic.cz/?service=vstupni-vysetreni`
   - `https://booking.redpoint-clinic.cz/?service=kontrolni-terapie&therapist=<approved-slug>`
   Never put patient data in links. Unknown slugs are ignored by the app.
4. Generic HTML fallback (Text/Code module):
   ```html
   <a href="https://booking.redpoint-clinic.cz/">Rezervovat termín</a>
   ```
5. `/book-appointment/`: remove the `[bookingpress_form]` shortcode; add a clear button to the booking app plus reception phone/email — or configure a **temporary (302)** server-side redirect of that single path. Don't redirect the whole site.
6. Capacity pop-up: replace with clinic-approved wording matching the current mode (automatic / request-only / paused). Don't assume capacity is open.
7. Save; purge WordPress cache plugin + CDN; check pages logged out on desktop and mobile.

## Acceptance

- [ ] Crawl the public site (e.g. Screaming Frog or `wget --spider -r`) and confirm no unintended `memberzone` link remains.
- [ ] Each CTA opens the booking app in the same tab; "← Zpět na web kliniky" returns to the site.
- [ ] Synthetic booking → visible to reception → confirmation email → cancellation via link → conflict case → request-only submission labelled "není potvrzená rezervace".
- [ ] `booking.redpoint-clinic.cz/admin`, `/manage` are `noindex` (X-Robots-Tag) — verify with `curl -I`.

## Rollback

Switch the CTAs to the reception contact page / phone. Do not revert to Memberzone.
