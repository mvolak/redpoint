"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, Spinner } from "@redcord/booking/components/ui";
import { StaffSlotChooser, type ChosenSlot } from "@redcord/booking/components/admin/StaffSlotChooser";
import { ErrorBox, isCode, PageTitle, useLoad, type TherapistLite } from "@redcord/booking/components/admin/common";
import { api, newIdempotencyKey } from "@redcord/booking/lib/client-api";
import { formatPrice } from "@redcord/booking/lib/format";

type CatService = { id: string; name: string; durationMin: number; priceMinMinor: number | null; priceMaxMinor: number | null; bookingMode: string; newPatients: string };
type CatTherapist = { id: string; displayName: string; serviceIds: string[] };

export default function NewAppointmentPage() {
  const router = useRouter();
  const catalogue = useLoad<{ services: CatService[]; therapists: CatTherapist[] }>("/api/rezervace/catalogue");
  const staffTherapists = useLoad<{ therapists: TherapistLite[] }>("/api/rezervace/admin/therapists");
  const [serviceId, setServiceId] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [slot, setSlot] = useState<ChosenSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // One idempotency key per logical submission; regenerated when the payload changes.
  const keyRef = useRef<{ key: string; payload: string } | null>(null);

  if (catalogue.loading) return <Spinner />;
  const services = catalogue.data?.services ?? [];
  const svc = services.find((s) => s.id === serviceId);
  const eligible = (catalogue.data?.therapists ?? []).filter((t) => t.serviceIds.includes(serviceId));
  const nameOf = (id: string) => staffTherapists.data?.therapists.find((t) => t.id === id)?.displayName ?? eligible.find((t) => t.id === id)?.displayName ?? id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || !serviceId) return;
    const body = {
      serviceId, therapistId: therapistId || null, start: slot.start,
      contact: { name, email, phone, isNewPatient: isNew },
    };
    const payload = JSON.stringify(body);
    if (!keyRef.current || keyRef.current.payload !== payload) keyRef.current = { key: newIdempotencyKey(), payload };
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ appointmentId: string }>("/api/rezervace/admin/appointments", { body: { ...body, idempotencyKey: keyRef.current.key } });
      router.push(`/rezervace/admin/appointments/${r.appointmentId}`);
    } catch (err) {
      setError(err);
      if (isCode(err, "slot_unavailable")) { setSlot(null); setRefreshKey((k) => k + 1); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle>Nová rezervace</PageTitle>
      <ErrorBox error={catalogue.error} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Card className="space-y-4">
          <h2 className="font-semibold">1. Služba a terapeut</h2>
          <Field label="Služba">
            {(id) => (
              <Select id={id} value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTherapistId(""); setSlot(null); }} required>
                <option value="">— vyberte —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>)}
              </Select>
            )}
          </Field>
          {svc && (
            <p className="text-sm text-muted">
              Cena: {formatPrice(svc.priceMinMinor, svc.priceMaxMinor) ?? "neuvedena"}
              {svc.newPatients === "not_allowed" && " · pouze stávající klienti"}
              {svc.newPatients === "only" && " · pouze noví klienti"}
            </p>
          )}
          <Field label="Terapeut">
            {(id) => (
              <Select id={id} value={therapistId} onChange={(e) => { setTherapistId(e.target.value); setSlot(null); }} disabled={!serviceId}>
                <option value="">První volný</option>
                {eligible.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
              </Select>
            )}
          </Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-semibold">2. Termín</h2>
          <StaffSlotChooser serviceId={serviceId || null} therapistId={therapistId || null} value={slot} onChange={setSlot} refreshKey={refreshKey} />
          {slot?.therapistIds && !therapistId && (
            <p className="text-xs text-muted">Volní terapeuti: {slot.therapistIds.map(nameOf).join(", ")}. Konkrétní terapeut bude přiřazen při uložení.</p>
          )}
        </Card>
        <Card className="space-y-4">
          <h2 className="font-semibold">3. Kontakt na klienta</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jméno a příjmení">{(id) => <Input id={id} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} required />}</Field>
            <Field label="Telefon">{(id) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />}</Field>
            <Field label="E-mail" hint="Na e-mail odejde potvrzení s odkazem na správu rezervace.">{(id, d) => <Input id={id} aria-describedby={d} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Klient</legend>
              <label className="mr-4 inline-flex items-center gap-2 text-sm"><input type="radio" name="isNew" checked={isNew} onChange={() => setIsNew(true)} /> Nový</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="isNew" checked={!isNew} onChange={() => setIsNew(false)} /> Stávající</label>
            </fieldset>
          </div>
          <Alert kind="info">Nezapisujte zdravotní údaje ani diagnózu – rezervace obsahuje jen kontaktní a organizační údaje.</Alert>
        </Card>
        <ErrorBox error={error} />
        <Button type="submit" busy={busy} disabled={!slot || !serviceId || !name || !email || !phone}>Vytvořit rezervaci</Button>
      </form>
    </div>
  );
}
