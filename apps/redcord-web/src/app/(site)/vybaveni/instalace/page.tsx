import type { Metadata } from "next";
import { EmptyState, Section } from "@redcord/ui";
import { Media } from "@/components/Media";
import { PageIntro, ReviewOnly } from "@/components/blocks";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata: Metadata = {
  title: "Instalace vybavení",
  description: "Instalace a zaškolení k vybavení Redcord pro kliniky, trenéry i jednotlivce.",
  alternates: { canonical: "/vybaveni/instalace/" },
};

export default function InstallationPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/vybaveni/", label: "Vybavení" }, { label: "Instalace" }]}
        title="Instalace vybavení"
        intro="Veškeré vybavení, které dodáváme, na přání klienta také instalujeme. Zaškolení v bezpečném používání probíhá vždy s montáží nového vybavení."
      />
      <Section labelledBy="process-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="process-title" className="text-section font-bold">
              Jak instalace probíhá
            </h2>
            <div className="mt-6">
              <EmptyState title="Postup instalace doplníme">
                Schválený popis postupu, požadavků na prostor a příklady instalací zveřejníme po dodání podkladů. Technické požadavky
                (nosnost, kotvení) uvádíme pouze podle dokumentace výrobce a po konzultaci na místě.
              </EmptyState>
            </div>
            <div className="mt-6">
              <ReviewOnly>
                Stávající odkaz „Instalace“ vrací chybu 404. Prototyp stránku obnovuje, ale nevymýšlí instalační limity ani postupy —
                dodá je vlastník.
              </ReviewOnly>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-card">
              <Media slot="install-clinic" sizes="(min-width: 1024px) 25vw, 50vw" />
            </div>
            <div className="mt-12 overflow-hidden rounded-card">
              <Media slot="install-studio" sizes="(min-width: 1024px) 25vw, 50vw" />
            </div>
          </div>
        </div>
      </Section>
      <Section tone="muted" labelledBy="install-form" id="poptavka">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="install-form" className="text-section font-bold">
              Konzultace instalace
            </h2>
            <p className="mt-4 text-lg text-muted">Popište prostor a zamýšlené použití. Ozve se obchodní oddělení.</p>
          </div>
          <div className="rounded-card bg-white p-6 md:p-8">
            <EnquiryForm defaultDepartment="obchod" defaultReference="Instalace" idPrefix="instalace" />
          </div>
        </div>
      </Section>
    </>
  );
}
