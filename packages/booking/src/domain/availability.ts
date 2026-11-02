// Pure slot engine: no I/O, deterministic for a given `now`. Used by availability queries,
// booking revalidation (inside locked transactions) and schedule-change validation.
import { addDays, eachDate, localDate, localToInstant, overlaps, weekdayOf, type Interval } from "./time";

export type WeeklyRule = { weekday: number; start: string; end: string; validFrom: string | null; validTo: string | null };
export type ExceptionRule = { therapistId: string | null; date: string; kind: "closed" | "custom_hours"; start: string | null; end: string | null };

export type TherapistSchedule = {
  therapistId: string;
  weekly: WeeklyRule[];
  /** Therapist-specific and clinic-wide (therapistId null) exceptions. */
  exceptions: ExceptionRule[];
  /** Occupied time of every resource this booking would need (therapist + required rooms/equipment). */
  occupied: Interval[];
};

export type SlotRules = {
  durationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  stepMin: number;
  minLeadMinutes: number;
  horizonDays: number;
};

export type Slot = { start: number; end: number };

const MIN = 60_000;

/** Working windows (instants) for one local date, after exceptions. */
export function windowsForDate(s: TherapistSchedule, date: string): Interval[] {
  const exc = s.exceptions.filter((e) => e.date === date && (e.therapistId === null || e.therapistId === s.therapistId));
  if (exc.some((e) => e.kind === "closed")) return [];
  const custom = exc.filter((e) => e.kind === "custom_hours" && e.therapistId === s.therapistId);
  const rules: { start: string; end: string }[] = custom.length
    ? custom.map((e) => ({ start: e.start!, end: e.end! }))
    : s.weekly.filter(
        (w) => w.weekday === weekdayOf(date) && (!w.validFrom || w.validFrom <= date) && (!w.validTo || w.validTo >= date),
      );
  return rules
    .map((r) => ({ start: localToInstant(date, r.start.slice(0, 5)), end: localToInstant(date, r.end.slice(0, 5)) }))
    .filter((w) => w.end > w.start)
    .sort((a, b) => a.start - b.start);
}

export function bufferedInterval(rules: Pick<SlotRules, "bufferBeforeMin" | "bufferAfterMin">, start: number, end: number): Interval {
  return { start: start - rules.bufferBeforeMin * MIN, end: end + rules.bufferAfterMin * MIN };
}

export type SlotRejection = "outside_hours" | "off_grid" | "lead_time" | "horizon" | "occupied" | "in_past";

export type CheckOptions = { enforceLead: boolean; enforceGrid: boolean; enforceHorizon: boolean };

export const PUBLIC_CHECK: CheckOptions = { enforceLead: true, enforceGrid: true, enforceHorizon: true };
/** Reception may book closer than the public lead time and off the public grid, but never in the past or outside hours. */
export const STAFF_CHECK: CheckOptions = { enforceLead: false, enforceGrid: false, enforceHorizon: false };

export function checkSlot(rules: SlotRules, s: TherapistSchedule, start: number, now: number, opts: CheckOptions): SlotRejection | null {
  const end = start + rules.durationMin * MIN;
  if (start < now) return "in_past";
  if (opts.enforceLead && start < now + rules.minLeadMinutes * MIN) return "lead_time";
  const date = localDate(start);
  if (opts.enforceHorizon && date > addDays(localDate(now), rules.horizonDays)) return "horizon";
  const win = windowsForDate(s, date).find((w) => w.start <= start && end <= w.end);
  if (!win) return "outside_hours";
  if (opts.enforceGrid && (start - win.start) % (rules.stepMin * MIN) !== 0) return "off_grid";
  const b = bufferedInterval(rules, start, end);
  if (s.occupied.some((o) => overlaps(o, b))) return "occupied";
  return null;
}

/** Free slots in [fromDate, toDate] (local dates, inclusive). Caller must bound the range. */
export function generateSlots(rules: SlotRules, s: TherapistSchedule, fromDate: string, toDate: string, now: number, opts: CheckOptions = PUBLIC_CHECK): Slot[] {
  const out: Slot[] = [];
  const step = rules.stepMin * MIN;
  const dur = rules.durationMin * MIN;
  for (const date of eachDate(fromDate, toDate)) {
    for (const w of windowsForDate(s, date)) {
      // Step in real elapsed time from the window start: DST-safe (no nonexistent or duplicated slots).
      for (let t = w.start; t + dur <= w.end; t += step) {
        if (checkSlot(rules, s, t, now, opts) === null) out.push({ start: t, end: t + dur });
      }
    }
  }
  return out;
}

/** Does an existing appointment still fit the (possibly changed) working schedule? */
export function fitsWorkingHours(s: TherapistSchedule, start: number, end: number): boolean {
  return windowsForDate(s, localDate(start)).some((w) => w.start <= start && end <= w.end);
}
