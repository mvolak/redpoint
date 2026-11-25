# Route migration map (draft)

Strojově čitelným zdrojem je `apps/redcord-web/src/config/redirects.ts`, testovaný v `redirects.test.ts`: jedinečné zdroje, existující cíle, žádné řetězce přesměrování, žádné plošné přesměrování na domovskou stránku a deklarované kotvy.
V náhledu se z pravidel `proposed` stávají **dočasná (307)** přesměrování. Trvalá (308) jsou pouze pravidla `decided`. Neznámé URL vracejí 404, nikdy domovskou stránku.

Cílem je buď cesta v aplikaci, nebo **absolutní https URL** na hostiteli uvedeném v `EXTERNAL_REDIRECT_HOSTS` (aktuálně `www.redpoint-clinic.cz`, `obchod.redcord.cz`). Testy odmítnou jakéhokoli jiného hostitele, cíle bez https i cíle relativní k protokolu `//…`. Hostitele přidávejte až po potvrzení majitelem. Externí fragmenty (např. `#neurac`) odsud nelze ověřit; zkontrolujte je ručně. `pnpm inventory:compare` externí přesměrování hlásí, ale nenásleduje je.

| Old URL | New URL | Status | Reason |
|---|---|---|---|
| `/` | `/` | keep | Nová kompozice |
| `/vybaveni/` | `/vybaveni/` | keep | Přestavěno s filtrem podle cílové skupiny |
| `/vybaveni/fyzioterapeut/` | `/vybaveni/?pro=klinika` | proposed | Dlaždici cílové skupiny nahradil filtr katalogu; nejprve zkontrolujte obsah stávající stránky |
| `/vybaveni/trener/` | `/vybaveni/?pro=trener` | proposed | Viz výše |
| `/vybaveni/jednotlivec/` | `/jednotlivec/` | proposed | Stránka cesty pro jednotlivce |
| `/vybaveni/doplnky/` | — | **needs owner** | Obsah o doplňcích není ověřený; možná jde přímo o kategorii e-shopu |
| `/vybaveni/instalace/` | `/vybaveni/instalace/` | keep | **Dnes odkazovaná, ale vrací 404**: obnoveno |
| `/vybaveni/<product>/` (původní stránky jednotlivých produktů) | `/vybaveni/<slug>/` | **needs owner** | Původní URL produktů nebyly staženy; namapovat jednu po druhé podle inventury |
| `/vzdelavani/` | `/vzdelavani/` | keep | |
| `/vzdelavani/neurac/` | `/vzdelavani/neurac/` | keep | |
| `/vzdelavani/vzdelavani/` | `/vzdelavani/treneri/` | proposed | Normalizace cesty |
| `/vzdelavani/trener/` | `/vzdelavani/treneri/` | proposed | Odkazováno z dlaždice na /vzdelavani/ |
| `/vzdelavani/jednotlivec/` | `/jednotlivec/` | proposed | Odkazováno z dlaždice na /vzdelavani/ |
| `/vzdelavani/vzdelavaci-program/` | `/vzdelavani/vzdelavaci-program/` | keep | Tabulka z roku 2020 přesunuta do archivu |
| `/vzdelavani/workshopy/` | `/vzdelavani/workshopy/` | keep | **Dnes 404**: obnoveno s pravdivě uvedeným stavem |
| `/vzdelavani/konference/` | — | **needs owner** | Potvrdit přesnou cestu a zda stránku archivovat |
| Foto vzdělávání (cesta bude upřesněna) | — | **needs owner** | Galerie je mimo rozsah |
| `/neurac/` | `/neurac/` | keep (změna role) | Dříve přesměrování na vzdělávání; nyní stránka o metodě. Zkontrolujte příchozí odkazy. |
| `/neurac/certified-neurac-practitioner/` | `/neurac/#certifikace` | proposed | Sloučeno; kotva `certifikace` je zaručena |
| `/neurac/kdo-jsou-certified-neurac-practitioners/` | stejná | keep | Pouze schválené záznamy |
| Položka menu „Léčba Neurac“ → `redpoint-clinic.cz/fyzioterapie/#neurac` | beze změny (externí) | keep | Doména kliniky zůstává nedotčena; kotva neověřena |
| `/neurac/lecba-neurac/` | `https://www.redpoint-clinic.cz/fyzioterapie/#neurac` | proposed (externí) | Už dnes jde o 301 na web kliniky; ponechán stejný cíl. Kotva neověřena |
| `/jednotlivec/` | `/jednotlivec/` | keep | |
| `/bezpecnost/` | `/bezpecnost/` | keep | |
| `/bezpecnost/bezpecnostni-oznameni/` | stejná | keep | Obsah od majitele |
| `/bezpecnost/technicke-kontroly/` | stejná | keep | **Dnes 404**: obnoveno se servisním formulářem |
| `/bezpecnost/pece-a-udrzba/` | stejná | keep | Obsah od majitele |
| `/bezpecnost/skoleni-bezpecnosti/` | stejná | keep | Obsah od majitele |
| `/kontakt/` | `/kontakt/` | keep | Rozšířeno o směrování dotazů a formulář (`#poptavka`) |
| `/kontaktujte-nas/` | `/kontakt/#poptavka` | proposed | Formulář sloučen |
| `/novinky/` | — | **needs owner** | Archivovat, nebo zrušit |
| `/?s=…` (vyhledávání WordPressu) | `/hledat/?q=…` | **needs owner** | Při přechodu implementovat jako přesměrování podle parametru dotazu |
| `/?p=…` / `/?page_id=…` (odkazy s ID v parametru) | podle ID | **needs owner** | Každé ID dohledat v inventuře / exportu WordPressu; žádné plošné pravidlo |
| `/wp-content/uploads/…` (PDF letáky, program) | stejná nebo namapovaná | **needs owner** | Platné soubory ponechat na stejné URL, nebo je přesně namapovat |
| Košík / pokladna / účet WordPressu | — | **needs owner** | Pozůstatky WooCommerce: účty ani objednávky se nemigrují |

## Page inventory findings (2 November 2026)

`pnpm inventory:old` prošel 39 URL na redcord.cz: **14 funkčních stránek, 10 přesměrování, 15 × 404**. Jednotlivé URL najdete v `inventory/comparison.html`.

- **Broken redirect chains:** `/vybaveni/trener/` → `/vybaveni/active/` → `/vybaveni/vybaveni-4/` → 404 a `/vybaveni/jednotlivec/` → `/vybaveni/vybaveni-3/` → 404.
- **Live WooCommerce leftovers:** `/obchod/`, `/kosik/`, `/pokladna/`, `/muj-ucet/`. Nyní jsou v mapě jako `needs-owner`.
- **All 4 linked PDFs return 404:** oba letáky kurzů, leták Neurac 3 a program na rok 2020. Spolu s chybějícími obrázky to naznačuje poškozenou složku `wp-content/uploads`; obnovte ji ze zálohy WEDOS.
- **Úvodní stránka nemá H1.** Jedna stránka odkazuje na e-mailovou adresu, jako by šlo o URL (`/neurac/kdo-jsou-certified-neurac-practitioners/skamilla@seznam.cz/`).
- **`/neurac/lecba-neurac/`** je externí 301 na web kliniky. Nyní je v mapě jako navrhované externí přesměrování na stejnou URL.

## Fragments

Fragmenty se na server nikdy nedostanou. Kotvy, které stránky musí zachovat, jsou deklarované v `REQUIRED_ANCHORS`: `/neurac/#certifikace`, `/kontakt/#poptavka`. Ostatní příchozí fragmenty (např. `#neurac` na webu kliniky) je třeba sepsat podle inventury.

## Broken links still needing owners

- `/vybaveni/instalace/`, `/vzdelavani/workshopy/`, `/bezpecnost/technicke-kontroly/`: obnoveny, ale potřebují **schválený obsah**.
- `/vybaveni/doplnky/`, `/vzdelavani/konference/`, foto-vzdělávání, `/novinky/`: není zvolen žádný cíl.
