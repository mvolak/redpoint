import type { Metadata } from "next";
import { ButtonLink, PhotoCard, Section, SectionHeading } from "@redcord/ui";
import { PageIntro, ReviewOnly } from "@/components/blocks";
import { Media } from "@/components/Media";
import { PathwaySessions } from "@/components/education";

export const metadata: Metadata = {
  title: "Vzdělávání",
  description: "Kurzy Neurac pro fyzioterapeuty a lékaře, Redcord Active pro trenéry a tematické workshopy.",
  alternates: { canonical: "/vzdelavani/" },
};

export const revalidate = 3600;

export default function EducationPage() {
  return (
    <>
      <PageIntro
        crumbs={[{ label: "Vzdělávání" }]}
        title="Vzdělávání Redcord a Neurac"
        intro="Vzdělávání fyzioterapeutů probíhá ve vzdělávacích akreditovaných pracovištích fyzioterapie Redpoint Clinic CZ Praha a Hradec Králové. Vyberte cestu podle své profese."
      >
        <ButtonLink href="/vzdelavani/vzdelavaci-program/">Termíny kurzů</ButtonLink>
        <ButtonLink href="/kontakt/?oddeleni=vzdelavani#poptavka" variant="outline-dark">
          Dotaz na vzdělávání
        </ButtonLink>
      </PageIntro>
      <Section labelledBy="paths-title">
        <SectionHeading id="paths-title" title="Vzdělávací cesty" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <PhotoCard
            href="/vzdelavani/neurac/"
            kicker="Fyzioterapeuti a lékaři"
            title="Neurac 1–3"
            description="Certifikované kurzy terapeutické metody Neurac."
            media={<Media slot="edu-neurac" tone="dark" compact sizes="(min-width: 768px) 33vw, 100vw" />}
            ratio="4/5"
          />
          <PhotoCard
            href="/vzdelavani/treneri/"
            kicker="Trenéři a instruktoři"
            title="Redcord Active"
            description="Intro, Advanced a Pro pro tréninkovou praxi."
            media={<Media slot="edu-active" tone="dark" compact sizes="(min-width: 768px) 33vw, 100vw" />}
            ratio="4/5"
          />
          <PhotoCard
            href="/vzdelavani/workshopy/"
            kicker="Praxe a absolventi"
            title="Workshopy"
            description="Krátké tematické bloky."
            media={<Media slot="edu-workshop" tone="dark" compact sizes="(min-width: 768px) 33vw, 100vw" />}
            ratio="4/5"
          />
        </div>
        <div className="mt-8">
          <ReviewOnly>
            Stávající web uvádí „již více než 20 let“ vzdělávání a lektorky Mgr. Alice Hamáčková a Mgr. Alice Pernicová. Lektory a
            akreditace zobrazíme po potvrzení aktuálnosti.
          </ReviewOnly>
        </div>
      </Section>
      <PathwaySessions title="Nejbližší termíny všech kurzů" />
    </>
  );
}
