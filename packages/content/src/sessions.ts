import type { CourseSession, SessionState } from "./types";

/** Derive the display state. Past is computed from the end time, never trusted from data. */
export function deriveSessionState(session: CourseSession, now: Date): SessionState {
  const end = new Date(session.end);
  if (Number.isNaN(end.getTime())) return "unknown";
  if (end.getTime() < now.getTime()) return "past";
  switch (session.status) {
    case "cancelled":
      return "cancelled";
    case "full":
      return "full";
    case "scheduled":
      return "open";
    default:
      return "unknown";
  }
}

export const SESSION_STATE_LABELS: Record<SessionState, string> = {
  open: "Registrace otevřena",
  full: "Obsazeno",
  cancelled: "Zrušeno",
  past: "Proběhlo",
  unknown: "Stav neověřen",
};

const PRAGUE = "Europe/Prague";

const dayFmt = new Intl.DateTimeFormat("cs-CZ", { timeZone: PRAGUE, day: "numeric", month: "numeric", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("cs-CZ", { timeZone: PRAGUE, hour: "2-digit", minute: "2-digit" });
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: PRAGUE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Czech date range in Europe/Prague, e.g. "10. 3. 2027 – 12. 3. 2027" or "3. 6. 2027, 14:00–17:00". */
export function formatSessionRange(session: CourseSession): string {
  const start = new Date(session.start);
  const end = new Date(session.end);
  if (ymd.format(start) === ymd.format(end)) {
    return `${dayFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  }
  return `${dayFmt.format(start)} – ${dayFmt.format(end)}`;
}

export function formatPrice(price: NonNullable<CourseSession["price"]>): string {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(
    price.amount,
  );
}
