// Browser-side fetch helper. Same-origin only; cookies are httpOnly and never touched by JS.
export type ApiError = { code: string; message: string; details?: Record<string, unknown> | null; status: number };

export class ApiFailure extends Error {
  constructor(public readonly error: ApiError) { super(error.message); }
}

/** The host site uses `trailingSlash: true`; add the slash up front to skip a 308 round trip. */
export function withTrailingSlash(path: string) {
  const i = path.search(/[?#]/);
  const [p, rest] = i === -1 ? [path, ""] : [path.slice(0, i), path.slice(i)];
  return (p.endsWith("/") ? p : p + "/") + rest;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(withTrailingSlash(path), {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiFailure({ code: "network", message: "Nepodařilo se spojit se serverem. Zkontrolujte připojení a zkuste to znovu.", status: 0 });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiFailure({ code: e.code ?? "internal", message: e.message ?? "Něco se nepovedlo.", details: e.details ?? null, status: res.status });
  }
  return data as T;
}

export function newIdempotencyKey() {
  return crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
}

export const PRAGUE = "Europe/Prague";

export function fmtDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("cs-CZ", { timeZone: PRAGUE, ...opts }).format(new Date(iso));
}

export function fmtTime(iso: string | Date) {
  return new Intl.DateTimeFormat("cs-CZ", { timeZone: PRAGUE, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** Local time with UTC offset — used when the local time is ambiguous (DST fall-back). */
export function fmtTimeWithOffset(iso: string) {
  const d = new Date(iso);
  const off = new Intl.DateTimeFormat("en-GB", { timeZone: PRAGUE, timeZoneName: "shortOffset" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value;
  return `${fmtTime(d)} (${off})`;
}

export function fmtDateTime(iso: string | Date) {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}

/** yyyy-mm-dd of an instant in Prague. */
export function pragueDate(d: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PRAGUE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

export function addDaysIso(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Convert a Prague local date + HH:MM to an ISO instant (for staff manual time entry). */
export function pragueLocalToIso(date: string, hhmm: string): string {
  // Try both possible offsets (+01:00, +02:00) and pick the one that round-trips.
  for (const off of ["+01:00", "+02:00"]) {
    const iso = `${date}T${hhmm}:00${off}`;
    const d = new Date(iso);
    if (pragueDate(d) === date && fmtHHMM(d) === hhmm) return d.toISOString();
  }
  return new Date(`${date}T${hhmm}:00+01:00`).toISOString();
}

function fmtHHMM(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: PRAGUE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

/** Group slots by Prague date, flagging ambiguous (repeated) local times. */
export function groupSlots<T extends { start: string }>(slots: T[]) {
  const byDay = new Map<string, (T & { label: string })[]>();
  const seen = new Map<string, number>();
  for (const s of slots) seen.set(`${pragueDate(s.start)} ${fmtTime(s.start)}`, (seen.get(`${pragueDate(s.start)} ${fmtTime(s.start)}`) ?? 0) + 1);
  for (const s of slots) {
    const day = pragueDate(s.start);
    const ambiguous = (seen.get(`${day} ${fmtTime(s.start)}`) ?? 0) > 1;
    const list = byDay.get(day) ?? [];
    list.push({ ...s, label: ambiguous ? fmtTimeWithOffset(s.start) : fmtTime(s.start) });
    byDay.set(day, list);
  }
  return byDay;
}
