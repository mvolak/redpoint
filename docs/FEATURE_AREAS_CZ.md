# Feature areas

Samostatná témata tohoto projektu pro plánování další práce. Jde o mapu oblastí, ne o seznam stránek či rout. Konkrétní otevřené úkoly jsou v `PRODUCTION_BACKLOG.md`, rozhodnutí majitele v `ASSUMPTIONS_AND_INPUTS.md` a podrobnosti k rezervacím v `booking/README.md`. Anglická verze: `FEATURE_AREAS.md`.

Last updated: 24 Nov 2026.

## Status legend

| Status | Význam |
|---|---|
| **Done** | Hotovo a funkční v současné fázi (prototyp k připomínkám / staging). |
| **Partial** | Hotovo zčásti, nebo funguje jen s testovacími daty či testovacími adaptéry. |
| **Owner input** | Kód je připravený; čeká se na obsah, data nebo rozhodnutí majitele či kliniky. |
| **Deferred** | Záměrně odloženo. |
| **Not started** | Zatím nezačato. |

„Done“ znamená hotovo pro prototyp a staging, ne připraveno pro produkci. Připravenost pro produkci sleduje `PRODUCTION_BACKLOG.md`.

## Site and content

| # | Area | Status | Notes |
|---|---|---|---|
| 1 | **Content model and provenance:** zdroj a stav schválení u každého záznamu, odznaky ke kontrole v náhledu, v produkci jen schválené záznamy | Done | Většina záznamů stále čeká na schválení majitelem (viz 2). |
| 2 | **Content pages:** vybavení, vzdělávání, Neurac, servis a bezpečnost, o nás, kontakt | Partial | Stránky jsou hotové; obsah je ve stavu `pending` / `proposal`, dokud ho majitel nezkontroluje. |
| 3 | **Course catalogue and dates:** kalendář kurzů, ilustrativní termíny, předání na externí registraci | Partial | Kalendář ukazuje ilustrativní termíny jen v náhledu; skutečné termíny chybí. |
| 4 | **Enquiry / consultation form:** validace, limit odeslání, adaptér, který bude zprávy skutečně odesílat | Partial | Jen testovací adaptér; limit odeslání se drží v paměti. |
| 5 | **Search:** vlastní vyhledávání na webu (`/hledat/`) | Done | |
| 6 | **Navigation and header:** menu, mobilní menu, tlačítka Konzultace / Rezervace / E-shop | Done | |
| 7 | **Design system / UI kit:** `packages/ui`, Tailwind tokeny, komponenty, přístupnost | Done | |
| 8 | **Media and images:** mediální sloty, stažení ze starého webu, kontrola a zveřejnění, logo | Partial | Staženo do `assets-inbox/`; čeká se na kontrolu majitelem v `review.csv` a na zveřejnění. |
| 9 | **Brand identity:** logo, textové logo, barvy, písma | Owner input | Chybí schválený zdrojový soubor loga; v hlavičce je dočasné textové logo. |

## Migration and SEO

| # | Area | Status | Notes |
|---|---|---|---|
| 10 | **Migration map and redirects:** staré → nové URL, externí přesměrování, rozhodnutí majitele | Partial | Otevřené položky `needs-owner`; přesměrování `proposed` (včetně externího pro Neurac) čekají na potvrzení. |
| 11 | **Page inventory:** procházení starého webu, porovnání starého a nového | Done | |
| 12 | **SEO and indexing:** metadata, sitemap, robots, noindex v náhledu, strukturovaná data | Partial | Noindex a robots pro náhled jsou hotové; SEO pro produkci je v backlogu. |

## Integrations

| # | Area | Status | Notes |
|---|---|---|---|
| 13 | **E-shop hand-off:** odkazy na obchod.redcord.cz | Done | |
| 14 | **Redpoint Clinic:** odkazy a vztah obou webů (redcord.cz a redpoint-clinic.cz) | Partial | Rezervace je vložená do redcord.cz; dlouhodobý vztah k webu kliniky není rozhodnutý. |
| 15 | **Email (SMTP):** poskytovatel, adresa odesílatele, šablony, testovací schránka vs. produkce | Partial | Staging posílá do sandboxu Mailtrap; produkční poskytovatel ani odesílatel nejsou vybraní. Viz `EMAIL.md`. |

## Booking

| # | Area | Status | Notes |
|---|---|---|---|
| 16 | **Booking wizard:** služba, termín, údaje, shrnutí, ověření e-mailu | Done | Celý průchod ověřen lokálně; test na stagingu skončil u kroku s kódem a je potřeba ho zopakovat. |
| 17 | **Guest verification (OTP):** kódy, limity, relace hosta | Done | |
| 18 | **Managing a booking:** odkaz z e-mailu, změna termínu, zrušení | Done | Pokryto DB testy; na stagingu zatím nevyzkoušeno. |
| 19 | **Booking rules:** automatické potvrzení vs. na žádost, rezervační okna, storno podmínky | Owner input | Pravidla jsou implementovaná; hodnoty musí potvrdit klinika. |
| 20 | **Schedules and availability:** pracovní doba, výjimky, svátky, výpočet volných termínů | Owner input | Logika je hotová; chybí skutečná pracovní doba. |
| 21 | **Catalogue:** služby, ceny, délky, terapeuti, pobočky | Owner input | Jen syntetická testovací data. |
| 22 | **Notifications:** fronta (outbox), potvrzení, připomínky, cron worker | Partial | Fronta funguje; na stagingu není naplánovaný cron, takže e-maily z fronty se neodesílají. |

## Staff and security

| # | Area | Status | Notes |
|---|---|---|---|
| 23 | **Staff authentication:** Supabase Auth, přihlášení, obnova hesla | Done | Propojen jeden admin; pro odkazy na obnovu hesla je potřeba nastavit Site URL v Supabase. |
| 24 | **Two-factor sign-in (MFA)** pro personál | Deferred | Kód to podporuje; `STAFF_REQUIRE_MFA` je na stagingu vypnuté. Před produkcí povinné. |
| 25 | **Authorization / roles:** admin, recepce, terapeut a co kdo vidí | Partial | Role jsou vynucené v kódu; zatím existuje jen účet admina. |
| 26 | **Admin UI:** kalendář, rezervace, žádosti, personál, nastavení, audit log | Done | |
| 27 | **Audit log:** kdo co změnil | Done | |
| 28 | **App security:** CSP a bezpečnostní hlavičky, kontrola původu požadavků (CSRF), limity požadavků, kontroly prostředí, tajné klíče | Done | Vývojový režim jen na localhostu (PR #2); před produkcí znovu zkontrolovat. |

## Data and compliance

| # | Area | Status | Notes |
|---|---|---|---|
| 29 | **Database:** Supabase Postgres, migrace, RLS, testovací data | Done | Stagingová databáze se syntetickými daty. |
| 30 | **Backup and restore:** zálohy, zkouška obnovy | Not started | Postup je popsaný v `booking/BACKUP_RESTORE.md`; zatím nebyl nikdy proveden. |
| 31 | **GDPR and privacy:** souhlasy, zásady ochrany osobních údajů, doba uchování a mazání údajů pacientů, cookies | Owner input | Vyžaduje rozhodnutí majitele / právníka o textech a době uchování. |
| 32 | **Legal texts:** obchodní podmínky, údaje o firmě | Owner input | |

## Operations

| # | Area | Status | Notes |
|---|---|---|---|
| 33 | **Environments:** lokální, náhled / staging, produkce a proměnné pro každé z nich | Partial | Lokální prostředí a staging jsou nastavené; produkční prostředí neexistuje. |
| 34 | **Deployment:** Vercel, produkční doména, DNS, přechod ze starého webu | Partial | Staging běží na Vercelu; doména, DNS a přechod zatím nezačaly. |
| 35 | **Monitoring and logs:** chyby, dostupnost, upozornění na výpadek cronu | Not started | |
| 36 | **Analytics:** měření návštěvnosti, podmíněné souhlasem | Not started | Přepínač funkce je vypnutý. |
| 37 | **Testing and QA:** unit testy, DB testy rezervací, Playwright review, kontroly přístupnosti | Done | 54 unit testů, 62 DB testů rezervací, Playwright review a E2E skripty pro rezervace. |
| 38 | **CI / repo workflow:** GitHub, PR, automatické kontroly před merge | Not started | Na PR běží jen buildy Vercelu. |
| 39 | **Developer environment:** Windows / Git Bash, pnpm, Node, Docker | Partial | Funguje; po změně verze Node spustit `corepack enable pnpm`. |
| 40 | **Documentation:** README, CLAUDE.md, dokumenty v `docs/`, rozhodnutí majitele | Done | Průběžně; aktualizovat s každou změnou. |
