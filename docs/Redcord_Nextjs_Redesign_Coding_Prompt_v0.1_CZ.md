# Redcord.cz Next.js renewal — coding-bot brief

Verze 0.1 · 1. listopadu 2026 · Schůzka: 2. listopadu 2026

Používejte společně s dokumentem `Redcord_CZ_Current_Site_Inventory_v0.1.md`. Jde o návrh zadání pro vývoj. Odlišuje doložený současný stav od navrhovaných funkcí a prototyp pro schůzku od produkční služby.

## 1. Your task

Vytvořte nový český web Redcord v Next.js. Jeho veřejný obchodní rozsah vychází z redcord.cz, vizuální směr z redcord.com. Zachovejte českou regionální distribuci, poptávky vybavení, odborné vzdělávání, cestu jednotlivých zákazníků k vybavení, instalaci, bezpečnost a podporu, informace o terapeutech a odkazy na referenční kliniku. Uspořádejte je do přehledných, moderních zákaznických cest.

Strategie je již zvolena: **dvě veřejné domény, společná platforma**. Redcord se spouští jako první; Redpoint Clinic se ke společnému základu připojí později. Zachovejte odlišnou identitu i publikum obou webů. Stávající samostatná rezervační komponenta kliniky podle vlastníka projektu funguje; nenahrazujte ji ani ji znovu nevytvářejte.

Nejprve dodejte spustitelný prototyp k připomínkám, v README výslovně označený jako koncept ke kontrole vlastníkem. Poté připravte produkční backlog a plán implementace. V rámci tohoto zadání nic nenasazujte, neměňte DNS, neodesílejte skutečné zprávy, nezpracovávejte platby ani neimportujte soukromé záznamy. V této etapě znovu nebudujte kliniku ani kompletní e-shop.

## 2. Reference sources and evidence hierarchy

1. Doprovodná inventura: zjištěné české stránky, routy, nefunkční odkazy, metadata assetů a hranice funkcí.
2. https://www.redcord.cz/ a příslušné české stránky: zdroj obchodního obsahu, podléhá ověření vlastníkem.
3. https://www.redcord.com/ a https://www.redcord.com/redcord-equipment: pouze vizuální a kompoziční reference.
4. Aktuální katalog, termíny kurzů, brand manuál a integrační smlouvy dodané vlastníkem: po dodání závazné.

Nepovažujte staré ceny kurzů, akce z roku 2020, historické kvalifikace, popisky menu, chybějící bezpečnostní stránky ani globální statistiky Redcord za ověřená aktuální česká fakta. U migrovaných záznamů uchovejte zdrojovou URL a stav schválení. Nikdy bez redakčního schválení nepřebírejte celá globální lékařská tvrzení či tvrzení o účinnosti do místního marketingu.

## 3. Experience and business priorities

Primární publikum: fyzioterapeuti a klinická pracoviště, trenéři a sportovní/výkonnostní zařízení, jednotliví kupující vybavení. Sekundární: stávající zákazníci hledající podporu k vybavení; pacienti hledající léčbu; odborníci hledající školení nebo certifikované terapeuty.

Primární konverze: kvalifikovaná poptávka vybavení či instalace, předání na registraci do kurzu, předání na nákup produktu. Podpora musí být snadno dostupná. Rezervace termínu na klinice je sekundární odkaz, nikoli dominantní akce domovské stránky Redcord.

Navrhovaná česká navigace: **Vybavení · Vzdělávání · Neurac · Servis a bezpečnost · O nás · Kontakt**, plus jasně označený cíl **E-shop**. Přidejte kontextový odkaz na **Redpoint Clinic**. Mobilní navigace musí zůstat použitelná i při tomto objemu obsahu; použijte seskupenou podnavigaci místo vtěsnání všech položek do jednoho řádku.

## 4. Visual direction — what was actually observed

Živá desktopová reference používá:

- Bílou hlavičku s malým červeným logem, kompaktní tmavou navigací a černým kontaktním tlačítkem ve tvaru pilulky.
- Široký, odsazený hero panel se zaoblenými rohy; klinické video či fotografie, tmavý překryv, velký bílý nadpis zarovnaný vlevo, červenou primární akci a obrysovou sekundární akci.
- Na desktopu vpravo sloupec metrik dokládajících důvěryhodnost, oddělených tenkými linkami. Hodnoty se v referenci animují; při prvním načtení byly krátce vidět nuly. Naše verze musí vykreslit platné schválené hodnoty bez závislosti na animaci.
- Velkorysé bílé místo a střídání bílých, světle šedých, téměř černých a výrazně červených sekcí.
- Velké, těsně sázené bezpatkové nadpisy; vykreslený H1 měl při zkoumané šířce desktopu zhruba 60px a nadpisy sekcí kolem 45px. Rodiny písem zahrnují Helvetica Neue Bold a aliasy Helvetica.
- Zaoblené karty oblastí použití postavené na fotografii, s tmavým překryvem ve spodní části a střídmým zvýrazněním textu červenou.
- Nadrozměrnou redakční typografii oddělující vybavení a metodu, po níž následuje tmavá sekce o metodě.
- Střídající se řádky obrázek/text, jemné okraje a stíny, červené svislé linky u citací, tmavé karty se statistikami, štítky ve tvaru pilulky a vzdušné formuláře.
- Výraznou červenou sekci akcí, tmavé reference zákazníků a tmavou vícesloupcovou patičku.
- Stránka vybavení používá úvod rozdělený na text a fotografii, zaoblené vysoké obrázky, praktická vysvětlení vlastností a FAQ v podobě akordeonu.

Jde o pozorování z desktopové domovské stránky a stránky vybavení, nikoli o změřený globální design systém ani audit mobilní verze. Nekopírujte chyby vykreslování, překlepy, prázdné či líně načítané panely ani kód Wix.

### Proposed implementation tokens

Následující hodnoty jsou výchozí pro novou implementaci; přímo z reference jsou odebrány pouze červená barva CTA a téměř černá. Finální brand manuál má přednost.

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

Pokud bude dodáno schválené či licencované písmo z rodiny Helvetica, použijte ho. Jinak použijte vhodné otevřené písmo s podporou češtiny, například Inter, instalované lokálně a ověřené na české diakritice. Nevyjímejte z Wixu proprietární soubory písem. Typografický charakter napodobte řezem, prostrkáním a kompozicí, nikoli převzetím nespolehlivých velikostí písma z obalových prvků.

Navrhovaná responzivní škála: H1 clamp(2.25rem, 4.6vw, 4.25rem), H2 clamp(1.75rem, 3.3vw, 3rem), základní text 16–18px, řádkování základního textu 1,5–1,65. Podle potřeby použijte okraje 20px na mobilu, 32px na tabletu a 48–72px pro obsah na desktopu. Rozestupy sekcí přibližně 56px na mobilu a 88–112px na desktopu. Délku řádků základního textu udržujte čitelnou. Jde o cílové hodnoty návrhu, nikoli o změřené CSS reference.

Fotografický směr: skutečné vybavení Redcord, odborníci, prostory pro terapii a trénink a detaily instalací. Výrazný redakční ořez a konzistentní překryvy. Vyhněte se generickým abstraktním AI pozadím, dekorativním skleněným panelům, zbytečným přechodům a lékařským fotobankovým snímkům, které s vybavením nesouvisejí. Jeden střídmý světlý přechod u volitelného poptávkového formuláře je přijatelný, pokud odpovídá směru reference.

Pohyb: krátké přechody průhlednosti a posunu, jemný efekt při najetí na obrázek, volitelné schválené ztlumené smyčkové hero video s náhledovým obrázkem, ovládáním pauzy a náhradou pro omezený pohyb. Hlavní obsah a metriky musí být přítomny i bez animací a JavaScriptu. Rezervujte rozměry médií, aby nedocházelo k posunům rozvržení. Žádné přebírání scrollování ani automaticky přehrávaný zvuk.

## 5. Translate the reference into the Czech business

| Reference pattern | Czech adaptation |
|---|---|
| Globální brandové hero | Místní nabídka Redcord a regionální akce pro konzultaci a kurzy |
| Globální vyhledávač distributorů | Přímý český/slovenský kontakt na prodej a podporu; bez zbytečného kroku výběru země |
| Mřížka fotografií oblastí použití | Klinická pracoviště, trenéři a výkon, jednotlivci a domácí použití; rozšiřovat jen o schválené místní nabídky |
| Oddělení vybavení a metody | Vysvětlit rozdíl mezi vybavením Redcord a metodou Neurac ve schváleném českém textu |
| Globální studie a statistiky | Pouze zdrojované, schválené a správně označené globální či místní důkazy; neschválené metriky skrýt |
| Globální vzdělávací cesty | Skutečná česká nabídka Neurac a Active s předpoklady a ověřenými termíny |
| Blok webinářů a akcí | Skutečné místní termíny; prázdný stav s poptávkou, pokud aktuální termíny nejsou |
| Lead magnet v podobě balíčku publikací | Volitelná pozdější funkce, pokud bude existovat schválený balíček a proces jeho doručení |
| Globální kontakt a patička | Regionální údaje AHAMA, česká oddělení, místní sociální sítě a odkaz na referenční kliniku |
| FAQ k vybavení | Schválené místní odpovědi k nákupu, instalaci a podpoře; nevymýšlejte bezpečnostní specifikace |

Výsledek by měl působit jako blízký příbuzný redcord.com a zároveň být užitečný pro českého zákazníka. Nejde o doslovný překlad globálního webu.

## 6. Proposed homepage composition

1. **Header:** schválené logo; navigace; viditelný odkaz na E-shop; primární akce pro konzultaci či kontakt.
2. **Hero:** schválený vizuál z kliniky či s vybavením; stručné české sdělení. Navrhovaný pracovní nadpis: „Redcord vybavení. Neurac metoda. Podpora pro vaši praxi.“ V obsahových záznamech text označte jako návrh. Primární akce „Prozkoumat vybavení“, sekundární „Najít kurz“. Formulaci o místním zastoupení doplňte až po schválení.
3. **Audience/application cards:** kliničtí odborníci, trenéři a výkon, jednotlivci a domácí uživatelé. Každá karta otevírá příslušnou cestu k vybavení či vzdělávání.
4. **Equipment overview:** věrohodné snímky vybavení, kategorie produktových řad, akce pro konzultaci či cenovou nabídku; cesta jednotlivého kupujícího vede do e-shopu.
5. **Method explanation:** kontrastní tmavá sekce vysvětlující vztah mezi vybavením a metodou Neurac s jediným informativním dalším krokem.
6. **Education pathways:** terapie/Neurac, Active/trénink, schválené workshopy. Uveďte předpoklady a cílové publikum; nevydávejte všechny kurzy za otevřené všem.
7. **Upcoming sessions:** pouze schválené termíny; karty uvádějí datum, místo, lektora, podmínky účasti, cenu nebo stav „na dotaz“ a externí cíl registrace. Historické akce se archivují, nikdy nejsou „nadcházející“.
8. **Installation and support:** blok s fotografií a textem; odkazy na konzultaci, kontroly a bezpečnost.
9. **Reference clinic:** kompaktní představení Redpoint vysvětlující místní praxi a předvádění se schváleným odkazem. Nezahlcujte distribuční web dlouhým životopisem terapeuta.
10. **Credibility:** schválené reference a informace o terapeutech, volitelně zdrojované důkazy. Nevymýšlejte citace, loga klientů, akreditace ani výkonnostní statistiky.
11. **Contact routing:** prodej a instalace, vzdělávání, podpora k vybavení. Jasná alternativa přes telefon či e-mail.
12. **Footer:** údaje o společnosti, seskupená navigace, bezpečnost, ochrana soukromí a nastavení cookies, místní sociální sítě, odkazy na e-shop a kliniku.

Stránku udržujte soustředěnou; volitelné bloky s důkazy čistě zmizí, pokud není k dispozici schválený obsah. Prototyp nesmí vyplňovat mezery vymyšlenými čísly ani referencemi.

## 7. Route and template plan

Kde je to praktické, zachovejte funkční původní cesty. Navrhovaná doplnění a přejmenování jsou výslovně vyznačena; přesná rozhodnutí o URL vyžadují před spuštěním migrační mapu.

| Route | Template and behaviour | Status |
|---|---|---|
| `/` | Kompozice domovské stránky popsaná výše | Stávající |
| `/vybaveni/` | Přehled katalogu; filtry podle publika; rozlišení konzultace a nákupu | Stávající, přestavět |
| `/vybaveni/[slug]/` | Schválená produktová řada či detail; snímky, použití, související vzdělávání, odkaz na poptávku či e-shop | Navrženo |
| `/vybaveni/instalace/` | Služba instalace, schválený postup, formulář pro konzultaci | Původní odkaz vrací 404; navrženo obnovení |
| `/vzdelavani/` | Přehled vzdělávání a karty vzdělávacích cest | Stávající |
| `/vzdelavani/neurac/` | Terapeutická cesta; úrovně a předpoklady; odpovídající termíny | Stávající |
| `/vzdelavani/treneri/` | Cesta Active | Navržená normalizace `/vzdelavani/vzdelavani/` |
| `/vzdelavani/vzdelavaci-program/` | Aktuální kalendář kurzů a filtry; oddělený archiv | Stávající, nahradit historickou tabulku |
| `/vzdelavani/kurzy/[slug]/` | Definice kurzu, publikum, výstupy, předpoklady a odkazy na ověřené termíny | Navrženo |
| `/vzdelavani/workshopy/` | Workshopy schválené vlastníkem, nebo upřímný stav nedostupnosti | Původní odkaz vrací 404; navrženo obnovení |
| `/neurac/` | Samostatné vysvětlení metody; odkazy na školení, adresář a kliniku | Navrženo nové využití; nyní přesměrovává na školení |
| `/neurac/kdo-jsou-certified-neurac-practitioners/` | Zkontrolovaný adresář, filtr podle města a schválené profily | Stávající |
| `/jednotlivec/` | Cesta pro jednotlivce a domácí použití | Stávající |
| `/bezpecnost/` | Rozcestník servisu a bezpečnosti se zkontrolovanými dokumenty | Stávající |
| `/bezpecnost/technicke-kontroly/` | Poptávka kontroly a schválené informace o servisu | Původní odkaz vrací 404; navrženo obnovení |
| `/bezpecnost/[slug]/` | Schválená upozornění, péče, bezpečnostní školení | Navrženo / pouze obnovený obsah |
| `/o-nas/` | Regionální zastoupení, tým a referenční pracoviště | Navrženo vyčlenění z domovské stránky |
| `/kontakt/` | Kontakty na oddělení a poptávkový formulář | Stávající, rozšířit |
| `/hledat/` | Přístupné vyhledávání ve veřejném obsahu; výsledky dotazů noindex | Navrženo jako náhrada vyhledávání WP |
| Routy pro zásady ochrany soukromí a cookies | Zásady schválené vlastníkem, ovládání preferencí | Navrženo; přesné cesty dohodnout před spuštěním |

Nezveřejňujte prázdné výplňové stránky a nevytvářejte produktová fakta z nefunkčních položek menu. Prototyp k připomínkám může ukázat výslovně označený stav nedostupného obsahu a kontaktní cestu. V produkci se spouštějí pouze schválené routy a obsah.

## 8. Functional requirements

### Catalogue and enquiries

- Filtrujte vybavení podle schváleného publika či použití; produktové řady odkazují na schválené cíle v e-shopu nebo nabízejí žádost o radu.
- Bez důvěryhodné integrace nezrcadlete živé skladové zásoby a ceny z e-shopu. Kde je to vhodné, použijte „Cena a konfigurace na dotaz“, nikoli vymyšlenou cenu.
- Poptávkový formulář: jméno, e-mail, volitelně telefon a firma, oddělení, volitelný odkaz na produkt či kurz, stručná zpráva, potvrzení seznámení s příslušnými informacemi. Validace na serveru, limity délky, honeypot a omezení počtu odeslání, srozumitelné chybové hlášky.
- Adaptér prototypu musí výslovně uvádět, že jde o test a požadavek se nedoručí. Produkční adaptér poptávku trvale uloží či předá dál, hlásí selhání a úspěch zobrazí až po přijatém uložení nebo předání k doručení. Žádné předstírané stavy „e-mail odeslán“.
- V prvním vydání žádný sběr zdravotní anamnézy ani nahrávání souborů.

### Education

- Oddělte definici kurzu od záznamů o termínech. Datová pole zahrnují úroveň kurzu, podmínky účasti, předpoklady, lektora, jazyk, místo, začátek a konec, časové pásmo, aktuální stav, URL registrace, volitelnou schválenou cenu a měnu a zdroj kapacity.
- Stav termínu rozlišuje otevřený, plný, zrušený, proběhlý a neznámý. Volná místa neodvozujte ze zastaralých marketingových textů. Pokud kapacita není integrovaná, odkažte kvůli dostupnosti na registraci.
- České formátování; termíny zobrazujte v časovém pásmu Europe/Prague. Proběhlé termíny automaticky skryjte či archivujte; podporujte příslušné filtry podle data a publika.
- První produkční vydání odkazuje na stávající závazný cíl registrace. Nový zápis do kurzů, platby, certifikáty či vzdělávací portál mají samostatný rozsah.

### Directory, documents and support

- Pouze schválené záznamy terapeutů; pole pro město, profesi a certifikaci s výslovně určenou veřejnou viditelností a datem kontroly. Nikdy slepě znovu nezveřejňujte záznamy skryté v Elementoru, které se objeví v exportu.
- Soubory ke stažení mají název, verzi či datum, typ souboru, vlastníka a stav schválení. Kde je to vhodné, zachovejte platné stávající URL souborů ke stažení nebo jejich přesné náhrady.
- Bezpečnostní materiály musí zachovat smysl i přístup k zásadním informacím. Pokud chybějí, musí je dodat vlastníci; negenerujte limity pro instalaci ani je nenahrazujte pokyny napsanými AI.
- Vyhledávání indexuje pouze veřejné schválené záznamy. Přístupné prázdné stavy, limity dotazů a žádné prohledávání soukromých systémů.

### Shop, clinic, social and measurement

- Stávající hosting PrestaShopu zůstává v provozu a oddělený. Zachovejte smysluplné hluboké odkazy; zdokumentujte externí předání a zpětné odkazy. Nebudujte nefunkční místní košík napodobující staré zbytky WordPressu.
- URL kliniky a rezervací pocházejí z konfigurace dodané vlastníkem. Funkční URL rezervací nehádejte. Ve fázi 1 žádné společné přihlašování pro pacienty a zákazníky e-shopu.
- Zachovejte ověřené místní účty na Facebooku, Instagramu a YouTube, vhodná metadata pro sdílení a atribuci kampaní bez údajů o pacientech. Ve výchozím stavu žádné vložené živé feedy.
- Události: equipment_viewed, quote_started, enquiry_accepted, course_viewed, registration_handoff, shop_handoff, support_enquiry_accepted. Odchozí kliknutí není prodej ani dokončený zápis. Skutečné výsledky sledujte pouze se zpětným párováním nebo integrací na backendu.
- Volitelné měření a média se načítají podle zvoleného přístupu k souhlasu. Starý pixel automaticky nepřebírejte. Veřejný obsah zůstává použitelný i po odmítnutí volitelného měření.

## 9. Platform architecture and future Redpoint reuse

Použijte Next.js App Router, TypeScript, React a Tailwind s podporovanými stabilními verzemi, které zafixujete po ověření implementačního prostředí. Použijte hranice pnpm workspace / monorepa:

- `apps/redcord-web`: jediný web implementovaný nyní.
- `packages/ui`: tokeny a znovupoužitelné základní komponenty a sekce.
- `packages/content`: typovaná schémata obsahu, fixtures a rozhraní repozitářů.
- `packages/integrations`: odkazy na e-shop a adaptér katalogu, adaptér poptávek, budoucí kontrakty pro vzdělávání a rezervace.
- Konfigurace webu určuje název, logo, tokeny, navigaci, kontakty na oddělení, kanonický origin, externí endpointy a zapnuté funkce.

Později přidejte `apps/redpoint-web`, který znovu použije základní komponenty a obsahová rozhraní a zároveň umožní odlišná rozvržení, texty a tokeny. Neimplementujte prázdnou druhou aplikaci ani multi-tenant administraci jen kvůli předvedení budoucí rozšiřitelnosti.

Prototyp: typované lokální záznamy a fixtures jsou přijatelné a měly by mít označený zdroj. Pro vykreslení marketingového prototypu k připomínkám není potřeba databáze. Produkce: editovatelný CMS s konceptem, náhledem a publikací a s vlastnictvím médií zvolte po posouzení pracovního postupu vlastníka; WordPress jako dočasný headless zdroj je možný, ale nevykreslujte nesanitizované HTML z Elementoru jako finální komponentový systém. PostgreSQL/Supabase může v případě potřeby uchovávat provozní záznamy poptávek a kurzů; provozní role a úložiště rezervací pacientů držte odděleně. Nevytvářejte druhou databázi termínů.

Příprava na budoucí AI: schválený strukturovaný veřejný obsah; typované operace čtení pro produkty, kurzy a podporu a validovaná operace poptávky. Pozdější asistenti je mohou používat na základě výslovných oprávnění. AI chat, autonomní klinické poradenství a autonomní transakce jsou mimo rozsah tohoto vývoje.

## 10. Assets and editorial workflow

- Přílohy doprovodné inventury s médii a vykreslenými referencemi používejte jako vstupy pro zmapování, nikoli jako úplnou zálohu či licenci.
- Schválené zdrojové soubory loga, fotografie a videa, brand manuál a licencovaná písma získejte od vlastníků či globálního partnera. Inspirace logem a stylem nezakládá práva ke všem assetům na redcord.com.
- Schválená média ukládejte do řízeného úložiště se zdrojem, vlastníkem či oprávněním, alternativním textem, rozměry, ohniskovým bodem a určením použití. Obnovte původní obrázky z hostingu WEDOS; tento hostname nepoužívejte jako trvalou závislost.
- Pro pozadí hero sekcí upřednostněte zdrojové fotografie. Stávající malé portréty z adresáře zůstanou malé; nezvětšujte je do velkých lifestylových snímků.
- Generujte moderní responzivní odvozené verze se stabilními rozměry, dobrým ořezem a líným načítáním obrázků mimo první obrazovku. Hero obrázek a náhled videa optimalizujte pro první načtení.
- Dokud zdrojové soubory nejsou k dispozici, použijte podle možností schválené stávající české obrázky a jinak zřetelně označené místní zástupné obrázky. Nikdy nenaznačujte, že vygenerovaný obrázek zobrazuje skutečnou kliniku, osobu či instalaci produktu.
- Aktualizujte české texty s kontrolou rodilým mluvčím; nadpisy udržujte stručné a používejte přesné místní kontakty. Nezveřejňujte historická data a ceny akcí jako aktuální nabídku.

## 11. SEO, migration and accessibility

- Vytvořte výslovnou mapu stará URL → nová URL → důvod/stav, včetně odkazů s ID v dotazu, aliasů vzdělávání, přejmenované cesty pro trenéry, nefunkčních URL pro jednotlivá publika, souborů ke stažení a fragmentů. Než zvolíte přesměrování, obnovte odpovídající obsah.
- Stávající dobré URL zůstávají tam, kde jsou užitečné. Trvalá přesměrování použijte jen pro rozhodnuté ekvivalenty. Žádné plošné přesměrování všech 404 na domovskou stránku.
- Fragmenty se zpracovávají v prohlížeči: zachovejte stará ID nebo je výslovně namapujte. Ověřte skutečné kotvy v přesměrovaném obsahu.
- S `/neurac/` zacházejte uvážlivě, protože se jeho role mění z přesměrování na stránku o metodě. Před spuštěním potvrďte záměr a příchozí odkazy.
- Zachovejte hosting e-shopu, poštovní DNS, doménu kliniky a funkční rezervační službu. O zbytcích košíku, pokladny a účtů ve WordPressu rozhodne vlastník; zákaznické účty ani objednávky potichu nemigrujte.
- Hlavní texty vykreslované na serveru, smysluplná metadata, kanonický host, obrázky pro sociální sítě, sitemap/robots, drobečková navigace, popisné alternativní texty obrázků a strukturovaná data (schema) pro skutečný obsah stránky. Ve schema žádné falešné recenze, nepodložená hodnocení ani nedostupné akce.
- Náhled je noindex/chráněný; konfiguraci indexování v produkci je nutné otestovat při přepnutí. Po spuštění sledujte 404 a výkon ve vyhledávání.
- Cílem implementace je WCAG 2.2 AA: kontrast, viditelný fokus, menu a dialogy ovladatelné klávesnicí, formuláře s popisky, použitelné souhrny chyb, sémantické pořadí nadpisů, odkaz pro přeskočení obsahu, omezený pohyb a dostatečně velké dotykové plochy.
- Vyhněte se chybám reference: více H1 na vnitřních stránkách, metriky zpočátku zobrazující nulu, interakce bez popisků a obsah, jehož existence závisí na líné animaci.

## 12. Delivery sequence and acceptance

### A. Review prototype for the owners

Implementujte domovskou stránku, šablonu přehledu a detailu vybavení, vzdělávání s kalendářem, rozcestník bezpečnosti a šablonu kontaktu s reprezentativními schválenými či výslovně ilustrativními daty a funkčními interakcemi navigace, vyhledávání a filtrů. Nepodporované provozní akce ponechte viditelně v testovacím režimu. Dodejte přehledné README popisující skutečná data oproti fixtures a každou nepřipojenou integraci.

Zkontrolujte domovskou stránku a alespoň jednu vnitřní šablonu při šířkách přibližně 390px, 768px a 1440px. Ve vývojovém postupu pořiďte snímky obrazovky k připomínkám. Ověřte, že nedochází k vodorovnému přetečení, české nadpisy jsou čitelné, navigace klávesnicí funguje a prázdné stavy dávají smysl. Vizuální kontrola má porovnávat kompozici, typografii, fotografie, kontrast a rozestupy s referencí, nikoli vyžadovat shodu na pixel.

### B. Production completion after business inputs

Integrujte zvolený CMS, schválený obsah a assety, skutečné směrování poptávek, kde je to možné i důvěryhodné zdroje termínů a produktů, mapování URL, analytiku a souhlas a monitoring. Ponechte závazné služby e-shopu a registrace, pokud nebude zadána samostatná migrace. Build, typové kontroly, příslušné testy, kontroly rout a odkazů i kontrola přístupnosti musí projít.

Smysluplné testy: termíny kurzů proběhlé/aktuální/zrušené, prázdné výsledky, chybně zadané oddělení, selhání uložení či doručení poptávky, nedostupná externí registrace a mapování přesměrování a kotev. Vyhněte se testům, které jen zrcadlí markup. Ověřte sémantiku externích předání bez odesílání nákupů či skutečných registrací.

### Required outputs from the coding bot

1. Spustitelný repozitář a pokyny k nastavení, se šablonou prostředí neobsahující žádná tajemství.
2. Znovupoužitelné design tokeny a komponenty a zdokumentovaná konfigurace webu.
3. Funkční routy prototypu a výslovné hranice testovacího režimu.
4. Obsahové záznamy s označeným zdrojem a manifest assetů.
5. Migrační mapa rout a rozhodnutí o nefunkčních odkazech, která stále čekají na vlastníky.
6. Produkční backlog a závislosti, seskupené podle katalogu, vzdělávání, e-shopu, podpory, CMS, SEO a budoucího znovupoužití pro kliniku.
7. Souhrn provedeného ověření a známých nedostatků. Nepopisujte nepřipojené formuláře, pokladnu ani AI jako funkční.

## 13. Owner decisions to record before production

Schválený vztah ke globální značce a povolené assety; aktivní produktová řada a aktuální bezpečnostní dokumenty; potřeby publika a jazyků pro CZ/SK; odpovědné kontakty; aktuální kurzy, ceny a podmínky účasti; autorita pro registrace; zveřejnění seznamu terapeutů; backend e-shopu a přístup k API; pracovní postup editace v CMS; stávající URL a rozhraní rezervací; rozhodnutí o přesměrováních a archivu; hosting a region dat a zpracování poptávek; metriky úspěchu.

## 14. Start now

Přečtěte oba dokumenty. Zaznamenejte předpoklady a určete chybějící vstupy. Založte modulární projekt v Next.js a implementujte prototyp k připomínkám ve vertikálních řezech: společný rámec a tokeny → domovská stránka → katalog → vzdělávání → podpora a kontakt → dokumentace migrace a QA. Používejte schválené zdrojové materiály, výslovné prázdné stavy a testovací adaptéry, aby vlastníci mohli posoudit směr, aniž by prototyp považovali za připojenou produkční službu.
