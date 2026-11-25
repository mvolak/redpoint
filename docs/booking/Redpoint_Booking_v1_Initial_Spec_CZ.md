# Redpoint Booking v1 — initial implementation specification

Verze: 0.1 · 1. listopadu 2026 · Stav: navržený rozsah pro implementaci

## 1. Objective

Vytvořit rezervační aplikaci pro Redpoint Clinic, primárně v češtině a dobře použitelnou na mobilu. Spustit ji nezávisle na stávajícím webu ve WordPressu, napojit na ni rezervační tlačítka webu a aplikaci i rezervační doménu později znovu využít v platformě Clinic–Academy–Shop.

První vydání: termíny na klinice a administrace pro recepci. Zápisy do Academy a obchod zůstávají samostatnými budoucími moduly s vlastními pravidly.

Součástí programátorského úkolu nejsou žádné změny v produkci, import skutečných pacientů ani odesílání skutečných zpráv. Výstupem je funkční lokální aplikace, migrace, syntetická seed data, testy a pokyny k nasazení. Až do záměrného přechodu do produkce používejte staging a testovací příjemce e-mailů.

## 2. Context and assumptions

- Prohlídka veřejného webu ukázala WordPress a Divi. Rezervační tlačítka nyní vedou na Memberzone; klinika hlásí, že služba nefunguje.
- Zveřejněná rezervační stránka ve WordPressu obsahuje `[bookingpress_form]`. Nepředpokládejte, že existuje funkční plugin nebo použitelná rezervační databáze.
- WordPress běžně používá MySQL/MariaDB. Přesný databázový systém a verze kliniky nejsou ověřené a pro tuto integraci nejsou potřeba.
- Výchozí rozsah plánování: jedno pracoviště kliniky v Hradci Králové; před konfigurací produkce potvrďte aktivní pracoviště.
- Rezervace mají vlastní databázi. Pro běžný provoz není potřeba přístup k tabulkám databáze WordPressu, k cookies WordPressu ani k Memberzone.
- Stávající termíny je nutné obnovit nebo ručně sesouhlasit dřív, než se zapne automatické veřejné potvrzování.
- Pokud není známa spolehlivá dostupnost, spusťte režim pouze žádostí: recepce žádosti potvrzuje ručně. Žádost se nikdy nezobrazuje jako potvrzený termín.

## 3. Proposed implementation stack

- Next.js App Router, React, TypeScript, Tailwind; v době implementace zafixujte podporované stabilní verze.
- PostgreSQL, nejlépe spravovaná instance v dohodnutém regionu EU; vhodnou navrhovanou volbou je Supabase Postgres.
- Drizzle ORM s explicitními SQL migracemi pro omezení (constraints). Na serveru použijte postgres.js; pro zvolené nasazení nastavte connection pooling a prepared statements.
- Spravovaná autentizace personálu; pokud se zvolí Supabase, výchozí volbou je Supabase Auth. Ve v1 žádné SSO přes WordPress.
- Validace schématu na každé hranici serveru, např. Zod.
- E-mail za rozhraním poskytovatele, s lokální implementací pro zachytávání a testování.
- Trvalý outbox notifikací a plánovaný worker. Obsluha požadavku nesmí spoléhat na časovač v paměti ani na neočekávanou (unawaited) úlohu na pozadí.
- Malá modulární aplikace: rezervační doména, persistence, notifikace, UI. Stačí jeden repozitář a jedna aplikace; nestavějte obecný multi-tenant SaaS framework.

Tato specifikace předpokládá vlastní plánovací backend. Před implementací plánování zaznamenejte krátké rozhodnutí, které ho porovná se zavedeným rezervačním poskytovatelem s API. Pokud se zvolí poskytovatel, je zdrojem pravdy o termínech on; neudržujte souběžnou lokální evidenci slotů. Doménová rozhraní mohou zůstat, ale sémantika poskytovatele musí nahradit níže popsaný vlastní návrh transakcí.

## 4. Roles

| Role | Access |
|---|---|
| Návštěvník/pacient | Prohlížení veřejného katalogu a dostupnosti; odeslání rezervace nebo žádosti; správa jednoho termínu po ověření |
| Terapeut | Prohlížení vlastního rozvrhu a nezbytně nutných údajů o termínu a kontaktu; zaznamenání stavu dokončeno / nedostavil se |
| Recepce | Správa termínů všech terapeutů; správa výjimek v pracovní době a žádostí |
| Administrátor | Přístup recepce a navíc role personálu, katalog, pravidla, otevírací doba, konfigurace |

Role a omezení terapeuta na vlastní data vynucujte na serveru u každé operace. Skryté tlačítko není autorizace. Před produkcí vyžadujte u personálu MFA.

## 5. Patient journey

1. Výběr služby; zobrazí se délka, zveřejněná cena nebo jasně označené cenové rozpětí a požadavky pro první návštěvu.
2. Výběr způsobilého terapeuta nebo možnosti „první volný“. Konkrétně přidělený terapeut se zobrazí před finálním odesláním.
3. Výběr data a času, zobrazených v časovém pásmu Europe/Prague. Dostupnost je orientační, dokud server rezervaci nepotvrdí.
4. Zadání jména, e-mailu a telefonu; uvedení, zda jde o nového, nebo stávajícího pacienta. Ve v1 žádná anamnéza, diagnóza, přílohy ani volný klinický text.
5. Kontrola služby, terapeuta, místa, času, ceny a storno podmínek; potvrzení příslušných podmínek. Přihlášení k marketingovým sdělením musí být samostatné a dobrovolné, pokud se později přidá.
6. Ověření e-mailu pomocí ověřovacího kódu (OTP) s omezenou platností; ověření prokazuje kontrolu nad kontaktem, nikoli rezervaci. Počet žádostí i pokusů omezte. Ověřená relace je krátkodobá a smí rezervovat jen v povoleném rozsahu.
7. Odeslání s idempotency klíčem. Server znovu ověří všechna pravidla a atomicky vytvoří termín i notifikační událost.
8. Zobrazení buď potvrzené rezervace s referenčním číslem, nebo jasně označené žádosti o termín, která čeká na recepci. Pokud mezitím slot zmizel, zachovejte vyplněná data formuláře a nabídněte aktualizované možnosti.

Pacientské účty a online platby jsou mimo rozsah. Služby s klinicky omezenou způsobilostí musí procházet kontrolou recepce, pokud nelze způsobilost bezpečně určit bez klinického posouzení.

## 6. Reception and therapist UI

- Denní a týdenní pohled, filtry podle terapeuta a stavu termínu; na malých displejích použitelný seznam.
- Vytváření termínů, zobrazení detailu, přeplánování, storno, označení jako dokončeno / nedostavil se.
- Vyřizování žádostí o termín výběrem platného slotu a potvrzením, nebo zamítnutím s vhodnou zprávou.
- Pracovní doba, dovolené, přestávky, jednorázová uzavření, ruční blokace času.
- Žádné tiché přepisování překrývajících se termínů. Zobrazte konflikty a vyžadujte platnou alternativu.
- Zobrazení stavu doručení notifikací a opakování neúspěšných odeslání bez opětovného vytváření termínů.
- Konfigurovatelný veřejný režim: automatická rezervace, pouze žádosti, nebo dočasně pozastaveno s kontaktem na recepci.
- Auditní stopa změn termínů, změn rozvrhu a změn rolí.

## 7. Scheduling rules

- Konfigurace služby: aktivní stav, délka, rezervy před a po, způsobilí terapeuti, dostupnost pro nové pacienty, minimální předstih, rezervační horizont, režim rezervace a nastavení ceny.
- Výjimky délky nebo ceny pro kombinaci terapeut/služba musí být explicitní; před vrácením dostupných slotů se musí určit výsledná konfigurace.
- Týdenní pracovní doba je lokální pravidlo v Europe/Prague s datovanými výjimkami. Skutečné okamžiky termínů ukládejte jako UTC/timestamptz.
- Generování slotů respektuje rezervy, pracovní dobu, dovolené, existující termíny a obsazené zdroje.
- Výchozí stav je jeden pacient na terapeuta v daném čase. Ověřte, zda jsou místnosti nebo vybavení Redcord kapacitním omezením; pokud jsou důležité sdílené omezené zdroje, zahrňte je do v1 ještě před spuštěním.
- Generujte omezený rozsah dat a limitujte velikost dotazů. Veřejná dostupnost vrací pouze volné sloty, nikdy totožnost ani důvody obsazeného času.
- Při přechodu na letní a zimní čas přeskakujte neexistující lokální časy; opakované lokální časy zpracujte jednoznačně. Kde je potřeba, zobrazte posun vůči UTC.
- Volba „první volný“ musí atomicky určit a zarezervovat konkrétního způsobilého terapeuta; nikdy neslibujte souhrnnou kapacitu, kterou nelze přidělit.
- Lhůta pro storno je konfigurovatelná. Ověřte, zda znamená uplynulé hodiny, nebo pravidla podle pracovních dnů; nezakódujte znění ze stávajícího webu jako schválené pravidlo.
- Pozdní storno se předává recepci. Ve v1 žádné automatické storno poplatky.

## 8. Data model

Všechny hlavní záznamy mají ID a časová razítka vytvoření a změny. Používejte UUID a cizí klíče.

| Entity | Key fields/purpose |
|---|---|
| Location | Název, adresa, časové pásmo, kontaktní údaje |
| StaffProfile | Subjekt autentizace, role, volitelné ID terapeuta, aktivní stav |
| Therapist | Veřejné jméno/profil, aktivní stav, pracoviště |
| Service | Název, popis, výchozí délka/rezervy, cena/rozpětí, pravidla rezervace |
| TherapistService | Způsobilost a explicitní výjimky délky/ceny |
| WorkingHours / Exception | Opakující se lokální časová okna a datované výjimky dostupnosti |
| PatientContact | Jméno, ověřený e-mail, telefon; jen minimální údaje pro plánování |
| AppointmentRequest | Preferovaná služba/terapeut/časové okno, kontakt, stav čeká/vyřízeno/zamítnuto |
| Appointment | Pacient, služba, terapeut, pracoviště, začátek/konec, stav, verze, zdroj |
| Occupancy | ID zdroje, časový rozsah včetně rezerv, zdrojový termín nebo ruční blokace |
| IdempotencyRecord | Klíč, otisk požadavku, rozsah aktéra/relace, uložená odpověď/reference |
| NotificationOutbox | Událost, verze termínu, kanál, stav opakování, další pokus |
| ManagementCredential | Hashovaný náhodný token, rozsah na termín, platnost, stav zneplatnění |
| AuditEvent | Aktér, operace, odkaz na záznam, čas; bez zbytečných osobních údajů |

V okamžiku rezervace uložte snímek délky termínu, rezerv, ceny/rozpětí a verze pravidel. Úpravy katalogu nesmějí potichu změnit dříve přijaté závazky. Peníze ukládejte v celých nejmenších jednotkách měny s měnou CZK.

Stavy termínu: confirmed → completed, no_show nebo cancelled. Přeplánování mění čas a zdroje atomicky a zaznamená auditní událost; nejde o koncový stav. Žádosti jsou samostatné záznamy a kapacitu neblokují. Obsazenost v minulosti zůstává chráněná u termínů confirmed/completed/no-show; storno svou obsazenost uvolní.

## 9. Integrity and concurrency — mandatory

- Na obsazenost zdrojů použijte v PostgreSQL vylučovací omezení nad rozsahy (range exclusion constraints), např. shoda zdroje plus překrývající se intervaly `tstzrange`, s polootevřenými rozsahy `[start,end)` a vhodnou třídou operátorů GiST / rozšířením.
- Časové blokace terapeuta a obsazenost termíny patří do stejné domény omezení. Pokud jsou zahrnuty místnosti nebo vybavení, rezervujte všechny potřebné zdroje ve stejné transakci.
- Zámky zdrojů získávejte ve stejném pořadí u všech zápisů rezervací, blokací, změn pracovní doby a přeplánování. Po získání zámků znovu načtěte relevantní pravidla. Změny pracovní doby nebo dovolených, které by zneplatnily termíny, odmítněte, dokud nejsou výslovně vyřešeny.
- Rezervace: ověřit ověřenou relaci a vstupy; určit závaznou konfiguraci služby; zamknout; znovu zkontrolovat rozvrh; vložit termín, obsazenost, výsledek idempotence a událost do outboxu; commit. E-mail odeslat až poté.
- Různá odeslání pro stejný interval smí vést nanejvýš k jedné konfliktní rezervaci zdroje. Neúspěšnému odeslání vraťte odpověď o konfliktu.
- Opakování se stejným idempotency klíčem a stejnými daty vrátí existující výsledek, i po nejisté odpovědi sítě. Změněná data se stejným klíčem se odmítnou. Klíče važte na aktéra/relaci a ošetřete souběžné identické požadavky.
- Přeplánování je transakční: buď se zajistí všechny nové zdroje a starý čas se uvolní, nebo původní rezervace zůstane beze změny.
- Souběžné úpravy používají kontrolu verze; místo přepsání změn vraťte konflikt kvůli zastaralému záznamu.
- Ve v1 nezavádějte dočasné blokování slotů. Ověření e-mailu slot neblokuje; v UI to jasně uveďte.

## 10. Domain operations and API contract

Validaci a obchodní pravidla držte v typovaných doménových službách, které používají route handlery i budoucí agenti. Externí agenti nikdy nesmějí spouštět surové SQL.

| Operation | Contract |
|---|---|
| listServices / listTherapists | Pouze veřejný aktivní katalog |
| findAvailability | Služba, volitelně terapeut, omezený rozsah dat → vyhodnocené volné sloty |
| requestEmailVerification / verifyEmail | OTP s omezeným počtem pokusů → krátkodobá ověřená rezervační relace |
| createAppointment | Ověřená relace, služba, terapeut, začátek, verze podmínek, idempotency klíč → potvrzení nebo konflikt |
| createAppointmentRequest | Ověřený kontakt a omezené preference → čekající žádost |
| getManagedAppointment | Ověřená relace pro správu rezervace vázaná na termín → minimální údaje |
| cancelAppointment | Platná relace pro správu rezervace nebo relace personálu, očekávaná verze → zrušeno nebo odmítnuto podle pravidel |
| rescheduleAppointment | Platná relace, očekávaná verze, zvolený slot → aktualizovaný termín nebo konflikt |
| staff administration | Operace s katalogem, rozvrhem, žádostmi a termíny chráněné rolemi |

Navrhované skupiny rout: `/api/catalogue/*`, `/api/availability`, `/api/verification/*`, `/api/appointments/*`, `/api/requests`, `/api/admin/*`. Přesná schémata požadavků a odpovědí zdokumentujte před implementací. Odmítněte ceny, délku, roli, vlastnictví nebo stav potvrzení dodané klientem. Odpovědi o dostupnosti se neukládají do cache jako zaručená nabídka. Odpovědi na změnové a soukromé požadavky používají politiku no-store.

## 11. Notifications and appointment management

- České šablony pro potvrzení, přeplánování, storno a připomenutí; obsahují základní organizační informace a kontakt na recepci.
- Transakční outbox opakuje odeslání s prodlevou (backoff). Potvrzený termín nikdy nevracejte zpět kvůli selhání e-mailu.
- Deduplikace podle události/verze/kanálu; před připomenutím zkontrolujte aktuální stav a verzi termínu, aby zrušené nebo přeplánované termíny nedostaly zastaralá připomenutí.
- V předmětech e-mailů ani v popisech kalendářních událostí žádná diagnóza ani citlivé údaje o návštěvě. Volitelný kalendářní soubor obsahuje jen minimum organizačních informací.
- Odkaz pro správu používá token s vysokou entropií, omezeným rozsahem a omezenou platností, uložený pouze jako hash. Pouhé otevření odkazu přes GET nikdy termín nezruší ani nezmění.
- Odkaz vyměňte za zabezpečenou relaci a token odstraňte z viditelné URL; před zobrazením osobních údajů nebo povolením změn vyžadujte e-mailový ověřovací kód (OTP). Tokeny v logách maskujte; na stránkách pro správu použijte no-referrer a žádné skripty třetích stran.
- SMS jsou odložené; rozhraní pro notifikace ponechte pro pozdější použití.

## 12. Operational and privacy requirements

- Jen minimální kontaktní a plánovací údaje; nejde o elektronickou zdravotnickou dokumentaci.
- Přihlašovací údaje a privilegované databázové klíče zůstávají na serveru. Relace personálu používají bezpečné nastavení cookies, ochranu proti CSRF / kontrolu origin, kde je to relevantní, a autorizaci na serveru.
- Pokud je zapnuté Supabase Data API, nastavte výchozí zákaz / RLS, aby anonymní klienti neměli přístup k soukromým rezervačním tabulkám. Přímá serverová připojení musí kontroly rolí a rozsahu i tak implementovat.
- Omezte počet pokusů o hromadné stahování dostupnosti, ověření, vytváření žádostí a změny. Kde je to praktické, používejte obecné odpovědi při ověřování; neprozrazujte, zda pacient existuje.
- Přístup personálu je oddělený od veřejného ověřování hostů. Žádné sdílené cookies s WordPressem ani široké autentizační cookies na nadřazené doméně.
- Přístupy a změny auditujte podle potřeby; z běžných logů a chybové telemetrie odstraňujte kontaktní údaje, tokeny a těla požadavků.
- Před produkcí dohodněte doby uchovávání, smluvní zajištění poskytovatelů, odpovědnost za zálohy a obnovu a oprávněný přístup personálu. Zálohy musí jít skutečně obnovit, ne jen být zapnuté.
- Analytika smí zaznamenávat souhrnné události průchodu: booking_started, availability_shown, verification_completed, booking_confirmed, booking_failed. V marketingových nástrojích žádná jména, kontaktní údaje, ID termínů, tokeny pro správu ani zdravotní údaje. Transakční pravda pochází ze záznamů v databázi.

## 13. WordPress integration guide

### Recommended launch topology

Stávající web: `https://redpoint-clinic.cz/` (WordPress).
Navrhovaný nový rezervační host: `https://booking.redpoint-clinic.cz/` (Next.js).

Jde o navrhovanou adresu; DNS ani nasazení zatím nebyly vytvořeny. WordPress zůstává na svém stávajícím hostingu. Rezervační aplikace má vlastní nasazení, databázi, autentizaci personálu a konfiguraci e-mailu.

### Deployment prerequisites

1. Zajistit oprávněný administrátorský přístup do WordPressu, přístup k DNS, hosting pro rezervace, databázi, přístup k odesílací e-mailové adrese/doméně a provozní podklady od kliniky.
2. Nasadit staging se syntetickými daty; ponechat ho jako noindex a chráněný před nechtěným veřejným použitím. Tajné údaje nastavit přes prostředí hostingu.
3. Po otestování připojit rezervační hostname. Přidat jen přesné záznamy CNAME/A, které zvolený hosting vyžaduje. Zachovat záznamy pro apex/www a stávající poštovní záznamy. Ověřit HTTPS a jeho obnovování.
4. Nastavit autentizaci odesílatele pomocí DNS hodnot od poskytovatele; potřebná nastavení sloučit se stávajícími, ne slepě přepsat existující SPF / poštovní konfiguraci.
5. Nastavit produkční veřejnou URL, časové pásmo kliniky, povolené callback URL, účty personálu a skutečné služby/rozvrhy. Žádná produkční seed data s vymyšlenými cenami nebo dostupností.

### Connect Divi buttons

1. Zálohovat web a databázi WordPressu a exportovat dotčené layouty Divi. Zaznamenat všechny současné rezervační cíle.
2. Otevřít domovskou stránku v Divi Visual Builderu. Najít každý rezervační modul Button, upravit nastavení odkazu/URL a cíl v Memberzone nahradit ověřenou rezervační URL. Navigaci ponechat ve stejné záložce, aby cesta uživatele navazovala.
3. Totéž zopakovat u rezervačních tlačítek na stránkách terapeutů, metod, služeb a ceníku, dále v hlavičce/patičce, v globálních modulech Divi, šablonách Theme Builderu, vyskakovacích oknech a mobilních variantách.
4. Pokud je to užitečné, přidat necitlivé přímé odkazy jako `/?service=initial-visit` nebo `/?therapist=approved-slug`. Slugy jsou navrhované identifikátory; nejprve je vytvořte v katalogu a všechny query parametry validujte. Do odkazů nedávejte údaje o pacientech.
5. Aktualizovat zveřejněnou stránku `/book-appointment/`: odstranit nepoužitelný shortcode a uvést jasný odkaz na rezervaci a náhradní kontakt na recepci, nebo nastavit otestované serverové přesměrování na novou aplikaci. Během zavádění použít dočasné přesměrování; nepřesměrovávat celý web.
6. Ověřit, zda stávající vyskakovací okno o kapacitě ještě platí. Nahradit ho schváleným zněním a odpovídajícím režimem rezervace / žádostí; nepředpokládat automaticky, že je kapacita volná.
7. Uložit změny, vymazat příslušné cache WordPressu/CDN a zkontrolovat zveřejněné stránky v odhlášeném stavu na počítači i na mobilu.

Není potřeba žádný plugin do WordPressu, databázová integrace, zápis přes REST API, iframe ani cross-origin fetch v prohlížeči. Následování běžného odkazu je navigace a nevyžaduje nastavení CORS. Rezervační aplikace v prohlížeči komunikuje se svým vlastním originem. Nepřidávejte jako obejití benevolentní CORS.

Popisky nastavení v Divi se mohou podle verze lišit; vycházejte z rozhraní nainstalovaného Divi 4 a v rámci této změny Divi neaktualizujte. V případě potřeby lze ve vhodném obsahovém modulu použít obecný HTML odkaz:

```html
<a href="https://booking.redpoint-clinic.cz/">Rezervovat termín</a>
```

Ukázková URL musí před zveřejněním vést na produkční aplikaci. V rezervační aplikaci vytvořte odpovídající hlavičku/logo Redpoint a jasný odkaz zpět na web kliniky.

### Acceptance and rollback

- Projít veřejné odkazy a ověřit, že nezůstal neúmyslně žádný cíl v Memberzone určený pacientům.
- Ověřit syntetickou rezervaci, viditelnost pro recepci, potvrzení, storno a konfliktní případ. Ověřit, že odeslání v režimu pouze žádostí je správně označené.
- Stránky administrace, správy a potvrzení nenechat indexovat vyhledávači; marketingový web si ponechá své současné URL. Neduplikovat marketingové stránky na rezervačním hostu.
- Pokud nová aplikace selže, přepnout CTA ve WordPressu na náhradní kontakt / žádost na recepci. Záznamy potvrzených termínů musí zůstat pro recepci dostupné. Nevracet se k poskytovateli rezervací, o kterém se ví, že nefunguje.
- Později může plný web v Next.js dál odkazovat na tento hostname nebo znovu využít doménové služby. Neprovozovat dvě nezávislé databáze termínů. Při jakémkoli přesunu rout zachovat již vydané odkazy pro správu.

## 14. Existing appointment cutover

1. Zjistit, kdo nyní drží závazný kalendář a zda Memberzone nabízí export nebo obnovu podporovanou dodavatelem.
2. Definovat pole, mapování, deduplikaci a auditní stopu. Data o termínech nestahovat z webu (scraping) ani nevymýšlet.
3. Importovat do stagingu nebo sesouhlasit ručně; s recepcí ověřit interpretaci data a času a přiřazení terapeutů.
4. Vyřešit konflikty, sesouhlasit denní počty u jednotlivých terapeutů a potvrdit, že je zachycen veškerý budoucí obsazený čas.
5. Dohodnout čas přechodu a pokud možno pozastavit zápisy do starého rezervačního systému; změny přicházející během přechodu výslovně ošetřit.
6. Automatické potvrzování zapnout až po odsouhlasení recepcí. Do té doby používat režim pouze žádostí.

## 15. Tests and definition of done

Pro testy souběhu, omezení a transakcí použijte skutečnou jednorázovou instanci PostgreSQL; mockovaná persistence pro tyto kontroly nestačí.

- Dva ověření pacienti žádají o překrývající se čas: jeden uspěje, druhý dostane konflikt.
- Duplicitní opakování po síťových chybách vytvoří jeden termín a jednu logickou notifikační událost.
- Rezervy a ruční blokace brání konfliktům; sousední nepřekrývající se intervaly zůstávají rezervovatelné.
- Neúspěšné přeplánování zachová původní termín. Zastaralé úpravy se odmítnou.
- Změny pracovní doby nebo dovolených nemohou v souběhu s rezervací vést k neplatnému rozvrhu.
- Přechody letního/zimního času v Praze, minimální předstih, horizont a lhůta pro storno fungují správně.
- Zrušené nebo přeplánované termíny nedostávají zastaralá připomenutí; výpadek e-mailu nezpůsobí ztrátu rezervací.
- Anonymní uživatelé nemohou vypsat pacienty; terapeuti nemohou číst soukromé detaily rozvrhu jiného terapeuta; hranice mezi recepcí a administrátorem platí.
- Expirované nebo zneplatněné tokeny a neúspěšná OTP nemohou zpřístupnit ani změnit termíny. Skenery odkazů nemohou vyvolat změny.
- Průchody na mobilu a z klávesnice pokrývají rezervaci, režim pouze žádostí, konflikt, storno a zotavení z chyb; používejte přístupné popisky a srozumitelné české hlášky.
- Integrace s WordPressem funguje v odhlášeném stavu a všechny rezervační cíle jsou ověřené.
- Součástí dodávky je návod k nasazení, šablona proměnných prostředí bez tajných údajů, migrace, syntetické fixtures a runbook pro zálohování a obnovu.

## 16. Decisions to confirm with the clinic

Před produkcí: aktivní pracoviště; matice služeb a terapeutů; skutečné délky a rezervy; ceny; omezení pro nové pacienty; stav kapacity; omezení sdílených místností/vybavení; předstih/horizont; storno podmínky; zdroj stávajících termínů; oprávnění personálu; odesílatel notifikací; uchovávání dat a hosting.

Pro vývoj používejte jasně označené syntetické hodnoty. Veďte log rozhodnutí a feature flagy pro režim pouze žádostí oproti automatickému potvrzování. Lokální implementaci neblokujte kvůli každé neznámé, ale předpoklady potichu neměňte v produkční pravidla.

## 17. Coding bot starting instruction

Implementujte specifikaci po vertikálních řezech: (1) projekt, migrace, autentizace personálu, syntetický katalog; (2) dostupnost a transakčně bezpečná rezervační doména s testy integrity; (3) UI pro ověření a rezervaci pacienta a administrace pro recepci; (4) outbox worker, připomenutí, proces správy termínu; (5) dokumentace nasazení na staging a checklist integrace s WordPressem. Doménovou logiku držte nezávislou na UI, aby budoucí AI nástroje mohly volat stejné validované operace. První řez dodejte se spustitelným README a pak pokračujte dalšími řezy. V tomto milníku nestavějte celý marketingový web, Academy, Shop, platby, AI chat ani obecnou SaaS platformu.

## Sources and evidence limits

- Požadavky WordPressu na databázi: https://wordpress.org/about/requirements/
- Dokumentace tlačítka v Divi (aktuální stránka popisuje Divi 5; nainstalovaný web veřejně uváděl Divi 4, popisky je tedy nutné ověřit): https://help.elegantthemes.com/en/articles/10259665-the-button-module-divi-5
- Omezení nad rozsahy v PostgreSQL: https://www.postgresql.org/docs/current/rangetypes.html#RANGETYPES-CONSTRAINT
- Stávající zveřejněná rezervační stránka: https://redpoint-clinic.cz/book-appointment/

Veřejnou prohlídkou nelze zjistit nainstalované verze serveru a databáze kliniky, soukromá nastavení pluginů, záznamy o termínech ani skutečnou kapacitu. Jde o navrhovanou implementační smlouvu, nikoli o audit soukromých provozních systémů.
