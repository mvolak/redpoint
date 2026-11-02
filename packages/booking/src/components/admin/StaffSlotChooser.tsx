"use client";
import { useEffect, useState } from "react";
import { SlotPicker, startOfWeekIso, type PickerSlot } from "../SlotPicker";
import { Button, Field, Input } from "../ui";
import { addDaysIso, api, fmtDateTime, pragueDate, pragueLocalToIso } from "../../lib/client-api";
import { ErrorBox } from "./common";

export type ChosenSlot = { start: string; therapistIds?: string[]; manual: boolean };

/**
 * Staff slot selection: week view from staff availability (no public lead time) plus manual
 * date/time entry. The server always revalidates on submit.
 */
export function StaffSlotChooser({
  serviceId, therapistId, initialDate, value, onChange, refreshKey = 0,
}: {
  serviceId: string | null;
  therapistId: string | null;
  initialDate?: string;
  value: ChosenSlot | null;
  onChange: (s: ChosenSlot | null) => void;
  refreshKey?: number;
}) {
  const [from, setFrom] = useState(startOfWeekIso(initialDate && initialDate > pragueDate() ? initialDate : pragueDate()));
  const [slots, setSlots] = useState<PickerSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [manualDate, setManualDate] = useState(initialDate ?? pragueDate());
  const [manualTime, setManualTime] = useState("");

  useEffect(() => {
    if (!serviceId) { setSlots([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ serviceId, from, to: addDaysIso(from, 6) });
    if (therapistId) qs.set("therapistId", therapistId);
    api<{ slots: PickerSlot[] }>(`/api/rezervace/admin/availability?${qs}`)
      .then((r) => { if (!cancelled) setSlots(r.slots); })
      .catch((e) => { if (!cancelled) { setError(e); setSlots([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [serviceId, therapistId, from, refreshKey]);

  if (!serviceId) return <p className="text-sm text-muted">Nejprve vyberte službu.</p>;

  return (
    <div className="space-y-4">
      <SlotPicker
        from={from}
        onFromChange={setFrom}
        slots={slots}
        loading={loading}
        selected={value && !value.manual ? value.start : null}
        onSelect={(s) => onChange({ start: s.start, therapistIds: s.therapistIds, manual: false })}
        minDate={startOfWeekIso(pragueDate())}
      />
      <ErrorBox error={error} />
      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium">Zadat čas ručně</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
          <Field label="Datum">{(id) => <Input id={id} type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />}</Field>
          <Field label="Čas začátku" hint="Server ověří pracovní dobu a kolize.">{(id, d) => <Input id={id} aria-describedby={d} type="time" step={300} value={manualTime} onChange={(e) => setManualTime(e.target.value)} />}</Field>
          <Button type="button" variant="secondary" disabled={!manualDate || !manualTime}
            onClick={() => onChange({ start: pragueLocalToIso(manualDate, manualTime), manual: true })}>
            Použít tento čas
          </Button>
        </div>
      </details>
      {value && <p className="text-sm" aria-live="polite">Vybráno: <strong>{fmtDateTime(value.start)}</strong>{value.manual && " (ručně)"}</p>}
    </div>
  );
}
