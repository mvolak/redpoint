# Asset manifest

## Image workflow

Každá pozice obrázku je **slot** definovaný v `packages/content/src/media/slots.json` (id, stránka, zadání, poměr stran, minimální šířka). Stránky vykreslují `<Media slot="…">`, který zobrazí přiřazenou fotografii, nebo popsaný zástupný prvek, pokud žádná přiřazená není.

| Step | Command | Result |
|---|---|---|
| 1. Sběr | `pnpm images:harvest` | Projde redcord.cz a stáhne největší dostupnou verzi každého obrázku do `assets-inbox/redcord-cz/` (nezveřejňuje se, ignorováno gitem). Zapíše `manifest.json`, `review.csv` (UTF-8, `;`, otevře se v české verzi Excelu) a `index.html` (náhledový přehled). Při opakovaném spuštění zůstanou sloupce majitele zachovány. |
| 2. Rozhodnutí | Majitel upravuje `review.csv` | `slot` (jedno nebo více id slotů oddělených `\|`), `approval` (`approved` / `pending`), `alt_cs` (povinné), `focal` (`50% 30%`), `credit`, `notes` |
| 3. Kontrola | `pnpm images:check` | Neznámé sloty, duplicitní sloty, chybějící alternativní text a problémy s rozlišením. Fotografie užší než polovina minimální šířky slotu je **odmítnuta** (bez zvětšování); fotografie mezi polovinou a plným minimem je povolena, ale označena. |
| 4. Zveřejnění | `pnpm images:promote` | Zapíše optimalizované zdrojové soubory (≤ 2560 px, bez EXIF/GPS údajů) do `apps/redcord-web/public/media/redcord-cz/` a znovu vygeneruje `packages/content/src/media/registry.generated.json` |

Pravidla zveřejnění: **náhled** zobrazuje fotografie `approved` i `pending`, přičemž čekající mají odznak „Foto: redcord.cz · čeká na schválení“ a fotografie s nízkým rozlišením odznak „nízké rozlišení“. **Produkce** zobrazuje pouze fotografie `approved`. Next.js automaticky poskytuje zmenšené verze ve formátech AVIF/WebP.

Dodané originály (záloha WordPressu, mediální sada Redcord AS) procházejí stejnou tabulkou. Soubory vložte do `assets-inbox/redcord-cz/files/`, doplňte do tabulky řádky a poté spusťte krok promote. Id slotů se nemění, takže není potřeba měnit kód stránek.

## Harvest result, 2 November 2026

- Prošlo se 37 stránek; odkazují na 45 různých obrázků.
- **Stáhnout se podařilo jen 4 použitelné obrázky.** 31 odkazovaných souborů vrací na `www.redcord.cz` 404 a původní hostitel `202499.w99.wedos.ws` neodpovídá. 10 obrázků bylo malých (portréty terapeutů zhruba 200×250, logo), proto byly zapsány do seznamu, ale nestaženy.
- 3 fotografie jsou přiřazeny jako návrhy ve stavu `pending`: `neurac-vybaveni` (1920×1080 → karta kliniky na domovské stránce a produkt Workstation), `slider-2` a `slider-0` (780×420, označeny kvůli nízkému rozlišení → karta trenéra a karta vzdělávání Active). Vypadají jako marketingové fotografie Redcord AS, proto je třeba ověřit uvedení autora a povolení k použití.
- `mgr-alice-hamackova` (2838×3672, portrét konkrétní osoby) není přiřazena; rozhodnutí je na majiteli.
- Po procházení začal web odpovídat **401/429** (ochrana hostingu proti botům). Sběr znovu nespouštějte, dokud to majitel nepovolí nebo nepřidá výjimku. Lepším zdrojem je nyní **záloha WordPressu `wp-content/uploads` z WEDOS**, která by měla obsahovat i soubory, o které živý web přišel.

## Slot list

Dříve byly všechny sloty jen zástupnými prvky. Níže uvedená tabulka uvádí u každého slotu zadání a stav. Nic nebylo převzato z redcord.com ani z Wixu.

Povinné údaje u každého schváleného assetu: **id, zdroj, vlastník/povolení, alternativní text (cs), rozměry, ohnisko, použití, konec platnosti licence**. Zdrojové soubory ukládejte do řízeného úložiště a generujte z nich responzivní odvozené verze (AVIF/WebP) s rezervovanými rozměry.

| Slot | Where | Brief | Ratio | Status |
|---|---|---|---|---|
| Logo | Hlavička, patička | Schválené logo Redcord (SVG), červená a bílá verze | — | **Chybí**: zástupné textové logo |
| Pozadí úvodní sekce | `/` | Fyzioterapeut s klientem na Redcord Workstation ve skutečném zařízení; volitelně ztlumené smyčkové video s úvodním snímkem a ovládáním pauzy | 21:9 pro desktop, výřez pro mobil | Chybí |
| Karty cílových skupin ×3 | `/` | Terapie na klinice; trenér a sportovec; jednotlivec doma | 3:4 | Chybí |
| Přehled vybavení | `/` | Instalace ve skutečném prostoru: rám, závěsné body, lana | 4:5 | Chybí |
| Instalace | `/`, `/vybaveni/instalace/` | Technik upevňující stropní závěsný bod; příklady z kliniky a studia | 4:3, 3:4 | Chybí (původní obrázky instalací možná existují; obnovit z hostitele WEDOS) |
| Referenční klinika | `/` | Velký sál v Redpoint Clinic CZ (Praha / Hradec Králové) | 4:3 | Existuje na redcord.cz (zjištěny popisky); chybí zdrojové soubory a povolení |
| Produktové řady ×10 | `/vybaveni/*` | Viz `media.brief` v `packages/content/src/fixtures/products.ts` | 4:3 karta, 4:5 detail | Chybí |
| Karty vzdělávání ×3 | `/vzdelavani/` | Výuka kurzu Neurac; kurz Active; malý workshop | 4:5 | Chybí |
| O nás / tým | `/o-nas/` | Tým AHAMA / Redcord ČR | 4:3 | Chybí |
| Portréty terapeutů | Adresář | Ponechat v malé velikosti; **nezvětšovat** | 1:1 malé | Nemigrováno (čeká se na souhlas) |
| Obrázek pro sdílení | Všechny | Obrázek značky 1200×630 | 1.91:1 | Chybí |

## Downloads (documents)

Z `packages/content/src/fixtures/organisation.ts`:

| id | Title | Version | URL status |
|---|---|---|---|
| letak-fyzioterapeuti | Leták kurzů Neurac pro fyzioterapeuty | 2019-07 | URL zjištěna; aktuálnost neověřena |
| letak-neurac-3 | Leták kurzu Neurac 3 | 2020 | Zjištěn název souboru; přesnou URL je třeba potvrdit |
| letak-treneri | Leták kurzů Redcord Active | 2019-07 | URL zjištěna; aktuálnost neověřena |
| program-2020 | Vzdělávací program 2020 (archiv) | 2020-04-15 | Pouze archiv; URL je třeba potvrdit |
| Bezpečnostní oznámení, návody k péči, dokumentace kontrol | — | — | **Musí dodat majitel** |
