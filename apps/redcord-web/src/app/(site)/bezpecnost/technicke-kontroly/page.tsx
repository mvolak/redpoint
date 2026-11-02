import type { Metadata } from "next";
import { EmptyState, Section } from "@redcord/ui";
import { PageIntro, ReviewOnly } from "@/components/blocks";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata: Metadata = {
  title: "Technické kontroly",
  description: "Objednání bezpečnostně technické kontroly instalovaného vybavení Redcord.",
  alternates: { canonical: "/bezpecnost/technicke-kontroly/" },
};

export default function InspectionPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/bezpecnost/", label: "Servis a bezpečnost" }, { label: "Technické kontroly" }]}
        title="Technické kontroly"
        intro="Bezpečnostně technické kontroly instalovaného vybavení Redcord. Objednávky a dotazy: +420 730 517 398, obchod@redcord.cz."
      />
      <Section labelledBy="tk-info">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-6">
            <h2 id="tk-info" className="text-section font-bold">
              Co kontrola zahrnuje
            </h2>
            <EmptyState title="Rozsah a interval kontrol doplníme">
              Schválený rozsah kontroly, doporučený interval a dokumentaci uvedeme podle podkladů výrobce a servisního oddělení.
            </EmptyState>
            <ReviewOnly>Stávající odkaz vrací 404; stránka obnovena se servisním formulářem v testovacím režimu.</ReviewOnly>
          </div>
          <div className="rounded-card border border-line p-6 md:p-8" id="poptavka">
            <h2 className="text-2xl font-bold">Objednat kontrolu</h2>
            <div className="mt-6">
              <EnquiryForm defaultDepartment="servis" defaultReference="Technická kontrola" idPrefix="kontrola" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
