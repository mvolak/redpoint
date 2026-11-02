import { DateTime } from "luxon";

export const CLINIC_TZ = "Europe/Prague";
export const MAX_RANGE_DAYS = 31;

export type Interval = { start: number; end: number }; // epoch ms, half-open [start, end)

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

/** ISO local date (yyyy-mm-dd) for an instant in the clinic timezone. */
export function localDate(instant: Date | number, tz = CLINIC_TZ): string {
  return DateTime.fromMillis(+instant, { zone: tz }).toISODate()!;
}

/** ISO weekday 1..7 for a local date. */
export function weekdayOf(date: string, tz = CLINIC_TZ): number {
  return DateTime.fromISO(date, { zone: tz }).weekday;
}

export function addDays(date: string, days: number, tz = CLINIC_TZ): string {
  return DateTime.fromISO(date, { zone: tz }).plus({ days }).toISODate()!;
}

export function daysBetween(from: string, to: string): number {
  return Math.round(DateTime.fromISO(to, { zone: "UTC" }).diff(DateTime.fromISO(from, { zone: "UTC" }), "days").days);
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Convert a local wall-clock time on a date to an instant.
 * - Nonexistent local times (spring-forward gap) resolve to the first valid instant after the gap.
 * - Repeated local times (fall-back) resolve to the earlier occurrence.
 * Both are deterministic, and slot generation then steps in real (UTC) time, so no slot
 * can land on a nonexistent wall-clock time and repeated times carry distinct offsets.
 */
export function localToInstant(date: string, hhmm: string, tz = CLINIC_TZ): number {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  let dt = DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: m }, { zone: tz });
  if (dt.hour !== h || dt.minute !== m) {
    // In a DST gap Luxon shifts forward by the gap length; snap to the transition instant
    // (Europe/Prague gaps are hour-aligned: 02:00-03:00).
    dt = dt.startOf('hour');
  }
  return dt.toMillis();
}

/** Formatting for Czech UI/emails. */
export function formatPrague(instant: Date | number, withOffsetIfAmbiguous = true): string {
  const dt = DateTime.fromMillis(+instant, { zone: CLINIC_TZ }).setLocale("cs");
  const base = dt.toFormat("cccc d. M. yyyy, H:mm");
  return withOffsetIfAmbiguous && isAmbiguousLocal(+instant) ? `${base} (${dt.toFormat("ZZ")})` : base;
}

export function formatTimePrague(instant: Date | number): string {
  const dt = DateTime.fromMillis(+instant, { zone: CLINIC_TZ });
  return isAmbiguousLocal(+instant) ? `${dt.toFormat("H:mm")} (${dt.toFormat("ZZ")})` : dt.toFormat("H:mm");
}

/** True when this instant's local wall time occurs twice (fall-back hour). */
export function isAmbiguousLocal(instant: number, tz = CLINIC_TZ): boolean {
  const dt = DateTime.fromMillis(instant, { zone: tz });
  const other = dt.offset === dt.plus({ hours: 1 }).offset ? dt.minus({ hours: 1 }) : dt.plus({ hours: 1 });
  return other.toFormat("yyyy-MM-dd HH:mm") === dt.toFormat("yyyy-MM-dd HH:mm") && other.offset !== dt.offset;
}

export function toRangeLiteral(i: Interval): string {
  return `[${new Date(i.start).toISOString()},${new Date(i.end).toISOString()})`;
}

