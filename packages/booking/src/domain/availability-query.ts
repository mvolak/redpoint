import type { Db } from "../db/client";
import { requireStaff, type Actor } from "./actor";
import { generateSlots, PUBLIC_CHECK, STAFF_CHECK } from "./availability";
import { getActiveService, loadSchedule, resolveConfigs } from "./catalogue";
import { DomainError } from "./errors";
import { addDays, daysBetween, localDate, localToInstant } from "./time";

export const PUBLIC_MAX_RANGE_DAYS = 14;
export const STAFF_MAX_RANGE_DAYS = 31;

export type AvailabilitySlot = { start: string; end: string; therapistIds?: string[] };

/**
 * Free slots only (spec §7): never returns who/what occupies time. Results are indicative;
 * the booking transaction re-checks everything under lock.
 */
export async function findAvailability(
  db: Db,
  q: { serviceId: string; therapistId: string | null; from: string; to: string },
  opts: { now?: Date; actor?: Actor | null; staffView?: boolean } = {},
): Promise<{ slots: AvailabilitySlot[]; from: string; to: string }> {
  const now = opts.now ?? new Date();
  const staffView = !!opts.staffView;
  if (staffView) requireStaff(opts.actor, "reception");
  const svc = await getActiveService(db, q.serviceId);

  const today = localDate(now);
  let from = q.from < today ? today : q.from;
  let to = q.to;
  const maxDays = staffView ? STAFF_MAX_RANGE_DAYS : PUBLIC_MAX_RANGE_DAYS;
  if (daysBetween(from, to) + 1 > maxDays) to = addDays(from, maxDays - 1);
  if (!staffView) {
    const horizonEnd = addDays(today, svc.horizonDays);
    if (to > horizonEnd) to = horizonEnd;
  }
  if (to < from) return { slots: [], from, to };

  const configs = await resolveConfigs(db, svc, q.therapistId);
  if (q.therapistId && !configs.length) throw new DomainError("not_found", "Terapeut tuto službu neposkytuje.");

  const rangeStart = localToInstant(from, "00:00") - 2 * 3_600_000;
  const rangeEnd = localToInstant(addDays(to, 1), "00:00") + 2 * 3_600_000;
  const byStart = new Map<number, { end: number; therapistIds: string[] }>();
  for (const cfg of configs) {
    const sched = await loadSchedule(db, cfg.therapistId, cfg.resourceIds, rangeStart, rangeEnd);
    for (const s of generateSlots(cfg.rules, sched, from, to, now.getTime(), staffView ? { ...STAFF_CHECK, enforceGrid: true } : PUBLIC_CHECK)) {
      const cur = byStart.get(s.start);
      if (cur) cur.therapistIds.push(cfg.therapistId);
      else byStart.set(s.start, { end: s.end, therapistIds: [cfg.therapistId] });
    }
  }
  const slots = [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([start, v]) => ({
    start: new Date(start).toISOString(),
    end: new Date(v.end).toISOString(),
    // Staff see which therapists are free; the public "first available" view does not need it.
    ...(staffView ? { therapistIds: v.therapistIds } : {}),
  }));
  return { slots, from, to };
}
