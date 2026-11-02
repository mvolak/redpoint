"use client";
// Patient journey (spec §5): service → therapist → time (or request preferences) → contact
// → review & terms → email OTP → submit (idempotent) → confirmation or clearly labelled request.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "../lib/format";
import { addDaysIso, api, ApiFailure, fmtDateTime, newIdempotencyKey, pragueDate } from "../lib/client-api";
import { SlotPicker, type PickerSlot } from "./SlotPicker";
import { Alert, Badge, Button, Card, cx, Field, Input, Select, Spinner } from "./ui";

type Service = {
  id: string; slug: string; name: string; description: string | null; firstVisitInfo: string | null; durationMin: number;
  priceMinMinor: number | null; priceMaxMinor: number | null; bookingMode: "automatic" | "request_only"; newPatients: "allowed" | "not_allowed" | "only";
};
type Therapist = { id: string; slug: string; displayName: string; bio: string | null; serviceIds: string[] };
type Catalogue = {
  services: Service[]; therapists: Therapist[]; mode: "automatic" | "request_only" | "paused"; pausedMessage: string | null;
  reception: { phone: string | null; email: string | null };
  terms: { version: number; cancellationCutoffHours: number; text: string };
  location: { name: string; address: string } | null;
};
type Contact = { name: string; email: string; phone: string; isNewPatient: boolean | null };
type Confirmed = { kind: "confirmed"; reference: string; startsAt: string; endsAt: string; therapistName: string; serviceName: string; priceMinMinor: number | null; priceMaxMinor: number | null };
type Requested = { kind: "request"; reference: string };

const STEPS = ["service", "therapist", "time", "details", "review", "verify", "done"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = { service: "Služba", therapist: "Terapeut", time: "Termín", details: "Kontakt", review: "Shrnutí", verify: "Ověření", done: "Hotovo" };
const FIRST = "first";

function track(event: "booking_started" | "availability_shown" | "verification_completed" | "booking_confirmed" | "booking_failed") {
  // Aggregate flow events only — never names, contacts, ids or tokens (spec §12). No third-party script is loaded;
  // wire this to a privacy-safe endpoint if analytics are approved.
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("rp-analytics", { detail: { event } }));
}

export function BookingWizard({ initialService, initialTherapist }: { initialService?: string; initialTherapist?: string }) {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [therapistId, setTherapistId] = useState<string>(FIRST);
  const [weekFrom, setWeekFrom] = useState(pragueDate());
  const [slots, setSlots] = useState<PickerSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<PickerSlot | null>(null);
  const [pref, setPref] = useState({ from: addDaysIso(pragueDate(), 1), to: addDaysIso(pragueDate(), 14), timeOfDay: "any" as "any" | "morning" | "afternoon" });
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "", isNewPatient: null });
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof Contact, string>>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Confirmed | Requested | null>(null);
  const idemKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const loadCatalogue = useCallback(async () => {
    try {
      const c = await api<Catalogue>("/api/rezervace/catalogue");
      setCat(c);
      return c;
    } catch (e) {
      setLoadError(e instanceof ApiFailure ? e.message : "Nepodařilo se načíst nabídku.");
      return null;
    }
  }, []);

  // Initial load + validated deep links (?service=slug&therapist=slug). Unknown slugs are ignored.
  useEffect(() => {
    loadCatalogue().then((c) => {
      if (!c) return;
      track("booking_started");
      const s = c.services.find((x) => x.slug === initialService);
      if (s) {
        setServiceId(s.id);
        const t = c.therapists.find((x) => x.slug === initialTherapist && x.serviceIds.includes(s.id));
        if (t) { setTherapistId(t.id); setStep("time"); } else setStep("therapist");
      }
    });
  }, [loadCatalogue, initialService, initialTherapist]);

  // Move focus to the step heading on step change (screen reader + keyboard users).
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const service = cat?.services.find((s) => s.id === serviceId) ?? null;
  const therapist = cat?.therapists.find((t) => t.id === therapistId) ?? null;
  const eligible = useMemo(() => (cat && serviceId ? cat.therapists.filter((t) => t.serviceIds.includes(serviceId)) : []), [cat, serviceId]);
  const requestMode = !!cat && !!service && (cat.mode === "request_only" || service.bookingMode === "request_only");

  // Any change to what is being booked invalidates the idempotency key.
  useEffect(() => { idemKey.current = null; }, [serviceId, therapistId, slot, pref, contact, requestMode]);

  const loadSlots = useCallback(async () => {
    if (!serviceId || requestMode) return;
    setSlotsLoading(true);
    try {
      const qs = new URLSearchParams({ serviceId, from: weekFrom, to: addDaysIso(weekFrom, 6) });
      if (therapistId !== FIRST) qs.set("therapistId", therapistId);
      const res = await api<{ slots: PickerSlot[] }>(`/api/rezervace/availability?${qs}`);
      setSlots(res.slots);
      track("availability_shown");
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Nepodařilo se načíst termíny.");
    } finally {
      setSlotsLoading(false);
    }
  }, [serviceId, therapistId, weekFrom, requestMode]);

  useEffect(() => { if (step === "time") loadSlots(); }, [step, loadSlots]);

  function go(next: Step) { setError(null); setNotice(null); setStep(next); }

  function validateContact(): boolean {
    const errs: typeof contactErrors = {};
    if (contact.name.trim().length < 2) errs.name = "Zadejte jméno a příjmení.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errs.email = "Zadejte platný e-mail.";
    if (!/^\+?[0-9 ()-]{9,20}$/.test(contact.phone.trim())) errs.phone = "Zadejte platné telefonní číslo (např. +420 777 123 456).";
    if (contact.isNewPatient === null) errs.isNewPatient = "Vyberte prosím jednu z možností.";
    if (service && contact.isNewPatient === true && service.newPatients === "not_allowed") errs.isNewPatient = "Tuto službu lze online objednat jen pro stávající klienty. Noví klienti začínají vstupním vyšetřením.";
    if (service && contact.isNewPatient === false && service.newPatients === "only") errs.isNewPatient = "Tato služba je určena pro nové klienty.";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function startVerification() {
    setBusy(true); setError(null);
    try {
      const sess = await api<{ verified: boolean; email?: string }>("/api/rezervace/verification/session");
      if (sess.verified && sess.email === contact.email.trim().toLowerCase()) { await submit(); return; }
      const r = await api<{ challengeId: string }>("/api/rezervace/verification/request", { body: { email: contact.email.trim() } });
      setChallengeId(r.challengeId); setCode("");
      go("verify");
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Nepodařilo se odeslat kód.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSubmit() {
    if (!challengeId) return;
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/verification/verify", { body: { challengeId, code: code.trim() } });
      track("verification_completed");
      await submit();
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Ověření se nezdařilo.");
      setBusy(false);
    }
  }

  async function submit() {
    if (!cat || !service) return;
    setBusy(true); setError(null);
    idemKey.current ??= newIdempotencyKey();
    const base = {
      serviceId: service.id, therapistId: therapistId === FIRST ? null : therapistId, termsVersion: cat.terms.version, termsAccepted: true as const,
      contact: { name: contact.name.trim(), phone: contact.phone.trim(), isNewPatient: !!contact.isNewPatient }, idempotencyKey: idemKey.current,
    };
    try {
      const r = requestMode
        ? await api<Requested>("/api/rezervace/requests", { body: { ...base, preferredFrom: pref.from, preferredTo: pref.to, preferredTimeOfDay: pref.timeOfDay, preferredStart: null } })
        : await api<Confirmed>("/api/rezervace/appointments", { body: { ...base, start: slot!.start } });
      setResult(r);
      track("booking_confirmed");
      go("done");
    } catch (e) {
      track("booking_failed");
      if (!(e instanceof ApiFailure)) { setError("Něco se nepovedlo. Zkuste to prosím znovu."); return; }
      const err = e.error;
      if (err.code === "network" || err.status >= 500) {
        // Uncertain outcome: keep the same idempotency key so a retry cannot double-book.
        setError(`${err.message} Opakované odeslání je bezpečné – rezervace nevznikne dvakrát.`);
      } else if (err.code === "slot_unavailable") {
        setSlot(null);
        setNotice("Vybraný termín mezitím obsadil někdo jiný. Vaše údaje jsme zachovali – vyberte prosím jiný termín.");
        setStep("time");
      } else if (err.code === "unauthenticated") {
        setNotice(err.message);
        setChallengeId(null);
        setStep("review");
      } else if (err.details?.reason === "terms_changed") {
        await loadCatalogue();
        setTermsAccepted(false);
        setNotice(err.message);
        setStep("review");
      } else if (err.details?.reason === "request_only") {
        await loadCatalogue();
        setNotice("Tuto službu nyní objednáváme formou žádosti, kterou potvrdí recepce. Zkontrolujte prosím údaje.");
        setStep("time");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <Alert kind="error" title="Rezervační systém je nedostupný">{loadError}</Alert>;
  if (!cat) return <Spinner />;

  const receptionLine = [cat.reception.phone && `tel. ${cat.reception.phone}`, cat.reception.email].filter(Boolean).join(", ");

  if (cat.mode === "paused") {
    return (
      <Card>
        <h1 className="text-xl font-bold">Online rezervace jsou dočasně pozastaveny</h1>
        <p className="mt-2 text-sm">{cat.pausedMessage ?? "Kontaktujte prosím recepci."}</p>
        {receptionLine && <p className="mt-2 text-sm font-medium">Recepce: {receptionLine}</p>}
      </Card>
    );
  }

  const visibleSteps = STEPS.filter((s) => s !== "done");
  const stepIdx = visibleSteps.indexOf(step as (typeof visibleSteps)[number]);
  const price = service ? formatPrice(service.priceMinMinor, service.priceMaxMinor) : null;

  return (
    <div className="space-y-4">
      {step !== "done" && (
        <nav aria-label="Postup rezervace">
          <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {visibleSteps.map((s, i) => (
              <li key={s} aria-current={s === step ? "step" : undefined} className={cx(s === step && "font-semibold text-ink", i < stepIdx && "text-ink")}>
                {i + 1}. {STEP_LABEL[s]}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {cat.mode === "request_only" && step !== "done" && (
        <Alert kind="info" title="Objednání formou žádosti">Online nyní přijímáme žádosti o termín. Recepce vás bude kontaktovat a termín potvrdí – odesláním žádosti termín ještě není rezervován.</Alert>
      )}
      {notice && <Alert kind="warning">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {step === "service" && (
        <section aria-labelledby="h-service" className="space-y-3">
          <h1 id="h-service" ref={headingRef} tabIndex={-1} className="text-xl font-bold">Vyberte službu</h1>
          <ul className="space-y-3">
            {cat.services.map((s) => {
              const p = formatPrice(s.priceMinMinor, s.priceMaxMinor);
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => { setServiceId(s.id); setSlot(null); setTherapistId(FIRST); go("therapist"); }}
                    className={cx("w-full rounded-xl border bg-white p-4 text-left hover:border-brand", serviceId === s.id ? "border-brand" : "border-line")}>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{s.name}</span>
                      {(s.bookingMode === "request_only" || cat.mode === "request_only") && <Badge tone="amber">na žádost</Badge>}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{s.durationMin} min{p ? ` · ${p}` : ""}</span>
                    {s.description && <span className="mt-2 block text-sm">{s.description}</span>}
                    {s.firstVisitInfo && <span className="mt-2 block text-xs text-muted">První návštěva: {s.firstVisitInfo}</span>}
                    {s.newPatients === "not_allowed" && <span className="mt-2 block text-xs text-muted">Pouze pro stávající klienty.</span>}
                    {s.newPatients === "only" && <span className="mt-2 block text-xs text-muted">Pouze pro nové klienty.</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {step === "therapist" && service && (
        <section aria-labelledby="h-therapist" className="space-y-3">
          <h1 id="h-therapist" ref={headingRef} tabIndex={-1} className="text-xl font-bold">Vyberte terapeuta</h1>
          <p className="text-sm text-muted">{service.name}</p>
          <div role="radiogroup" aria-labelledby="h-therapist" className="space-y-2">
            {[{ id: FIRST, displayName: "První volný terapeut", bio: "Přiřadíme konkrétního terapeuta, který má ve zvoleném čase volno." }, ...eligible].map((t) => (
              <label key={t.id} className={cx("flex cursor-pointer gap-3 rounded-xl border bg-white p-4", therapistId === t.id ? "border-brand" : "border-line")}>
                <input type="radio" name="therapist" className="mt-1" checked={therapistId === t.id} onChange={() => { setTherapistId(t.id); setSlot(null); }} />
                <span><span className="block font-semibold">{t.displayName}</span>{t.bio && <span className="block text-sm text-muted">{t.bio}</span>}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => go("service")}>Zpět</Button>
            <Button onClick={() => go("time")}>Pokračovat</Button>
          </div>
        </section>
      )}

      {step === "time" && service && (
        <section aria-labelledby="h-time" className="space-y-3">
          <h1 id="h-time" ref={headingRef} tabIndex={-1} className="text-xl font-bold">{requestMode ? "Kdy by se vám termín hodil?" : "Vyberte termín"}</h1>
          <p className="text-sm text-muted">{service.name} · {therapistId === FIRST ? "první volný terapeut" : therapist?.displayName}</p>
          {requestMode ? (
            <Card className="space-y-3">
              <p className="text-sm">Uveďte preferované období. Recepce vám navrhne konkrétní termín a potvrdí ho e-mailem.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Od">{(id) => <Input id={id} type="date" value={pref.from} min={pragueDate()} onChange={(e) => setPref({ ...pref, from: e.target.value })} />}</Field>
                <Field label="Do">{(id) => <Input id={id} type="date" value={pref.to} min={pref.from} max={addDaysIso(pref.from, 60)} onChange={(e) => setPref({ ...pref, to: e.target.value })} />}</Field>
              </div>
              <Field label="Část dne">{(id) => (
                <Select id={id} value={pref.timeOfDay} onChange={(e) => setPref({ ...pref, timeOfDay: e.target.value as typeof pref.timeOfDay })}>
                  <option value="any">Kdykoli</option><option value="morning">Dopoledne</option><option value="afternoon">Odpoledne</option>
                </Select>
              )}</Field>
            </Card>
          ) : (
            <Card>
              <SlotPicker from={weekFrom} onFromChange={setWeekFrom} slots={slots} loading={slotsLoading} selected={slot?.start ?? null}
                onSelect={(s) => setSlot(s)} minDate={pragueDate()} emptyText="V tomto týdnu nejsou volné termíny. Zkuste další týden nebo jiného terapeuta." />
            </Card>
          )}
          <div className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => go("therapist")}>Zpět</Button>
            <Button disabled={!requestMode && !slot} onClick={() => go("details")}>Pokračovat</Button>
          </div>
        </section>
      )}

      {step === "details" && (
        <section aria-labelledby="h-details" className="space-y-3">
          <h1 id="h-details" ref={headingRef} tabIndex={-1} className="text-xl font-bold">Kontaktní údaje</h1>
          <Card className="space-y-4">
            <form id="contact-form" noValidate onSubmit={(e) => { e.preventDefault(); if (validateContact()) go("review"); }} className="space-y-4">
              <Field label="Jméno a příjmení" error={contactErrors.name}>{(id, d) => (
                <Input id={id} autoComplete="name" value={contact.name} aria-invalid={!!contactErrors.name} aria-describedby={d} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              )}</Field>
              <Field label="E-mail" hint="Pošleme na něj ověřovací kód a potvrzení." error={contactErrors.email}>{(id, d) => (
                <Input id={id} type="email" autoComplete="email" inputMode="email" value={contact.email} aria-invalid={!!contactErrors.email} aria-describedby={d} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              )}</Field>
              <Field label="Telefon" error={contactErrors.phone}>{(id, d) => (
                <Input id={id} type="tel" autoComplete="tel" inputMode="tel" value={contact.phone} aria-invalid={!!contactErrors.phone} aria-describedby={d} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              )}</Field>
              <fieldset aria-describedby={contactErrors.isNewPatient ? "np-err" : undefined}>
                <legend className="text-sm font-medium">Byli jste u nás již dříve?</legend>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="np" checked={contact.isNewPatient === true} onChange={() => setContact({ ...contact, isNewPatient: true })} /> Jsem nový klient</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="np" checked={contact.isNewPatient === false} onChange={() => setContact({ ...contact, isNewPatient: false })} /> Jsem stávající klient</label>
                </div>
                {contactErrors.isNewPatient && <p id="np-err" className="mt-1 text-xs text-red-700">{contactErrors.isNewPatient}</p>}
              </fieldset>
              <p className="text-xs text-muted">Neuvádějte prosím žádné zdravotní informace – ty probereme osobně.</p>
            </form>
          </Card>
          <div className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => go("time")}>Zpět</Button>
            <Button type="submit" form="contact-form">Pokračovat</Button>
          </div>
        </section>
      )}

      {step === "review" && service && (
        <section aria-labelledby="h-review" className="space-y-3">
          <h1 id="h-review" ref={headingRef} tabIndex={-1} className="text-xl font-bold">{requestMode ? "Shrnutí žádosti" : "Shrnutí rezervace"}</h1>
          <Card>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Služba</dt><dd className="font-medium">{service.name} ({!requestMode && slot ? Math.round((Date.parse(slot.end) - Date.parse(slot.start)) / 60000) : service.durationMin} min)</dd>
              <dt className="text-muted">Terapeut</dt><dd className="font-medium">{therapistId === FIRST ? "První volný – konkrétního terapeuta uvidíte v potvrzení" : therapist?.displayName}</dd>
              <dt className="text-muted">{requestMode ? "Preference" : "Termín"}</dt>
              <dd className="font-medium">{requestMode ? `${pref.from} – ${pref.to}, ${{ any: "kdykoli", morning: "dopoledne", afternoon: "odpoledne" }[pref.timeOfDay]}` : fmtDateTime(slot!.start)}</dd>
              {cat.location && <><dt className="text-muted">Místo</dt><dd className="font-medium">{cat.location.name}, {cat.location.address}</dd></>}
              {price && <><dt className="text-muted">Cena</dt><dd className="font-medium">{price}</dd></>}
              <dt className="text-muted">Kontakt</dt><dd className="font-medium">{contact.name}, {contact.email}, {contact.phone}</dd>
            </dl>
          </Card>
          <Card className="space-y-2">
            <h2 className="text-sm font-semibold">Podmínky rezervace</h2>
            <p className="whitespace-pre-line text-sm text-muted">{cat.terms.text}</p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
              <span>Beru na vědomí podmínky rezervace a storno podmínky (online změna nejpozději {cat.terms.cancellationCutoffHours} h předem).</span>
            </label>
          </Card>
          <Alert kind="info">Dalším krokem ověříme váš e-mail kódem. <strong>Ověření termín nerezervuje</strong> – termín zůstává volný pro ostatní, dokud rezervaci neodešlete.</Alert>
          <div className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => go("details")}>Zpět</Button>
            <Button disabled={!termsAccepted} busy={busy} onClick={startVerification}>Ověřit e-mail a {requestMode ? "odeslat žádost" : "rezervovat"}</Button>
          </div>
        </section>
      )}

      {step === "verify" && (
        <section aria-labelledby="h-verify" className="space-y-3">
          <h1 id="h-verify" ref={headingRef} tabIndex={-1} className="text-xl font-bold">Ověření e-mailu</h1>
          <Card className="space-y-4">
            <p className="text-sm">Na adresu <strong>{contact.email}</strong> jsme poslali šestimístný kód. Platí 10 minut.</p>
            <form onSubmit={(e) => { e.preventDefault(); verifyAndSubmit(); }} className="space-y-4">
              <Field label="Ověřovací kód">{(id) => (
                <Input id={id} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="max-w-40 text-lg tracking-widest" />
              )}</Field>
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => go("review")}>Zpět</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" disabled={busy} onClick={startVerification}>Poslat nový kód</Button>
                  <Button type="submit" disabled={code.length !== 6} busy={busy}>{requestMode ? "Odeslat žádost" : "Potvrdit rezervaci"}</Button>
                </div>
              </div>
            </form>
          </Card>
        </section>
      )}

      {step === "done" && result && (
        <section aria-labelledby="h-done" className="space-y-3">
          {result.kind === "confirmed" ? (
            <Card className="space-y-3">
              <h1 id="h-done" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-green-800">Rezervace je potvrzena</h1>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Číslo rezervace</dt><dd className="font-mono font-semibold">{result.reference}</dd>
                <dt className="text-muted">Služba</dt><dd>{result.serviceName}</dd>
                <dt className="text-muted">Terapeut</dt><dd>{result.therapistName}</dd>
                <dt className="text-muted">Termín</dt><dd>{fmtDateTime(result.startsAt)}</dd>
                {cat.location && <><dt className="text-muted">Místo</dt><dd>{cat.location.name}, {cat.location.address}</dd></>}
                {formatPrice(result.priceMinMinor, result.priceMaxMinor) && <><dt className="text-muted">Cena</dt><dd>{formatPrice(result.priceMinMinor, result.priceMaxMinor)}</dd></>}
              </dl>
              <p className="text-sm">Potvrzení s odkazem pro změnu nebo zrušení vám přijde e-mailem.</p>
            </Card>
          ) : (
            <Card className="space-y-3">
              <h1 id="h-done" ref={headingRef} tabIndex={-1} className="text-xl font-bold">Žádost o termín odeslána</h1>
              <Alert kind="warning" title="Toto zatím není potvrzená rezervace">Recepce vás bude kontaktovat s návrhem termínu. Termín je rezervovaný až po jejím potvrzení.</Alert>
              <p className="text-sm">Číslo žádosti: <span className="font-mono font-semibold">{result.reference}</span></p>
            </Card>
          )}
          {receptionLine && <p className="text-sm text-muted">Recepce: {receptionLine}</p>}
          <Button variant="secondary" onClick={() => { setResult(null); setSlot(null); setTermsAccepted(false); setServiceId(null); go("service"); }}>Objednat další termín</Button>
        </section>
      )}
    </div>
  );
}
