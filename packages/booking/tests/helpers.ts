import { sql } from "drizzle-orm";
import { createDb, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { randomToken } from "@/lib/crypto";
import { sessionTokenHash } from "@/domain/verification";
import type { StaffActor } from "@/domain/actor";
import { DateTime } from "luxon";
import { CLINIC_TZ, localToInstant } from "@/domain/time";

let handle: ReturnType<typeof createDb> | undefined;

export function testDb(): Db {
  if (!handle) handle = createDb(process.env.DATABASE_URL!, { max: 20 });
  return handle.db;
}

export async function closeDb() {
  await handle?.client.end();
  handle = undefined;
}

const TABLES = [
  "captured_email", "audit_event", "notification_outbox", "management_credential", "verification_challenge", "guest_session",
  "idempotency_record", "occupancy", "time_block", "appointment_request", "appointment", "patient_contact", "schedule_exception",
  "working_hours", "staff_profile", "therapist_service", "service_required_resource", "service", "resource", "therapist",
  "booking_policy", "clinic_settings", "location", "rate_limit",
];

export async function resetData(db: Db) {
  // appointment_request ↔ appointment reference each other; CASCADE handles it.
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} CASCADE`));
}

/**
 * A Monday 08:00 Europe/Prague at least a week after the real clock, so DB-defaulted timestamps
 * (created_at/updated_at = real now()) are always safely in the past relative to test time.
 */
const monday = DateTime.now().setZone(CLINIC_TZ).plus({ days: 8 }).startOf('week').plus({ weeks: 1 }).set({ hour: 8 });
export const NOW = monday.toJSDate();
export const MON = monday.toISODate()!;
export const TUE = monday.plus({ days: 1 }).toISODate()!;
export const WED = monday.plus({ days: 2 }).toISODate()!;
export const at = (date: string, hhmm: string) => new Date(localToInstant(date, hhmm));

export type Fixture = Awaited<ReturnType<typeof seedFixture>>;

export async function seedFixture(db: Db, opts: { publicMode?: s.PublicMode; withRoom?: boolean } = {}) {
  await resetData(db);
  const [loc] = await db.insert(s.location).values({ slug: "hk", name: "Test Clinic", address: "Testovací 1, Hradec Králové", phone: "+420 111 111 111", email: "clinic@example.invalid" }).returning();
  await db.insert(s.clinicSettings).values({ id: 1, publicMode: opts.publicMode ?? "automatic", receptionPhone: "+420 111 111 111", receptionEmail: "recepce@example.invalid" });
  await db.insert(s.bookingPolicy).values({ version: 1, cancellationCutoffHours: 24, termsText: "Test terms", active: true });
  const [tA, tB] = await db.insert(s.therapist).values([
    { slug: "a", displayName: "Therapist A", locationId: loc!.id, sortOrder: 1 },
    { slug: "b", displayName: "Therapist B", locationId: loc!.id, sortOrder: 2 },
  ]).returning();
  const [rA, rB] = await db.insert(s.resource).values([
    { kind: "therapist", name: "A", therapistId: tA!.id, locationId: loc!.id },
    { kind: "therapist", name: "B", therapistId: tB!.id, locationId: loc!.id },
  ]).returning();
  const [svc, svcExisting, svcReview] = await db.insert(s.service).values([
    { slug: "std", name: "Standard", locationId: loc!.id, durationMin: 60, bufferBeforeMin: 0, bufferAfterMin: 15, priceMinMinor: 100000, minLeadMinutes: 60, horizonDays: 30, slotStepMin: 15 },
    { slug: "existing", name: "Existing only", locationId: loc!.id, durationMin: 30, newPatients: "not_allowed", priceMinMinor: 50000, minLeadMinutes: 60, horizonDays: 30, slotStepMin: 30 },
    { slug: "review", name: "Needs review", locationId: loc!.id, durationMin: 30, requiresReview: true, bookingMode: "request_only", minLeadMinutes: 60, horizonDays: 30, slotStepMin: 30 },
  ]).returning();
  await db.insert(s.therapistService).values([
    { therapistId: tA!.id, serviceId: svc!.id }, { therapistId: tB!.id, serviceId: svc!.id },
    { therapistId: tA!.id, serviceId: svcExisting!.id }, { therapistId: tA!.id, serviceId: svcReview!.id },
  ]);
  let room: typeof s.resource.$inferSelect | undefined;
  if (opts.withRoom) {
    [room] = await db.insert(s.resource).values({ kind: "room", name: "Room", locationId: loc!.id }).returning();
    await db.insert(s.serviceRequiredResource).values({ serviceId: svc!.id, resourceId: room!.id });
  }
  const weekdays = [1, 2, 3, 4, 5];
  await db.insert(s.workingHours).values([
    ...weekdays.map((weekday) => ({ therapistId: tA!.id, weekday, startLocal: "09:00", endLocal: "17:00" })),
    ...weekdays.map((weekday) => ({ therapistId: tB!.id, weekday, startLocal: "09:00", endLocal: "17:00" })),
  ]);
  const staff = await db.insert(s.staffProfile).values([
    { email: "admin@t.invalid", displayName: "Admin", role: "admin" },
    { email: "rec@t.invalid", displayName: "Reception", role: "reception" },
    { email: "a@t.invalid", displayName: "A", role: "therapist", therapistId: tA!.id },
    { email: "b@t.invalid", displayName: "B", role: "therapist", therapistId: tB!.id },
  ]).returning();
  const actor = (i: number): StaffActor => ({ kind: "staff", staffId: staff[i]!.id, role: staff[i]!.role, therapistId: staff[i]!.therapistId, displayName: staff[i]!.displayName });
  return {
    location: loc!, therapistA: tA!, therapistB: tB!, resourceA: rA!, resourceB: rB!, room,
    service: svc!, serviceExisting: svcExisting!, serviceReview: svcReview!,
    admin: actor(0), reception: actor(1), staffA: actor(2), staffB: actor(3),
  };
}

/** A verified booking session, as produced by a successful OTP (OTP flow has its own tests). */
export async function verifiedSession(db: Db, email = `p${Math.random().toString(36).slice(2, 8)}@example.invalid`, now = NOW) {
  const token = randomToken();
  const [g] = await db.insert(s.guestSession).values({
    tokenHash: sessionTokenHash(token), purpose: "booking", email, verified: true, expiresAt: new Date(now.getTime() + 30 * 60_000),
  }).returning();
  return g!;
}

export const contact = { name: "Test Patient", phone: "+420 777 000 000", isNewPatient: true };

export async function count(db: Db, table: string, where = "true"): Promise<number> {
  const r = await db.execute<{ n: number }>(sql.raw(`SELECT count(*)::int AS n FROM ${table} WHERE ${where}`));
  return Number(r[0]!.n);
}
