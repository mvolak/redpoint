// Transaction-safe appointment operations (spec §9). Every write path:
//   validate → resolve authoritative config → lock resources (sorted) → re-read rules
//   → recheck slot → insert appointment + occupancy + outbox (+ idempotency result) → commit.
// The occupancy exclusion constraint is the final backstop against double booking.
import { and, eq } from "drizzle-orm";
import type { Db, Executor, Tx } from "../db/client";
import {
  appointment, appointmentRequest, guestSession, idempotencyRecord, notificationOutbox, occupancy, patientContact,
  service, therapist, therapistService,
} from "../db/schema";
import { fingerprint, reference } from "../lib/crypto";
import { assertCanAccessTherapist, requireStaff, type Actor, type StaffActor } from "./actor";
import { audit } from "./audit";
import { bufferedInterval, checkSlot, PUBLIC_CHECK, STAFF_CHECK, type CheckOptions } from "./availability";
import { getActivePolicy, getActiveService, getSettings, lockResources, loadSchedule, resolveConfigs, therapistResourceId } from "./catalogue";
import { DomainError, isExclusionViolation } from "./errors";
import { toRangeLiteral } from "./time";

export const MAX_BOOKINGS_PER_SESSION = 3;

export type ContactInput = { name: string; email: string; phone: string; isNewPatient: boolean };

export type BookingResult = {
  kind: "confirmed";
  appointmentId: string;
  reference: string;
  startsAt: string;
  endsAt: string;
  therapistId: string;
  therapistName: string;
  serviceName: string;
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  version: number;
};

export type RequestResult = { kind: "request"; requestId: string; reference: string };

// ------------------------------------------------------------------ helpers

/** Map constraint races to a clean conflict for the loser. */
async function mapConflicts<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isExclusionViolation(e)) throw new DomainError("slot_unavailable", "Vybraný termín už není volný.");
    throw e;
  }
}

/**
 * Idempotent execution inside an open transaction. A concurrent identical request blocks on the
 * primary key until the first commits, then replays its stored response. If the first rolls
 * back (e.g. conflict), the second proceeds normally.
 */
export async function withIdempotency<T>(tx: Tx, scope: string, key: string, payload: unknown, fn: () => Promise<T>): Promise<{ result: T; replayed: boolean }> {
  const fp = fingerprint(payload);
  const inserted = await tx.insert(idempotencyRecord).values({ scope, key, fingerprint: fp }).onConflictDoNothing().returning({ key: idempotencyRecord.key });
  if (!inserted.length) {
    const [existing] = await tx.select().from(idempotencyRecord).where(and(eq(idempotencyRecord.scope, scope), eq(idempotencyRecord.key, key)));
    if (!existing) throw new DomainError("stale_version", "Požadavek se zpracovává, zkuste to prosím znovu.");
    if (existing.fingerprint !== fp) throw new DomainError("idempotency_mismatch", "Tento požadavek už byl odeslán s jinými údaji.");
    return { result: existing.response as T, replayed: true };
  }
  const result = await fn();
  await tx.update(idempotencyRecord).set({ response: result as object }).where(and(eq(idempotencyRecord.scope, scope), eq(idempotencyRecord.key, key)));
  return { result, replayed: false };
}

async function enqueue(tx: Executor, event: typeof notificationOutbox.$inferInsert["event"], target: { appointmentId?: string; appointmentVersion?: number; requestId?: string }) {
  const dedupeKey = target.appointmentId
    ? `${event}:${target.appointmentId}:v${target.appointmentVersion}:email`
    : `${event}:${target.requestId}:email`;
  await tx.insert(notificationOutbox).values({
    event, channel: "email", appointmentId: target.appointmentId ?? null, appointmentVersion: target.appointmentVersion ?? null,
    requestId: target.requestId ?? null, dedupeKey,
  }).onConflictDoNothing();
}

/** Lock and validate a guest booking session (verified email, unexpired, within quota). */
async function lockBookingSession(tx: Tx, sessionId: string, now: Date) {
  const [s] = await tx.select().from(guestSession).where(eq(guestSession.id, sessionId)).for("update");
  if (!s || s.purpose !== "booking" || !s.verified || s.revokedAt || s.expiresAt <= now || !s.email) {
    throw new DomainError("unauthenticated", "Ověření e-mailu vypršelo. Ověřte prosím e-mail znovu.");
  }
  return s;
}

async function assertBookable(tx: Executor, svc: typeof service.$inferSelect, isNewPatient: boolean, channel: "online" | "staff") {
  if (channel === "online") {
    const settings = await getSettings(tx);
    if (settings.publicMode === "paused") throw new DomainError("booking_paused", "Online rezervace jsou dočasně pozastaveny.");
    if (settings.publicMode === "request_only" || svc.bookingMode === "request_only" || svc.requiresReview) {
      throw new DomainError("policy", "Tuto službu lze objednat pouze žádostí, kterou potvrdí recepce.", { reason: "request_only" });
    }
  }
  if (svc.newPatients === "not_allowed" && isNewPatient) {
    throw new DomainError("policy", "Tuto službu mohou online objednat pouze stávající klienti.", { reason: "existing_only" });
  }
  if (svc.newPatients === "only" && !isNewPatient) {
    throw new DomainError("policy", "Tato služba je určena pro nové klienty.", { reason: "new_only" });
  }
}

// ------------------------------------------------------------------ core reservation

type ReserveParams = {
  serviceId: string;
  therapistId: string | null; // null = first available
  start: Date;
  contact: ContactInput & { emailVerified: boolean };
  source: "online" | "reception" | "request";
  check: CheckOptions;
  requestId?: string | null;
};

/** Must run inside a transaction. Resolves, locks, rechecks and reserves a specific therapist. */
export async function reserveInTx(tx: Tx, p: ReserveParams, now: Date): Promise<BookingResult> {
  const svc = await getActiveService(tx, p.serviceId);
  const policy = await getActivePolicy(tx);
  const configs = await resolveConfigs(tx, svc, p.therapistId);
  if (!configs.length) throw new DomainError("slot_unavailable", "Pro vybranou službu není dostupný žádný terapeut.");

  // Lock every candidate resource in consistent order, then re-read rules under the lock.
  await lockResources(tx, configs.flatMap((c) => c.resourceIds));

  const start = p.start.getTime();
  let chosen: (typeof configs)[number] | undefined;
  for (const cfg of configs) {
    const end = start + cfg.rules.durationMin * 60_000;
    const b = bufferedInterval(cfg.rules, start, end);
    const sched = await loadSchedule(tx, cfg.therapistId, cfg.resourceIds, b.start, b.end);
    if (checkSlot(cfg.rules, sched, start, now.getTime(), p.check) === null) { chosen = cfg; break; }
  }
  if (!chosen) throw new DomainError("slot_unavailable", "Vybraný termín už není volný.");

  const end = start + chosen.rules.durationMin * 60_000;
  const [contact] = await tx.insert(patientContact).values({
    name: p.contact.name, email: p.contact.email.toLowerCase(), phone: p.contact.phone,
    isNewPatient: p.contact.isNewPatient, emailVerified: p.contact.emailVerified,
  }).returning({ id: patientContact.id });

  const [appt] = await tx.insert(appointment).values({
    reference: reference("RP"),
    patientContactId: contact!.id,
    serviceId: svc.id,
    therapistId: chosen.therapistId,
    locationId: svc.locationId,
    startsAt: new Date(start),
    endsAt: new Date(end),
    serviceName: svc.name,
    durationMin: chosen.rules.durationMin,
    bufferBeforeMin: chosen.rules.bufferBeforeMin,
    bufferAfterMin: chosen.rules.bufferAfterMin,
    priceMinMinor: chosen.priceMinMinor,
    priceMaxMinor: chosen.priceMaxMinor,
    currency: "CZK",
    policyVersion: policy.version,
    cancellationCutoffHours: policy.cancellationCutoffHours,
    state: "confirmed",
    version: 1,
    source: p.source,
    requestId: p.requestId ?? null,
  }).returning();

  const during = toRangeLiteral(bufferedInterval(chosen.rules, start, end));
  await tx.insert(occupancy).values(chosen.resourceIds.map((resourceId) => ({ resourceId, during, appointmentId: appt!.id })));
  await enqueue(tx, "appointment_confirmed", { appointmentId: appt!.id, appointmentVersion: 1 });

  const [t] = await tx.select({ name: therapist.displayName }).from(therapist).where(eq(therapist.id, chosen.therapistId));
  return {
    kind: "confirmed",
    appointmentId: appt!.id,
    reference: appt!.reference,
    startsAt: appt!.startsAt.toISOString(),
    endsAt: appt!.endsAt.toISOString(),
    therapistId: chosen.therapistId,
    therapistName: t!.name,
    serviceName: svc.name,
    priceMinMinor: chosen.priceMinMinor,
    priceMaxMinor: chosen.priceMaxMinor,
    version: 1,
  };
}

// ------------------------------------------------------------------ public operations

export type CreateAppointmentInput = {
  sessionId: string;
  serviceId: string;
  therapistId: string | null;
  start: Date;
  termsVersion: number;
  contact: Omit<ContactInput, "email">;
  idempotencyKey: string;
};

/** Patient booking with a verified email session (spec §5 step 7). */
export async function createAppointment(db: Db, input: CreateAppointmentInput, now = new Date()): Promise<BookingResult & { replayed: boolean }> {
  return mapConflicts(() => db.transaction(async (tx) => {
    const { idempotencyKey, ...payload } = input;
    const { result, replayed } = await withIdempotency(tx, `guest:${input.sessionId}`, idempotencyKey, { ...payload, start: input.start.toISOString() }, async () => {
      const session = await lockBookingSession(tx, input.sessionId, now);
      if (session.bookingsMade >= MAX_BOOKINGS_PER_SESSION) {
        throw new DomainError("policy", "Dosáhli jste limitu rezervací v rámci jednoho ověření.", { reason: "session_quota" });
      }
      const svc = await getActiveService(tx, input.serviceId);
      await assertBookable(tx, svc, input.contact.isNewPatient, "online");
      const policy = await getActivePolicy(tx);
      if (policy.version !== input.termsVersion) {
        throw new DomainError("policy", "Podmínky rezervace se změnily. Zkontrolujte je prosím a potvrďte znovu.", { reason: "terms_changed" });
      }
      const r = await reserveInTx(tx, {
        serviceId: input.serviceId, therapistId: input.therapistId, start: input.start,
        contact: { ...input.contact, email: session.email!, emailVerified: true },
        source: "online", check: PUBLIC_CHECK,
      }, now);
      await tx.update(guestSession).set({ bookingsMade: session.bookingsMade + 1 }).where(eq(guestSession.id, session.id));
      await audit(tx, { kind: "guest", sessionId: session.id }, "appointment.create", "appointment", r.appointmentId, { start: r.startsAt, therapistId: r.therapistId, version: 1, source: "online" });
      return r;
    });
    return { ...result, replayed };
  }));
}

export type CreateRequestInput = {
  sessionId: string;
  serviceId: string;
  therapistId: string | null;
  preferredFrom: string;
  preferredTo: string;
  preferredTimeOfDay: "any" | "morning" | "afternoon";
  preferredStart: Date | null;
  contact: Omit<ContactInput, "email">;
  idempotencyKey: string;
};

/** Appointment request: reserves nothing; reception confirms manually (spec §2, §6). */
export async function createAppointmentRequest(db: Db, input: CreateRequestInput, now = new Date()): Promise<RequestResult & { replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { idempotencyKey, ...payload } = input;
    const { result, replayed } = await withIdempotency(tx, `guest:${input.sessionId}`, idempotencyKey, { ...payload, preferredStart: input.preferredStart?.toISOString() ?? null }, async () => {
      const session = await lockBookingSession(tx, input.sessionId, now);
      if (session.bookingsMade >= MAX_BOOKINGS_PER_SESSION) {
        throw new DomainError("policy", "Dosáhli jste limitu žádostí v rámci jednoho ověření.", { reason: "session_quota" });
      }
      const settings = await getSettings(tx);
      if (settings.publicMode === "paused") throw new DomainError("booking_paused", "Online objednávání je dočasně pozastaveno.");
      const svc = await getActiveService(tx, input.serviceId);
      if (input.therapistId) {
        const [elig] = await tx.select().from(therapistService).where(and(eq(therapistService.serviceId, svc.id), eq(therapistService.therapistId, input.therapistId), eq(therapistService.active, true)));
        if (!elig) throw new DomainError("validation", "Vybraný terapeut tuto službu neposkytuje.");
      }
      const [contact] = await tx.insert(patientContact).values({
        name: input.contact.name, email: session.email!, phone: input.contact.phone, isNewPatient: input.contact.isNewPatient, emailVerified: true,
      }).returning({ id: patientContact.id });
      const [req] = await tx.insert(appointmentRequest).values({
        reference: reference("RQ"), patientContactId: contact!.id, serviceId: svc.id, therapistId: input.therapistId,
        preferredFrom: input.preferredFrom, preferredTo: input.preferredTo, preferredTimeOfDay: input.preferredTimeOfDay,
        preferredStart: input.preferredStart, state: "pending", version: 1,
      }).returning();
      await enqueue(tx, "request_received", { requestId: req!.id });
      await tx.update(guestSession).set({ bookingsMade: session.bookingsMade + 1 }).where(eq(guestSession.id, session.id));
      await audit(tx, { kind: "guest", sessionId: session.id }, "request.create", "appointment_request", req!.id, {});
      return { kind: "request" as const, requestId: req!.id, reference: req!.reference };
    });
    return { ...result, replayed };
  });
}

// ------------------------------------------------------------------ staff operations

export type StaffCreateInput = {
  serviceId: string;
  therapistId: string | null;
  start: Date;
  contact: ContactInput;
  idempotencyKey: string;
};

export async function staffCreateAppointment(db: Db, actor: Actor | null, input: StaffCreateInput, now = new Date()) {
  const staff = requireStaff(actor, "reception");
  return mapConflicts(() => db.transaction(async (tx) => {
    const { idempotencyKey, ...payload } = input;
    const { result } = await withIdempotency(tx, `staff:${staff.staffId}`, idempotencyKey, { ...payload, start: input.start.toISOString() }, async () => {
      const svc = await getActiveService(tx, input.serviceId);
      await assertBookable(tx, svc, input.contact.isNewPatient, "staff");
      const r = await reserveInTx(tx, {
        serviceId: input.serviceId, therapistId: input.therapistId, start: input.start,
        contact: { ...input.contact, emailVerified: false }, source: "reception", check: STAFF_CHECK,
      }, now);
      await audit(tx, staff, "appointment.create", "appointment", r.appointmentId, { start: r.startsAt, therapistId: r.therapistId, version: 1, source: "reception" });
      return r;
    });
    return result;
  }));
}

export async function resolveRequest(db: Db, actor: Actor | null, input: { requestId: string; expectedVersion: number; therapistId: string; start: Date }, now = new Date()) {
  const staff = requireStaff(actor, "reception");
  return mapConflicts(() => db.transaction(async (tx) => {
    const [req] = await tx.select().from(appointmentRequest).where(eq(appointmentRequest.id, input.requestId)).for("update");
    if (!req) throw new DomainError("not_found", "Žádost nenalezena.");
    if (req.version !== input.expectedVersion) throw new DomainError("stale_version", "Žádost mezitím změnil někdo jiný. Načtěte ji znovu.");
    if (req.state !== "pending") throw new DomainError("policy", "Žádost už byla vyřízena.");
    const [c] = await tx.select().from(patientContact).where(eq(patientContact.id, req.patientContactId));
    const r = await reserveInTx(tx, {
      serviceId: req.serviceId, therapistId: input.therapistId, start: input.start,
      contact: { name: c!.name, email: c!.email, phone: c!.phone, isNewPatient: c!.isNewPatient, emailVerified: c!.emailVerified },
      source: "request", check: STAFF_CHECK, requestId: req.id,
    }, now);
    await tx.update(appointmentRequest).set({ state: "resolved", resolvedAppointmentId: r.appointmentId, version: req.version + 1 }).where(eq(appointmentRequest.id, req.id));
    await audit(tx, staff, "request.resolve", "appointment_request", req.id, { appointmentId: r.appointmentId });
    await audit(tx, staff, "appointment.create", "appointment", r.appointmentId, { start: r.startsAt, therapistId: r.therapistId, version: 1, source: "request" });
    return r;
  }));
}

export async function declineRequest(db: Db, actor: Actor | null, input: { requestId: string; expectedVersion: number; message: string }) {
  const staff = requireStaff(actor, "reception");
  return db.transaction(async (tx) => {
    const [req] = await tx.select().from(appointmentRequest).where(eq(appointmentRequest.id, input.requestId)).for("update");
    if (!req) throw new DomainError("not_found", "Žádost nenalezena.");
    if (req.version !== input.expectedVersion) throw new DomainError("stale_version", "Žádost mezitím změnil někdo jiný. Načtěte ji znovu.");
    if (req.state !== "pending") throw new DomainError("policy", "Žádost už byla vyřízena.");
    await tx.update(appointmentRequest).set({ state: "declined", declineMessage: input.message, version: req.version + 1 }).where(eq(appointmentRequest.id, req.id));
    await enqueue(tx, "request_declined", { requestId: req.id });
    await audit(tx, staff, "request.decline", "appointment_request", req.id, {});
  });
}

// ------------------------------------------------------------------ changes to existing appointments

type ChangeActor = { actor: StaffActor } | { guestSessionId: string };

async function lockAppointmentFor(tx: Tx, who: ChangeActor, appointmentId: string, expectedVersion: number, now: Date) {
  const [appt] = await tx.select().from(appointment).where(eq(appointment.id, appointmentId)).for("update");
  if (!appt) throw new DomainError("not_found", "Rezervace nenalezena.");
  if ("actor" in who) {
    requireStaff(who.actor, "reception");
  } else {
    const [s] = await tx.select().from(guestSession).where(eq(guestSession.id, who.guestSessionId));
    if (!s || s.purpose !== "manage" || !s.verified || s.revokedAt || s.expiresAt <= now || s.appointmentId !== appointmentId) {
      throw new DomainError("unauthenticated", "Ověření vypršelo. Otevřete prosím odkaz z e-mailu znovu.");
    }
  }
  if (appt.version !== expectedVersion) throw new DomainError("stale_version", "Rezervace byla mezitím změněna. Načtěte ji prosím znovu.");
  if (appt.state !== "confirmed") throw new DomainError("policy", "Tuto rezervaci už nelze měnit.", { reason: "not_confirmed" });
  if (!("actor" in who)) {
    const cutoff = appt.startsAt.getTime() - appt.cancellationCutoffHours * 3_600_000;
    if (now.getTime() > cutoff) {
      throw new DomainError("policy", `Změnu nebo zrušení méně než ${appt.cancellationCutoffHours} h před termínem je potřeba domluvit s recepcí.`, { reason: "late_change" });
    }
  }
  return appt;
}

export async function cancelAppointment(db: Db, who: ChangeActor, input: { appointmentId: string; expectedVersion: number }, now = new Date()) {
  return db.transaction(async (tx) => {
    const appt = await lockAppointmentFor(tx, who, input.appointmentId, input.expectedVersion, now);
    // Cancellation releases occupancy (spec §8).
    await tx.delete(occupancy).where(eq(occupancy.appointmentId, appt.id));
    const version = appt.version + 1;
    await tx.update(appointment).set({ state: "cancelled", version, cancelledAt: now, cancelledBy: "actor" in who ? "staff" : "patient" }).where(eq(appointment.id, appt.id));
    await enqueue(tx, "appointment_cancelled", { appointmentId: appt.id, appointmentVersion: version });
    await audit(tx, "actor" in who ? who.actor : { kind: "guest", sessionId: who.guestSessionId }, "appointment.cancel", "appointment", appt.id, { version, start: appt.startsAt.toISOString() });
    return { appointmentId: appt.id, state: "cancelled" as const, version };
  });
}

export async function rescheduleAppointment(
  db: Db, who: ChangeActor,
  input: { appointmentId: string; expectedVersion: number; start: Date; therapistId?: string | null },
  now = new Date(),
) {
  return mapConflicts(() => db.transaction(async (tx) => {
    const appt = await lockAppointmentFor(tx, who, input.appointmentId, input.expectedVersion, now);
    const isStaff = "actor" in who;
    const newTherapistId = isStaff && input.therapistId ? input.therapistId : appt.therapistId;

    const [svc] = await tx.select().from(service).where(eq(service.id, appt.serviceId));
    if (newTherapistId !== appt.therapistId) {
      const [elig] = await tx.select().from(therapistService).where(and(eq(therapistService.serviceId, appt.serviceId), eq(therapistService.therapistId, newTherapistId), eq(therapistService.active, true)));
      if (!elig) throw new DomainError("validation", "Vybraný terapeut tuto službu neposkytuje.");
    }
    const configs = await resolveConfigs(tx, svc!, newTherapistId);
    const requiredResourceIds = configs[0]?.resourceIds.slice(1) ?? [];
    const newResourceIds = [await therapistResourceId(tx, newTherapistId), ...requiredResourceIds];
    const oldResourceIds = (await tx.select({ r: occupancy.resourceId }).from(occupancy).where(eq(occupancy.appointmentId, appt.id))).map((x) => x.r);
    await lockResources(tx, [...newResourceIds, ...oldResourceIds]);

    // Rules from the booking-time snapshot (duration/buffers); public grid/lead from current service.
    const rules = {
      durationMin: appt.durationMin, bufferBeforeMin: appt.bufferBeforeMin, bufferAfterMin: appt.bufferAfterMin,
      stepMin: svc!.slotStepMin, minLeadMinutes: svc!.minLeadMinutes, horizonDays: svc!.horizonDays,
    };
    // Release the old reservation inside the transaction; any failure below rolls back and keeps it.
    await tx.delete(occupancy).where(eq(occupancy.appointmentId, appt.id));
    const start = input.start.getTime();
    const end = start + rules.durationMin * 60_000;
    const b = bufferedInterval(rules, start, end);
    const sched = await loadSchedule(tx, newTherapistId, newResourceIds, b.start, b.end);
    const rejection = checkSlot(rules, sched, start, now.getTime(), isStaff ? STAFF_CHECK : PUBLIC_CHECK);
    if (rejection) throw new DomainError("slot_unavailable", "Vybraný termín není volný.", isStaff ? { reason: rejection } : undefined);

    await tx.insert(occupancy).values(newResourceIds.map((resourceId) => ({ resourceId, during: toRangeLiteral(b), appointmentId: appt.id })));
    const version = appt.version + 1;
    await tx.update(appointment).set({ startsAt: new Date(start), endsAt: new Date(end), therapistId: newTherapistId, version }).where(eq(appointment.id, appt.id));
    await enqueue(tx, "appointment_rescheduled", { appointmentId: appt.id, appointmentVersion: version });
    await audit(tx, isStaff ? who.actor : { kind: "guest", sessionId: who.guestSessionId }, "appointment.reschedule", "appointment", appt.id, {
      version, fromStart: appt.startsAt.toISOString(), toStart: new Date(start).toISOString(), fromTherapistId: appt.therapistId, toTherapistId: newTherapistId,
    });
    return { appointmentId: appt.id, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), therapistId: newTherapistId, version };
  }));
}

/** Therapist (own appointments) or reception records the outcome. Occupancy is kept. */
export async function setAppointmentOutcome(db: Db, actor: Actor | null, input: { appointmentId: string; expectedVersion: number; outcome: "completed" | "no_show" }, now = new Date()) {
  const staff = requireStaff(actor, "therapist");
  return db.transaction(async (tx) => {
    const [appt] = await tx.select().from(appointment).where(eq(appointment.id, input.appointmentId)).for("update");
    if (!appt) throw new DomainError("not_found", "Rezervace nenalezena.");
    assertCanAccessTherapist(staff, appt.therapistId);
    if (appt.version !== input.expectedVersion) throw new DomainError("stale_version", "Rezervace byla mezitím změněna. Načtěte ji prosím znovu.");
    if (appt.state !== "confirmed") throw new DomainError("policy", "Stav této rezervace už nelze změnit.");
    if (appt.startsAt > now) throw new DomainError("policy", "Výsledek lze zaznamenat až po začátku termínu.");
    const version = appt.version + 1;
    await tx.update(appointment).set({ state: input.outcome, version }).where(eq(appointment.id, appt.id));
    await audit(tx, staff, `appointment.${input.outcome}`, "appointment", appt.id, { version });
    return { appointmentId: appt.id, state: input.outcome, version };
  });
}

