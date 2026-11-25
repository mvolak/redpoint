# Decision log

Stav: **D** = rozhodnuto pro vývoj v1 · **C** = musí potvrdit klinika před nasazením do produkce (specifikace §16).

| # | Date | Decision | Status |
|---|---|---|---|
| 1 | 2026-11-01 | **Vlastní rezervační backend místo externího rezervačního poskytovatele napojeného přes API.** Viz níže. | D (přehodnotit, pokud klinika dá přednost SaaS) |
| 2 | 2026-11-01 | Technologie: Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind 4, PostgreSQL 17, Drizzle ORM + postgres.js, Zod 4, Luxon. TypeScript 7 zatím záměrně nepoužíváme (kompatibilita nástrojů). | D |
| 3 | 2026-11-01 | Závazné jsou explicitní SQL migrace (`migrations/*.sql`); `src/db/schema.ts` je zrcadlí pro typované dotazy. Vlastní spouštěč (`scripts/migrate.ts`) s advisory lockem. | D |
| 4 | 2026-11-01 | Prevence dvojí rezervace: tabulka `occupancy` s `EXCLUDE USING gist (resource_id WITH =, during WITH &&)` nad polootevřeným `tstzrange`. Sdílejí ji rezervace (včetně časových rezerv) i ručně zadané blokace. Zapisující operace zamykají řádky `resource` v pořadí podle id (`SELECT … ORDER BY id FOR UPDATE`) a poté znovu načtou pravidla. | D |
| 5 | 2026-11-01 | Časové rezervy: samotný termín se musí vejít do pracovní doby; rezervy před a po termínu se nesmějí překrývat s jinou obsazeností, ale mohou přesahovat okraj pracovní doby. | C — potvrdit s klinikou |
| 6 | 2026-11-01 | Místnosti a vybavení (např. Redcord) jsou modelovány jako řádky `resource` a propojeny s jednotlivými službami (`service_required_resource`). Syntetická testovací data obsahují jednu „Redcord room“, aby se to dalo vyzkoušet. Zda jsou skutečné místnosti nedostatkové, není známo. | C |
| 7 | 2026-11-01 | „První volný“: konkrétní terapeut se přiřadí atomicky uvnitř rezervační transakce (kandidáti podle `sort_order`). Shrnutí před odesláním uvádí, že terapeut bude přiřazen při potvrzení, a potvrzení zobrazí jeho jméno. Pokud klinika vykládá §5.2 jako „před odesláním musí být uveden konkrétní terapeut“, přepnout rozhraní na odesílání explicitně zvoleného terapeuta. | C |
| 8 | 2026-11-01 | Storno lhůta = počet uplynulých hodin před začátkem (`booking_policy.cancellation_cutoff_hours`, synteticky 24 h). Počítání v pracovních dnech není implementováno. Změny a storna pacientem po uplynutí lhůty jsou online odmítnuty a odkázány na recepci. Recepce může měnit vždy. | C |
| 9 | 2026-11-01 | Přepínač veřejného režimu v `clinic_settings.public_mode` (`automatic` / `request_only` / `paused`). **Výchozí hodnota v migraci je `request_only`**; vývojová testovací data nastavují `automatic`, aby šlo vyzkoušet celý průchod. Jednotlivé služby mohou být také jen na žádost (`booking_mode`, `requires_review`). | D |
| 10 | 2026-11-01 | Ověřovací kód e-mailem: 6 číslic, 10 min, 5 pokusů, v úložišti uložen jako HMAC hash. Limity (pevné okno v Postgresu): 3 kódy/15 min na adresu, 10/15 min na IP, 30 pokusů o ověření/15 min na IP. Rezervační relace 30 min, nejvýše 3 rezervace/žádosti na relaci. | D |
| 11 | 2026-11-01 | Token v odkazu pro správu rezervace je umístěn ve **fragmentu** URL (`/manage#t=…`): nikdy se neposílá v požadavcích GET, nefiguruje v přístupových logech ani v hlavičce Referer. Stránka ho odešle metodou POST, obdrží *neověřenou* relační cookie a odstraní ho z URL; před zobrazením údajů nebo provedením změn je nutný ověřovací kód z e-mailu. Tokeny: 256 bitů, uložené jako HMAC hash, platnost končí 24 h po konci termínu; pro každý odchozí e-mail se vydává nový přístupový údaj, který se zneplatní, pokud odeslání selže. | D |
| 12 | 2026-11-01 | Notifikace: transakční outbox (`notification_outbox`, klíč pro deduplikaci = událost/rezervace/verze/kanál). Worker přebírá záznamy pomocí `FOR UPDATE SKIP LOCKED`, exponenciální odstup 1 min → 6 h, po 8 pokusech `failed` (ruční opakování v administraci). Zastaralá potvrzení a připomínky (změněná verze nebo nepotvrzeno) se označí `skipped`. Připomínky 24 h předem, jedna na verzi. Doručování přes `npm run worker` (dlouhodobě běžící proces) nebo `GET /api/cron/outbox` (HTTP cron). E-maily s ověřovacím kódem se odesílají synchronně (s čekáním na výsledek), protože jsou potřeba okamžitě. | D |
| 13 | 2026-11-01 | Rozhraní poskytovatele přihlašování personálu: `supabase` (Supabase Auth, TOTP MFA, AAL2 vynucené při `STAFF_REQUIRE_MFA=true`, v produkci povinné) a `dev` (lokální heslo z proměnné prostředí, mimo vývoj odmítnuto). Propojení personálu s účtem přes `staff_profile.auth_subject`. **Cesta přes Supabase se zkompiluje, ale nebyla vyzkoušena proti skutečnému projektu Supabase.** | D / ověřit na stagingu |
| 14 | 2026-11-01 | Recepce smí rezervovat mimo veřejnou mřížku termínů i v rámci veřejné minimální lhůty předem, ale nikdy do minulosti, mimo pracovní dobu ani s překryvem. Změny pracovní doby smí provádět jen admin (specifikace §4 „opening hours“); výjimky a blokace spravuje recepce. | D |
| 15 | 2026-11-01 | Změny rozvrhu (pracovní doba, výjimky) se provádějí uvnitř transakce a poté se znovu ověří všechny budoucí potvrzené rezervace dotčených terapeutů; jakékoli porušení změnu zruší a vrátí seznam dotčených rezervací. Výjimky pro celou kliniku mohou být jen uzavření. | D |
| 16 | 2026-11-01 | Přesunutí termínu zachovává snímek z doby rezervace (délka, časové rezervy, cena, verze podmínek). Personál může rezervaci přeřadit jinému způsobilému terapeutovi. | D |
| 17 | 2026-11-01 | Analytika: vysílá se pouze lokální událost prohlížeče `rp-analytics` s agregovanými názvy; nenačítá se žádný skript třetí strany. Napojit na sběrač šetrný k soukromí až po schválení. | D |
| 18 | 2026-11-01 | Kontaktní údaje pacienta se ukládají ke každé rezervaci/žádosti zvlášť (ve v1 bez vzájemného propojování a bez pacientských účtů). | D |

## 1. Owned backend vs. API-based booking provider

| | Owned (chosen) | Provider (e.g. a hosted scheduling SaaS with API) |
|---|---|---|
| Závazný zdroj termínů | Náš Postgres | Poskytovatel; nesmíme vést konkurenční evidenci termínů |
| UX primárně v češtině, režim jen na žádost, postupy pro recepci | Plně pod naší kontrolou | Omezeno funkcemi poskytovatele; režim jen na žádost obvykle chybí nebo je dodělaný narychlo |
| Záruky integrity | Vylučovací omezení v databázi + vlastní testy | Záruky poskytovatele; konflikty se testují obtížněji |
| Umístění dat / GDPR | Postgres v regionu EU dle naší volby | Závisí na DPA a regionu dodavatele |
| Znovupoužití v budoucí platformě Clinic–Academy–Shop | Doménové služby přímo znovupoužitelné | Jen integrační vrstva |
| Náklady / pracnost | Vyšší náročnost vývoje i provozu (tento kód) | Předplatné; rychlejší start |
| Riziko | Provozujeme to sami (zálohy, monitoring) | Závislost na dodavateli; předchozí poskytovatel (Memberzone) už kliniku jednou zklamal |

Zdůvodnění: klinika potřebuje během přechodu provoz v režimu jen na žádost, postupy zaměřené na recepci, české šablony a budoucí znovupoužití ve vlastní platformě; předchozí hostovaný poskytovatel přestal být dostupný. Pokud klinika dá přednost poskytovateli, ponechat rozhraní v `src/domain`, ale vnitřek `booking.ts`/`schedule.ts` nahradit voláními poskytovatele a vypustit lokální evidenci `occupancy`.

## Open items for the clinic (spec §16)

Aktivní pobočky · matice služeb a terapeutů · skutečné délky a časové rezervy · ceny · omezení pro nové pacienty · stav kapacity · omezení sdílených místností a vybavení · minimální lhůta předem / rezervační horizont · znění a výklad storno podmínek · zdroj stávajících rezervací (export z Memberzone?) · oprávnění personálu · doména odesílatele notifikací · doby uchování · poskytovatel a region hostingu/databáze · odpovědnost za zálohy.
