// SYNTHETIC development data only. Every name, price, duration and schedule here is invented
// for local testing and must never be loaded into production (spec §13 step 5, §16).
import "./load-env";
import { createDb } from "../src/db/client";
import * as s from "../src/db/schema";

if ((process.env.APP_ENV ?? "development") !== "development") {
  console.error("Seed refuses to run outside APP_ENV=development.");
  process.exit(1);
}

const { db, client } = createDb(process.env.DATABASE_URL!, { max: 1 });

const existing = await db.select().from(s.location);
if (existing.length) {
  console.log("Database already has data; run `npm run db:reset` for a fresh synthetic dataset.");
  await client.end();
  process.exit(0);
}

const [loc] = await db.insert(s.location).values({
  slug: "hradec-kralove", name: "Redpoint Clinic Hradec Králové (SYNTETICKÁ DATA)",
  address: "Ukázková 1, 500 02 Hradec Králové", timezone: "Europe/Prague",
  phone: "+420 000 000 000", email: "recepce@example.invalid",
}).returning();

await db.insert(s.clinicSettings).values({
  id: 1,
  // Dev convenience: automatic booking so the full flow can be exercised. The migration default
  // (and the required production starting point) is request_only.
  publicMode: "automatic",
  pausedMessage: "Online rezervace jsou dočasně pozastaveny. Kontaktujte prosím recepci.",
  receptionPhone: "+420 000 000 000", receptionEmail: "recepce@example.invalid", version: 1,
});

await db.insert(s.bookingPolicy).values({
  version: 1, cancellationCutoffHours: 24, active: true,
  termsText:
    "SYNTETICKÉ PODMÍNKY PRO VÝVOJ – nejsou schváleny klinikou.\n" +
    "Termín lze online zrušit nebo přesunout nejpozději 24 hodin před začátkem. Pozdější změny řešte s recepcí.\n" +
    "Rezervace slouží pouze k objednání termínu; nesdělujte nám zdravotní údaje.",
});

const therapists = await db.insert(s.therapist).values([
  { slug: "jana-testovaci", displayName: "Jana Testovací", bio: "Syntetický profil terapeutky.", locationId: loc!.id, active: true, sortOrder: 1 },
  { slug: "petr-ukazkovy", displayName: "Petr Ukázkový", bio: "Syntetický profil terapeuta.", locationId: loc!.id, active: true, sortOrder: 2 },
  { slug: "eva-vzorova", displayName: "Eva Vzorová", bio: "Syntetický profil terapeutky.", locationId: loc!.id, active: true, sortOrder: 3 },
]).returning();
const [jana, petr, eva] = therapists as [typeof therapists[0], typeof therapists[0], typeof therapists[0]];

await db.insert(s.resource).values(therapists.map((t) => ({ kind: "therapist" as const, name: t.displayName, therapistId: t.id, locationId: loc!.id, active: true })));
const [redcordRoom] = await db.insert(s.resource).values({ kind: "room", name: "Sál Redcord (syntetický)", locationId: loc!.id, active: true }).returning();

const services = await db.insert(s.service).values([
  {
    slug: "vstupni-vysetreni", name: "Vstupní vyšetření", sortOrder: 1, locationId: loc!.id, active: true,
    description: "První návštěva: rozhovor, vyšetření a návrh dalšího postupu. (syntetická data)",
    firstVisitInfo: "Přijďte prosím 10 minut předem, v pohodlném oblečení.",
    durationMin: 60, bufferBeforeMin: 0, bufferAfterMin: 10, priceMinMinor: 1_200_00, priceMaxMinor: null, currency: "CZK",
    bookingMode: "automatic", newPatients: "allowed", requiresReview: false, minLeadMinutes: 12 * 60, horizonDays: 60, slotStepMin: 15,
  },
  {
    slug: "kontrolni-terapie", name: "Kontrolní terapie", sortOrder: 2, locationId: loc!.id, active: true,
    description: "Navazující terapie pro stávající klienty. (syntetická data)", firstVisitInfo: null,
    durationMin: 45, bufferBeforeMin: 0, bufferAfterMin: 15, priceMinMinor: 900_00, priceMaxMinor: 1_200_00, currency: "CZK",
    bookingMode: "automatic", newPatients: "not_allowed", requiresReview: false, minLeadMinutes: 4 * 60, horizonDays: 45, slotStepMin: 15,
  },
  {
    slug: "redcord", name: "Redcord terapie", sortOrder: 3, locationId: loc!.id, active: true,
    description: "Cvičení v závěsném systému Redcord. Vyžaduje volný sál. (syntetická data)", firstVisitInfo: null,
    durationMin: 50, bufferBeforeMin: 5, bufferAfterMin: 5, priceMinMinor: 1_000_00, priceMaxMinor: null, currency: "CZK",
    bookingMode: "automatic", newPatients: "allowed", requiresReview: false, minLeadMinutes: 12 * 60, horizonDays: 60, slotStepMin: 30,
  },
  {
    slug: "konzultace-specialni", name: "Specializovaná konzultace", sortOrder: 4, locationId: loc!.id, active: true,
    description: "Vhodnost posoudí recepce, termín potvrdíme po ověření. (syntetická data)", firstVisitInfo: null,
    durationMin: 30, bufferBeforeMin: 0, bufferAfterMin: 0, priceMinMinor: 800_00, priceMaxMinor: null, currency: "CZK",
    bookingMode: "request_only", newPatients: "allowed", requiresReview: true, minLeadMinutes: 24 * 60, horizonDays: 60, slotStepMin: 30,
  },
]).returning();
const [vstup, kontrola, redcord, konzultace] = services as [typeof services[0], typeof services[0], typeof services[0], typeof services[0]];

await db.insert(s.serviceRequiredResource).values({ serviceId: redcord.id, resourceId: redcordRoom!.id });

await db.insert(s.therapistService).values([
  { therapistId: jana.id, serviceId: vstup.id, active: true },
  { therapistId: jana.id, serviceId: kontrola.id, active: true },
  { therapistId: jana.id, serviceId: redcord.id, active: true },
  { therapistId: petr.id, serviceId: vstup.id, active: true, durationMinOverride: 75 }, // explicit override example
  { therapistId: petr.id, serviceId: kontrola.id, active: true },
  { therapistId: petr.id, serviceId: konzultace.id, active: true },
  { therapistId: eva.id, serviceId: redcord.id, active: true },
  { therapistId: eva.id, serviceId: kontrola.id, active: true, priceMinOverride: 1_000_00, priceMaxOverride: null },
]);

const hours = (therapistId: string, days: number[], windows: [string, string][]) =>
  days.flatMap((weekday) => windows.map(([start, end]) => ({ therapistId, weekday, startLocal: start, endLocal: end })));
await db.insert(s.workingHours).values([
  ...hours(jana.id, [1, 2, 3, 4], [["08:00", "12:00"], ["13:00", "17:00"]]),
  ...hours(petr.id, [1, 3, 5], [["09:00", "18:00"]]),
  ...hours(petr.id, [2], [["12:00", "19:00"]]),
  ...hours(eva.id, [2, 4, 5], [["07:30", "13:30"]]),
]);

await db.insert(s.staffProfile).values([
  { email: "admin@example.invalid", displayName: "Administrátor (dev)", role: "admin", active: true, version: 1, authSubject: "dev-admin" },
  { email: "recepce@example.invalid", displayName: "Recepce (dev)", role: "reception", active: true, version: 1, authSubject: "dev-reception" },
  { email: "jana@example.invalid", displayName: "Jana Testovací", role: "therapist", therapistId: jana.id, active: true, version: 1, authSubject: "dev-jana" },
  { email: "petr@example.invalid", displayName: "Petr Ukázkový", role: "therapist", therapistId: petr.id, active: true, version: 1, authSubject: "dev-petr" },
]);

console.log("Synthetic seed loaded. Staff logins (AUTH_PROVIDER=dev, password = DEV_STAFF_PASSWORD):");
console.log("  admin@example.invalid · recepce@example.invalid · jana@example.invalid · petr@example.invalid");
await client.end();
