import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createAppointment, staffCreateAppointment } from "@/domain/booking";
import { createBlock } from "@/domain/schedule";
import { findAvailability } from "@/domain/availability-query";
import { DomainError } from "@/domain/errors";
import { at, closeDb, contact, count, NOW, seedFixture, testDb, TUE, verifiedSession, type Fixture } from "./helpers";

const db = testDb();
let f: Fixture;

beforeEach(async () => { f = await seedFixture(db); });
afterAll(closeDb);

async function book(therapistId: string | null, date: string, hhmm: string, key = crypto.randomUUID(), sessionId?: string) {
  const sid = sessionId ?? (await verifiedSession(db)).id;
  return createAppointment(db, { sessionId: sid, serviceId: f.service.id, therapistId, start: at(date, hhmm), termsVersion: 1, contact, idempotencyKey: key }, NOW);
}

function codeOf(r: PromiseSettledResult<unknown>) {
  return r.status === "rejected" ? (r.reason as DomainError).code : "ok";
}

describe("concurrency", () => {
  it("two patients requesting the same slot: one succeeds, the other gets a conflict", async () => {
    const results = await Promise.allSettled([book(f.therapistA.id, TUE, "10:00"), book(f.therapistA.id, TUE, "10:00")]);
    expect(results.map(codeOf).sort()).toEqual(["ok", "slot_unavailable"]);
    expect(await count(db, "appointment")).toBe(1);
    expect(await count(db, "occupancy")).toBe(1);
  });

  it("overlapping (not identical) intervals under concurrency: at most one reservation", async () => {
    const results = await Promise.allSettled([
      book(f.therapistA.id, TUE, "10:00"), book(f.therapistA.id, TUE, "10:30"), book(f.therapistA.id, TUE, "10:45"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.map(codeOf).filter((c) => c !== "ok")).toEqual(["slot_unavailable", "slot_unavailable"]);
  });

  it("first-available resolves a specific therapist atomically and never over-promises pooled capacity", async () => {
    const results = await Promise.allSettled([book(null, TUE, "11:00"), book(null, TUE, "11:00"), book(null, TUE, "11:00")]);
    const ok = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof book>>> => r.status === "fulfilled");
    expect(ok).toHaveLength(2);
    expect(new Set(ok.map((r) => r.value.therapistId))).toEqual(new Set([f.therapistA.id, f.therapistB.id]));
    expect(results.map(codeOf).filter((c) => c !== "ok")).toEqual(["slot_unavailable"]);
  });

  it("the exclusion constraint itself rejects overlaps and allows adjacent half-open ranges", async () => {
    const r = await book(f.therapistA.id, TUE, "10:00"); // occupies [10:00, 11:15)
    const insertBlock = (s: Date, e: Date) => db.execute(sql`
      WITH b AS (INSERT INTO time_block (resource_id, starts_at, ends_at) VALUES (${f.resourceA.id}, ${s.toISOString()}::timestamptz, ${e.toISOString()}::timestamptz) RETURNING id)
      INSERT INTO occupancy (resource_id, during, time_block_id) SELECT ${f.resourceA.id}, tstzrange(${s.toISOString()}::timestamptz, ${e.toISOString()}::timestamptz, '[)'), id FROM b`);
    await expect(insertBlock(at(TUE, "11:00"), at(TUE, "11:30"))).rejects.toMatchObject({ cause: { code: "23P01" } });
    await expect(insertBlock(at(TUE, "11:15"), at(TUE, "11:30"))).resolves.toBeDefined();
    expect(r.kind).toBe("confirmed");
  });
});

describe("idempotency", () => {
  it("duplicate network retries create one appointment and one notification event", async () => {
    const session = await verifiedSession(db);
    const key = crypto.randomUUID();
    const first = await book(f.therapistA.id, TUE, "10:00", key, session.id);
    const retry = await book(f.therapistA.id, TUE, "10:00", key, session.id);
    expect(retry.appointmentId).toBe(first.appointmentId);
    expect(retry.replayed).toBe(true);
    expect(await count(db, "appointment")).toBe(1);
    expect(await count(db, "notification_outbox")).toBe(1);
  });

  it("concurrent identical requests (uncertain network) still produce one appointment", async () => {
    const session = await verifiedSession(db);
    const key = crypto.randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => book(f.therapistA.id, TUE, "10:00", key, session.id)));
    expect(new Set(results.map((r) => r.appointmentId)).size).toBe(1);
    expect(await count(db, "appointment")).toBe(1);
    expect(await count(db, "notification_outbox")).toBe(1);
  });

  it("a changed payload with the same key is rejected", async () => {
    const session = await verifiedSession(db);
    const key = crypto.randomUUID();
    await book(f.therapistA.id, TUE, "10:00", key, session.id);
    await expect(book(f.therapistA.id, TUE, "13:00", key, session.id)).rejects.toMatchObject({ code: "idempotency_mismatch" });
  });

  it("keys are scoped to the session: another session's identical key does not replay", async () => {
    const key = crypto.randomUUID();
    await book(f.therapistA.id, TUE, "10:00", key);
    await expect(book(f.therapistA.id, TUE, "10:00", key)).rejects.toMatchObject({ code: "slot_unavailable" });
  });
});

describe("buffers, blocks and adjacency", () => {
  it("post-buffer blocks the following slot; the first slot after the buffer stays bookable", async () => {
    await book(f.therapistA.id, TUE, "10:00"); // 60 min + 15 min buffer → [10:00, 11:15)
    await expect(book(f.therapistA.id, TUE, "11:00")).rejects.toMatchObject({ code: "slot_unavailable" });
    await expect(book(f.therapistA.id, TUE, "11:15")).resolves.toMatchObject({ kind: "confirmed" });
  });

  it("a buffered booking may not run into the next appointment", async () => {
    await book(f.therapistA.id, TUE, "12:00");
    // 10:45 + 60 + 15 = 12:00 → adjacent, allowed. 11:00 would overlap.
    await expect(book(f.therapistA.id, TUE, "11:00")).rejects.toMatchObject({ code: "slot_unavailable" });
    await expect(book(f.therapistA.id, TUE, "10:45")).resolves.toMatchObject({ kind: "confirmed" });
  });

  it("manual blocks prevent bookings and cannot be placed over an appointment", async () => {
    await createBlock(db, f.reception, { therapistId: f.therapistA.id, start: at(TUE, "13:00"), end: at(TUE, "14:00"), kind: "break" });
    await expect(book(f.therapistA.id, TUE, "12:00")).rejects.toMatchObject({ code: "slot_unavailable" }); // buffer hits 13:00
    await expect(book(f.therapistA.id, TUE, "13:30")).rejects.toMatchObject({ code: "slot_unavailable" });
    await expect(book(f.therapistA.id, TUE, "14:00")).resolves.toMatchObject({ kind: "confirmed" });
    await expect(createBlock(db, f.reception, { therapistId: f.therapistA.id, start: at(TUE, "14:30"), end: at(TUE, "15:00"), kind: "block" }))
      .rejects.toMatchObject({ code: "schedule_conflict" });
  });

  it("availability omits occupied time and reveals no occupant details", async () => {
    await book(f.therapistA.id, TUE, "10:00");
    const res = await findAvailability(db, { serviceId: f.service.id, therapistId: f.therapistA.id, from: TUE, to: TUE }, { now: NOW });
    const starts = res.slots.map((s) => s.start);
    expect(starts).not.toContain(at(TUE, "10:00").toISOString());
    expect(starts).not.toContain(at(TUE, "11:00").toISOString());
    expect(starts).toContain(at(TUE, "11:15").toISOString());
    // 09:00–10:00 plus its own 15 min post-buffer reaches 10:15 and would overlap the 10:00 booking.
    expect(starts).not.toContain(at(TUE, "09:00").toISOString());
    expect(starts).toContain(at(TUE, "16:00").toISOString()); // last slot that ends by 17:00
    for (const s of res.slots) expect(Object.keys(s).sort()).toEqual(["end", "start"]);
  });

  it("shared room resource is reserved together with the therapist", async () => {
    f = await seedFixture(db, { withRoom: true });
    // Both therapists need the single room: only one booking at 10:00 across therapists.
    const results = await Promise.allSettled([book(f.therapistA.id, TUE, "10:00"), book(f.therapistB.id, TUE, "10:00")]);
    expect(results.map(codeOf).sort()).toEqual(["ok", "slot_unavailable"]);
    expect(await count(db, "occupancy")).toBe(2); // therapist + room
  });
});

describe("rules", () => {
  it("rejects client-irrelevant overrides: price/duration always come from the server config", async () => {
    const r = await book(f.therapistA.id, TUE, "10:00");
    expect(r.priceMinMinor).toBe(100000);
    expect(new Date(r.endsAt).getTime() - new Date(r.startsAt).getTime()).toBe(60 * 60_000);
  });

  it("enforces minimum lead time and booking horizon for patients", async () => {
    const mondayLate = new Date(NOW.getTime() + 20 * 60_000); // 08:20 Monday; 09:00 start is only 40 min away (lead 60)
    const s1 = await verifiedSession(db);
    await expect(createAppointment(db, { sessionId: s1.id, serviceId: f.service.id, therapistId: f.therapistA.id, start: new Date(NOW.getTime() + 60 * 60_000), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, mondayLate))
      .rejects.toMatchObject({ code: "slot_unavailable" });
    const far = new Date(NOW.getTime() + 40 * 86_400_000);
    await expect(createAppointment(db, { sessionId: s1.id, serviceId: f.service.id, therapistId: f.therapistA.id, start: far, termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "slot_unavailable" });
  });

  it("off-grid and outside-hours starts are rejected for patients", async () => {
    await expect(book(f.therapistA.id, TUE, "10:05")).rejects.toMatchObject({ code: "slot_unavailable" });
    await expect(book(f.therapistA.id, TUE, "16:30")).rejects.toMatchObject({ code: "slot_unavailable" }); // ends 17:30
  });

  it("reception may book off-grid within hours but never overlapping", async () => {
    await staffCreateAppointment(db, f.reception, { serviceId: f.service.id, therapistId: f.therapistA.id, start: at(TUE, "10:05"), contact: { ...contact, email: "x@example.invalid" }, idempotencyKey: crypto.randomUUID() }, NOW);
    await expect(staffCreateAppointment(db, f.reception, { serviceId: f.service.id, therapistId: f.therapistA.id, start: at(TUE, "10:30"), contact: { ...contact, email: "y@example.invalid" }, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "slot_unavailable" });
  });

  it("terms version must match the active policy", async () => {
    const s1 = await verifiedSession(db);
    await expect(createAppointment(db, { sessionId: s1.id, serviceId: f.service.id, therapistId: null, start: at(TUE, "10:00"), termsVersion: 0, contact, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "policy" });
  });

  it("new-patient eligibility and review-only services are enforced server-side", async () => {
    const s1 = await verifiedSession(db);
    await expect(createAppointment(db, { sessionId: s1.id, serviceId: f.serviceExisting.id, therapistId: null, start: at(TUE, "10:00"), termsVersion: 1, contact: { ...contact, isNewPatient: true }, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "policy", details: { reason: "existing_only" } });
    await expect(createAppointment(db, { sessionId: s1.id, serviceId: f.serviceReview.id, therapistId: null, start: at(TUE, "10:00"), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "policy", details: { reason: "request_only" } });
  });

  it("session booking quota is enforced", async () => {
    const s1 = await verifiedSession(db);
    await book(f.therapistA.id, TUE, "09:00", undefined, s1.id);
    await book(f.therapistA.id, TUE, "11:00", undefined, s1.id);
    await book(f.therapistA.id, TUE, "13:00", undefined, s1.id);
    await expect(book(f.therapistA.id, TUE, "15:00", undefined, s1.id)).rejects.toMatchObject({ code: "policy", details: { reason: "session_quota" } });
  });
});
