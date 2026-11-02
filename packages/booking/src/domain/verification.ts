// Email OTP verification (spec §5 step 6, §11). Verification proves control of an email
// address; it never holds or reserves a slot.
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { appointment, guestSession, location, managementCredential, patientContact, therapist, verificationChallenge } from "../db/schema";
import { maskEmail, otpCode, randomToken, safeEqualHex, secretHash } from "../lib/crypto";
import { enforce } from "../lib/rate-limit";
import type { EmailProvider } from "../notifications/provider";
import { otpEmail } from "../notifications/templates";
import { DomainError } from "./errors";

export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const BOOKING_SESSION_TTL_MIN = 30;
export const MANAGE_SESSION_TTL_MIN = 20;

const GENERIC_INVALID = "Kód je neplatný nebo vypršel. Vyžádejte si prosím nový.";

export function sessionTokenHash(token: string) {
  return secretHash(token, "guest-session");
}

/**
 * Always returns a challenge id, whether or not mail was sent (rate limited), so responses do
 * not reveal anything about the address.
 */
export async function requestBookingVerification(db: Db, mail: EmailProvider, input: { email: string; ip: string }, now = new Date()) {
  const email = input.email.trim().toLowerCase();
  await enforce(db, [
    { bucket: `otp:ip:${input.ip}`, max: 10, windowSeconds: 900 },
    { bucket: `otp:email:${secretHash(email, "rl")}`, max: 3, windowSeconds: 900 },
  ], now);
  const code = otpCode();
  const [ch] = await db.insert(verificationChallenge).values({
    purpose: "booking", email, codeHash: secretHash(code, "otp"), attempts: 0, maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60_000),
  }).returning({ id: verificationChallenge.id });
  await mail.send({ to: email, ...otpEmail(code, OTP_TTL_MIN, "booking") });
  return { challengeId: ch!.id };
}

async function consumeChallenge(db: Db, challengeId: string, code: string, ip: string, now: Date) {
  await enforce(db, [{ bucket: `otp-verify:ip:${ip}`, max: 30, windowSeconds: 900 }], now);
  // Count the attempt atomically before comparing.
  const [ch] = await db.update(verificationChallenge)
    .set({ attempts: sql`${verificationChallenge.attempts} + 1` })
    .where(and(
      eq(verificationChallenge.id, challengeId), isNull(verificationChallenge.consumedAt),
      gt(verificationChallenge.expiresAt, now), sql`${verificationChallenge.attempts} < ${verificationChallenge.maxAttempts}`,
    ))
    .returning();
  if (!ch || !safeEqualHex(ch.codeHash, secretHash(code.trim(), "otp"))) throw new DomainError("validation", GENERIC_INVALID);
  const [consumed] = await db.update(verificationChallenge).set({ consumedAt: now })
    .where(and(eq(verificationChallenge.id, ch.id), isNull(verificationChallenge.consumedAt))).returning({ id: verificationChallenge.id });
  if (!consumed) throw new DomainError("validation", GENERIC_INVALID);
  return ch;
}

export async function verifyBookingEmail(db: Db, input: { challengeId: string; code: string; ip: string }, now = new Date()) {
  const ch = await consumeChallenge(db, input.challengeId, input.code, input.ip, now);
  if (ch.purpose !== "booking") throw new DomainError("validation", GENERIC_INVALID);
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + BOOKING_SESSION_TTL_MIN * 60_000);
  await db.insert(guestSession).values({ tokenHash: sessionTokenHash(token), purpose: "booking", email: ch.email, verified: true, bookingsMade: 0, expiresAt });
  return { token, expiresAt, email: ch.email };
}

export async function getGuestSession(db: Db, token: string | undefined, purpose: "booking" | "manage", now = new Date()) {
  if (!token) return null;
  const [s] = await db.select().from(guestSession).where(eq(guestSession.tokenHash, sessionTokenHash(token)));
  if (!s || s.purpose !== purpose || s.revokedAt || s.expiresAt <= now) return null;
  return s;
}

// ------------------------------------------------------------------ management links

export function managementTokenHash(token: string) {
  return secretHash(token, "management-link");
}

/** Issue a management credential. Raw token goes only into the email; only its hash is stored. */
export async function issueManagementCredential(db: Db, appointmentId: string, appointmentEnd: Date) {
  const token = randomToken(32);
  const expiresAt = new Date(appointmentEnd.getTime() + 24 * 3_600_000);
  const [row] = await db.insert(managementCredential).values({ tokenHash: managementTokenHash(token), appointmentId, expiresAt }).returning({ id: managementCredential.id });
  return { token, credentialId: row!.id };
}

export async function revokeManagementCredential(db: Db, credentialId: string, now = new Date()) {
  await db.update(managementCredential).set({ revokedAt: now }).where(eq(managementCredential.id, credentialId));
}

/**
 * Exchange a link token for an *unverified* management session. Nothing is revealed and nothing
 * changes until the patient also passes an email OTP.
 */
export async function exchangeManagementToken(db: Db, input: { token: string; ip: string }, now = new Date()) {
  await enforce(db, [{ bucket: `manage-exchange:ip:${input.ip}`, max: 20, windowSeconds: 900 }], now);
  const [cred] = await db.select().from(managementCredential).where(eq(managementCredential.tokenHash, managementTokenHash(input.token)));
  if (!cred || cred.revokedAt || cred.expiresAt <= now) {
    throw new DomainError("unauthenticated", "Odkaz je neplatný nebo vypršel. Pro změnu termínu kontaktujte recepci.");
  }
  const [row] = await db.select({ email: patientContact.email }).from(appointment)
    .innerJoin(patientContact, eq(patientContact.id, appointment.patientContactId)).where(eq(appointment.id, cred.appointmentId));
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + MANAGE_SESSION_TTL_MIN * 60_000);
  await db.insert(guestSession).values({ tokenHash: sessionTokenHash(token), purpose: "manage", appointmentId: cred.appointmentId, verified: false, bookingsMade: 0, expiresAt });
  return { token, expiresAt, maskedEmail: maskEmail(row!.email) };
}

export async function requestManageVerification(db: Db, mail: EmailProvider, input: { sessionId: string; ip: string }, now = new Date()) {
  const [s] = await db.select().from(guestSession).where(eq(guestSession.id, input.sessionId));
  if (!s || s.purpose !== "manage" || s.revokedAt || s.expiresAt <= now) throw new DomainError("unauthenticated", "Relace vypršela. Otevřete prosím odkaz z e-mailu znovu.");
  await enforce(db, [
    { bucket: `otp:ip:${input.ip}`, max: 10, windowSeconds: 900 },
    { bucket: `otp:manage:${s.appointmentId}`, max: 3, windowSeconds: 900 },
  ], now);
  const [row] = await db.select({ email: patientContact.email }).from(appointment)
    .innerJoin(patientContact, eq(patientContact.id, appointment.patientContactId)).where(eq(appointment.id, s.appointmentId!));
  const code = otpCode();
  const [ch] = await db.insert(verificationChallenge).values({
    purpose: "manage", email: row!.email, guestSessionId: s.id, codeHash: secretHash(code, "otp"), attempts: 0, maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60_000),
  }).returning({ id: verificationChallenge.id });
  await mail.send({ to: row!.email, ...otpEmail(code, OTP_TTL_MIN, "manage") });
  return { challengeId: ch!.id };
}

export async function verifyManageEmail(db: Db, input: { sessionId: string; challengeId: string; code: string; ip: string }, now = new Date()) {
  const ch = await consumeChallenge(db, input.challengeId, input.code, input.ip, now);
  if (ch.purpose !== "manage" || ch.guestSessionId !== input.sessionId) throw new DomainError("validation", GENERIC_INVALID);
  const [s] = await db.update(guestSession).set({ verified: true })
    .where(and(eq(guestSession.id, input.sessionId), isNull(guestSession.revokedAt), gt(guestSession.expiresAt, now))).returning();
  if (!s) throw new DomainError("unauthenticated", "Relace vypršela. Otevřete prosím odkaz z e-mailu znovu.");
  return s;
}

/** Minimal details for the verified patient (spec §10 getManagedAppointment). */
export async function getManagedAppointment(db: Db, sessionId: string, now = new Date()) {
  const [s] = await db.select().from(guestSession).where(eq(guestSession.id, sessionId));
  if (!s || s.purpose !== "manage" || !s.verified || s.revokedAt || s.expiresAt <= now) {
    throw new DomainError("unauthenticated", "Nejprve ověřte e-mail kódem.");
  }
  const [r] = await db.select({ a: appointment, t: therapist.displayName, l: location }).from(appointment)
    .innerJoin(therapist, eq(therapist.id, appointment.therapistId))
    .innerJoin(location, eq(location.id, appointment.locationId))
    .where(eq(appointment.id, s.appointmentId!));
  if (!r) throw new DomainError("not_found", "Rezervace nenalezena.");
  const cutoff = r.a.startsAt.getTime() - r.a.cancellationCutoffHours * 3_600_000;
  return {
    appointmentId: r.a.id, reference: r.a.reference, state: r.a.state, version: r.a.version,
    serviceId: r.a.serviceId, serviceName: r.a.serviceName, therapistId: r.a.therapistId, therapistName: r.t,
    startsAt: r.a.startsAt.toISOString(), endsAt: r.a.endsAt.toISOString(),
    priceMinMinor: r.a.priceMinMinor, priceMaxMinor: r.a.priceMaxMinor,
    location: { name: r.l.name, address: r.l.address, phone: r.l.phone, email: r.l.email },
    cancellationCutoffHours: r.a.cancellationCutoffHours,
    canChangeOnline: r.a.state === "confirmed" && now.getTime() <= cutoff,
  };
}
