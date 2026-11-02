import type { Metadata } from "next";
import { ArrowLink, Section, SectionHeading } from "@redcord/ui";
import { PageIntro, ReviewOnly } from "@/components/blocks";
import { PathwaySessions } from "@/components/education";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Workshopy",
  description: "Krátké tematické workshopy Redcord a Neurac.",
  alternates: { canonical: "/vzdelavani/workshopy/" },
};

export const revalidate = 3600;

export default function WorkshopsPage() {
  const workshops = repo.listCourses({ pathway: "workshop" });
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/vzdelavani/", label: "Vzdělávání" }, { label: "Workshopy" }]}
        title="Workshopy"
        intro="Krátké tematické workshopy v rozsahu přibližně tří hodin. Aktuální nabídku zveřejníme po potvrzení témat a termínů."
      />
      <Section labelledBy="ws-title">
        <SectionHeading id="ws-title" title="Témata z dřívější nabídky" intro="Zda se témata budou opakovat, potvrdí vzdělávací oddělení." />
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {workshops.map((w) => (
            <li key={w.slug} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <span className="text-xl font-bold">{w.title}</span>
              <ArrowLink href={`/vzdelavani/kurzy/${w.slug}/`}>Detail</ArrowLink>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ReviewOnly>
            Odkaz „Workshopy“ na stávajícím webu vrací 404. Témata pocházejí z programu 2020; stránka je obnovena s poctivým stavem
            „nabídku připravujeme“.
          </ReviewOnly>
        </div>
      </Section>
      <PathwaySessions pathway="workshop" title="Termíny workshopů" />
    </>
  );
}
