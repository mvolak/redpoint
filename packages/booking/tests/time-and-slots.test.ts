import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { checkSlot, generateSlots, PUBLIC_CHECK, windowsForDate, type SlotRules, type TherapistSchedule } from "@/domain/availability";
import { formatTimePrague, isAmbiguousLocal, localToInstant } from "@/domain/time";

const rules: SlotRules = { durationMin: 60, bufferBeforeMin: 0, bufferAfterMin: 0, stepMin: 60, minLeadMinutes: 0, horizonDays: 400 };
const sched = (date: string, start: string, end: string, extra: Partial<TherapistSchedule> = {}): TherapistSchedule => ({
  therapistId: "t", weekly: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start, end, validFrom: null, validTo: null })),
  exceptions: [], occupied: [], ...extra,
});
const local = (ms: number) => DateTime.fromMillis(ms, { zone: "Europe/Prague" });
const dayBefore = (date: string) => Date.parse(date + "T00:00:00Z") - 86_400_000;

describe("Europe/Prague daylight-saving transitions", () => {
  it("spring forward (29 Mar 2026): no slot at a nonexistent local time; real duration respected", () => {
    const date = "2026-03-29";
    const slots = generateSlots(rules, sched(date, "01:00", "05:00"), date, date, dayBefore(date));
    const labels = slots.map((s) => local(s.start).toFormat("HH:mm"));
    expect(labels).toEqual(["01:00", "03:00", "04:00"]); // 01:00–05:00 local is only 3 real hours
    expect(labels.some((l) => l.startsWith("02:"))).toBe(false);
    for (const s of slots) expect(s.end - s.start).toBe(3_600_000);
  });

  it("fall back (25 Oct 2026): repeated hour yields two distinct, unambiguously labelled slots", () => {
    const date = "2026-10-25";
    const slots = generateSlots(rules, sched(date, "01:00", "04:00"), date, date, dayBefore(date));
    expect(slots).toHaveLength(4); // 01:00–04:00 local is 4 real hours
    const twos = slots.filter((s) => local(s.start).hour === 2);
    expect(twos).toHaveLength(2);
    expect(new Set(twos.map((s) => s.start)).size).toBe(2);
    expect(twos.every((s) => isAmbiguousLocal(s.start))).toBe(true);
    expect(twos.map((s) => formatTimePrague(s.start))).toEqual(["2:00 (+02:00)", "2:00 (+01:00)"]);
    expect(isAmbiguousLocal(slots[0]!.start)).toBe(false);
  });

  it("ordinary days: local business hours map to correct UTC instants in winter and summer", () => {
    expect(new Date(localToInstant("2026-01-15", "09:00")).toISOString()).toBe("2026-01-15T08:00:00.000Z");
    expect(new Date(localToInstant("2026-07-15", "09:00")).toISOString()).toBe("2026-07-15T07:00:00.000Z");
    const winter = windowsForDate(sched("2026-01-15", "09:00", "17:00"), "2026-01-15");
    expect(winter[0]!.end - winter[0]!.start).toBe(8 * 3_600_000);
  });

  it("a nonexistent window start snaps to the end of the gap", () => {
    expect(new Date(localToInstant("2026-03-29", "02:30")).toISOString()).toBe("2026-03-29T01:00:00.000Z"); // 03:00 CEST
  });
});

describe("lead time and horizon", () => {
  const date = "2026-11-03";
  const s = sched(date, "09:00", "17:00");
  const now = localToInstant("2026-11-03", "08:00");
  it("minimum lead time", () => {
    const r = { ...rules, minLeadMinutes: 120 };
    expect(checkSlot(r, s, localToInstant(date, "09:00"), now, PUBLIC_CHECK)).toBe("lead_time");
    expect(checkSlot(r, s, localToInstant(date, "10:00"), now, PUBLIC_CHECK)).toBeNull();
  });
  it("horizon counts local calendar days", () => {
    const r = { ...rules, horizonDays: 2 };
    expect(checkSlot(r, s, localToInstant("2026-11-05", "16:00"), now, PUBLIC_CHECK)).toBeNull();
    expect(checkSlot(r, s, localToInstant("2026-11-06", "09:00"), now, PUBLIC_CHECK)).toBe("horizon");
  });
  it("past instants are never bookable", () => {
    expect(checkSlot(rules, s, localToInstant(date, "07:00"), now, { enforceGrid: false, enforceHorizon: false, enforceLead: false })).toBe("in_past");
  });
});

describe("exceptions", () => {
  const date = "2026-11-03";
  it("closed day removes availability; clinic-wide closure applies to everyone", () => {
    expect(windowsForDate(sched(date, "09:00", "17:00", { exceptions: [{ therapistId: "t", date, kind: "closed", start: null, end: null }] }), date)).toEqual([]);
    expect(windowsForDate(sched(date, "09:00", "17:00", { exceptions: [{ therapistId: null, date, kind: "closed", start: null, end: null }] }), date)).toEqual([]);
  });
  it("custom hours replace weekly hours on that date", () => {
    const w = windowsForDate(sched(date, "09:00", "17:00", { exceptions: [{ therapistId: "t", date, kind: "custom_hours", start: "12:00", end: "14:00" }] }), date);
    expect(w).toEqual([{ start: localToInstant(date, "12:00"), end: localToInstant(date, "14:00") }]);
  });
});
