import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { capturedEmail, managementCredential, verificationChallenge } from "@/db/schema";
import { createAppointment, createAppointmentRequest } from "@/domain/booking";
import { getAppointmentDetail, listAppointments, listAudit, listStaff, updateSettings } from "@/domain/admin";
import { setWorkingHours } from "@/domain/schedule";
import {
  exchangeManagementToken, getGuestSession, getManagedAppointment, issueManagementCredential, requestBookingVerification,
  requestManageVerification, verifyBookingEmail, verifyManageEmail,
} from "@/domain/verification";
import { CaptureEmailProvider } from "@/notifications/provider";
import { at, closeDb, contact, count, NOW, seedFixture, testDb, TUE, verifiedSession, type Fixture } from "./helpers";

const db = testDb();
const mail = new CaptureEmailProvider(db);
let f: Fixture;
beforeEach(async () => { f = await seedFixture(db); });
afterAll(closeDb);

async function book(therapistId: string, hhmm: string) {
  const s = await verifiedSession(db, "owner@example.invalid");
  return createAppointment(db, { sessionId: s.id, serviceId: f.service.id, therapistId, start: at(TUE, hhmm), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW);
}
const lastCode = async () => /(\d{6})/.exec((await db.select().from(capturedEmail)).at(-1)!.textBody)![1]!;
const range = { from: new Date(NOW.getTime() - 86_400_000), to: new Date(NOW.getTime() + 7 * 86_400_000) };

describe("staff authorisation boundaries", () => {
  it("anonymous actors cannot list patients", async () => {
    await expect(listAppointments(db, null, range)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(listAppointments(db, { kind: "guest", sessionId: "x" }, range)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("therapists see only their own schedule and no patient emails", async () => {
    const a = await book(f.therapistA.id, "10:00");
    const b = await book(f.therapistB.id, "10:00");
    const own = await listAppointments(db, f.staffA, range);
    expect(own.map((x) => x.id)).toEqual([a.appointmentId]);
    expect(own[0]!.patientEmail).toBeNull();
    await expect(listAppointments(db, f.staffA, { ...range, therapistId: f.therapistB.id })).rejects.toMatchObject({ code: "forbidden" });
    await expect(getAppointmentDetail(db, f.staffA, b.appointmentId)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("reception sees all; admin-only operations stay admin-only", async () => {
    await book(f.therapistA.id, "10:00");
    await book(f.therapistB.id, "10:00");
    expect(await listAppointments(db, f.reception, range)).toHaveLength(2);
    await expect(setWorkingHours(db, f.reception, f.therapistA.id, [], NOW)).rejects.toMatchObject({ code: "forbidden" });
    await expect(listStaff(db, f.reception)).rejects.toMatchObject({ code: "forbidden" });
    await expect(listAudit(db, f.reception)).rejects.toMatchObject({ code: "forbidden" });
    await expect(updateSettings(db, f.staffA, { expectedVersion: 1, publicMode: "paused", pausedMessage: null, receptionPhone: null, receptionEmail: null })).rejects.toMatchObject({ code: "forbidden" });
    await expect(listStaff(db, f.admin)).resolves.toHaveLength(4);
  });
});

describe("email OTP", () => {
  it("correct code creates a short-lived verified session; codes are single-use", async () => {
    const { challengeId } = await requestBookingVerification(db, mail, { email: "New@Example.invalid", ip: "1.1.1.1" }, NOW);
    const code = await lastCode();
    const [ch] = await db.select().from(verificationChallenge).where(eq(verificationChallenge.id, challengeId));
    expect(ch!.codeHash).not.toContain(code); // stored hashed
    const s = await verifyBookingEmail(db, { challengeId, code, ip: "1.1.1.1" }, NOW);
    expect(s.email).toBe("new@example.invalid");
    expect(await getGuestSession(db, s.token, "booking", NOW)).not.toBeNull();
    expect(await getGuestSession(db, s.token, "booking", new Date(NOW.getTime() + 31 * 60_000))).toBeNull();
    await expect(verifyBookingEmail(db, { challengeId, code, ip: "1.1.1.1" }, NOW)).rejects.toMatchObject({ code: "validation" });
  });

  it("failed attempts burn the challenge; expired codes fail", async () => {
    const { challengeId } = await requestBookingVerification(db, mail, { email: "x@example.invalid", ip: "1.1.1.2" }, NOW);
    const code = await lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expect(verifyBookingEmail(db, { challengeId, code: wrong, ip: "1.1.1.2" }, NOW)).rejects.toMatchObject({ code: "validation" });
    await expect(verifyBookingEmail(db, { challengeId, code, ip: "1.1.1.2" }, NOW)).rejects.toMatchObject({ code: "validation" });

    const second = await requestBookingVerification(db, mail, { email: "x@example.invalid", ip: "1.1.1.2" }, NOW);
    const code2 = await lastCode();
    await expect(verifyBookingEmail(db, { challengeId: second.challengeId, code: code2, ip: "1.1.1.2" }, new Date(NOW.getTime() + 11 * 60_000))).rejects.toMatchObject({ code: "validation" });
  });

  it("OTP requests are rate limited per address", async () => {
    for (let i = 0; i < 3; i++) await requestBookingVerification(db, mail, { email: "rl@example.invalid", ip: `9.9.9.${i}` }, NOW);
    await expect(requestBookingVerification(db, mail, { email: "rl@example.invalid", ip: "9.9.9.9" }, NOW)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("an expired booking session cannot book", async () => {
    const s = await verifiedSession(db, "late@example.invalid", new Date(NOW.getTime() - 60 * 60_000));
    await expect(createAppointment(db, { sessionId: s.id, serviceId: f.service.id, therapistId: null, start: at(TUE, "10:00"), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "unauthenticated" });
  });
});

describe("management links", () => {
  it("link exchange alone reveals nothing and changes nothing; OTP is required", async () => {
    const a = await book(f.therapistA.id, "10:00");
    const { token } = await issueManagementCredential(db, a.appointmentId, new Date(a.endsAt));
    const [cred] = await db.select().from(managementCredential);
    expect(cred!.tokenHash).not.toBe(token);
    const ex = await exchangeManagementToken(db, { token, ip: "2.2.2.2" }, NOW);
    expect(ex.maskedEmail).toBe("o***r@example.invalid");
    const session = (await getGuestSession(db, ex.token, "manage", NOW))!;
    expect(session.verified).toBe(false);
    await expect(getManagedAppointment(db, session.id, NOW)).rejects.toMatchObject({ code: "unauthenticated" });
    expect(await count(db, "appointment", "state = 'confirmed'")).toBe(1); // a scanner following the link changed nothing

    const { challengeId } = await requestManageVerification(db, mail, { sessionId: session.id, ip: "2.2.2.2" }, NOW);
    await verifyManageEmail(db, { sessionId: session.id, challengeId, code: await lastCode(), ip: "2.2.2.2" }, NOW);
    const details = await getManagedAppointment(db, session.id, NOW);
    expect(details.reference).toBe(a.reference);
  });

  it("expired and revoked tokens are rejected", async () => {
    const a = await book(f.therapistA.id, "10:00");
    const { token } = await issueManagementCredential(db, a.appointmentId, new Date(a.endsAt));
    await expect(exchangeManagementToken(db, { token, ip: "3.3.3.3" }, new Date(new Date(a.endsAt).getTime() + 25 * 3_600_000))).rejects.toMatchObject({ code: "unauthenticated" });
    await db.update(managementCredential).set({ revokedAt: NOW });
    await expect(exchangeManagementToken(db, { token, ip: "3.3.3.3" }, NOW)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(exchangeManagementToken(db, { token: "garbage", ip: "3.3.3.3" }, NOW)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("a manage OTP cannot be redeemed by a different session", async () => {
    const a = await book(f.therapistA.id, "10:00");
    const t1 = await issueManagementCredential(db, a.appointmentId, new Date(a.endsAt));
    const t2 = await issueManagementCredential(db, a.appointmentId, new Date(a.endsAt));
    const s1 = (await getGuestSession(db, (await exchangeManagementToken(db, { token: t1.token, ip: "4.4.4.4" }, NOW)).token, "manage", NOW))!;
    const s2 = (await getGuestSession(db, (await exchangeManagementToken(db, { token: t2.token, ip: "4.4.4.4" }, NOW)).token, "manage", NOW))!;
    const { challengeId } = await requestManageVerification(db, mail, { sessionId: s1.id, ip: "4.4.4.4" }, NOW);
    await expect(verifyManageEmail(db, { sessionId: s2.id, challengeId, code: await lastCode(), ip: "4.4.4.4" }, NOW)).rejects.toMatchObject({ code: "validation" });
  });
});

describe("request-only mode", () => {
  it("automatic booking is refused; requests are stored without reserving capacity", async () => {
    f = await seedFixture(db, { publicMode: "request_only" });
    const s = await verifiedSession(db);
    await expect(createAppointment(db, { sessionId: s.id, serviceId: f.service.id, therapistId: null, start: at(TUE, "10:00"), termsVersion: 1, contact, idempotencyKey: crypto.randomUUID() }, NOW))
      .rejects.toMatchObject({ code: "policy", details: { reason: "request_only" } });
    const r = await createAppointmentRequest(db, {
      sessionId: s.id, serviceId: f.service.id, therapistId: null, preferredFrom: TUE, preferredTo: TUE, preferredTimeOfDay: "morning",
      preferredStart: null, contact, idempotencyKey: crypto.randomUUID(),
    }, NOW);
    expect(r.kind).toBe("request");
    expect(await count(db, "occupancy")).toBe(0);
    expect(await count(db, "appointment")).toBe(0);
  });

  it("paused mode blocks requests and bookings", async () => {
    f = await seedFixture(db, { publicMode: "paused" });
    const s = await verifiedSession(db);
    await expect(createAppointmentRequest(db, {
      sessionId: s.id, serviceId: f.service.id, therapistId: null, preferredFrom: TUE, preferredTo: TUE, preferredTimeOfDay: "any",
      preferredStart: null, contact, idempotencyKey: crypto.randomUUID(),
    }, NOW)).rejects.toMatchObject({ code: "booking_paused" });
  });
});
