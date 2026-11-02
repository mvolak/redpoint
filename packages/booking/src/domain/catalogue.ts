import { and, asc, eq, sql } from "drizzle-orm";
import type { Executor } from "../db/client";
import {
  bookingPolicy, clinicSettings, location, resource, scheduleException, service, serviceRequiredResource,
  therapist, therapistService, workingHours,
} from "../db/schema";
import { DomainError } from "./errors";
import type { SlotRules, TherapistSchedule } from "./availability";
import { localDate, type Interval } from "./time";

export async function getSettings(db: Executor) {
  const [s] = await db.select().from(clinicSettings).where(eq(clinicSettings.id, 1));
  if (!s) throw new Error("clinic_settings row missing — run the seed or create settings");
  return s;
}

export async function getActivePolicy(db: Executor) {
  const [p] = await db.select().from(bookingPolicy).where(eq(bookingPolicy.active, true));
  if (!p) throw new Error("No active booking policy configured");
  return p;
}

export async function getLocation(db: Executor, id: string) {
  const [l] = await db.select().from(location).where(eq(location.id, id));
  if (!l) throw new DomainError("not_found", "Pobočka nenalezena.");
  return l;
}

export type PublicService = {
  id: string; slug: string; name: string; description: string | null; firstVisitInfo: string | null;
  durationMin: number; priceMinMinor: number | null; priceMaxMinor: number | null; currency: string;
  bookingMode: "automatic" | "request_only"; newPatients: "allowed" | "not_allowed" | "only";
};

/** Public active catalogue only (spec §10). Request-only services are flagged so the UI never promises a slot. */
export async function listPublicServices(db: Executor): Promise<PublicService[]> {
  const rows = await db.select().from(service).where(eq(service.active, true)).orderBy(asc(service.sortOrder), asc(service.name));
  return rows.map((s) => ({
    id: s.id, slug: s.slug, name: s.name, description: s.description, firstVisitInfo: s.firstVisitInfo,
    durationMin: s.durationMin, priceMinMinor: s.priceMinMinor, priceMaxMinor: s.priceMaxMinor, currency: s.currency,
    bookingMode: s.requiresReview ? "request_only" : s.bookingMode, newPatients: s.newPatients,
  }));
}

export type PublicTherapist = { id: string; slug: string; displayName: string; bio: string | null; serviceIds: string[] };

export async function listPublicTherapists(db: Executor): Promise<PublicTherapist[]> {
  const rows = await db
    .select({ t: therapist, serviceId: therapistService.serviceId })
    .from(therapist)
    .leftJoin(therapistService, and(eq(therapistService.therapistId, therapist.id), eq(therapistService.active, true)))
    .leftJoin(service, eq(service.id, therapistService.serviceId))
    .where(eq(therapist.active, true))
    .orderBy(asc(therapist.sortOrder), asc(therapist.displayName));
  const map = new Map<string, PublicTherapist>();
  for (const r of rows) {
    const t = map.get(r.t.id) ?? { id: r.t.id, slug: r.t.slug, displayName: r.t.displayName, bio: r.t.bio, serviceIds: [] };
    if (r.serviceId) t.serviceIds.push(r.serviceId);
    map.set(r.t.id, t);
  }
  return [...map.values()];
}

export async function getActiveService(db: Executor, serviceId: string) {
  const [s] = await db.select().from(service).where(and(eq(service.id, serviceId), eq(service.active, true)));
  if (!s) throw new DomainError("not_found", "Služba není dostupná.");
  return s;
}

export type ResolvedConfig = {
  therapistId: string;
  resourceIds: string[]; // therapist resource first, then required resources
  rules: SlotRules;
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
};

/**
 * Final per-therapist configuration: service defaults + explicit therapist overrides.
 * Only active, eligible therapists are returned, ordered deterministically.
 */
export async function resolveConfigs(db: Executor, svc: typeof service.$inferSelect, onlyTherapistId?: string | null): Promise<ResolvedConfig[]> {
  const rows = await db
    .select({ ts: therapistService, resId: resource.id })
    .from(therapistService)
    .innerJoin(therapist, eq(therapist.id, therapistService.therapistId))
    .innerJoin(resource, and(eq(resource.therapistId, therapist.id), eq(resource.active, true)))
    .where(and(
      eq(therapistService.serviceId, svc.id),
      eq(therapistService.active, true),
      eq(therapist.active, true),
      onlyTherapistId ? eq(therapist.id, onlyTherapistId) : sql`true`,
    ))
    .orderBy(asc(therapist.sortOrder), asc(therapist.id));
  const required = await db
    .select({ id: serviceRequiredResource.resourceId })
    .from(serviceRequiredResource)
    .innerJoin(resource, eq(resource.id, serviceRequiredResource.resourceId))
    .where(and(eq(serviceRequiredResource.serviceId, svc.id), eq(resource.active, true)));
  return rows.map((r) => ({
    therapistId: r.ts.therapistId,
    resourceIds: [r.resId, ...required.map((x) => x.id)],
    rules: {
      durationMin: r.ts.durationMinOverride ?? svc.durationMin,
      bufferBeforeMin: svc.bufferBeforeMin,
      bufferAfterMin: svc.bufferAfterMin,
      stepMin: svc.slotStepMin,
      minLeadMinutes: svc.minLeadMinutes,
      horizonDays: svc.horizonDays,
    },
    priceMinMinor: r.ts.priceMinOverride ?? svc.priceMinMinor,
    priceMaxMinor: r.ts.priceMinOverride !== null ? r.ts.priceMaxOverride : svc.priceMaxMinor,
  }));
}

export async function therapistResourceId(db: Executor, therapistId: string): Promise<string> {
  const [r] = await db.select({ id: resource.id }).from(resource).where(eq(resource.therapistId, therapistId));
  if (!r) throw new DomainError("not_found", "Terapeut nenalezen.");
  return r.id;
}

/**
 * Load everything the slot engine needs for a therapist + resources over [from, to).
 * `excludeAppointmentId` ignores that appointment's own occupancy (rescheduling).
 */
export async function loadSchedule(
  db: Executor, therapistId: string, resourceIds: string[], from: number, to: number, excludeAppointmentId?: string,
): Promise<TherapistSchedule> {
  const fromDate = localDate(from);
  const toDate = localDate(to);
  const [weekly, exceptions, occ] = await Promise.all([
    db.select().from(workingHours).where(eq(workingHours.therapistId, therapistId)),
    db.select().from(scheduleException).where(and(
      sql`${scheduleException.date} BETWEEN ${fromDate} AND ${toDate}`,
      sql`(${scheduleException.therapistId} IS NULL OR ${scheduleException.therapistId} = ${therapistId})`,
    )),
    resourceIds.length
      ? db.execute<{ s: Date; e: Date }>(sql`
          SELECT lower(during) AS s, upper(during) AS e FROM occupancy
          WHERE resource_id IN ${sql.raw("(" + resourceIds.map((id) => `'${uuidOrThrow(id)}'`).join(",") + ")")}
            AND during && tstzrange(${new Date(from).toISOString()}::timestamptz, ${new Date(to).toISOString()}::timestamptz, '[)')
            ${excludeAppointmentId ? sql`AND (appointment_id IS NULL OR appointment_id <> ${excludeAppointmentId})` : sql``}`)
      : Promise.resolve([] as { s: Date; e: Date }[]),
  ]);
  return {
    therapistId,
    weekly: weekly.map((w) => ({ weekday: w.weekday, start: w.startLocal, end: w.endLocal, validFrom: w.validFrom, validTo: w.validTo })),
    exceptions: exceptions.map((e) => ({ therapistId: e.therapistId, date: e.date, kind: e.kind, start: e.startLocal, end: e.endLocal })),
    occupied: [...occ].map((o): Interval => ({ start: new Date(o.s).getTime(), end: new Date(o.e).getTime() })),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuidOrThrow(id: string): string {
  if (!UUID_RE.test(id)) throw new DomainError("validation", "Neplatný identifikátor.");
  return id;
}

/** Lock resources in a consistent (id) order to avoid deadlocks between concurrent writers (spec §9). */
export async function lockResources(tx: Executor, resourceIds: string[]) {
  const ids = [...new Set(resourceIds)].map(uuidOrThrow).sort();
  if (!ids.length) return;
  await tx.execute(sql`SELECT id FROM resource WHERE id IN ${sql.raw("(" + ids.map((i) => `'${i}'`).join(",") + ")")} ORDER BY id FOR UPDATE`);
}

