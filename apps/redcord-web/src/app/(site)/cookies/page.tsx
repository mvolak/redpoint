import type { Metadata } from "next";
import { EmptyState, Section } from "@redcord/ui";
import { PageIntro } from "@/components/blocks";

export const metadata: Metadata = { title: "Cookies", alternates: { canonical: "/cookies/" } };

export default function CookiesPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ label: "Cookies" }]}
        title="Cookies a nastavení souhlasu"
        intro="Prototyp nepoužívá analytické ani marketingové cookies a nenačítá žádné měřicí skripty ani pixely."
      />
      <Section>
        <div className="max-w-3xl">
          <EmptyState headingLevel="h2" title="Nastavení souhlasu připravujeme">
            Až provozovatel zvolí nástroje měření, zde bude možné souhlas udělit, odmítnout a kdykoli změnit. Web zůstane plně použitelný i
            při odmítnutí volitelných cookies.
          </EmptyState>
        </div>
      </Section>
    </>
  );
}
