import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appointment, workingHours } from "@/db/schema";
import { cancelAppointment, createAppointment, rescheduleAppointment, setAppointmentOutcome } from "@/domain/booking";
import { addException, setWorkingHours } from "@/domain/schedule";
import { guestSession } from "@/db/schema";
import { randomToken } from "@/lib/crypto";
import { sessionTokenHash } from "@/domain/verification";
import { at, closeDb, contact, count, NOW, seedFixture, testDb, TUE, WED, verifiedSession, type Fixture } from "./helpers";

const db = testDb();
let f: Fixture;
beforeEach(async () => { f = await seedFixture(db); });
afterAll(closeDb);

async function book(therapistId: string, date: string, hhmm: string) {
  const s = await verifiedSession(db);
  return createAppointment(db, { sessionId: s.id, serviceId: f.service.id, therapistId, start: at(date, hhmm), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW);
}

async function manageSession(appointmentId: string, verified = true) {
  const [g] = await db.insert(guestSession).values({
    tokenHash: sessionTokenHash(randomToken()), purpose: "manage", appointmentId, verified, expiresAt: new Date(NOW.getTime() + 20 * 60_000),
  }).returning();
  return g!;
}

async function occupancyOf(appointmentId: string) {
  return (await db.query.occupancy.findMany({ where: (o, { eq }) => eq(o.appointmentId, appointmentId) })).map((o) => o.during);
}

describe("rescheduling", () => {
  it("failed rescheduling retains the original appointment and its occupancy", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    await book(f.therapistA.id, TUE, "13:00");
    const before = await occupancyOf(a.appointmentId);
    await expect(rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "13:30") }, NOW))
      .rejects.toMatchObject({ code: "slot_unavailable" });
    const [row] = await db.select().from(appointment).where(eq(appointment.id, a.appointmentId));
    expect(row!.startsAt.toISOString()).toBe(a.startsAt);
    expect(row!.version).toBe(1);
    expect(await occupancyOf(a.appointmentId)).toEqual(before);
  });

  it("successful reschedule moves occupancy atomically and frees the old slot", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    const r = await rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(WED, "10:00") }, NOW);
    expect(r.version).toBe(2);
    await expect(book(f.therapistA.id, TUE, "10:00")).resolves.toMatchObject({ kind: "confirmed" });
    expect(await count(db, "notification_outbox", "event = 'appointment_rescheduled'")).toBe(1);
  });

  it("reschedule can overlap its own previous time (shift by 15 minutes)", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    await expect(rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "10:15") }, NOW))
      .resolves.toMatchObject({ version: 2 });
  });

  it("stale edits are rejected", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    await rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "11:00") }, NOW);
    await expect(cancelAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1 }, NOW)).rejects.toMatchObject({ code: "stale_version" });
    await expect(rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "14:00") }, NOW)).rejects.toMatchObject({ code: "stale_version" });
  });

  it("concurrent edits with the same expected version: exactly one wins", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    const results = await Promise.allSettled([
      rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "14:00") }, NOW),
      cancelAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1 }, NOW),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe("stale_version");
  });

  it("staff reassignment to another therapist checks that therapist's time", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    await book(f.therapistB.id, TUE, "10:00");
    await expect(rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "10:00"), therapistId: f.therapistB.id }, NOW))
      .rejects.toMatchObject({ code: "slot_unavailable" });
    await expect(rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(TUE, "13:00"), therapistId: f.therapistB.id }, NOW))
      .resolves.toMatchObject({ therapistId: f.therapistB.id });
  });
});

describe("cancellation", () => {
  it("cancellation releases occupancy so the slot can be booked again", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    await cancelAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1 }, NOW);
    expect(await count(db, "occupancy")).toBe(0);
    await expect(book(f.therapistA.id, TUE, "10:00")).resolves.toMatchObject({ kind: "confirmed" });
  });

  it("patient cancellation respects the cutoff exactly; late changes go to reception", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    const s = await manageSession(a.appointmentId);
    const cutoff = new Date(new Date(a.startsAt).getTime() - 24 * 3_600_000);
    const late = new Date(cutoff.getTime() + 1);
    // Session must still be valid at those instants.
    await db.update(guestSession).set({ expiresAt: new Date(cutoff.getTime() + 3_600_000) }).where(eq(guestSession.id, s.id));
    await expect(cancelAppointment(db, { guestSessionId: s.id }, { appointmentId: a.appointmentId, expectedVersion: 1 }, late))
      .rejects.toMatchObject({ code: "policy", details: { reason: "late_change" } });
    await expect(cancelAppointment(db, { guestSessionId: s.id }, { appointmentId: a.appointmentId, expectedVersion: 1 }, cutoff))
      .resolves.toMatchObject({ state: "cancelled" });
  });

  it("an unverified management session cannot cancel", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    const s = await manageSession(a.appointmentId, false);
    await expect(cancelAppointment(db, { guestSessionId: s.id }, { appointmentId: a.appointmentId, expectedVersion: 1 }, NOW)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("a management session is scoped to its own appointment", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    const b = await book(f.therapistA.id, TUE, "13:00");
    const s = await manageSession(a.appointmentId);
    await expect(cancelAppointment(db, { guestSessionId: s.id }, { appointmentId: b.appointmentId, expectedVersion: 1 }, NOW)).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

describe("outcomes", () => {
  it("therapist records outcome for own appointment only, after start; occupancy is kept", async () => {
    const a = await book(f.therapistA.id, TUE, "10:00");
    const after = new Date(new Date(a.startsAt).getTime() + 70 * 60_000);
    await expect(setAppointmentOutcome(db, f.staffA, { appointmentId: a.appointmentId, expectedVersion: 1, outcome: "completed" }, NOW)).rejects.toMatchObject({ code: "policy" });
    await expect(setAppointmentOutcome(db, f.staffB, { appointmentId: a.appointmentId, expectedVersion: 1, outcome: "no_show" }, after)).rejects.toMatchObject({ code: "forbidden" });
    await expect(setAppointmentOutcome(db, f.staffA, { appointmentId: a.appointmentId, expectedVersion: 1, outcome: "no_show" }, after)).resolves.toMatchObject({ state: "no_show" });
    expect(await count(db, "occupancy")).toBe(1);
  });
});

describe("schedule changes vs appointments", () => {
  const nineToFive = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "09:00", end: "17:00" }));
  const nineToNoon = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "09:00", end: "12:00" }));

  it("rejects hours changes that would invalidate a confirmed appointment", async () => {
    await book(f.therapistA.id, TUE, "15:00");
    await expect(setWorkingHours(db, f.admin, f.therapistA.id, nineToNoon, NOW)).rejects.toMatchObject({ code: "schedule_conflict" });
    expect(await count(db, "working_hours", `therapist_id = '${f.therapistA.id}' AND end_local = '17:00'`)).toBe(5);
    await expect(setWorkingHours(db, f.admin, f.therapistB.id, nineToNoon, NOW)).resolves.toBeUndefined();
  });

  it("rejects leave on a day with appointments, allows it elsewhere", async () => {
    await book(f.therapistA.id, TUE, "10:00");
    await expect(addException(db, f.reception, { therapistId: f.therapistA.id, date: TUE, kind: "closed" }, NOW)).rejects.toMatchObject({ code: "schedule_conflict" });
    await expect(addException(db, f.reception, { therapistId: null, date: TUE, kind: "closed" }, NOW)).rejects.toMatchObject({ code: "schedule_conflict" });
    await expect(addException(db, f.reception, { therapistId: f.therapistA.id, date: WED, kind: "closed" }, NOW)).resolves.toBeDefined();
    await expect(book(f.therapistA.id, WED, "10:00")).rejects.toMatchObject({ code: "slot_unavailable" });
  });

  it("hours/leave updates cannot race a booking into an invalid schedule", async () => {
    for (let i = 0; i < 8; i++) {
      f = await seedFixture(db);
      await Promise.allSettled([
        book(f.therapistA.id, TUE, "15:00"),
        setWorkingHours(db, f.admin, f.therapistA.id, nineToNoon, NOW),
      ]);
      const hours = await db.select().from(workingHours).where(eq(workingHours.therapistId, f.therapistA.id));
      const appts = await db.select().from(appointment).where(eq(appointment.state, "confirmed"));
      const shortened = hours.every((h) => h.endLocal.startsWith("12:00"));
      // Never both: a 15:00 appointment with hours ending at 12:00.
      expect(shortened && appts.length > 0).toBe(false);
      expect(shortened || appts.length === 1).toBe(true);
    }
    await setWorkingHours(db, f.admin, f.therapistA.id, nineToFive, NOW);
  });
});
