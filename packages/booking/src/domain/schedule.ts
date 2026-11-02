// Working hours, dated exceptions and manual blocks. Every change locks the affected therapist
// resources (same ordering as bookings), applies the change, then re-validates future
// appointments inside the same transaction; any invalidated appointment aborts the change
// (spec §9: "Reject hours/leave changes that would invalidate appointments").
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { appointment, occupancy, resource, scheduleException, therapist, timeBlock, workingHours } from "../db/schema";
import { assertCanAccessTherapist, requireStaff, type Actor } from "./actor";
import { audit } from "./audit";
import { fitsWorkingHours } from "./availability";
import { lockResources, loadSchedule } from "./catalogue";
import { DomainError, isExclusionViolation } from "./errors";
import { formatPrague, toRangeLiteral } from "./time";

export type HoursRuleInput = { weekday: number; start: string; end: string; validFrom?: string | null; validTo?: string | null };

async function therapistResources(tx: Tx, therapistIds: string[] | "all") {
  return tx.select({ id: resource.id, therapistId: resource.therapistId }).from(resource)
    .where(therapistIds === "all" ? eq(resource.kind, "therapist") : inArray(resource.therapistId, therapistIds));
}

/** Throws schedule_conflict listing appointments that would fall outside the new schedule. */
async function assertAppointmentsStillFit(tx: Tx, therapistIds: string[], now: Date) {
  if (!therapistIds.length) return;
  const appts = await tx.select({ id: appointment.id, reference: appointment.reference, therapistId: appointment.therapistId, startsAt: appointment.startsAt, endsAt: appointment.endsAt })
    .from(appointment)
    .where(and(inArray(appointment.therapistId, therapistIds), eq(appointment.state, "confirmed"), gte(appointment.endsAt, now)))
    .orderBy(asc(appointment.startsAt));
  const invalid: { appointmentId: string; reference: string; start: string }[] = [];
  for (const a of appts) {
    const sched = await loadSchedule(tx, a.therapistId, [], a.startsAt.getTime(), a.endsAt.getTime());
    if (!fitsWorkingHours(sched, a.startsAt.getTime(), a.endsAt.getTime())) {
      invalid.push({ appointmentId: a.id, reference: a.reference, start: formatPrague(a.startsAt) });
    }
  }
  if (invalid.length) {
    throw new DomainError("schedule_conflict", `Změna by zneplatnila ${invalid.length} potvrzených rezervací. Nejprve je přesuňte nebo zrušte.`, { appointments: invalid });
  }
}

export async function getSchedule(db: Db, actor: Actor | null, therapistId: string) {
  const staff = requireStaff(actor, "therapist");
  assertCanAccessTherapist(staff, therapistId);
  const [hours, exceptions, blocks] = await Promise.all([
    db.select().from(workingHours).where(eq(workingHours.therapistId, therapistId)).orderBy(asc(workingHours.weekday), asc(workingHours.startLocal)),
    db.select().from(scheduleException)
      .where(and(
        sql`(${scheduleException.therapistId} = ${therapistId} OR ${scheduleException.therapistId} IS NULL)`,
        sql`${scheduleException.date} >= (now() AT TIME ZONE 'Europe/Prague')::date - 7`,
      ))
      .orderBy(asc(scheduleException.date)),
    db.select({ b: timeBlock }).from(timeBlock).innerJoin(resource, eq(resource.id, timeBlock.resourceId))
      .where(and(eq(resource.therapistId, therapistId), sql`${timeBlock.endsAt} >= now() - interval '7 days'`))
      .orderBy(asc(timeBlock.startsAt)),
  ]);
  return { hours, exceptions, blocks: blocks.map((x) => x.b) };
}

/** Replace a therapist's weekly hours (administrator: "opening hours", spec §4). */
export async function setWorkingHours(db: Db, actor: Actor | null, therapistId: string, rules: HoursRuleInput[], now = new Date()) {
  const staff = requireStaff(actor, "admin");
  return db.transaction(async (tx) => {
    const res = await therapistResources(tx, [therapistId]);
    if (!res.length) throw new DomainError("not_found", "Terapeut nenalezen.");
    await lockResources(tx, res.map((r) => r.id));
    await tx.delete(workingHours).where(eq(workingHours.therapistId, therapistId));
    if (rules.length) {
      await tx.insert(workingHours).values(rules.map((r) => ({
        therapistId, weekday: r.weekday, startLocal: r.start, endLocal: r.end, validFrom: r.validFrom ?? null, validTo: r.validTo ?? null,
      })));
    }
    await assertAppointmentsStillFit(tx, [therapistId], now);
    await audit(tx, staff, "schedule.hours.replace", "therapist", therapistId, { rules: rules.length });
  });
}

export type ExceptionInput = { therapistId: string | null; date: string; kind: "closed" | "custom_hours"; start?: string | null; end?: string | null; note?: string | null };

export async function addException(db: Db, actor: Actor | null, input: ExceptionInput, now = new Date()) {
  const staff = requireStaff(actor, "reception");
  if (input.therapistId === null && input.kind !== "closed") throw new DomainError("validation", "Výjimka pro celou kliniku může být jen uzavření.");
  if (input.kind === "custom_hours" && (!input.start || !input.end || input.end <= input.start)) throw new DomainError("validation", "Zadejte platný čas od–do.");
  return db.transaction(async (tx) => {
    const res = await therapistResources(tx, input.therapistId ? [input.therapistId] : "all");
    await lockResources(tx, res.map((r) => r.id));
    const [row] = await tx.insert(scheduleException).values({
      therapistId: input.therapistId, date: input.date, kind: input.kind,
      startLocal: input.kind === "custom_hours" ? input.start! : null,
      endLocal: input.kind === "custom_hours" ? input.end! : null,
      note: input.note ?? null,
    }).returning();
    await assertAppointmentsStillFit(tx, res.map((r) => r.therapistId).filter((x): x is string => !!x), now);
    await audit(tx, staff, "schedule.exception.add", "schedule_exception", row!.id, { therapistId: input.therapistId, date: input.date, kind: input.kind });
    return row!;
  });
}

export async function deleteException(db: Db, actor: Actor | null, id: string, now = new Date()) {
  const staff = requireStaff(actor, "reception");
  return db.transaction(async (tx) => {
    const [ex] = await tx.select().from(scheduleException).where(eq(scheduleException.id, id));
    if (!ex) throw new DomainError("not_found", "Výjimka nenalezena.");
    const res = await therapistResources(tx, ex.therapistId ? [ex.therapistId] : "all");
    await lockResources(tx, res.map((r) => r.id));
    await tx.delete(scheduleException).where(eq(scheduleException.id, id));
    // Removing custom (extended) hours can invalidate appointments too.
    await assertAppointmentsStillFit(tx, res.map((r) => r.therapistId).filter((x): x is string => !!x), now);
    await audit(tx, staff, "schedule.exception.delete", "schedule_exception", id, { date: ex.date });
  });
}

export type BlockInput = { therapistId: string; start: Date; end: Date; kind: "block" | "break" | "leave"; note?: string | null };

/** Manual time block in the same exclusion domain as appointments: overlaps are rejected, never overridden. */
export async function createBlock(db: Db, actor: Actor | null, input: BlockInput) {
  const staff = requireStaff(actor, "reception");
  if (input.end <= input.start) throw new DomainError("validation", "Konec musí být po začátku.");
  try {
    return await db.transaction(async (tx) => {
      const res = await therapistResources(tx, [input.therapistId]);
      if (!res.length) throw new DomainError("not_found", "Terapeut nenalezen.");
      await lockResources(tx, res.map((r) => r.id));
      const [b] = await tx.insert(timeBlock).values({
        resourceId: res[0]!.id, startsAt: input.start, endsAt: input.end, kind: input.kind, note: input.note ?? null, createdBy: staff.staffId,
      }).returning();
      await tx.insert(occupancy).values({
        resourceId: res[0]!.id, during: toRangeLiteral({ start: input.start.getTime(), end: input.end.getTime() }), timeBlockId: b!.id,
      });
      await audit(tx, staff, "schedule.block.add", "time_block", b!.id, { therapistId: input.therapistId, start: input.start.toISOString(), end: input.end.toISOString(), kind: input.kind });
      return b!;
    });
  } catch (e) {
    if (isExclusionViolation(e)) {
      const conflicts = await db.select({ reference: appointment.reference, startsAt: appointment.startsAt }).from(occupancy)
        .innerJoin(appointment, eq(appointment.id, occupancy.appointmentId))
        .innerJoin(resource, eq(resource.id, occupancy.resourceId))
        .where(and(eq(resource.therapistId, input.therapistId), sql`${occupancy.during} && tstzrange(${input.start.toISOString()}::timestamptz, ${input.end.toISOString()}::timestamptz, '[)')`));
      throw new DomainError("schedule_conflict", "Blok se překrývá s existující rezervací nebo jiným blokem.", {
        appointments: conflicts.map((c) => ({ reference: c.reference, start: formatPrague(c.startsAt) })),
      });
    }
    throw e;
  }
}

export async function deleteBlock(db: Db, actor: Actor | null, id: string) {
  const staff = requireStaff(actor, "reception");
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(timeBlock).where(eq(timeBlock.id, id));
    if (!b) throw new DomainError("not_found", "Blok nenalezen.");
    await lockResources(tx, [b.resourceId]);
    await tx.delete(timeBlock).where(eq(timeBlock.id, id));
    await audit(tx, staff, "schedule.block.delete", "time_block", id, {});
  });
}

export async function listTherapistsForStaff(db: Db, actor: Actor | null) {
  const staff = requireStaff(actor, "therapist");
  const rows = await db.select({ id: therapist.id, displayName: therapist.displayName, active: therapist.active, slug: therapist.slug })
    .from(therapist).orderBy(asc(therapist.sortOrder));
  return staff.role === "therapist" ? rows.filter((r) => r.id === staff.therapistId) : rows;
}
