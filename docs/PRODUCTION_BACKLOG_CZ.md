# Production backlog and dependencies

Fáze B zadání. Každá položka závisí na podkladech od majitele (viz `ASSUMPTIONS_AND_INPUTS.md`). „Dep“ uvádí, co položku blokuje.

## Catalogue
- [ ] Schválený sortiment, texty (použití, cílové skupiny), obrazový materiál pro každou produktovou řadu. Dep: majitel/globální partner.
- [ ] Mapování produktových řad na přímé odkazy do obchodu (náhrada odkazů na kategorie). Dep: přístup k obchodu.
- [ ] Rozhodnutí o příslušenství (`/vybaveni/doplnky/`).
- [ ] Volitelný důvěryhodný adaptér katalogu (`packages/integrations`) pro dostupnost; ceny pouze z důvěryhodného zdroje.
- [ ] Schválené časté dotazy k nákupu a instalaci.

## Education
- [ ] Závazný zdroj termínů (kolekce v CMS nebo API registračního systému) implementující kontrakt `CourseSession`. Dep: subjekt odpovědný za registraci.
- [ ] Ověřené registrační URL pro každý termín; kapacita jen při napojení (`capacitySource`).
- [ ] Odstranit testovací data `illustrativeSessions`; produkce je už skrývá.
- [ ] Výstupy kurzů, lektoři, prohlášení o akreditaci (zákon 96/2004 Sb.) po ověření.
- [ ] Rozhodnutí o workshopech a konferenci; pravidla archivace minulých termínů.

## Shop
- [ ] Ponechat PrestaShop (obchod.redcord.cz) odděleně; zdokumentovat předání a zpětné odkazy.
- [ ] Atribuce kampaní u odchozích odkazů (bez osobních údajů).
- [ ] Pozůstatky košíku, pokladny a účtu z WordPressu: naložení s nimi schválené majitelem.

## Support, enquiries, safety
- [ ] **Production enquiry adapter**: trvalé ukládání (např. PostgreSQL/Supabase v dohodnutém regionu) + předání do schránek oddělení + upozornění na selhání. Stav `accepted` hlásit až po uložení. Pravidla uchovávání. Dep: rozhodnutí o hostingu a datech.
- [ ] Omezení počtu požadavků se sdíleným úložištěm a ochrana proti botům (náhrada limitu v paměti).
- [ ] Bezpečnostní obsah, dokumenty s verzí, vlastníkem a schválením. Dep: majitel/výrobce.
- [ ] Obsah stránky o rozsahu a intervalu kontrol.
- [ ] Adresář terapeutů: záznamy se souhlasem, data revizí, filtr podle města (rozhraní je připravené).

## CMS and content operations
- [ ] Vybrat CMS s koncepty, náhledem a zveřejněním, rolemi a vlastnictvím médií; implementovat nad ním `ContentRepository`. Dočasně je možný WordPress jako headless CMS; nikdy nevykreslovat surové HTML z Elementoru.
- [ ] Převést záznamy `pending` se schvalovacím postupem; texty `proposal` nechat zkontrolovat rodilým mluvčím češtiny.
- [ ] Zpracování médií podle `ASSET_MANIFEST.md`.
- [ ] Texty zásad ochrany osobních údajů a cookies; dohodnout konečné cesty.

## SEO, migration, analytics, accessibility
- [ ] Dokončit `redirects.ts` podle doprovodné inventury (odkazy s ID v query, nahrané soubory, fragmenty); dohodnutá pravidla přepnout na `decided`.
- [ ] Přesměrování dotazu WordPressu `?s=` → `/hledat/` při přechodu.
- [ ] Produkční metadata: kanonický host, OG obrázky, schema.org (Organization, Course/Event jen pro skutečné termíny, Product jen se skutečnými daty). Žádná hodnocení ani recenze.
- [ ] Ochrana náhledu (autentizace) navíc k noindex; při přechodu otestovat indexaci produkce.
- [ ] Správa souhlasů, nástroj pro analytiku napojený na stávající kontrakt událostí; respektovat odmítnutí. Nepřebírat starý pixel.
- [ ] Sledování chyb 404 a Search Console po spuštění.
- [ ] Úplný audit WCAG 2.2 AA (průchod se čtečkou obrazovky, kontrast na finálních obrázcích, zvětšení 400 %).
- [ ] CI: typová kontrola, testy, build, kontrola odkazů, `pnpm review` proti náhledovému nasazení.

## Future clinic reuse (Redpoint)
- [ ] `apps/redpoint-web` s vlastním `site.ts` a souborem tokenů; znovu použít `ui`, rozhraní `content` a `integrations`.
- [x] Stávající rezervační aplikace vložena jako `packages/booking` na `/rezervace/` (2. 11. 2026). Jde o stejnou aplikaci a schéma, ne o druhou databázi termínů. Přihlašování pacientů a personálu zůstává oddělené od jakéhokoli přihlašování v e-shopu.
- [ ] Rezervace v produkci: hostovaný Postgres + zálohy, Supabase Auth s MFA, SMTP, worker nebo cron (`/api/rezervace/cron/outbox/`), skutečný katalog, informace o ochraně osobních údajů. Viz `docs/booking/README.md` a `docs/booking/DEPLOYMENT.md`.
- [ ] Prohlížečové testy rezervací v CI (`scripts/booking-e2e.mjs` potřebuje databázovou službu).
- [ ] Až vznikne `apps/redpoint-web`, rozhodnout, zda se `/rezervace/` přesune tam a redcord.cz bude přesměrovávat na ni.

## Explicitly out of scope until separately commissioned
Nový systém přihlášek, platby, certifikáty či vzdělávací portál, lokální košík, AI chat nebo autonomní poradenství či transakce.
