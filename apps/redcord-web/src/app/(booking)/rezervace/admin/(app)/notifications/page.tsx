"use client";
import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Card, Field, Select, Spinner } from "@redcord/booking/components/ui";
import { ErrorBox, EVENT_LABEL, NOTIF_LABEL, NotifBadge, PageTitle, useLoad } from "@redcord/booking/components/admin/common";
import { api, fmtDateTime } from "@redcord/booking/lib/client-api";

type Notif = {
  id: string; event: string; status: string; attempts: number; maxAttempts: number; lastError: string | null;
  nextAttemptAt: string; sentAt: string | null; createdAt: string; appointmentId: string | null; requestId: string | null;
  reference: string | null; appointmentVersion: number | null;
};

export default function NotificationsPage() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useLoad<{ notifications: Notif[] }>(`/api/rezervace/admin/notifications${status ? `?status=${status}` : ""}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function retry(id: string) {
    setBusyId(id); setActionError(null); setNotice(null);
    try {
      await api(`/api/rezervace/admin/notifications/${id}/retry`, { method: "POST", body: {} });
      setNotice("Zpráva byla zařazena k novému odeslání (rezervace se nemění).");
      await reload();
    } catch (e) { setActionError(e); } finally { setBusyId(null); }
  }

  return (
    <div>
      <PageTitle>Notifikace</PageTitle>
      <Card className="mb-4 max-w-sm">
        <Field label="Stav">
          {(id) => (
            <Select id={id} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Vše</option>
              {Object.entries(NOTIF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}
        </Field>
      </Card>
      {notice && <div className="mb-3"><Alert kind="success">{notice}</Alert></div>}
      <ErrorBox error={error ?? actionError} />
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th scope="col" className="p-2">Vytvořeno</th>
                <th scope="col" className="p-2">Událost</th>
                <th scope="col" className="p-2">Rezervace / žádost</th>
                <th scope="col" className="p-2">Stav</th>
                <th scope="col" className="p-2">Pokusy</th>
                <th scope="col" className="p-2">Poslední chyba</th>
                <th scope="col" className="p-2"><span className="sr-only">Akce</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.notifications.length === 0 && <tr><td colSpan={7} className="p-3 text-muted">Žádné zprávy.</td></tr>}
              {data?.notifications.map((n) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap p-2">{fmtDateTime(n.createdAt)}</td>
                  <td className="p-2">{EVENT_LABEL[n.event] ?? n.event}{n.appointmentVersion && <span className="text-xs text-muted"> v{n.appointmentVersion}</span>}</td>
                  <td className="p-2">
                    {n.appointmentId ? <Link className="text-brand hover:underline" href={`/rezervace/admin/appointments/${n.appointmentId}`}>{n.reference}</Link> : n.reference}
                  </td>
                  <td className="p-2"><NotifBadge status={n.status} />{n.status === "pending" && n.attempts > 0 && <div className="text-xs text-muted">další pokus {fmtDateTime(n.nextAttemptAt)}</div>}</td>
                  <td className="p-2">{n.attempts}/{n.maxAttempts}</td>
                  <td className="max-w-xs p-2 text-xs text-muted">{n.lastError}</td>
                  <td className="p-2">
                    {(n.status === "failed" || n.status === "skipped") && <Button variant="secondary" busy={busyId === n.id} onClick={() => retry(n.id)}>Odeslat znovu</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
