"use client";
import { useState } from "react";
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from "@redcord/booking/components/ui";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { ErrorBox, isCode, PageTitle, ROLE_LABEL, useLoad, type TherapistLite } from "@redcord/booking/components/admin/common";
import { api } from "@redcord/booking/lib/client-api";

type Staff = { id: string; email: string; displayName: string; role: "therapist" | "reception" | "admin"; therapistId: string | null; active: boolean; authSubject: string | null; version: number };
type Form = Omit<Staff, "id" | "version"> & { id?: string; version?: number };

const EMPTY: Form = { email: "", displayName: "", role: "reception", therapistId: null, active: true, authSubject: "" };

export default function StaffPage() {
  const me = useMe();
  const { data, error, loading, reload } = useLoad<{ staff: Staff[] }>(me.role === "admin" ? "/api/rezervace/admin/staff" : null);
  const therapists = useLoad<{ therapists: TherapistLite[] }>("/api/rezervace/admin/therapists");
  const [editing, setEditing] = useState<Form | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (me.role !== "admin") return <Alert kind="error">Tato sekce je jen pro administrátory.</Alert>;
  const tName = (id: string | null) => therapists.data?.therapists.find((t) => t.id === id)?.displayName ?? "—";

  return (
    <div className="space-y-4">
      <PageTitle actions={!editing && <Button onClick={() => { setEditing({ ...EMPTY }); setNotice(null); }}>+ Přidat osobu</Button>}>Personál a role</PageTitle>
      {notice && <Alert kind="success">{notice}</Alert>}
      {editing && (
        <StaffForm initial={editing} therapists={therapists.data?.therapists ?? []} onCancel={() => setEditing(null)}
          onSaved={async (msg) => { setEditing(null); setNotice(msg); await reload(); }} onStale={reload} />
      )}
      <ErrorBox error={error} />
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr><th scope="col" className="p-2">Jméno</th><th scope="col" className="p-2">E-mail</th><th scope="col" className="p-2">Role</th><th scope="col" className="p-2">Terapeut</th><th scope="col" className="p-2">Stav</th><th scope="col" className="p-2"><span className="sr-only">Akce</span></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.staff.map((s) => (
                <tr key={s.id}>
                  <td className="p-2">{s.displayName}</td>
                  <td className="p-2">{s.email}</td>
                  <td className="p-2">{ROLE_LABEL[s.role]}</td>
                  <td className="p-2">{s.role === "therapist" ? tName(s.therapistId) : "—"}</td>
                  <td className="p-2">{s.active ? <Badge tone="green">aktivní</Badge> : <Badge>neaktivní</Badge>}</td>
                  <td className="p-2"><Button variant="secondary" onClick={() => { setEditing({ ...s, authSubject: s.authSubject ?? "" }); setNotice(null); }}>Upravit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">„Auth subject“ je ID uživatele ve správci přihlášení (Supabase Auth). Změny rolí se zapisují do auditu.</p>
    </div>
  );
}

function StaffForm({ initial, therapists, onCancel, onSaved, onStale }: { initial: Form; therapists: TherapistLite[]; onCancel: () => void; onSaved: (msg: string) => Promise<void>; onStale: () => Promise<void> }) {
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const payload = {
      email: f.email, displayName: f.displayName, role: f.role, therapistId: f.role === "therapist" ? f.therapistId : null,
      active: f.active, authSubject: f.authSubject ? f.authSubject : null,
      ...(f.id ? { expectedVersion: f.version } : {}),
    };
    try {
      if (f.id) await api(`/api/rezervace/admin/staff/${f.id}`, { method: "PUT", body: payload });
      else await api("/api/rezervace/admin/staff", { body: payload });
      await onSaved(f.id ? "Profil byl upraven." : "Osoba byla přidána.");
    } catch (err) {
      setError(err);
      if (isCode(err, "stale_version")) await onStale();
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{f.id ? "Upravit profil" : "Nová osoba"}</h2>
        <Field label="Jméno">{(id) => <Input id={id} value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required />}</Field>
        <Field label="E-mail">{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />}</Field>
        <Field label="Role">
          {(id) => (
            <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Form["role"] })}>
              <option value="therapist">Terapeut</option><option value="reception">Recepce</option><option value="admin">Administrátor</option>
            </Select>
          )}
        </Field>
        {f.role === "therapist" && (
          <Field label="Profil terapeuta">
            {(id) => (
              <Select id={id} value={f.therapistId ?? ""} onChange={(e) => setF({ ...f, therapistId: e.target.value || null })} required>
                <option value="">— vyberte —</option>
                {therapists.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
              </Select>
            )}
          </Field>
        )}
        <Field label="Auth subject (ID v Supabase Auth)">{(id) => <Input id={id} value={f.authSubject ?? ""} onChange={(e) => setF({ ...f, authSubject: e.target.value })} />}</Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Aktivní</label>
        <div className="sm:col-span-2"><ErrorBox error={error} /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" busy={busy}>Uložit</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Zrušit</Button>
        </div>
      </form>
    </Card>
  );
}
