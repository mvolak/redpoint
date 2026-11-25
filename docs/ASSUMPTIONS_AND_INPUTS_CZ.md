# Assumptions, missing inputs and owner decisions

Stav k 24. 11. 2026. Původně připraveno pro schůzku s majitelem 2. 11. 2026.

## Missing inputs

| Input | Impact | Workaround in prototype |
|---|---|---|
| **`Redcord_CZ_Current_Site_Inventory_v0.1.md`** (doprovodná inventura, na kterou odkazuje zadání). **V repozitáři není.** | Nebylo možné ověřit seznam rout, nefunkční odkazy, metadata souborů ani přesné původní cesty | 10 klíčových stránek redcord.cz bylo přečteno přímo 1. 11. 2026. Cesty ke konferenci, foto-vzdělávání a pozůstatkům WooCommerce jsou označeny „verify in inventory“. |
| Schválený zdrojový soubor loga, manuál značky, licencovaná písma | Vizuální věrnost | Dočasné textové logo; Inter Variable |
| Schválené fotografie a videa | Kompozici nelze posoudit se skutečnými snímky | Označené zástupné obrázky s fotografickým zadáním (`docs/ASSET_MANIFEST.md`) |
| Aktuální sortiment a texty k produktům | Detailní stránky nemají obsah o použití | Názvy z navigace redcord.cz, neutrální shrnutí, „Popis použití připravujeme“ |
| Aktuální termíny kurzů, ceny a subjekt odpovědný za registraci | Žádné skutečné nadcházející termíny | Program 2020 je archivovaný. Ilustrativní termíny (označené) předvádějí rozhraní. |
| Bezpečnostní dokumenty (upozornění, péče, rozsah kontrol, školení) | Stránky o bezpečnosti nemají obsah | Stav „nedostupné“ a kontakt na servis. Žádné generované bezpečnostní pokyny. |
| Souhlas terapeutů se zveřejněním | Adresář je prázdný | Prázdný stav; zjištěný počet a města jen v poznámce pro kontrolu |
| Skutečný katalog kliniky pro rezervace (služby, ceny, terapeuti, pracovní doba, podmínky) | Rezervace běží na syntetických testovacích datech | Vložená rezervace na `/rezervace/` se syntetickými daty a pouze zachycovanými e-maily (`docs/booking/README.md`) |
| Texty a cesty zásad ochrany osobních údajů a cookies | Zástupné stránky | `/ochrana-osobnich-udaju/` a `/cookies/` jako zástupné stránky. Konečné cesty je ještě třeba dohodnout. |
| Zpracování poptávek (kdo je přijímá, region uložení, doba uchování) | Žádný produkční adaptér | Jen testovací adaptér |

## Assumptions made

1. **Language:** pouze čeština (`lang="cs"`). Publikum z ČR a SR obslouží český web. Slovenština vyžaduje rozhodnutí.
2. **Department routing:** formulář nabízí Obchod a instalace / Vzdělávání / Servis. „Servis“ jako samostatný cíl je návrh; na současném webu spadá servis pod obchodní oddělení (stejný e-mail, jiný telefon).
3. **Audience model:** `klinika` / `trener` / `jednotlivec`, v souladu se třemi současnými dlaždicemi na redcord.cz.
4. **Shop links** vedou na zjištěné URL kategorií (`/7-vybaveni`, `/6-vzdelavani`), nikoli přímo na produkty. Nejsou ověřené.
5. **Trainer path** sjednocena na `/vzdelavani/treneri/`, s dočasnými (307) přesměrováními z `/vzdelavani/vzdelavani/` a `/vzdelavani/trener/` pouze v náhledu.
6. **`/neurac/`** se stává stránkou o metodě (dnes přesměrovává na vzdělávání). Příchozí odkazy je třeba před spuštěním zkontrolovat.
7. **Workshops** uvedené v programu 2020 jsou modelovány jako definice kurzů s podmínkou účasti „Upřesní vlastník“. Zda se stále konají, není známo.
8. **Course price display:** ceny z roku 2020 se zobrazují jen na archivních kartách s označením „Cena 2020“. Nadcházející kurzy ukazují „Na dotaz“, pokud neexistuje schválená cena.
9. **Rate limiting** se drží v paměti každé instance (prototyp). Produkce potřebuje sdílené úložiště.
10. **Hero:** ukazatele důvěryhodnosti vpravo jsou nahrazeny seznamem služeb, protože žádný ukazatel není schválený. Formulace o místním zastoupení („výhradní zastoupení“) se v hero sekci nepoužívá, pouze v patičce a kontaktních údajích, které citují současný web.
11. **Rezervace kliniky je vložená do webu (rozhodnutí z 2. 11. 2026).** Vedoucí projektu rozhodl vložit stávající aplikaci Redpoint Booking v1 přímo do tohoto webu (`packages/booking`, `/rezervace/`) místo externího odkazu, jak původně stanovilo zadání v §6. Jde o stejnou rezervační aplikaci a stejné databázové schéma, přesunuté, nikoli přestavěné. Umístění na doméně a pod značkou stále čeká na odpověď majitele (`docs/booking/README.md`, „Open decisions“).

## Source inconsistencies found (need owner answers)

- Počet proškolených ročně: „více jak 200“ (statistiky na úvodní stránce) vs. „přibližně 250“ (životopis na úvodní stránce).
- Výuka Neurac od roku 2000 (časová osa) vs. „od roku 2002“ (životopis).
- Název kurzu: „Active Pro“ (nadpis stránky) vs. „Active Pro Specialist“ (navigace).
- `/jednotlivec/` má titulek „REDCORD ACTIVE/SPORT PROFESSIONALS“, který neodpovídá jejímu obsahu.
- `/jednotlivec/` tvrdí „Studie ukazují…“ bez uvedení zdroje. Vynecháno.
- Termíny balíčku Neurac 2 „Květen - Listopad 2020 Říjen – Listopad 2020“ si odporují.
- U jednoho záznamu terapeuta je zapomenutý štítek „SCHOVÁNO“ (skryto). Skryté záznamy se nesmějí nikdy znovu zveřejnit.
- Letáky Neurac 1 a Neurac 2 sdílejí jedno PDF z roku 2019.

## Owner decisions to record before production (brief §13)

- [ ] Vztah ke společnosti Redcord AS / globální značce; povolené logo, obrazový materiál a tvrzení
- [ ] Aktivní sortiment; aktuální bezpečnostní dokumenty a jejich vlastníci
- [ ] Publikum z ČR a SR a jazykové potřeby
- [ ] Odpovědné kontakty za jednotlivá oddělení (jména, telefony, e-maily)
- [ ] Aktuální kurzy, ceny, podmínky účasti, lektoři; **subjekt odpovědný za registraci**
- [ ] Seznam terapeutů: souhlas, zobrazované údaje, četnost revizí
- [ ] Přístup k backendu/API obchodu (PrestaShop) a pravidla pro přímé odkazy na produkty
- [ ] Postup úprav v CMS (koncept/náhled/zveřejnění, vlastnictví médií)
- [ ] Rezervace: umístění na doméně a pod značkou (redcord.cz/rezervace vs. booking.redpoint-clinic.cz), skutečný katalog, produkční infrastruktura, informace o zpracování údajů pacientů
- [ ] Rozhodnutí o přesměrováních a archivu (`docs/MIGRATION_MAP.md`)
- [ ] Hosting a region uložení dat; zpracování poptávek a doba uchování
- [ ] Měřítka úspěchu a přístup k souhlasům
