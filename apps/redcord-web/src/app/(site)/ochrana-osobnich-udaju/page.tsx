import type { Metadata } from "next";
import { EmptyState, Section } from "@redcord/ui";
import { PageIntro } from "@/components/blocks";

export const metadata: Metadata = { title: "Ochrana osobních údajů", alternates: { canonical: "/ochrana-osobnich-udaju/" } };

export default function PrivacyPage() {
  return (
    <>
      <PageIntro crumbs={[{ label: "Ochrana osobních údajů" }]} title="Ochrana osobních údajů" />
      <Section>
        <div className="max-w-3xl">
          <EmptyState headingLevel="h2" title="Zásady dodá provozovatel">
            Text zásad zpracování osobních údajů musí schválit provozovatel (AHAMA s.r.o.) před spuštěním. Prototyp neukládá žádné údaje z
            formulářů. Přesná URL této stránky bude dohodnuta před spuštěním.
          </EmptyState>
        </div>
      </Section>
    </>
  );
}
