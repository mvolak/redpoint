"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, Spinner, Textarea } from "@redcord/booking/components/ui";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { ErrorBox, isCode, PageTitle, useLoad } from "@redcord/booking/components/admin/common";
import { api } from "@redcord/booking/lib/client-api";

type Settings = { publicMode: "automatic" | "request_only" | "paused"; pausedMessage: string | null; receptionPhone: string | null; receptionEmail: string | null; version: number };
type Policy = { version: number; cancellationCutoffHours: number; termsText: string };

const MODES = [
  { v: "automatic", label: "Automatické rezervace", desc: "Pacienti si online rezervují konkrétní volný termín, který je okamžitě potvrzen." },
  { v: "request_only", label: "Pouze žádosti", desc: "Pacienti posílají žádost o termín, recepce ji ručně potvrdí. Žádost není potvrzená rezervace." },
  { v: "paused", label: "Pozastaveno", desc: "Online objednávání je vypnuté, zobrazí se zpráva a kontakt na recepci." },
] as const;

export default function SettingsPage() {
  const me = useMe();
  const { data, error, loading, reload } = useLoad<{ settings: Settings; policy: Policy }>("/api/rezervace/admin/settings");
  const [form, setForm] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (data) setForm(data.settings); }, [data]);

  if (loading && !data) return <Spinner />;
  if (!data || !form) return <ErrorBox error={error} />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setSaveError(null); setNotice(null);
    try {
      await api("/api/rezervace/admin/settings", {
        method: "PUT",
        body: { expectedVersion: form.version, publicMode: form.publicMode, pausedMessage: form.pausedMessage || null, receptionPhone: form.receptionPhone || null, receptionEmail: form.receptionEmail || null },
      });
      setNotice("Nastavení bylo uloženo.");
      await reload();
    } catch (err) {
      setSaveError(err);
      if (isCode(err, "stale_version")) await reload();
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle>Nastavení</PageTitle>
      {notice && <Alert kind="success">{notice}</Alert>}
      <form onSubmit={save}>
        <Card className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="font-semibold">Režim online objednávání</legend>
            {MODES.map((m) => (
              <label key={m.v} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand">
                <input type="radio" name="mode" value={m.v} checked={form.publicMode === m.v} onChange={() => setForm({ ...form, publicMode: m.v })} className="mt-1" />
                <span><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-muted">{m.desc}</span></span>
              </label>
            ))}
          </fieldset>
          <Alert kind="warning">
            Produkční provoz začíná v režimu „Pouze žádosti“. Automatické potvrzování zapněte až po převzetí a odsouhlasení stávajících rezervací recepcí.
          </Alert>
          <Field label="Zpráva při pozastavení">
            {(id) => <Textarea id={id} value={form.pausedMessage ?? ""} maxLength={500} onChange={(e) => setForm({ ...form, pausedMessage: e.target.value })} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefon recepce">{(id) => <Input id={id} type="tel" value={form.receptionPhone ?? ""} onChange={(e) => setForm({ ...form, receptionPhone: e.target.value })} />}</Field>
            <Field label="E-mail recepce">{(id) => <Input id={id} type="email" value={form.receptionEmail ?? ""} onChange={(e) => setForm({ ...form, receptionEmail: e.target.value })} />}</Field>
          </div>
          <ErrorBox error={saveError} />
          <Button type="submit" busy={busy}>Uložit nastavení</Button>
        </Card>
      </form>
      <PolicyCard policy={data.policy} canPublish={me.role === "admin"} onPublished={async () => { setNotice("Nová verze podmínek byla zveřejněna."); await reload(); }} />
    </div>
  );
}

function PolicyCard({ policy, canPublish, onPublished }: { policy: Policy; canPublish: boolean; onPublished: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [cutoff, setCutoff] = useState(String(policy.cancellationCutoffHours));
  const [text, setText] = useState(policy.termsText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function publish() {
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/admin/settings", { body: { cancellationCutoffHours: Number(cutoff), termsText: text } });
      setOpen(false);
      await onPublished();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Podmínky rezervace – verze {policy.version}</h2>
      <p className="text-sm">Online změna/zrušení nejpozději <strong>{policy.cancellationCutoffHours} h</strong> před termínem (počítáno v uplynulých hodinách).</p>
      <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs">{policy.termsText}</pre>
      {canPublish && !open && <Button variant="secondary" onClick={() => setOpen(true)}>Vydat novou verzi</Button>}
      {canPublish && open && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <Field label="Lhůta pro online změnu/zrušení (hodiny)">{(id) => <Input id={id} type="number" min={0} max={336} value={cutoff} onChange={(e) => setCutoff(e.target.value)} />}</Field>
          <Field label="Text podmínek" hint="Používejte jen klinikou schválené znění.">{(id, d) => <Textarea id={id} aria-describedby={d} className="min-h-40" value={text} onChange={(e) => setText(e.target.value)} />}</Field>
          <Alert kind="info">Nové rezervace budou vyžadovat potvrzení nové verze. Stávající rezervace si ponechávají podmínky platné v době rezervace.</Alert>
          <div className="flex gap-2">
            <Button busy={busy} onClick={publish}>Zveřejnit verzi {policy.version + 1}</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Zpět</Button>
          </div>
        </div>
      )}
      <ErrorBox error={error} />
    </Card>
  );
}
