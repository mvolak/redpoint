import type { Metadata } from "next";
import { ManageAppointment } from "@redcord/booking/components/ManageAppointment";
import { bookingConfigured } from "@redcord/booking/lib/env";
import { Container, Eyebrow } from "@redcord/ui";

// Reached from the e-mailed management link (/rezervace/sprava/#t=…). The token lives in the
// fragment, never reaches the server, and the page sends no referrer (see next.config.ts headers).
export const metadata: Metadata = {
  title: "Správa rezervace — Redpoint Clinic",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default function ManagePage() {
  return (
    <Container className="max-w-3xl py-10 lg:py-14">
      <Eyebrow>Redpoint Clinic · Správa rezervace</Eyebrow>
      {bookingConfigured() ? (
        <ManageAppointment />
      ) : (
        <div className="rounded-card border border-dashed border-[#bdbdbd] p-8 md:p-10">
          <h1 className="text-xl font-bold">Správa rezervací zde zatím není připojená</h1>
          <p className="mt-3 text-muted">Kontaktujte prosím recepci kliniky.</p>
        </div>
      )}
    </Container>
  );
}
