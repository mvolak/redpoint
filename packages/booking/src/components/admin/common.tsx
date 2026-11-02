"use client";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge } from "../ui";
import { api, ApiFailure } from "../../lib/client-api";

export type StaffMe = { id: string; role: "therapist" | "reception" | "admin"; therapistId: string | null; displayName: string };
export type TherapistLite = { id: string; displayName: string; active: boolean; slug: string };

export const STATE_LABEL: Record<string, string> = {
  confirmed: "Potvrzeno", completed: "Proběhlo", no_show: "Nedostavil se", cancelled: "Zrušeno",
};
const STATE_TONE: Record<string, "green" | "blue" | "red" | "gray" | "amber"> = {
  confirmed: "green", completed: "blue", no_show: "amber", cancelled: "gray",
};
export function StateBadge({ state }: { state: string }) {
  return <Badge tone={STATE_TONE[state] ?? "gray"}>{STATE_LABEL[state] ?? state}</Badge>;
}

export const NOTIF_LABEL: Record<string, string> = {
  pending: "Čeká", sending: "Odesílá se", sent: "Odesláno", failed: "Chyba", skipped: "Přeskočeno",
};
const NOTIF_TONE: Record<string, "green" | "blue" | "red" | "gray" | "amber"> = {
  pending: "amber", sending: "blue", sent: "green", failed: "red", skipped: "gray",
};
export function NotifBadge({ status }: { status: string }) {
  return <Badge tone={NOTIF_TONE[status] ?? "gray"}>{NOTIF_LABEL[status] ?? status}</Badge>;
}
export const EVENT_LABEL: Record<string, string> = {
  appointment_confirmed: "Potvrzení", appointment_rescheduled: "Změna termínu", appointment_cancelled: "Zrušení",
  appointment_reminder: "Připomínka", request_received: "Přijetí žádosti", request_declined: "Zamítnutí žádosti",
};

export const ROLE_LABEL: Record<string, string> = { therapist: "Terapeut", reception: "Recepce", admin: "Administrátor" };
export const roleRank = { therapist: 1, reception: 2, admin: 3 } as const;
export function hasRole(me: StaffMe | null, min: keyof typeof roleRank) {
  return !!me && roleRank[me.role] >= roleRank[min];
}

/** Error display incl. schedule-conflict appointment lists. */
export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error instanceof ApiFailure ? error.error : { code: "internal", message: (error as Error)?.message ?? "Chyba", details: null };
  const appts = (e.details as { appointments?: { reference: string; start: string }[] } | null)?.appointments;
  return (
    <Alert kind="error" title={e.message}>
      {appts && appts.length > 0 && (
        <ul className="list-disc pl-5">
          {appts.map((a) => <li key={a.reference}>{a.reference} – {a.start}</li>)}
        </ul>
      )}
    </Alert>
  );
}

export function isCode(e: unknown, code: string) {
  return e instanceof ApiFailure && e.error.code === code;
}

/** Simple GET loader. */
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!!path);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export function kcToMinor(v: string): number | null {
  const t = v.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
export function minorToKc(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v / 100);
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-bold">{children}</h1>
      {actions}
    </div>
  );
}

export const WEEKDAYS = ["", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
