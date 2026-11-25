# Email (SMTP)

Jak projekt odesílá e-maily, v jakém stavu je to nyní (simulované / sandboxové SMTP) a plán přechodu na skutečné doručování. Oblast č. 15 v `FEATURE_AREAS.md`.

Last updated: 24 Nov 2026.

## Current status in short

- **E-maily odesílá jen rezervační systém.** Poptávkový formulář webu e-maily neodesílá: používá testovací adaptér a nic neposílá (viz `PRODUCTION_BACKLOG.md`).
- **Local development:** e-maily se ukládají do databáze a zobrazují se v testovací schránce na `/rezervace/dev/mailbox/`. Nic neopustí počítač.
- **Staging (Vercel):** e-maily odcházejí přes skutečné SMTP do **sandboxu Mailtrap**. Sandbox zprávy přijímá, ale nikdy je nedoručí skutečným příjemcům. Navíc `EMAIL_REDIRECT_ALL_TO` přeadresuje každou zprávu do jedné testovací schránky.
- **Production:** skutečný poskytovatel zatím není vybraný. Produkce není nasazená.

## What the system sends

| Message | Subject | When | How it is sent |
|---|---|---|---|
| Ověřovací kód (OTP) | Ověřovací kód – Redpoint Clinic | Pacient rezervuje termín nebo otevře „správu rezervace“ | Přímo během požadavku. Bez fronty. |
| Potvrzení rezervace | Potvrzení rezervace – Redpoint Clinic | Vytvoření rezervace (služby s automatickým potvrzením) | Fronta outbox, s kalendářovou přílohou `.ics` |
| Změna termínu | Změna termínu – Redpoint Clinic | Přesunutí rezervace | Fronta outbox, s `.ics` |
| Zrušení | Zrušení rezervace – Redpoint Clinic | Zrušení rezervace | Fronta outbox, s `.ics` (zrušení) |
| Připomínka | Připomínka termínu – Redpoint Clinic | Přibližně 24 h před termínem | Fronta outbox |
| Přijetí žádosti | Přijali jsme vaši žádost o termín – Redpoint Clinic | Pacient odešle žádost u služby rezervované jen na žádost | Fronta outbox |
| Zamítnutí žádosti | Vaše žádost o termín – Redpoint Clinic | Recepce žádost zamítne | Fronta outbox |

Šablony jsou v `packages/booking/src/notifications/templates.ts`: v češtině, jako prostý text a jednoduché HTML, se značkou „Redpoint Clinic“. Potvrzení a změny obsahují odkaz pro správu rezervace.

### The outbox queue

Vše kromě OTP prochází tabulkou `notification_outbox` (`packages/booking/src/notifications/outbox.ts`):

- Nejprve se uloží rezervace a ve stejné transakci se e-mail zařadí do fronty. **Selhání e-mailu nikdy rezervaci nezruší ani nezablokuje.**
- Každý běh workeru odešle zprávy, které jsou na řadě, neúspěšné zkouší znovu s narůstající prodlevou (1 min, pokaždé dvojnásobek, nejvýše 6 h, až 8 pokusů) a poté je označí jako `failed`.
- Zastaralé zprávy se přeskakují. Například připomínka k rezervaci, která byla mezitím přesunuta.
- Duplicitám brání deduplikační klíč pro každou událost a verzi rezervace.

**Who runs the worker:**
- Lokálně: `pnpm worker` (trvale běžící smyčka, každých 30 s) nebo `pnpm worker -- --once`.
- Na Vercelu: endpoint `/api/rezervace/cron/outbox/`, který každou minutu volá externí plánovač s hlavičkou `Authorization: Bearer <CRON_SECRET>`. Vlastní cron Vercelu na tarifu Hobby nemůže běžet tak často, proto je potřeba externí služba, například cron-job.org. **Na stagingu zatím není nastaveno:** potvrzení a připomínky z fronty se tam zatím neodesílají. OTP přesto funguje, protože frontu nepoužívá.

## Providers and modes

Volí se pomocí `EMAIL_PROVIDER` (`packages/booking/src/notifications/provider.ts`):

| Value | What it does | Used for |
|---|---|---|
| `capture` | Ukládá zprávy do tabulky `captured_email` a zobrazuje je na `/rezervace/dev/mailbox/` | Lokální vývoj (výchozí) |
| `smtp` | Odesílá přes SMTP pomocí nodemaileru s nastavením `SMTP_*` | Staging a produkce |
| `failing` | Každé odeslání selže | Testy a nácvik výpadků |

**`EMAIL_REDIRECT_ALL_TO`**, je-li nastaveno, obaluje libovolného poskytovatele. Každá zpráva odejde na tuto jedinou adresu a předmět dostane prefix `[TEST → original@address]`. Jde o pojistku pro staging, aby z testovacího prostředí nikdy nedostal e-mail žádný skutečný pacient.

## Safety guards in code

`packages/booking/src/lib/env.ts` odmítne aplikaci spustit, pokud:

- `APP_ENV` je `staging` nebo `production` a `EMAIL_PROVIDER` není `smtp`;
- `APP_ENV` je `development` nebo `test` mimo localhost nebo na Vercelu. Testovací schránka zobrazuje OTP kódy, takže nikdy nesmí být veřejná (PR #2).

## Configuration per environment

| Variable | Local | Staging (now) | Production (target) |
|---|---|---|---|
| `APP_ENV` | `development` | `staging` | `production` |
| `EMAIL_PROVIDER` | `capture` | `smtp` | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | nepoužívá se | `sandbox.smtp.mailtrap.io` / `2525` | Host a port skutečného poskytovatele (obvykle 587 STARTTLS nebo 465 TLS) |
| `SMTP_SECURE` | nepoužívá se | `false` | `true` pro port 465, `false` pro 587 |
| `SMTP_USER` / `SMTP_PASSWORD` | nepoužívá se | Přístupové údaje k sandboxu Mailtrap | Přístupové údaje ke skutečnému poskytovateli, uložené pouze ve Vercelu |
| `EMAIL_FROM` | výchozí `rezervace@example.invalid` | ověřit hodnotu nastavenou ve Vercelu | Skutečný odesílatel na ověřené doméně |
| `EMAIL_REDIRECT_ALL_TO` | prázdné | adresa testovací schránky | **prázdné** |
| `CRON_SECRET` | v `.env.local` | nastaveno | nastaveno (nová hodnota) |

Tajné údaje jsou uložené pouze v `apps/redcord-web/.env.local` (ignorováno gitem) a v proměnných prostředí Vercelu. Nikdy je necommitujte.

### Optional: staging-like SMTP on your machine

`packages/booking/docker-compose.yml` obsahuje volitelný kontejner **Mailpit** (profil `mail`): lokální simulovaný SMTP server s webovou schránkou. Spustíte ho příkazem `docker compose --profile mail up -d` ve složce `packages/booking` a nastavíte `EMAIL_PROVIDER=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=54341`. Zprávy se pak zobrazí na `http://localhost:54342`. Takto otestujete skutečnou cestu přes SMTP bez jakékoli externí služby.

## Path to real email

### Stage 1: finish staging on the sandbox (now)

1. Nastavte externí cron pro `/api/rezervace/cron/outbox/`, aby se e-maily z fronty odesílaly.
2. Proveďte kompletní testovací rezervaci a přečtěte si kód v Mailtrapu. Ověřte, že dorazí potvrzení a poté zprávy o změně termínu, zrušení a připomínka.
3. Zkontrolujte, jak se zprávy zobrazují: české znaky, odkazy, příloha `.ics` v kalendářové aplikaci.

### Stage 2: owner decisions

4. **Sending domain and address.** Například `rezervace@redpoint-clinic.cz` nebo adresa na doméně redcord.cz. Pacienti znají jako odesílatele kliniku, takže její doména je přirozenou volbou. Vyplatí se přidat `Reply-To` směřující na recepci.
5. **Provider.** Nejjednodušší je transakční e-mailová služba s SMTP. Kritéria výběru:
   - zpracování dat v EU a smlouva o zpracování osobních údajů (DPA), protože zprávy obsahují jména pacientů a podrobnosti o termínech (GDPR);
   - podpora SPF, DKIM a DMARC na naší doméně;
   - protokoly o doručení a hlášení o nedoručitelnosti (bounce);
   - cena pro očekávaný objem.

   Příklady k porovnání: Brevo, Postmark, Mailgun (region EU), Amazon SES (region EU). Přes SMTP umí odesílat i stávající schránka kliniky v Microsoft 365 / Google Workspace, má však denní limity a pro automatickou poštu se hodí méně.
6. Kdo bude vlastnit účet u poskytovatele a DNS odesílací domény.

### Stage 3: switch to real delivery (production)

7. Ověřte odesílací doménu u poskytovatele: přidejte DNS záznamy SPF, DKIM a DMARC, které uvede, a počkejte, až projdou ověřením.
8. V **produkčním** prostředí Vercelu nastavte hodnoty `SMTP_*` od poskytovatele, skutečný `EMAIL_FROM`, `APP_ENV=production` a `EMAIL_REDIRECT_ALL_TO` ponechte **prázdné**.
9. Staging ponechte na sandboxu Mailtrap s přesměrováním, aby se testy nikdy nedostaly ke skutečným pacientům.
10. Proveďte nové nasazení, zarezervujte testovací termín na adresu někoho z personálu a zkontrolujte doručení, zda zpráva nekončí ve spamu (např. pomocí mail-tester.com) a zda odkazy vedou na produkční doménu (`APP_URL`).
11. Během prvních týdnů sledujte u poskytovatele protokoly o doručení a nedoručitelnosti. Neúspěšné řádky fronty outbox jsou vidět v administraci.

### Later

- **Optional real-delivery test on staging:** nasměrujte staging na skutečného poskytovatele a nastavte `EMAIL_REDIRECT_ALL_TO` na schránku personálu. Tak otestujete skutečné doručování ještě před spuštěním, bez jakéhokoli rizika pro pacienty.
- **Monitoring:** upozornění, když zprávy ve frontě skončí jako `failed` nebo když cron přestane volat (oblast č. 35).
- **Enquiry form:** pokud bude žádoucí skutečné odesílání i u poptávkového formuláře webu, může využít stejného poskytovatele (oblast č. 4).
- **SMS:** rozhraní poskytovatele je připravené na pozdější doplnění kanálu SMS.

## Related

- `booking/README.md`: nastavení rezervací a rozhodnutí majitele
- `booking/DEPLOYMENT.md`: nasazení a proměnné prostředí
- `.env.example`: všechny proměnné s lokálními výchozími hodnotami
