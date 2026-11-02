"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Spinner } from "@redcord/booking/components/ui";
import { ErrorBox } from "@redcord/booking/components/admin/common";
import { api } from "@redcord/booking/lib/client-api";

type Factor = { id: string; status: string };

export default function MfaPage() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    api<{ factors: Factor[] }>("/api/rezervace/admin/auth/mfa", { body: { action: "status" } })
      .then((r) => setFactors(r.factors))
      .catch((e) => { setError(e); setFactors([]); });
  }, []);

  const verified = factors?.find((f) => f.status === "verified");
  const factorId = enroll?.factorId ?? verified?.id;

  async function startEnroll() {
    setBusy(true); setError(null);
    try { setEnroll(await api("/api/rezervace/admin/auth/mfa", { body: { action: "enroll" } })); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true); setError(null);
    try {
      await api("/api/rezervace/admin/auth/mfa", { body: { action: "verify", factorId, code } });
      router.replace("/rezervace/admin/calendar");
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  const qrSrc = enroll?.qrCode
    ? enroll.qrCode.startsWith("data:") ? enroll.qrCode : `data:image/svg+xml;utf8,${encodeURIComponent(enroll.qrCode)}`
    : null;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-4 text-xl font-bold">Dvoufázové ověření</h1>
      <Card className="space-y-4">
        {factors === null ? <Spinner /> : (
          <>
            {!factorId && (
              <>
                <p className="text-sm">Pro přístup do administrace je nutné nastavit ověřovací aplikaci (TOTP).</p>
                <Button onClick={startEnroll} busy={busy}>Nastavit ověřovací aplikaci</Button>
              </>
            )}
            {enroll && (
              <div className="space-y-2">
                <p className="text-sm">Naskenujte QR kód v ověřovací aplikaci, nebo zadejte klíč ručně:</p>
                {qrSrc && <img src={qrSrc} alt="QR kód pro ověřovací aplikaci" className="h-48 w-48" />}
                <p className="break-all font-mono text-xs">{enroll.secret}</p>
              </div>
            )}
            {factorId && (
              <form onSubmit={verify} className="space-y-3">
                <Field label="Kód z ověřovací aplikace">
                  {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
                </Field>
                <Button type="submit" busy={busy} disabled={code.length !== 6}>Ověřit</Button>
              </form>
            )}
          </>
        )}
        <ErrorBox error={error} />
      </Card>
    </main>
  );
}
