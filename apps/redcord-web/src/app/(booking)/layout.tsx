import type { Metadata } from "next";
import type { ReactNode } from "react";
import { bookingConfigured } from "@redcord/booking/lib/env";

// Staff/dev booking pages: no public site chrome, never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function BookingStaffLayout({ children }: { children: ReactNode }) {
  if (!bookingConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-xl font-bold">Rezervační systém není připojen</h1>
        <p className="mt-3 text-muted">
          V tomto prostředí chybí databáze rezervací (<code>DATABASE_URL</code>, <code>APP_SECRET</code>). Postup zprovoznění je
          v <code>docs/booking/README.md</code>.
        </p>
      </main>
    );
  }
  return <div className="flex-1 bg-surface-muted">{children}</div>;
}
