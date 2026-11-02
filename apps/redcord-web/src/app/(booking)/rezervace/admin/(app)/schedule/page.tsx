"use client";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from "@redcord/booking/components/ui";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { ErrorBox, hasRole, PageTitle, useLoad, WEEKDAYS, type TherapistLite } from "@redcord/booking/components/admin/common";
import { api, fmtDate, fmtDateTime, fmtTime, pragueDate, pragueLocalToIso } from "@redcord/booking/lib/client-api";

type Hours = { id: string; weekday: number; startLocal: string; endLocal: string; validFrom: string | null; validTo: string | null };
type Exc = { id: string; therapistId: string | null; date: string; kind: "closed" | "custom_hours"; startLocal: string | null; endLocal: string | null; note: string | null };
type Block = { id: string; startsAt: string; endsAt: string; kind: "block" | "break" | "leave"; note: string | null };
type Schedule = { hours: Hours[]; exceptions: Exc[]; blocks: Block[] };
type Rule = { weekday: number; start: string; end: string; validFrom: string; validTo: string };

const BLOCK_LABEL = { block: "Blokace", break: "Přestávka", leave: "Nepřítomnost" };
const hm = (t: string | null) => (t ?? "").slice(0, 5);

export default function SchedulePage() {
  const me = useMe();
  const therapists = useLoad<{ therapists: TherapistLite[] }>("/api/rezervace/admin/therapists");
  const [therapistId, setTherapistId] = useState("");
  useEffect(() => {
    if (!therapistId && therapists.data?.therapists[0]) setTherapistId(me.therapistId ?? therapists.data.therapists[0].id);
  }, [therapists.data, therapistId, me.therapistId]);
  const sched = useLoad<Schedule>(therapistId ? `/api/rezervace/admin/schedule/${therapistId}` : null);
  const [notice, setNotice] = useState<string | null>(null);

  const canEdit = hasRole(me, "reception");
  const reload = async (msg?: string) => { setNotice(msg ?? null); await sched.reload(); };

  return (
    <div className="space-y-4">
      <PageTitle>Rozvrh</PageTitle>
      {me.role !== "therapist" && (
        <Card>
          <Field label="Terapeut">
            {(id) => (
              <Select id={id} value={therapistId} onChange={(e) => { setTherapistId(e.target.value); setNotice(null); }}>
                {therapists.data?.therapists.map((t) => <option key={t.id} value={t.id}>{t.displayName}{t.active ? "" : " (neaktivní)"}</option>)}
              </Select>
            )}
          </Field>
        </Card>
      )}
      {notice && <Alert kind="success">{notice}</Alert>}
      <ErrorBox error={therapists.error ?? sched.error} />
      {sched.loading || !sched.data ? <Spinner /> : (
        <>
          <HoursEditor key={therapistId + sched.data.hours.map((h) => h.id).join()} therapistId={therapistId} hours={sched.data.hours} editable={me.role === "admin"} onSaved={() => reload("Pracovní doba byla uložena.")} />
          <Exceptions therapistId={therapistId} items={sched.data.exceptions} editable={canEdit} onChanged={reload} />
          <Blocks therapistId={therapistId} items={sched.data.blocks} editable={canEdit} onChanged={reload} />
        </>
      )}
    </div>
  );
}

function HoursEditor({ therapistId, hours, editable, onSaved }: { therapistId: string; hours: Hours[]; editable: boolean; onSaved: () => Promise<void> }) {
  const [rules, setRules] = useState<Rule[]>(hours.map((h) => ({ weekday: h.weekday, start: hm(h.startLocal), end: hm(h.endLocal), validFrom: h.validFrom ?? "", validTo: h.validTo ?? "" })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (i: number, patch: Partial<Rule>) => setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    setBusy(true); setError(null);
    try {
      await api(`/api/rezervace/admin/schedule/${therapistId}`, {
        method: "PUT",
        body: { rules: rules.map((r) => ({ weekday: r.weekday, start: r.start, end: r.end, validFrom: r.validFrom || null, validTo: r.validTo || null })) },
      });
      await onSaved();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  const sorted = [...hours].sort((a, b) => a.weekday - b.weekday || a.startLocal.localeCompare(b.startLocal));
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Týdenní pracovní doba <span className="text-xs font-normal text-muted">(místní čas Praha)</span></h2>
      {!editable ? (
        sorted.length === 0 ? <p className="text-sm text-muted">Nenastaveno.</p> : (
          <ul className="text-sm">
            {sorted.map((h) => (
              <li key={h.id}>{WEEKDAYS[h.weekday]}: {hm(h.startLocal)}–{hm(h.endLocal)}{(h.validFrom || h.validTo) && <span className="text-muted"> (platí {h.validFrom ?? "…"} – {h.validTo ?? "…"})</span>}</li>
            ))}
          </ul>
        )
      ) : (
        <>
          <div className="space-y-2">
            {rules.map((r, i) => (
              <fieldset key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-2 sm:grid-cols-6 sm:items-end">
                <legend className="sr-only">Pravidlo {i + 1}</legend>
                <Field label="Den">{(id) => <Select id={id} value={r.weekday} onChange={(e) => set(i, { weekday: Number(e.target.value) })}>{WEEKDAYS.slice(1).map((d, k) => <option key={k} value={k + 1}>{d}</option>)}</Select>}</Field>
                <Field label="Od">{(id) => <Input id={id} type="time" value={r.start} onChange={(e) => set(i, { start: e.target.value })} />}</Field>
                <Field label="Do">{(id) => <Input id={id} type="time" value={r.end} onChange={(e) => set(i, { end: e.target.value })} />}</Field>
                <Field label="Platí od">{(id) => <Input id={id} type="date" value={r.validFrom} onChange={(e) => set(i, { validFrom: e.target.value })} />}</Field>
                <Field label="Platí do">{(id) => <Input id={id} type="date" value={r.validTo} onChange={(e) => set(i, { validTo: e.target.value })} />}</Field>
                <Button variant="ghost" type="button" onClick={() => setRules((x) => x.filter((_, j) => j !== i))} aria-label={`Odebrat pravidlo ${i + 1}`}>Odebrat</Button>
              </fieldset>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => setRules((x) => [...x, { weekday: 1, start: "09:00", end: "17:00", validFrom: "", validTo: "" }])}>+ Přidat okno</Button>
            <Button busy={busy} onClick={save}>Uložit pracovní dobu</Button>
          </div>
          <p className="text-xs text-muted">Změnu, která by zneplatnila potvrzené rezervace, systém odmítne – nejprve je přesuňte.</p>
        </>
      )}
      <ErrorBox error={error} />
    </Card>
  );
}

function Exceptions({ therapistId, items, editable, onChanged }: { therapistId: string; items: Exc[]; editable: boolean; onChanged: (msg?: string) => Promise<void> }) {
  const [date, setDate] = useState(pragueDate());
  const [kind, setKind] = useState<"closed" | "custom_hours">("closed");
  const [scope, setScope] = useState<"therapist" | "clinic">("therapist");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true); setError(null);
    try { await fn(); await onChanged(msg); } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Výjimky (dovolená, zavřeno, jiná pracovní doba)</h2>
      {items.length === 0 ? <p className="text-sm text-muted">Žádné nadcházející výjimky.</p> : (
        <ul className="divide-y divide-line text-sm">
          {items.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="capitalize">
                {fmtDate(x.date + "T12:00:00Z")} · {x.kind === "closed" ? "Zavřeno / nepřítomnost" : `Pracovní doba ${hm(x.startLocal)}–${hm(x.endLocal)}`}
                {x.therapistId === null && <> {" "}<Badge tone="amber">celá klinika</Badge></>}
                {x.note && <span className="text-muted"> – {x.note}</span>}
              </span>
              {editable && <Button variant="ghost" busy={busy} onClick={() => run(() => api(`/api/rezervace/admin/schedule/exceptions/${x.id}`, { method: "DELETE" }), "Výjimka byla odstraněna.")}>Odstranit</Button>}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-3 sm:items-end" onSubmit={(e) => {
          e.preventDefault();
          void run(() => api("/api/rezervace/admin/schedule/exceptions", {
            body: { therapistId: scope === "clinic" ? null : therapistId, date, kind: scope === "clinic" ? "closed" : kind, start: kind === "custom_hours" && scope !== "clinic" ? start : null, end: kind === "custom_hours" && scope !== "clinic" ? end : null, note: note || null },
          }), "Výjimka byla přidána.");
        }}>
          <Field label="Datum">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>
          <Field label="Platí pro">{(id) => <Select id={id} value={scope} onChange={(e) => setScope(e.target.value as "therapist" | "clinic")}><option value="therapist">Tohoto terapeuta</option><option value="clinic">Celou kliniku (zavřeno)</option></Select>}</Field>
          {scope === "therapist" && <Field label="Typ">{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as "closed" | "custom_hours")}><option value="closed">Celý den volno</option><option value="custom_hours">Jiná pracovní doba</option></Select>}</Field>}
          {scope === "therapist" && kind === "custom_hours" && (
            <>
              <Field label="Od">{(id) => <Input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
              <Field label="Do">{(id) => <Input id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
            </>
          )}
          <Field label="Poznámka (interní, bez osobních údajů)">{(id) => <Input id={id} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />}</Field>
          <Button type="submit" busy={busy}>Přidat výjimku</Button>
        </form>
      )}
      <ErrorBox error={error} />
    </Card>
  );
}

function Blocks({ therapistId, items, editable, onChanged }: { therapistId: string; items: Block[]; editable: boolean; onChanged: (msg?: string) => Promise<void> }) {
  const [date, setDate] = useState(pragueDate());
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("12:30");
  const [kind, setKind] = useState<Block["kind"]>("break");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true); setError(null);
    try { await fn(); await onChanged(msg); } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Blokace času (přestávky, ruční blokace)</h2>
      {items.length === 0 ? <p className="text-sm text-muted">Žádné blokace.</p> : (
        <ul className="divide-y divide-line text-sm">
          {items.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="capitalize">{fmtDateTime(b.startsAt)}–{fmtTime(b.endsAt)} · {BLOCK_LABEL[b.kind]}{b.note && <span className="text-muted"> – {b.note}</span>}</span>
              {editable && <Button variant="ghost" busy={busy} onClick={() => run(() => api(`/api/rezervace/admin/schedule/blocks/${b.id}`, { method: "DELETE" }), "Blokace byla odstraněna.")}>Odstranit</Button>}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-3 sm:items-end" onSubmit={(e) => {
          e.preventDefault();
          void run(() => api("/api/rezervace/admin/schedule/blocks", {
            body: { therapistId, start: pragueLocalToIso(date, start), end: pragueLocalToIso(date, end), kind, note: note || null },
          }), "Blokace byla přidána.");
        }}>
          <Field label="Datum">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>
          <Field label="Od">{(id) => <Input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} required />}</Field>
          <Field label="Do">{(id) => <Input id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />}</Field>
          <Field label="Typ">{(id) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as Block["kind"])}><option value="break">Přestávka</option><option value="block">Blokace</option><option value="leave">Nepřítomnost</option></Select>}</Field>
          <Field label="Poznámka (interní)">{(id) => <Input id={id} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />}</Field>
          <Button type="submit" busy={busy}>Přidat blokaci</Button>
        </form>
      )}
      <p className="text-xs text-muted">Blokace se nesmí překrývat s rezervací – při kolizi systém zobrazí dotčené rezervace.</p>
      <ErrorBox error={error} />
    </Card>
  );
}
