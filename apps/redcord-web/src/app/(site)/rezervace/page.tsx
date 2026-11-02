import type { Metadata } from "next";
import { BookingWizard } from "@redcord/booking/components/BookingWizard";
import { bookingConfigured } from "@redcord/booking/lib/env";
import { Container, Eyebrow, ReviewNote } from "@redcord/ui";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rezervace termínu — Redpoint Clinic",
  description: "Online objednání termínu fyzioterapie v Redpoint Clinic.",
};

const SLUG = /^[a-z0-9-]{1,60}$/;

export default async function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  // Deep links (?service=slug&therapist=slug), e.g. from the clinic site: validated, non-sensitive identifiers only.
  const pick = (v: string | string[] | undefined) => (typeof v === "string" && SLUG.test(v) ? v : undefined);
  const ready = bookingConfigured();
  return (
    <Container className="max-w-3xl py-10 lg:py-14">
      <Eyebrow>Redpoint Clinic · Rezervace termínu</Eyebrow>
      <p className="mb-8 max-w-2xl text-muted">
        Fyzioterapii poskytuje referenční klinika{" "}
        <a href={site.external.clinic.url} className="font-medium text-ink underline underline-offset-4 hover:text-brand">
          {site.external.clinic.label}
        </a>
        . Údaje používáme pouze k objednání termínu.
      </p>
      {site.reviewMode && (
        <div className="mb-8">
          <ReviewNote title="Rezervace v prototypu">
            Rezervační systém Redpoint Booking v1 vložený do webu. Služby, terapeuti, ceny a ordinační hodiny jsou
            syntetická testovací data; e-maily se neodesílají (ukládají se do vývojové schránky).
          </ReviewNote>
        </div>
      )}
      {ready ? (
        <BookingWizard initialService={pick(sp.service)} initialTherapist={pick(sp.therapist)} />
      ) : (
        <div className="rounded-card border border-dashed border-[#bdbdbd] p-8 md:p-10">
          <h1 className="text-xl font-bold">Online rezervace zde zatím nejsou připojené</h1>
          <p className="mt-3 text-muted">
            Objednat se můžete přímo na webu kliniky{" "}
            <a href={site.external.clinic.url} className="underline underline-offset-4">
              {site.external.clinic.label}
            </a>
            .
          </p>
        </div>
      )}
    </Container>
  );
}
