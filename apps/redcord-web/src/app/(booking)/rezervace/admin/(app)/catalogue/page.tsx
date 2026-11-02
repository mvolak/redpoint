"use client";
import { useState } from "react";
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from "@redcord/booking/components/ui";
import { useMe } from "@redcord/booking/components/admin/AdminShell";
import { ErrorBox, kcToMinor, minorToKc, PageTitle, useLoad } from "@redcord/booking/components/admin/common";
import { api } from "@redcord/booking/lib/client-api";
import { formatPrice } from "@redcord/booking/lib/format";

type Service = {
  id: string; slug: string; name: string; description: string | null; firstVisitInfo: string | null; active: boolean;
  durationMin: number; bufferBeforeMin: number; bufferAfterMin: number; priceMinMinor: number | null; priceMaxMinor: number | null;
  bookingMode: "automatic" | "request_only"; newPatients: "allowed" | "not_allowed" | "only"; requiresReview: boolean;
  minLeadMinutes: number; horizonDays: number; slotStepMin: number;
};
type Therapist = { id: string; displayName: string; active: boolean };
type Link = { therapistId: string; serviceId: string; active: boolean; durationMinOverride: number | null; priceMinOverride: number | null; priceMaxOverride: number | null };

export default function CataloguePage() {
  const me = useMe();
  const { data, error, loading, reload } = useLoad<{ services: Service[]; therapists: Therapist[]; matrix: Link[] }>("/api/rezervace/admin/catalogue");
  const [notice, setNotice] = useState<string | null>(null);
  if (me.role !== "admin") return <Alert kind="error">Tato sekce je jen pro administrátory.</Alert>;
  if (loading && !data) return <Spinner />;
  if (!data) return <ErrorBox error={error} />;
  const done = async (msg: string) => { setNotice(msg); await reload(); };

  return (
    <div className="max-w-5xl space-y-4">
      <PageTitle>Katalog služeb</PageTitle>
      <Alert kind="info">Změny platí jen pro nové rezervace. Existující rezervace si ponechávají délku, rezervy a cenu z okamžiku rezervace.</Alert>
      {notice && <Alert kind="success">{notice}</Alert>}
      {data.services.map((s) => (
        <ServiceCard key={s.id + s.durationMin + s.name + s.active + s.priceMinMinor} s={s} therapists={data.therapists} links={data.matrix.filter((m) => m.serviceId === s.id)} onDone={done} />
      ))}
    </div>
  );
}

function ServiceCard({ s, therapists, links, onDone }: { s: Service; therapists: Therapist[]; links: Link[]; onDone: (msg: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: s.name, description: s.description ?? "", firstVisitInfo: s.firstVisitInfo ?? "", active: s.active,
    durationMin: String(s.durationMin), bufferBeforeMin: String(s.bufferBeforeMin), bufferAfterMin: String(s.bufferAfterMin),
    priceMin: minorToKc(s.priceMinMinor), priceMax: minorToKc(s.priceMaxMinor), bookingMode: s.bookingMode, newPatients: s.newPatients,
    requiresReview: s.requiresReview, minLeadMinutes: String(s.minLeadMinutes), horizonDays: String(s.horizonDays), slotStepMin: String(s.slotStepMin),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api(`/api/rezervace/admin/catalogue/services/${s.id}`, {
        method: "PATCH",
        body: {
          name: f.name, description: f.description || null, firstVisitInfo: f.firstVisitInfo || null, active: f.active,
          durationMin: Number(f.durationMin), bufferBeforeMin: Number(f.bufferBeforeMin), bufferAfterMin: Number(f.bufferAfterMin),
          priceMinMinor: kcToMinor(f.priceMin), priceMaxMinor: kcToMinor(f.priceMax),
          bookingMode: f.bookingMode, newPatients: f.newPatients, requiresReview: f.requiresReview,
          minLeadMinutes: Number(f.minLeadMinutes), horizonDays: Number(f.horizonDays), slotStepMin: Number(f.slotStepMin),
        },
      });
      setOpen(false);
      await onDone(`Služba „${f.name}“ byla uložena.`);
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  const num = (k: keyof typeof f, label: string, hint?: string) => (
    <Field label={label} hint={hint}>{(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}</Field>
  );

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{s.name} {!s.active && <Badge>neaktivní</Badge>} {(s.bookingMode === "request_only" || s.requiresReview) && <Badge tone="amber">jen žádost</Badge>}</h2>
          <p className="text-sm text-muted">{s.durationMin} min · rezervy {s.bufferBeforeMin}/{s.bufferAfterMin} min · {formatPrice(s.priceMinMinor, s.priceMaxMinor) ?? "bez ceny"} · /{s.slug}</p>
        </div>
        <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Zavřít" : "Upravit"}</Button>
      </div>
      {open && (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3"><Field label="Název">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field></div>
          <div className="sm:col-span-3"><Field label="Popis">{(id) => <Textarea id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field></div>
          <div className="sm:col-span-3"><Field label="Informace k první návštěvě">{(id) => <Textarea id={id} value={f.firstVisitInfo} onChange={(e) => setF({ ...f, firstVisitInfo: e.target.value })} />}</Field></div>
          {num("durationMin", "Délka (min)")}
          {num("bufferBeforeMin", "Rezerva před (min)")}
          {num("bufferAfterMin", "Rezerva po (min)")}
          <Field label="Cena od (Kč)" hint="Pevná cena: vyplňte jen toto pole.">{(id, d) => <Input id={id} aria-describedby={d} inputMode="decimal" value={f.priceMin} onChange={(e) => setF({ ...f, priceMin: e.target.value })} />}</Field>
          <Field label="Cena do (Kč)" hint="Pro cenové rozpětí.">{(id, d) => <Input id={id} aria-describedby={d} inputMode="decimal" value={f.priceMax} onChange={(e) => setF({ ...f, priceMax: e.target.value })} />}</Field>
          <Field label="Krok nabídky (min)">
            {(id) => <Select id={id} value={f.slotStepMin} onChange={(e) => setF({ ...f, slotStepMin: e.target.value })}>{[5, 10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>{n}</option>)}</Select>}
          </Field>
          {num("minLeadMinutes", "Minimální předstih (min)")}
          {num("horizonDays", "Horizont rezervace (dny)")}
          <Field label="Režim">
            {(id) => <Select id={id} value={f.bookingMode} onChange={(e) => setF({ ...f, bookingMode: e.target.value as Service["bookingMode"] })}><option value="automatic">Automatická rezervace</option><option value="request_only">Pouze žádost</option></Select>}
          </Field>
          <Field label="Noví klienti">
            {(id) => <Select id={id} value={f.newPatients} onChange={(e) => setF({ ...f, newPatients: e.target.value as Service["newPatients"] })}><option value="allowed">Povoleni</option><option value="not_allowed">Jen stávající klienti</option><option value="only">Jen noví klienti</option></Select>}
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.requiresReview} onChange={(e) => setF({ ...f, requiresReview: e.target.checked })} /> Vyžaduje posouzení recepcí</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Aktivní</label>
          <div className="sm:col-span-3"><ErrorBox error={error} /></div>
          <div className="sm:col-span-3"><Button type="submit" busy={busy}>Uložit službu</Button></div>
        </form>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-medium">Terapeuti pro tuto službu ({links.filter((l) => l.active).length})</summary>
        <ul className="mt-2 space-y-2">
          {therapists.map((t) => (
            <MatrixRow key={t.id + JSON.stringify(links.find((l) => l.therapistId === t.id) ?? null)} t={t} serviceId={s.id} link={links.find((l) => l.therapistId === t.id)} onDone={onDone} />
          ))}
        </ul>
      </details>
    </Card>
  );
}

function MatrixRow({ t, serviceId, link, onDone }: { t: Therapist; serviceId: string; link?: Link; onDone: (msg: string) => Promise<void> }) {
  const [active, setActive] = useState(link?.active ?? false);
  const [dur, setDur] = useState(link?.durationMinOverride ? String(link.durationMinOverride) : "");
  const [pMin, setPMin] = useState(minorToKc(link?.priceMinOverride));
  const [pMax, setPMax] = useState(minorToKc(link?.priceMaxOverride));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/admin/catalogue", {
        method: "PUT",
        body: { therapistId: t.id, serviceId, active, durationMinOverride: dur ? Number(dur) : null, priceMinOverride: kcToMinor(pMin), priceMaxOverride: kcToMinor(pMax) },
      });
      await onDone(`Nastavení pro ${t.displayName} bylo uloženo.`);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <li className="rounded-lg border border-line p-2">
      <div className="grid gap-2 sm:grid-cols-5 sm:items-end">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> {t.displayName}{!t.active && " (neaktivní)"}</label>
        <Field label="Délka – výjimka (min)">{(id) => <Input id={id} type="number" min={5} value={dur} onChange={(e) => setDur(e.target.value)} placeholder="výchozí" />}</Field>
        <Field label="Cena od – výjimka (Kč)">{(id) => <Input id={id} inputMode="decimal" value={pMin} onChange={(e) => setPMin(e.target.value)} placeholder="výchozí" />}</Field>
        <Field label="Cena do – výjimka (Kč)">{(id) => <Input id={id} inputMode="decimal" value={pMax} onChange={(e) => setPMax(e.target.value)} placeholder="výchozí" />}</Field>
        <Button variant="secondary" busy={busy} onClick={save}>Uložit</Button>
      </div>
      <ErrorBox error={error} />
    </li>
  );
}
