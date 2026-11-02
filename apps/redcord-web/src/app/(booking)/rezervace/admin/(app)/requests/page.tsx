"use client";
import Link from "next/link";
import { useState } from "react";
import { Alert, Badge, Button, Card, Field, Select, Spinner, Textarea } from "@redcord/booking/components/ui";
import { StaffSlotChooser, type ChosenSlot } from "@redcord/booking/components/admin/StaffSlotChooser";
import { ErrorBox, isCode, PageTitle, useLoad } from "@redcord/booking/components/admin/common";
import { api, fmtDate, fmtDateTime } from "@redcord/booking/lib/client-api";

type Req = {
  id: string; reference: string; state: string; version: number; createdAt: string;
  serviceId: string; serviceName: string; therapistId: string | null; therapistName: string | null;
  preferredFrom: string; preferredTo: string; preferredTimeOfDay: "any" | "morning" | "afternoon"; preferredStart: string | null;
  resolvedAppointmentId: string | null;
  patient: { name: string; email: string; phone: string; isNewPatient: boolean };
};
type CatTherapist = { id: string; displayName: string; serviceIds: string[] };
const TOD = { any: "kdykoli", morning: "dopoledne", afternoon: "odpoledne" };
const TABS = [["pending", "Čekající"], ["resolved", "Vyřízené"], ["declined", "Zamítnuté"]] as const;

export default function RequestsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("pending");
  const { data, error, loading, reload } = useLoad<{ requests: Req[] }>(`/api/rezervace/admin/requests?state=${tab}`);
  const catalogue = useLoad<{ therapists: CatTherapist[] }>("/api/rezervace/catalogue");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div>
      <PageTitle>Žádosti o termín</PageTitle>
      <div role="tablist" aria-label="Stav žádostí" className="mb-4 flex gap-2">
        {TABS.map(([k, label]) => (
          <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "primary" : "secondary"} onClick={() => { setTab(k); setNotice(null); }}>{label}</Button>
        ))}
      </div>
      {notice && <div className="mb-4"><Alert kind="success">{notice}</Alert></div>}
      <ErrorBox error={error} />
      {loading ? <Spinner /> : data?.requests.length === 0 ? <p className="text-sm text-muted">Žádné žádosti.</p> : (
        <div className="space-y-3">
          {data?.requests.map((r) => (
            <RequestCard key={r.id} r={r} therapists={catalogue.data?.therapists ?? []}
              onDone={async (msg) => { setNotice(msg); await reload(); }} onStale={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ r, therapists, onDone, onStale }: { r: Req; therapists: CatTherapist[]; onDone: (msg: string) => Promise<void>; onStale: () => Promise<void> }) {
  const [mode, setMode] = useState<"none" | "resolve" | "decline">("none");
  const [therapistId, setTherapistId] = useState(r.therapistId ?? "");
  const [slot, setSlot] = useState<ChosenSlot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const eligible = therapists.filter((t) => t.serviceIds.includes(r.serviceId));
  // With "first available" the slot tells us who is free; use the first such therapist.
  const effectiveTherapist = therapistId || slot?.therapistIds?.[0] || "";

  async function act(fn: () => Promise<unknown>, msg: string) {
    setBusy(true); setError(null);
    try { await fn(); await onDone(msg); }
    catch (e) {
      setError(e);
      if (isCode(e, "stale_version")) await onStale();
      if (isCode(e, "slot_unavailable")) { setSlot(null); setRefreshKey((k) => k + 1); }
    } finally { setBusy(false); }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{r.reference} · {r.serviceName}</p>
          <p className="text-sm">{r.patient.name} {r.patient.isNewPatient && <Badge tone="blue">nový</Badge>} · <a className="text-brand" href={`tel:${r.patient.phone.replace(/\s/g, "")}`}>{r.patient.phone}</a> · {r.patient.email}</p>
          <p className="text-sm text-muted">
            Preference: {r.preferredStart ? fmtDateTime(r.preferredStart) : `${fmtDate(r.preferredFrom + "T12:00:00Z", { day: "numeric", month: "numeric" })} – ${fmtDate(r.preferredTo + "T12:00:00Z", { day: "numeric", month: "numeric", year: "numeric" })}, ${TOD[r.preferredTimeOfDay]}`}
            {" · "}terapeut: {r.therapistName ?? "kdokoli"}
          </p>
          <p className="text-xs text-muted">Přijato {fmtDateTime(r.createdAt)}</p>
        </div>
        {r.state === "resolved" && r.resolvedAppointmentId && <Link className="text-sm text-brand hover:underline" href={`/rezervace/admin/appointments/${r.resolvedAppointmentId}`}>Zobrazit rezervaci →</Link>}
        {r.state === "pending" && (
          <div className="flex gap-2">
            <Button variant={mode === "resolve" ? "primary" : "secondary"} onClick={() => setMode(mode === "resolve" ? "none" : "resolve")}>Potvrdit termín</Button>
            <Button variant="danger" onClick={() => setMode(mode === "decline" ? "none" : "decline")}>Zamítnout</Button>
          </div>
        )}
      </div>
      <ErrorBox error={error} />
      {mode === "resolve" && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <Field label="Terapeut">
            {(id) => (
              <Select id={id} value={therapistId} onChange={(e) => { setTherapistId(e.target.value); setSlot(null); }}>
                <option value="">Kdokoli volný</option>
                {eligible.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
              </Select>
            )}
          </Field>
          <StaffSlotChooser serviceId={r.serviceId} therapistId={therapistId || null} initialDate={r.preferredFrom} value={slot} onChange={setSlot} refreshKey={refreshKey} />
          {!therapistId && slot?.manual && <Alert kind="warning">U ručně zadaného času vyberte konkrétního terapeuta.</Alert>}
          <Button busy={busy} disabled={!slot || !effectiveTherapist}
            onClick={() => slot && act(() => api(`/api/rezervace/admin/requests/${r.id}/resolve`, { body: { expectedVersion: r.version, therapistId: effectiveTherapist, start: slot.start } }), `Žádost ${r.reference} byla potvrzena jako rezervace. Klient dostane potvrzení e-mailem.`)}>
            Vytvořit rezervaci a potvrdit
          </Button>
        </div>
      )}
      {mode === "decline" && (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <Field label="Zpráva pro klienta" hint="Odejde e-mailem. Neuvádějte zdravotní informace.">
            {(id, d) => <Textarea id={id} aria-describedby={d} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Omlouváme se, v požadovaném období nemáme volný termín. Zavolejte nám prosím…" />}
          </Field>
          <div className="flex gap-2">
            <Button variant="danger" busy={busy} disabled={message.trim().length < 5}
              onClick={() => act(() => api(`/api/rezervace/admin/requests/${r.id}/decline`, { body: { expectedVersion: r.version, message } }), `Žádost ${r.reference} byla zamítnuta.`)}>
              Zamítnout a odeslat zprávu
            </Button>
            <Button variant="secondary" onClick={() => setMode("none")}>Zpět</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
