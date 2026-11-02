import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appointment, capturedEmail, notificationOutbox } from "@/db/schema";
import { cancelAppointment, createAppointment, rescheduleAppointment } from "@/domain/booking";
import { CaptureEmailProvider, FailingEmailProvider } from "@/notifications/provider";
import { enqueueReminders, processOutbox, sanitizeError } from "@/notifications/outbox";
import { retryNotification } from "@/domain/admin";
import { at, closeDb, contact, count, NOW, seedFixture, testDb, TUE, WED, verifiedSession, type Fixture } from "./helpers";

const db = testDb();
const capture = new CaptureEmailProvider(db);
let f: Fixture;
beforeEach(async () => { f = await seedFixture(db); });
afterAll(closeDb);

async function book(date: string, hhmm: string) {
  const s = await verifiedSession(db, "patient@example.invalid");
  return createAppointment(db, { sessionId: s.id, serviceId: f.service.id, therapistId: f.therapistA.id, start: at(date, hhmm), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW);
}

/** The day before a Tuesday-10:00 appointment, ~20 h ahead. */
const reminderTime = () => new Date(at(TUE, "10:00").getTime() - 20 * 3_600_000);

describe("outbox delivery", () => {
  it("sends a Czech confirmation with a fragment-based management link and minimal subject", async () => {
    await book(TUE, "10:00");
    const res = await processOutbox(db, capture, { now: NOW });
    expect(res.sent).toBe(1);
    const [mail] = await db.select().from(capturedEmail);
    expect(mail!.toAddress).toBe("patient@example.invalid");
    expect(mail!.subject).toBe("Potvrzení rezervace – Redpoint Clinic");
    expect(mail!.subject).not.toContain("Standard"); // no service detail in subject
    expect(mail!.textBody).toMatch(/\/rezervace\/sprava\/#t=[A-Za-z0-9_-]{40,}/);
    expect(mail!.hasIcs).toBe(true);
    expect(await count(db, "management_credential")).toBe(1);
  });

  it("email outage never loses the reservation; delivery retries with backoff and later succeeds", async () => {
    const a = await book(TUE, "10:00");
    const r1 = await processOutbox(db, new FailingEmailProvider(), { now: NOW });
    expect(r1.retry).toBe(1);
    const [ev] = await db.select().from(notificationOutbox);
    expect(ev!.status).toBe("pending");
    expect(ev!.attempts).toBe(1);
    expect(ev!.nextAttemptAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(await count(db, "management_credential", "revoked_at IS NULL")).toBe(0); // unsent link revoked
    const [appt] = await db.select().from(appointment).where(eq(appointment.id, a.appointmentId));
    expect(appt!.state).toBe("confirmed");
    // Not due yet:
    expect((await processOutbox(db, capture, { now: NOW })).sent).toBe(0);
    // After backoff:
    expect((await processOutbox(db, capture, { now: new Date(NOW.getTime() + 5 * 60_000) })).sent).toBe(1);
  });

  it("exhausted retries become 'failed' and can be retried by reception without new appointments", async () => {
    await book(TUE, "10:00");
    await db.update(notificationOutbox).set({ maxAttempts: 1 });
    expect((await processOutbox(db, new FailingEmailProvider(), { now: NOW })).failed).toBe(1);
    await retryNotification(db, f.reception, (await db.select().from(notificationOutbox))[0]!.id);
    expect((await processOutbox(db, capture, { now: new Date(NOW.getTime() + 1000) })).sent).toBe(1);
    expect(await count(db, "appointment")).toBe(1);
  });

  it("provider error text is sanitised before storage", () => {
    expect(sanitizeError(new Error("550 rejected patient@example.invalid token AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"))).toBe("550 rejected [email] token [redacted]");
  });
});

describe("reminders", () => {
  it("confirmed appointments get exactly one reminder per version", async () => {
    await book(TUE, "10:00");
    await processOutbox(db, capture, { now: NOW });
    expect(await enqueueReminders(db, reminderTime())).toBe(1);
    expect(await enqueueReminders(db, reminderTime())).toBe(0);
    expect((await processOutbox(db, capture, { now: reminderTime() })).sent).toBe(1);
  });

  it("cancelled appointments receive no obsolete reminder", async () => {
    const a = await book(TUE, "10:00");
    await processOutbox(db, capture, { now: NOW });
    await enqueueReminders(db, reminderTime());
    await cancelAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1 }, NOW);
    const res = await processOutbox(db, capture, { now: reminderTime() });
    expect(res.skipped).toBe(1); // the stale reminder
    expect(res.sent).toBe(1); // the cancellation notice
    const subjects = (await db.select().from(capturedEmail)).map((m) => m.subject);
    expect(subjects).not.toContain("Připomínka termínu – Redpoint Clinic");
  });

  it("rescheduled appointments: the old version's reminder and confirmation are skipped", async () => {
    const a = await book(TUE, "10:00");
    await enqueueReminders(db, reminderTime());
    await rescheduleAppointment(db, { actor: f.reception }, { appointmentId: a.appointmentId, expectedVersion: 1, start: at(WED, "10:00") }, NOW);
    const res = await processOutbox(db, capture, { now: reminderTime() });
    expect(res).toMatchObject({ sent: 1, skipped: 2 }); // reschedule notice sent; v1 confirmation + v1 reminder skipped
  });
});
