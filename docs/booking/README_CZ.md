# Redpoint Clinic booking — embedded in the Redcord site

Samostatná aplikace **Redpoint Booking v1** (`C:\repo\booking`, commit `9fde9a9`) byla 2. 11. 2026 přesunuta do tohoto monorepa a nyní ji obsluhuje `apps/redcord-web` pod cestou `/rezervace/`. Ostatní dokumenty v této složce pocházejí z onoho repozitáře. Stále ji popisují jako samostatnou aplikaci na `booking.redpoint-clinic.cz` s cestami jako `/manage` a `/api/...`. **Tabulka cest níže má před nimi přednost.**

> Všechna testovací data jsou **syntetická** (služby, terapeuti, ceny, pracovní doba, personál). Nic není nasazeno a neodesílají se žádné e-maily: poskytovatel `capture` ukládá poštu do databáze.

## Quick start

Vyžaduje Docker. Rezervační skripty čtou `apps/redcord-web/.env.local`; zkopírujte tam `.env.example` a nastavte `APP_SECRET` a `CRON_SECRET`.

```bash
pnpm db:up          # Postgres 17 on localhost:54340 (+ booking_test DB)
pnpm db:migrate
pnpm db:seed        # synthetic catalogue, therapists, hours, staff
pnpm dev            # http://localhost:3000/rezervace/
pnpm worker         # second terminal: delivers queued e-mails/reminders (to the capture mailbox)
```

- Rezervace pro pacienty: `/rezervace/` (přímý odkaz: `/rezervace/?service=vstupni-vysetreni&therapist=<slug>`)
- Zachycené e-maily (ověřovací kódy, potvrzení, odkazy pro správu rezervace): `/rezervace/dev/mailbox/`
- Recepce/administrace: `/rezervace/admin/`. Vývojové přihlašovací účty `admin@`, `recepce@`, `jana@`, `petr@example.invalid`; heslo z `DEV_STAFF_PASSWORD` (`redpoint-dev`).
- Čerstvá data: `pnpm db:reset`
- `pnpm db:up` vytvoří kontejner s názvem `redpoint_booking_db`. Pokud už běží kontejner z původního samostatného repozitáře, jde o stejnou databázi na stejném portu: použijte ji.

Bez `DATABASE_URL` a `APP_SECRET` se web přesto sestaví a spustí. `/rezervace/` i administrace zobrazí upozornění „nepřipojeno“ a API odpovídá kódem 503.

## Tests

| Command | What |
|---|---|
| `pnpm test:booking` | 62 integračních testů proti skutečné jednorázové databázi PostgreSQL (`booking_test`, při každém běhu vytvořena znovu): souběhy dvojí rezervace, letní čas, idempotence, bezpečnost ověřovacích kódů a tokenů, oprávnění. Vyžaduje `pnpm db:up`. |
| `node scripts/booking-e2e.mjs [baseUrl]` | Průchod v prohlížeči: rezervace jako nový pacient → ověřovací kód z vývojové schránky → potvrzení → odkaz pro správu rezervace → přihlášení recepce. Vyžaduje běžící server, worker a vývojovou databázi. **Zapíše jednu syntetickou rezervaci** (`e2e+…@example.invalid`). |

## Paths (old standalone → embedded)

| Standalone | Embedded |
|---|---|
| `/` | `/rezervace/` |
| `/manage#t=…` (odkaz z e-mailu) | `/rezervace/sprava/#t=…` |
| `/admin/…` | `/rezervace/admin/…` |
| `/dev/mailbox` | `/rezervace/dev/mailbox/` |
| `/api/…` | `/api/rezervace/…/` (lomítko na konci; doplňuje ho klient) |
| `/api/cron/outbox` | `/api/rezervace/cron/outbox/` |

## Structure

```
packages/booking/            @redcord/booking
  src/domain|db|notifications|auth|lib   unchanged business logic (imports made relative)
  src/components/            patient wizard, manage view, reception UI (Header removed: site chrome is used)
  migrations/ scripts/ tests/ docker-compose.yml
apps/redcord-web/src/app/
  (site)/rezervace/          patient pages inside the Redcord header/footer
  (booking)/rezervace/       admin + dev mailbox: own layout, no public chrome, noindex
  api/rezervace/             thin route handlers → @redcord/booking
```

## What changed compared with the standalone app

- **Layout:** stránky pro pacienty používají hlavičku, patičku a banner pro připomínkování webu Redcord. Rezervační `Header` a kořenový layout byly odstraněny. Designové tokeny (`brand`, `ink`, `muted`, `line`, `surface`) jsou namapované na tokeny Redcordu, takže rezervační rozhraní přebírá barvy Redcordu a písmo Inter.
- **Headers:** rezervační CSP, `X-Frame-Options: DENY`, `no-referrer` na `/rezervace/sprava/` a `noindex` pro administraci, vývojové stránky a API se uplatňují **pouze na rezervačních cestách** (`next.config.ts`).
- **Environment:** sdílené s webem v jednom souboru `.env.local`. Rezervační proměnné (`APP_URL`, `APP_ENV`, `DATABASE_URL`, `APP_SECRET`, …) nekolidují s proměnnými webu (`SITE_ENV`, `SITE_ORIGIN`, …).
- **Vývojový režim funguje jen na localhostu.** `APP_ENV=development|test` zapíná vývojové přihlášení personálu a schránku zachycených e-mailů (která zobrazuje ověřovací kódy). `env()` tento režim odmítne, pokud `APP_URL` není `localhost`/`127.0.0.1`/`[::1]` nebo pokud je nastavená `VERCEL`, takže nasazení, které zapomene nastavit `APP_ENV`, skončí chybou, místo aby schránku zpřístupnilo. Nasazení nastavují `APP_ENV=staging` nebo `production`.
- **No database:** `bookingConfigured()` blokuje stránky a API routy, pokud chybí databáze nebo tajný klíč.
- **Tooling:** vitest byl v celém workspace povýšen z 4.0.18 na 5.0.5, aby odpovídal rezervačním testům. npm bylo nahrazeno pnpm.
- **Unchanged:** doménová logika, SQL schéma a testy. Přepsány byly jen řetězce URL.

## Open decisions for the owner

1. **Domain and brand.** Rezervace kliniky nyní běží na redcord.cz, zatímco rozhraní i e-maily uvádějí „Redpoint Clinic“. Má redpoint-clinic.cz odkazovat sem, nebo má `booking.redpoint-clinic.cz` směřovat na toto nasazení (bylo by potřeba přepisování podle hostitele)?
2. **Real catalogue.** Služby, délky, ceny, terapeuty, pracovní dobu a podmínky dodá klinika; nahradí syntetická testovací data.
3. **Production stack.** Je potřeba hostovaný Postgres, Supabase Auth s MFA pro personál, SMTP a worker nebo cron. Do té doby zůstává `APP_ENV=development` a e-maily se pouze zachycují (viz `DEPLOYMENT.md`; upravte názvy hostitelů).
4. **Privacy.** Informace o zpracování údajů pacientů a doba jejich uchování musí klinika schválit před první skutečnou rezervací.
