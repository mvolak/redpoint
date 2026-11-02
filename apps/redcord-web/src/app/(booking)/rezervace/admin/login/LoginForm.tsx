"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Field, Input } from "@redcord/booking/components/ui";
import { ErrorBox } from "@redcord/booking/components/admin/common";
import { api } from "@redcord/booking/lib/client-api";

export function LoginForm({ devHint }: { devHint: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ ok: boolean; mfaRequired: boolean }>("/api/rezervace/admin/auth/login", { body: { email, password } });
      router.replace(r.mfaRequired ? "/rezervace/admin/mfa" : "/rezervace/admin/calendar");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">RP</span>
        <h1 className="text-xl font-bold">Přihlášení personálu</h1>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="E-mail">{(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Heslo">{(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <ErrorBox error={error} />
          <Button type="submit" busy={busy} className="w-full">Přihlásit</Button>
        </form>
      </Card>
      {devHint && (
        <div className="mt-4">
          <Alert kind="warning" title="Vývojové přihlášení (pouze lokálně, syntetická data)">
            <p>Účty: admin@example.invalid, recepce@example.invalid, jana@example.invalid, petr@example.invalid.</p>
            <p>Heslo je hodnota proměnné <code>DEV_STAFF_PASSWORD</code> v souboru <code>.env.local</code>.</p>
          </Alert>
        </div>
      )}
    </main>
  );
}
