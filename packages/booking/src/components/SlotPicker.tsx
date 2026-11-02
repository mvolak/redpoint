"use client";
import { addDaysIso, fmtDate, groupSlots, pragueDate } from "../lib/client-api";
import { Button, cx, Spinner } from "./ui";

export type PickerSlot = { start: string; end: string; therapistIds?: string[] };

/** Week-at-a-time slot list grouped by day. Fully keyboard operable (buttons in a radiogroup-like list). */
export function SlotPicker({
  from, onFromChange, slots, loading, selected, onSelect, minDate, maxDate, emptyText = "V tomto týdnu nejsou volné termíny.",
}: {
  from: string;
  onFromChange: (d: string) => void;
  slots: PickerSlot[];
  loading: boolean;
  selected: string | null;
  onSelect: (s: PickerSlot) => void;
  minDate?: string;
  maxDate?: string;
  emptyText?: string;
}) {
  const to = addDaysIso(from, 6);
  const grouped = groupSlots(slots);
  const canPrev = !minDate || from > minDate;
  const canNext = !maxDate || to < maxDate;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" type="button" disabled={!canPrev} onClick={() => onFromChange(addDaysIso(from, -7))} aria-label="Předchozí týden">← Předchozí</Button>
        <p className="text-sm font-medium text-center" aria-live="polite">
          {fmtDate(from + "T12:00:00Z", { day: "numeric", month: "numeric" })} – {fmtDate(to + "T12:00:00Z", { day: "numeric", month: "numeric", year: "numeric" })}
        </p>
        <Button variant="secondary" type="button" disabled={!canNext} onClick={() => onFromChange(addDaysIso(from, 7))} aria-label="Další týden">Další →</Button>
      </div>
      {loading ? <Spinner label="Hledáme volné termíny…" /> : grouped.size === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([day, list]) => (
            <fieldset key={day}>
              <legend className="mb-2 text-sm font-semibold capitalize">{fmtDate(day + "T12:00:00Z")}</legend>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    aria-pressed={selected === s.start}
                    onClick={() => onSelect(s)}
                    className={cx(
                      "min-h-11 min-w-20 rounded-lg border px-3 py-2 text-sm font-medium",
                      selected === s.start ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
      <p className="text-xs text-muted">Časy jsou uvedeny v místním čase (Praha). Dostupnost je orientační – termín je závazný až po potvrzení.</p>
    </div>
  );
}

export function startOfWeekIso(d = pragueDate()) {
  const date = new Date(d + "T12:00:00Z");
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  return addDaysIso(d, -dow);
}
