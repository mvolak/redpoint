"use client";
// Appointment management (spec §11): token arrives in the URL *fragment*, is exchanged via POST
// for an unverified session, removed from the visible URL, and an email OTP is required before
// any detail is shown or changed. Landing on the page never changes anything.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "../lib/format";
import { addDaysIso, api, ApiFailure, fmtDateTime, pragueDate } from "../lib/client-api";
import { SlotPicker, type PickerSlot } from "./SlotPicker";
import { Alert, Badge, Button, Card, Field, Input, Spinner } from "./ui";

type Details = {
  appointmentId: string; reference: string; state: "confirmed" | "completed" | "no_show" | "cancelled"; version: number;
  serviceId: string; serviceName: string; therapistId: string; therapistName: string; startsAt: string; endsAt: string;
  priceMinMinor: number | null; priceMaxMinor: number | null;
  location: { name: string; address: string; phone: string | null; email: string | null };
  cancellationCutoffHours: number; canChangeOnline: boolean;
};

type Phase = "init" | "no-link" | "otp-send" | "otp-enter" | "details" | "error";
const STATE_LABEL = { confirmed: "Potvrzeno", completed: "Proběhlo", no_show: "Nedostavil(a) se", cancelled: "Zrušeno" } as const;

export function ManageAppointment() {
  const [phase, setPhase] = useState<Phase>("init");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "confirm-cancel" | "reschedule">("view");
  const [weekFrom, setWeekFrom] = useState(pragueDate());
  const [slots, setSlots] = useState<PickerSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<PickerSlot | null>(null);
  const started = useRef(false);

  const loadDetails = useCallback(async () => {
    const d = await api<Details>("/api/rezervace/appointments/manage");
    setDetails(d);
    setPhase("details");
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("t");
    // Remove the token from the visible URL / history immediately.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        if (token) {
          const r = await api<{ maskedEmail: string }>("/api/rezervace/appointments/manage/session", { body: { token } });
          setMaskedEmail(r.maskedEmail);
          setPhase("otp-send");
          return;
        }
        // Returning within an existing (verified) session?
        await loadDetails();
      } catch (e) {
        // Existing but not yet verified session (e.g. page reload before entering the code):
        if (!token && e instanceof ApiFailure && e.error.code === "unauthenticated" && e.error.message.includes("ověřte")) setPhase("otp-send");
        else if (!token && e instanceof ApiFailure && e.error.code === "unauthenticated") setPhase("no-link");
        else { setError(e instanceof ApiFailure ? e.message : "Odkaz se nepodařilo ověřit."); setPhase("error"); }
      }
    })();
  }, [loadDetails]);

  const loadSlots = useCallback(async () => {
    if (!details) return;
    setSlotsLoading(true);
    try {
      const qs = new URLSearchParams({ serviceId: details.serviceId, therapistId: details.therapistId, from: weekFrom, to: addDaysIso(weekFrom, 6) });
      const r = await api<{ slots: PickerSlot[] }>(`/api/rezervace/availability?${qs}`);
      setSlots(r.slots.filter((s) => s.start !== details.startsAt));
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Nepodařilo se načíst termíny.");
    } finally {
      setSlotsLoading(false);
    }
  }, [details, weekFrom]);

  useEffect(() => { if (mode === "reschedule") loadSlots(); }, [mode, loadSlots]);

  async function sendCode() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ challengeId: string }>("/api/rezervace/appointments/manage/verification/request", { body: {} });
      setChallengeId(r.challengeId); setCode(""); setPhase("otp-enter");
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Kód se nepodařilo odeslat.");
      if (e instanceof ApiFailure && e.error.code === "unauthenticated") setPhase("error");
    } finally { setBusy(false); }
  }

  async function verify() {
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/appointments/manage/verification/verify", { body: { challengeId, code } });
      await loadDetails();
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Ověření se nezdařilo.");
    } finally { setBusy(false); }
  }

  async function handleChangeError(e: unknown) {
    if (!(e instanceof ApiFailure)) { setError("Něco se nepovedlo. Zkuste to prosím znovu."); return; }
    if (e.error.code === "stale_version") { setNotice(e.message); await loadDetails(); setMode("view"); return; }
    if (e.error.code === "slot_unavailable") { setSlot(null); setNotice("Termín mezitím obsadil někdo jiný. Vyberte prosím jiný."); await loadSlots(); return; }
    if (e.error.code === "unauthenticated") { setPhase("error"); }
    setError(e.message);
  }

  async function cancel() {
    if (!details) return;
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/appointments/manage/cancel", { body: { expectedVersion: details.version } });
      await loadDetails();
      setMode("view");
      setNotice("Rezervace byla zrušena. Potvrzení vám přijde e-mailem.");
    } catch (e) { await handleChangeError(e); } finally { setBusy(false); }
  }

  async function reschedule() {
    if (!details || !slot) return;
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/appointments/manage/reschedule", { body: { expectedVersion: details.version, start: slot.start } });
      await loadDetails();
      setMode("view"); setSlot(null);
      setNotice("Termín byl změněn. Potvrzení vám přijde e-mailem.");
    } catch (e) { await handleChangeError(e); } finally { setBusy(false); }
  }

  if (phase === "init") return <Spinner label="Ověřujeme odkaz…" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Správa rezervace</h1>
      {notice && <Alert kind="success">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {phase === "no-link" && (
        <Card><p className="text-sm">Pro správu rezervace otevřete odkaz z potvrzovacího e-mailu. Pokud ho nemáte, kontaktujte prosím recepci.</p></Card>
      )}

      {phase === "error" && !error && <Alert kind="error">Odkaz je neplatný nebo vypršel. Pro změnu termínu kontaktujte recepci.</Alert>}

      {phase === "otp-send" && (
        <Card className="space-y-3">
          <p className="text-sm">Z bezpečnostních důvodů vám pošleme ověřovací kód na e-mail {maskedEmail && <strong>{maskedEmail}</strong>}. Teprve po ověření zobrazíme podrobnosti rezervace.</p>
          <Button busy={busy} onClick={sendCode}>Poslat ověřovací kód</Button>
        </Card>
      )}

      {phase === "otp-enter" && (
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
            <Field label="Ověřovací kód z e-mailu">{(id) => (
              <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="max-w-40 text-lg tracking-widest" />
            )}</Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={code.length !== 6} busy={busy}>Ověřit</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={sendCode}>Poslat nový kód</Button>
            </div>
          </form>
        </Card>
      )}

      {phase === "details" && details && (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-semibold">{details.reference}</p>
              <Badge tone={details.state === "confirmed" ? "green" : details.state === "cancelled" ? "red" : "gray"}>{STATE_LABEL[details.state]}</Badge>
            </div>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Služba</dt><dd>{details.serviceName}</dd>
              <dt className="text-muted">Terapeut</dt><dd>{details.therapistName}</dd>
              <dt className="text-muted">Termín</dt><dd className="font-medium">{fmtDateTime(details.startsAt)}</dd>
              <dt className="text-muted">Místo</dt><dd>{details.location.name}, {details.location.address}</dd>
              {formatPrice(details.priceMinMinor, details.priceMaxMinor) && <><dt className="text-muted">Cena</dt><dd>{formatPrice(details.priceMinMinor, details.priceMaxMinor)}</dd></>}
            </dl>
          </Card>

          {details.state === "confirmed" && !details.canChangeOnline && (
            <Alert kind="warning" title="Online změna už není možná">
              Méně než {details.cancellationCutoffHours} h před termínem prosím změnu nebo zrušení domluvte s recepcí
              {details.location.phone ? ` (tel. ${details.location.phone})` : ""}.
            </Alert>
          )}

          {details.state === "confirmed" && details.canChangeOnline && mode === "view" && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { setMode("reschedule"); setNotice(null); }}>Změnit termín</Button>
              <Button variant="danger" onClick={() => { setMode("confirm-cancel"); setNotice(null); }}>Zrušit rezervaci</Button>
            </div>
          )}

          {mode === "confirm-cancel" && (
            <Card className="space-y-3">
              <p className="text-sm font-medium">Opravdu chcete rezervaci zrušit? Termín se uvolní pro ostatní.</p>
              <div className="flex gap-2">
                <Button variant="danger" busy={busy} onClick={cancel}>Ano, zrušit rezervaci</Button>
                <Button variant="secondary" onClick={() => setMode("view")}>Ponechat</Button>
              </div>
            </Card>
          )}

          {mode === "reschedule" && (
            <Card className="space-y-3">
              <h2 className="font-semibold">Vyberte nový termín ({details.therapistName})</h2>
              <p className="text-xs text-muted">Původní termín zůstává platný, dokud změnu nepotvrdíte.</p>
              <SlotPicker from={weekFrom} onFromChange={setWeekFrom} slots={slots} loading={slotsLoading} selected={slot?.start ?? null} onSelect={setSlot} minDate={pragueDate()} />
              <div className="flex gap-2">
                <Button disabled={!slot} busy={busy} onClick={reschedule}>{slot ? `Přesunout na ${fmtDateTime(slot.start)}` : "Vyberte termín"}</Button>
                <Button variant="secondary" onClick={() => { setMode("view"); setSlot(null); }}>Zpět</Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
