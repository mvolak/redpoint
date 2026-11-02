"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, Select, Spinner } from "@redcord/booking/components/ui";
import { startOfWeekIso } from "@redcord/booking/components/SlotPicker";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { ErrorBox, hasRole, PageTitle, STATE_LABEL, StateBadge, useLoad, type TherapistLite } from "@redcord/booking/components/admin/common";
import { addDaysIso, fmtDate, fmtTime, pragueDate, pragueLocalToIso } from "@redcord/booking/lib/client-api";

type Appt = {
  id: string; reference: string; state: string; version: number; startsAt: string; endsAt: string;
  serviceName: string; therapistId: string; therapistName: string; patientName: string; patientPhone: string;
  patientEmail: string | null; isNewPatient: boolean; source: string;
};

export default function CalendarPage() {
  const me = useMe();
  const [view, setView] = useState<"day" | "week">("week");
  const [date, setDate] = useState(pragueDate());
  const [therapistId, setTherapistId] = useState("");
  const [state, setState] = useState("confirmed,completed,no_show");

  const from = view === "week" ? startOfWeekIso(date) : date;
  const days = view === "week" ? 7 : 1;
  const dayList = Array.from({ length: days }, (_, i) => addDaysIso(from, i));
  const qs = new URLSearchParams({ from: pragueLocalToIso(from, "00:00"), to: pragueLocalToIso(addDaysIso(from, days), "00:00") });
  if (therapistId) qs.set("therapistId", therapistId);
  if (state) qs.set("states", state);
  const { data, error, loading } = useLoad<{ appointments: Appt[] }>(`/api/rezervace/admin/appointments?${qs}`);
  const therapists = useLoad<{ therapists: TherapistLite[] }>("/api/rezervace/admin/therapists");

  const byDay = useMemo(() => {
    const m = new Map<string, Appt[]>();
    for (const d of dayList) m.set(d, []);
    for (const a of data?.appointments ?? []) m.get(pragueDate(a.startsAt))?.push(a);
    return m;
  }, [data, dayList.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = view === "week" ? 7 : 1;
  return (
    <div>
      <PageTitle actions={hasRole(me, "reception") && <Link href="/rezervace/admin/appointments/new" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">+ Nová rezervace</Link>}>
        Kalendář
      </PageTitle>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="flex gap-2" role="group" aria-label="Zobrazení">
            <Button variant={view === "day" ? "primary" : "secondary"} aria-pressed={view === "day"} onClick={() => setView("day")}>Den</Button>
            <Button variant={view === "week" ? "primary" : "secondary"} aria-pressed={view === "week"} onClick={() => setView("week")}>Týden</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" aria-label="Předchozí" onClick={() => setDate(addDaysIso(date, -step))}>←</Button>
            <Button variant="secondary" onClick={() => setDate(pragueDate())}>Dnes</Button>
            <Button variant="secondary" aria-label="Další" onClick={() => setDate(addDaysIso(date, step))}>→</Button>
            <input type="date" aria-label="Datum" className="min-h-11 rounded-lg border border-line px-2 text-sm" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          {me.role !== "therapist" && (
            <Field label="Terapeut">
              {(id) => (
                <Select id={id} value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
                  <option value="">Všichni</option>
                  {therapists.data?.therapists.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
                </Select>
              )}
            </Field>
          )}
          <Field label="Stav">
            {(id) => (
              <Select id={id} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="confirmed,completed,no_show">Aktivní a proběhlé</option>
                <option value="confirmed">{STATE_LABEL.confirmed}</option>
                <option value="completed">{STATE_LABEL.completed}</option>
                <option value="no_show">{STATE_LABEL.no_show}</option>
                <option value="cancelled">{STATE_LABEL.cancelled}</option>
                <option value="">Vše včetně zrušených</option>
              </Select>
            )}
          </Field>
        </div>
      </Card>
      <ErrorBox error={error} />
      {loading && <Spinner />}
      {!loading && data && (
        <div className={view === "week" ? "grid gap-3 lg:grid-cols-7" : "grid gap-3"}>
          {dayList.map((d) => {
            const list = byDay.get(d) ?? [];
            const isToday = d === pragueDate();
            return (
              <section key={d} aria-label={fmtDate(d + "T12:00:00Z")} className={view === "week" ? "rounded-xl border border-line bg-white p-2" : ""}>
                <h2 className={`mb-2 text-sm font-semibold capitalize ${isToday ? "text-brand" : ""}`}>
                  {fmtDate(d + "T12:00:00Z", { weekday: "short", day: "numeric", month: "numeric" })}
                  {isToday && <span className="sr-only"> (dnes)</span>}
                </h2>
                {list.length === 0 ? <p className="text-xs text-muted">Žádné rezervace</p> : (
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li key={a.id}>
                        <Link href={`/rezervace/admin/appointments/${a.id}`} className="block rounded-lg border border-line bg-white p-2 text-sm hover:border-brand">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold">{fmtTime(a.startsAt)}–{fmtTime(a.endsAt)}</span>
                            <StateBadge state={a.state} />
                          </div>
                          <div className="truncate">{a.patientName} {a.isNewPatient && <Badge tone="blue">nový</Badge>}</div>
                          <div className="truncate text-xs text-muted">{a.serviceName}</div>
                          <div className="truncate text-xs text-muted">{a.therapistName}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
