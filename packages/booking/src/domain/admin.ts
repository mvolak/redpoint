// Staff-facing reads and administration. Every function takes the actor and enforces role and
// therapist scope itself — route handlers and future agents get the same guarantees.
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  appointment, appointmentRequest, auditEvent, bookingPolicy, clinicSettings, notificationOutbox, patientContact,
  service, staffProfile, therapist, therapistService, type PublicMode, type StaffRole,
} from "../db/schema";
import { assertCanAccessTherapist, requireStaff, therapistScope, type Actor } from "./actor";
import { audit } from "./audit";
import { DomainError } from "./errors";

export async function listAppointments(db: Db, actor: Actor | null, q: { from: Date; to: Date; therapistId?: string | null; states?: string[] }) {
  const staff = requireStaff(actor, "therapist");
  if (q.to.getTime() - q.from.getTime() > 62 * 86_400_000) throw new DomainError("validation", "Maximální rozsah je 62 dní.");
  const scope = therapistScope(staff);
  if (scope && q.therapistId && q.therapistId !== scope) throw new DomainError("forbidden", "K tomuto rozvrhu nemáte přístup.");
  const therapistFilter = scope ?? q.therapistId ?? null;
  const rows = await db.select({ a: appointment, c: patientContact, t: therapist.displayName })
    .from(appointment)
    .innerJoin(patientContact, eq(patientContact.id, appointment.patientContactId))
    .innerJoin(therapist, eq(therapist.id, appointment.therapistId))
    .where(and(
      gte(appointment.startsAt, q.from), lt(appointment.startsAt, q.to),
      therapistFilter ? eq(appointment.therapistId, therapistFilter) : sql`true`,
      q.states?.length ? inArray(appointment.state, q.states as never[]) : sql`true`,
    ))
    .orderBy(asc(appointment.startsAt))
    .limit(1000);
  return rows.map((r) => ({
    id: r.a.id, reference: r.a.reference, state: r.a.state, version: r.a.version, source: r.a.source,
    startsAt: r.a.startsAt.toISOString(), endsAt: r.a.endsAt.toISOString(),
    serviceId: r.a.serviceId, serviceName: r.a.serviceName, therapistId: r.a.therapistId, therapistName: r.t,
    // Minimum necessary contact details (spec §4); email only for reception/admin.
    patientName: r.c.name, patientPhone: r.c.phone, patientEmail: staff.role === "therapist" ? null : r.c.email,
    isNewPatient: r.c.isNewPatient,
  }));
}

export async function getAppointmentDetail(db: Db, actor: Actor | null, id: string) {
  const staff = requireStaff(actor, "therapist");
  const [r] = await db.select({ a: appointment, c: patientContact, t: therapist.displayName })
    .from(appointment)
    .innerJoin(patientContact, eq(patientContact.id, appointment.patientContactId))
    .innerJoin(therapist, eq(therapist.id, appointment.therapistId))
    .where(eq(appointment.id, id));
  if (!r) throw new DomainError("not_found", "Rezervace nenalezena.");
  assertCanAccessTherapist(staff, r.a.therapistId);
  const notifications = staff.role === "therapist" ? [] : await db.select().from(notificationOutbox)
    .where(eq(notificationOutbox.appointmentId, id)).orderBy(asc(notificationOutbox.createdAt));
  const history = await db.select().from(auditEvent)
    .where(and(eq(auditEvent.recordType, "appointment"), eq(auditEvent.recordId, id))).orderBy(asc(auditEvent.createdAt));
  return {
    id: r.a.id, reference: r.a.reference, state: r.a.state, version: r.a.version, source: r.a.source,
    startsAt: r.a.startsAt.toISOString(), endsAt: r.a.endsAt.toISOString(),
    serviceId: r.a.serviceId, serviceName: r.a.serviceName, therapistId: r.a.therapistId, therapistName: r.t,
    durationMin: r.a.durationMin, bufferBeforeMin: r.a.bufferBeforeMin, bufferAfterMin: r.a.bufferAfterMin,
    priceMinMinor: r.a.priceMinMinor, priceMaxMinor: r.a.priceMaxMinor, policyVersion: r.a.policyVersion,
    cancellationCutoffHours: r.a.cancellationCutoffHours,
    patient: { name: r.c.name, phone: r.c.phone, email: staff.role === "therapist" ? null : r.c.email, isNewPatient: r.c.isNewPatient, emailVerified: r.c.emailVerified },
    notifications: notifications.map((n) => ({ id: n.id, event: n.event, status: n.status, attempts: n.attempts, lastError: n.lastError, sentAt: n.sentAt?.toISOString() ?? null, appointmentVersion: n.appointmentVersion })),
    history: history.map((h) => ({ operation: h.operation, actorType: h.actorType, at: h.createdAt.toISOString(), details: h.details })),
  };
}

export async function listRequests(db: Db, actor: Actor | null, state: "pending" | "resolved" | "declined" = "pending") {
  requireStaff(actor, "reception");
  const rows = await db.select({ q: appointmentRequest, c: patientContact, s: service.name, t: therapist.displayName })
    .from(appointmentRequest)
    .innerJoin(patientContact, eq(patientContact.id, appointmentRequest.patientContactId))
    .innerJoin(service, eq(service.id, appointmentRequest.serviceId))
    .leftJoin(therapist, eq(therapist.id, appointmentRequest.therapistId))
    .where(eq(appointmentRequest.state, state))
    .orderBy(state === "pending" ? asc(appointmentRequest.createdAt) : desc(appointmentRequest.updatedAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.q.id, reference: r.q.reference, state: r.q.state, version: r.q.version, createdAt: r.q.createdAt.toISOString(),
    serviceId: r.q.serviceId, serviceName: r.s, therapistId: r.q.therapistId, therapistName: r.t,
    preferredFrom: r.q.preferredFrom, preferredTo: r.q.preferredTo, preferredTimeOfDay: r.q.preferredTimeOfDay,
    preferredStart: r.q.preferredStart?.toISOString() ?? null, resolvedAppointmentId: r.q.resolvedAppointmentId,
    patient: { name: r.c.name, email: r.c.email, phone: r.c.phone, isNewPatient: r.c.isNewPatient },
  }));
}

// ------------------------------------------------------------------ notifications

export async function listNotifications(db: Db, actor: Actor | null, status?: string) {
  requireStaff(actor, "reception");
  const rows = await db.select({ n: notificationOutbox, ref: appointment.reference, rref: appointmentRequest.reference })
    .from(notificationOutbox)
    .leftJoin(appointment, eq(appointment.id, notificationOutbox.appointmentId))
    .leftJoin(appointmentRequest, eq(appointmentRequest.id, notificationOutbox.requestId))
    .where(status ? eq(notificationOutbox.status, status as never) : sql`true`)
    .orderBy(desc(notificationOutbox.createdAt)).limit(200);
  return rows.map(({ n, ref, rref }) => ({
    id: n.id, event: n.event, status: n.status, attempts: n.attempts, maxAttempts: n.maxAttempts, lastError: n.lastError,
    nextAttemptAt: n.nextAttemptAt.toISOString(), sentAt: n.sentAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString(),
    appointmentId: n.appointmentId, requestId: n.requestId, reference: ref ?? rref, appointmentVersion: n.appointmentVersion,
  }));
}

/** Retry a failed/skipped message. Re-sends the same logical event; never recreates appointments. */
export async function retryNotification(db: Db, actor: Actor | null, id: string) {
  const staff = requireStaff(actor, "reception");
  const [n] = await db.update(notificationOutbox)
    .set({ status: "pending", nextAttemptAt: new Date(), maxAttempts: sql`${notificationOutbox.attempts} + 3`, lockedUntil: null })
    .where(and(eq(notificationOutbox.id, id), inArray(notificationOutbox.status, ["failed", "skipped"])))
    .returning({ id: notificationOutbox.id });
  if (!n) throw new DomainError("policy", "Zprávu lze znovu odeslat jen ve stavu chyba/přeskočeno.");
  await audit(db, staff, "notification.retry", "notification_outbox", id, {});
}

// ------------------------------------------------------------------ settings & policy

export async function updateSettings(db: Db, actor: Actor | null, input: { expectedVersion: number; publicMode: PublicMode; pausedMessage: string | null; receptionPhone: string | null; receptionEmail: string | null }) {
  const staff = requireStaff(actor, "reception");
  const [row] = await db.update(clinicSettings).set({
    publicMode: input.publicMode, pausedMessage: input.pausedMessage, receptionPhone: input.receptionPhone, receptionEmail: input.receptionEmail,
    version: sql`${clinicSettings.version} + 1`,
  }).where(and(eq(clinicSettings.id, 1), eq(clinicSettings.version, input.expectedVersion))).returning();
  if (!row) throw new DomainError("stale_version", "Nastavení mezitím změnil někdo jiný. Načtěte stránku znovu.");
  await audit(db, staff, "settings.update", "clinic_settings", null, { publicMode: input.publicMode, version: row.version });
  return row;
}

export async function publishPolicy(db: Db, actor: Actor | null, input: { cancellationCutoffHours: number; termsText: string }) {
  const staff = requireStaff(actor, "admin");
  return db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE booking_policy IN SHARE ROW EXCLUSIVE MODE`);
    const [{ max }] = [...(await tx.execute<{ max: number | null }>(sql`SELECT max(version) AS max FROM booking_policy`))] as [{ max: number | null }];
    await tx.update(bookingPolicy).set({ active: false }).where(eq(bookingPolicy.active, true));
    const [p] = await tx.insert(bookingPolicy).values({ version: (max ?? 0) + 1, cancellationCutoffHours: input.cancellationCutoffHours, termsText: input.termsText, active: true }).returning();
    await audit(tx, staff, "policy.publish", "booking_policy", p!.id, { version: p!.version, cutoff: p!.cancellationCutoffHours });
    return p!;
  });
}

// ------------------------------------------------------------------ audit

export async function listAudit(db: Db, actor: Actor | null, limit = 200) {
  requireStaff(actor, "admin");
  const rows = await db.select({ e: auditEvent, staffName: staffProfile.displayName })
    .from(auditEvent)
    .leftJoin(staffProfile, and(eq(auditEvent.actorType, "staff"), sql`${staffProfile.id}::text = ${auditEvent.actorId}`))
    .orderBy(desc(auditEvent.createdAt)).limit(Math.min(limit, 500));
  return rows.map(({ e, staffName }) => ({
    id: e.id, at: e.createdAt.toISOString(), actorType: e.actorType, actor: staffName ?? (e.actorType === "patient" ? "pacient (ověřená relace)" : e.actorType),
    operation: e.operation, recordType: e.recordType, recordId: e.recordId, details: e.details,
  }));
}

// ------------------------------------------------------------------ staff & roles (admin)

export async function listStaff(db: Db, actor: Actor | null) {
  requireStaff(actor, "admin");
  return db.select().from(staffProfile).orderBy(asc(staffProfile.displayName));
}

export async function upsertStaff(db: Db, actor: Actor | null, input: { id?: string; expectedVersion?: number; email: string; displayName: string; role: StaffRole; therapistId: string | null; active: boolean; authSubject?: string | null }) {
  const admin = requireStaff(actor, "admin");
  if (input.role === "therapist" && !input.therapistId) throw new DomainError("validation", "Terapeut musí mít přiřazený profil terapeuta.");
  if (input.id === admin.staffId && (input.role !== "admin" || !input.active)) throw new DomainError("policy", "Nemůžete odebrat administrátorská práva sami sobě.");
  if (input.id) {
    const [row] = await db.update(staffProfile).set({
      email: input.email.toLowerCase(), displayName: input.displayName, role: input.role, therapistId: input.therapistId, active: input.active,
      ...(input.authSubject !== undefined ? { authSubject: input.authSubject } : {}),
      version: sql`${staffProfile.version} + 1`,
    }).where(and(eq(staffProfile.id, input.id), eq(staffProfile.version, input.expectedVersion ?? -1))).returning();
    if (!row) throw new DomainError("stale_version", "Profil mezitím změnil někdo jiný. Načtěte stránku znovu.");
    await audit(db, admin, "staff.update", "staff_profile", row.id, { role: row.role, active: row.active, therapistId: row.therapistId });
    return row;
  }
  const [row] = await db.insert(staffProfile).values({
    email: input.email.toLowerCase(), displayName: input.displayName, role: input.role, therapistId: input.therapistId, active: input.active, authSubject: input.authSubject ?? null, version: 1,
  }).returning();
  await audit(db, admin, "staff.create", "staff_profile", row!.id, { role: row!.role, therapistId: row!.therapistId });
  return row!;
}

// ------------------------------------------------------------------ catalogue (admin)

export async function listCatalogueForAdmin(db: Db, actor: Actor | null) {
  requireStaff(actor, "reception");
  const [services, therapists, matrix] = await Promise.all([
    db.select().from(service).orderBy(asc(service.sortOrder)),
    db.select().from(therapist).orderBy(asc(therapist.sortOrder)),
    db.select().from(therapistService),
  ]);
  return { services, therapists, matrix };
}

export type ServiceUpdate = Partial<Pick<typeof service.$inferInsert,
  "name" | "description" | "firstVisitInfo" | "active" | "durationMin" | "bufferBeforeMin" | "bufferAfterMin" | "priceMinMinor" | "priceMaxMinor"
  | "bookingMode" | "newPatients" | "requiresReview" | "minLeadMinutes" | "horizonDays" | "slotStepMin">>;

/** Catalogue edits affect future bookings only; existing appointments keep their snapshots. */
export async function updateService(db: Db, actor: Actor | null, id: string, patch: ServiceUpdate) {
  const admin = requireStaff(actor, "admin");
  const [row] = await db.update(service).set(patch).where(eq(service.id, id)).returning();
  if (!row) throw new DomainError("not_found", "Služba nenalezena.");
  await audit(db, admin, "catalogue.service.update", "service", id, { fields: Object.keys(patch) });
  return row;
}

export async function setTherapistService(db: Db, actor: Actor | null, input: { therapistId: string; serviceId: string; active: boolean; durationMinOverride: number | null; priceMinOverride: number | null; priceMaxOverride: number | null }) {
  const admin = requireStaff(actor, "admin");
  await db.insert(therapistService).values(input).onConflictDoUpdate({
    target: [therapistService.therapistId, therapistService.serviceId],
    set: { active: input.active, durationMinOverride: input.durationMinOverride, priceMinOverride: input.priceMinOverride, priceMaxOverride: input.priceMaxOverride },
  });
  await audit(db, admin, "catalogue.therapist_service.set", "therapist", input.therapistId, { serviceId: input.serviceId, active: input.active });
}
