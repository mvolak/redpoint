"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert, Badge, Button, Card, Field, Select, Spinner } from "@redcord/booking/components/ui";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { StaffSlotChooser, type ChosenSlot } from "@redcord/booking/components/admin/StaffSlotChooser";
import { ErrorBox, EVENT_LABEL, hasRole, isCode, NotifBadge, PageTitle, StateBadge, useLoad } from "@redcord/booking/components/admin/common";
import { api, fmtDateTime, fmtTime, pragueDate } from "@redcord/booking/lib/client-api";
import { formatPrice } from "@redcord/booking/lib/format";

type Detail = {
  id: string; reference: string; state: string; version: number; source: string; startsAt: string; endsAt: string;
  serviceId: string; serviceName: string; therapistId: string; therapistName: string;
  durationMin: number; bufferBeforeMin: number; bufferAfterMin: number; priceMinMinor: number | null; priceMaxMinor: number | null;
  policyVersion: number; cancellationCutoffHours: number;
  patient: { name: string; phone: string; email: string | null; isNewPatient: boolean; emailVerified: boolean };
  notifications: { id: string; event: string; status: string; attempts: number; lastError: string | null; sentAt: string | null; appointmentVersion: number | null }[];
  history: { operation: string; actorType: string; at: string; details: Record<string, unknown> }[];
};
type CatTherapist = { id: string; displayName: string; serviceIds: string[] };

const SOURCE_LABEL: Record<string, string> = { online: "Online", reception: "Recepce", request: "Ze žádosti", import: "Import" };
const OP_LABEL: Record<string, string> = {
  "appointment.create": "Vytvořeno", "appointment.reschedule": "Přesunuto", "appointment.cancel": "Zrušeno",
  "appointment.completed": "Označeno jako proběhlé", "appointment.no_show": "Označeno: nedostavil se",
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const { data: a, error, loading, reload } = useLoad<Detail>(`/api/rezervace/admin/appointments/${id}`);
  const catalogue = useLoad<{ therapists: CatTherapist[] }>(hasRole(me, "reception") ? "/api/rezervace/catalogue" : null);
  const [mode, setMode] = useState<"none" | "reschedule" | "cancel">("none");
  const [newTherapist, setNewTherapist] = useState("");
  const [slot, setSlot] = useState<ChosenSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading && !a) return <Spinner />;
  if (error || !a) return <ErrorBox error={error} />;

  const started = new Date(a.startsAt).getTime() <= Date.now();
  const canManage = hasRole(me, "reception") && a.state === "confirmed";
  const eligible = (catalogue.data?.therapists ?? []).filter((t) => t.serviceIds.includes(a.serviceId));

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true); setActionError(null); setNotice(null);
    try {
      await fn();
      setNotice(success);
      setMode("none");
      setSlot(null);
      await reload();
    } catch (e) {
      setActionError(e);
      if (isCode(e, "stale_version")) await reload();
      if (isCode(e, "slot_unavailable")) { setSlot(null); setRefreshKey((k) => k + 1); }
    } finally { setBusy(false); }
  }

  const reschedule = () => slot && run(() => api(`/api/rezervace/admin/appointments/${a.id}/reschedule`, {
    body: { expectedVersion: a.version, start: slot.start, therapistId: newTherapist || null },
  }), "Termín byl přesunut. Klient dostane e-mail se změnou.");
  const cancel = () => run(() => api(`/api/rezervace/admin/appointments/${a.id}/cancel`, { body: { expectedVersion: a.version } }), "Rezervace byla zrušena.");
  const outcome = (o: "completed" | "no_show") => run(() => api(`/api/rezervace/admin/appointments/${a.id}/outcome`, { body: { expectedVersion: a.version, outcome: o } }), "Stav byl uložen.");
  const retry = (nid: string) => run(() => api(`/api/rezervace/admin/notifications/${nid}/retry`, { method: "POST", body: {} }), "Zpráva byla zařazena k novému odeslání.");

  return (
    <div className="max-w-4xl space-y-4">
      <PageTitle actions={<Link href="/rezervace/admin/calendar" className="text-sm text-brand hover:underline">← Kalendář</Link>}>
        Rezervace {a.reference}
      </PageTitle>
      {notice && <Alert kind="success">{notice}</Alert>}
      <ErrorBox error={actionError} />

      <Card>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Stav</dt><dd><StateBadge state={a.state} /> <span className="text-xs text-muted">verze {a.version}</span></dd></div>
          <div><dt className="text-muted">Termín</dt><dd className="font-semibold capitalize">{fmtDateTime(a.startsAt)}–{fmtTime(a.endsAt)}</dd></div>
          <div><dt className="text-muted">Služba</dt><dd>{a.serviceName} ({a.durationMin} min{a.bufferAfterMin || a.bufferBeforeMin ? `, rezerva ${a.bufferBeforeMin}/${a.bufferAfterMin} min` : ""})</dd></div>
          <div><dt className="text-muted">Terapeut</dt><dd>{a.therapistName}</dd></div>
          <div><dt className="text-muted">Cena (při rezervaci)</dt><dd>{formatPrice(a.priceMinMinor, a.priceMaxMinor) ?? "—"}</dd></div>
          <div><dt className="text-muted">Zdroj</dt><dd>{SOURCE_LABEL[a.source] ?? a.source} · podmínky v{a.policyVersion} (storno {a.cancellationCutoffHours} h)</dd></div>
          <div><dt className="text-muted">Klient</dt><dd>{a.patient.name} {a.patient.isNewPatient && <Badge tone="blue">nový</Badge>}</dd></div>
          <div><dt className="text-muted">Telefon</dt><dd><a className="text-brand hover:underline" href={`tel:${a.patient.phone.replace(/\s/g, "")}`}>{a.patient.phone}</a></dd></div>
          {a.patient.email && <div><dt className="text-muted">E-mail</dt><dd>{a.patient.email} {a.patient.emailVerified ? <Badge tone="green">ověřen</Badge> : <Badge>neověřen</Badge>}</dd></div>}
        </dl>
      </Card>

      {a.state === "confirmed" && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Akce</h2>
          <div className="flex flex-wrap gap-2">
            {canManage && <Button variant={mode === "reschedule" ? "primary" : "secondary"} onClick={() => setMode(mode === "reschedule" ? "none" : "reschedule")}>Přesunout</Button>}
            {canManage && <Button variant="danger" onClick={() => setMode(mode === "cancel" ? "none" : "cancel")}>Zrušit rezervaci</Button>}
            {started && <Button variant="secondary" busy={busy} onClick={() => outcome("completed")}>Proběhlo</Button>}
            {started && <Button variant="secondary" busy={busy} onClick={() => outcome("no_show")}>Nedostavil se</Button>}
            {!started && !canManage && <p className="text-sm text-muted">Výsledek návštěvy lze zaznamenat po začátku termínu.</p>}
          </div>

          {mode === "cancel" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm">Opravdu zrušit rezervaci {a.reference}? Termín se uvolní a klient dostane e-mail o zrušení.</p>
              <div className="mt-2 flex gap-2">
                <Button variant="danger" busy={busy} onClick={cancel}>Ano, zrušit</Button>
                <Button variant="secondary" onClick={() => setMode("none")}>Ne, ponechat</Button>
              </div>
            </div>
          )}

          {mode === "reschedule" && (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <Field label="Terapeut">
                {(fid) => (
                  <Select id={fid} value={newTherapist} onChange={(e) => { setNewTherapist(e.target.value); setSlot(null); }}>
                    <option value="">Ponechat: {a.therapistName}</option>
                    {eligible.filter((t) => t.id !== a.therapistId).map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
                  </Select>
                )}
              </Field>
              <StaffSlotChooser serviceId={a.serviceId} therapistId={newTherapist || a.therapistId} initialDate={pragueDate(a.startsAt)} value={slot} onChange={setSlot} refreshKey={refreshKey} />
              <p className="text-xs text-muted">Nabídka vychází z délky aktuální služby; server ověří termín podle délky a rezerv uložených u této rezervace. Původní termín zůstane zachován, pokud přesun selže.</p>
              <div className="flex gap-2">
                <Button busy={busy} disabled={!slot} onClick={reschedule}>Potvrdit přesun</Button>
                <Button variant="secondary" onClick={() => setMode("none")}>Zpět</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {hasRole(me, "reception") && (
        <Card>
          <h2 className="mb-2 font-semibold">Notifikace</h2>
          {a.notifications.length === 0 ? <p className="text-sm text-muted">Žádné.</p> : (
            <ul className="divide-y divide-line text-sm">
              {a.notifications.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{EVENT_LABEL[n.event] ?? n.event} <span className="text-xs text-muted">(v{n.appointmentVersion ?? "–"}, pokusů {n.attempts})</span></span>
                  <span className="flex items-center gap-2">
                    <NotifBadge status={n.status} />
                    {n.sentAt && <span className="text-xs text-muted">{fmtDateTime(n.sentAt)}</span>}
                    {(n.status === "failed" || n.status === "skipped") && <Button variant="secondary" busy={busy} onClick={() => retry(n.id)}>Odeslat znovu</Button>}
                  </span>
                  {n.lastError && <span className="w-full text-xs text-muted">{n.lastError}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">Historie</h2>
        <ul className="space-y-1 text-sm">
          {a.history.map((h, i) => (
            <li key={i}>
              <span className="text-muted">{fmtDateTime(h.at)}</span> · {OP_LABEL[h.operation] ?? h.operation}
              {" "}<span className="text-xs text-muted">({h.actorType === "staff" ? "personál" : h.actorType === "patient" ? "klient" : "systém"})</span>
              {typeof h.details.toStart === "string" && <span className="text-xs text-muted"> → {fmtDateTime(h.details.toStart)}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
