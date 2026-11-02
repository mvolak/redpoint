"use client";
import Link from "next/link";
import { Alert, Spinner } from "@redcord/booking/components/ui";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { ErrorBox, PageTitle, useLoad } from "@redcord/booking/components/admin/common";
import { fmtDateTime } from "@redcord/booking/lib/client-api";

type Ev = { id: string; at: string; actorType: string; actor: string; operation: string; recordType: string; recordId: string | null; details: Record<string, unknown> };

export default function AuditPage() {
  const me = useMe();
  const { data, error, loading } = useLoad<{ events: Ev[] }>(me.role === "admin" ? "/api/rezervace/admin/audit" : null);
  if (me.role !== "admin") return <Alert kind="error">Tato sekce je jen pro administrátory.</Alert>;
  return (
    <div>
      <PageTitle>Auditní záznam</PageTitle>
      <ErrorBox error={error} />
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr><th scope="col" className="p-2">Čas</th><th scope="col" className="p-2">Kdo</th><th scope="col" className="p-2">Operace</th><th scope="col" className="p-2">Záznam</th><th scope="col" className="p-2">Detaily</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.events.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap p-2">{fmtDateTime(e.at)}</td>
                  <td className="p-2">{e.actor}</td>
                  <td className="p-2 font-mono text-xs">{e.operation}</td>
                  <td className="p-2 text-xs">
                    {e.recordType === "appointment" && e.recordId ? <Link className="text-brand hover:underline" href={`/rezervace/admin/appointments/${e.recordId}`}>rezervace</Link> : e.recordType}
                  </td>
                  <td className="max-w-md p-2 font-mono text-xs text-muted break-all">{JSON.stringify(e.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
