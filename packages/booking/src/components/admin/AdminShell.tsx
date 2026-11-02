"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Button, cx, Spinner } from "../ui";
import { api, ApiFailure } from "../../lib/client-api";
import { hasRole, ROLE_LABEL, type StaffMe } from "./common";

const MeContext = createContext<StaffMe | null>(null);
export function useMe(): StaffMe {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe outside AdminShell");
  return me;
}

const NAV: { href: string; label: string; min: StaffMe["role"] }[] = [
  { href: "/rezervace/admin/calendar", label: "Kalendář", min: "therapist" },
  { href: "/rezervace/admin/schedule", label: "Rozvrh", min: "therapist" },
  { href: "/rezervace/admin/requests", label: "Žádosti", min: "reception" },
  { href: "/rezervace/admin/appointments/new", label: "Nová rezervace", min: "reception" },
  { href: "/rezervace/admin/notifications", label: "Notifikace", min: "reception" },
  { href: "/rezervace/admin/settings", label: "Nastavení", min: "reception" },
  { href: "/rezervace/admin/staff", label: "Personál", min: "admin" },
  { href: "/rezervace/admin/catalogue", label: "Katalog", min: "admin" },
  { href: "/rezervace/admin/audit", label: "Audit", min: "admin" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api<{ status: string; staff: StaffMe }>("/api/rezervace/admin/auth/me")
      .then((r) => setMe(r.staff))
      .catch((e) => {
        if (e instanceof ApiFailure && e.error.status === 401) router.replace("/rezervace/admin/login");
        else if (e instanceof ApiFailure && e.error.status === 403) router.replace("/rezervace/admin/mfa");
        else setFailed(e instanceof ApiFailure ? e.error.message : "Chyba");
      });
  }, [router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await api("/api/rezervace/admin/auth/logout", { method: "POST", body: {} }).catch(() => {});
    router.replace("/rezervace/admin/login");
  }

  if (failed) return <div className="p-6 text-sm text-red-700" role="alert">{failed}</div>;
  if (!me) return <div className="p-6"><Spinner /></div>;

  const items = NAV.filter((n) => hasRole(me, n.min));
  return (
    <MeContext.Provider value={me}>
      <div className="min-h-screen">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/rezervace/admin/calendar" className="flex items-center gap-2">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">RP</span>
              <span className="font-bold">Redpoint · Recepce</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted sm:inline">{me.displayName} ({ROLE_LABEL[me.role]})</span>
              <Button variant="secondary" onClick={logout}>Odhlásit</Button>
              <Button variant="ghost" className="md:hidden" aria-expanded={menuOpen} aria-controls="admin-nav" onClick={() => setMenuOpen((v) => !v)}>Menu</Button>
            </div>
          </div>
          <nav id="admin-nav" aria-label="Administrace" className={cx("mx-auto max-w-7xl px-4 pb-2 md:block", menuOpen ? "block" : "hidden")}>
            <ul className="flex flex-col gap-1 md:flex-row md:flex-wrap">
              {items.map((n) => {
                const active = pathname === n.href || (n.href !== "/rezervace/admin/appointments/new" && pathname.startsWith(n.href + "/"));
                return (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={active ? "page" : undefined}
                      className={cx("block rounded-md px-3 py-2 text-sm font-medium", active ? "bg-brand text-white" : "hover:bg-gray-100")}>
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </MeContext.Provider>
  );
}
