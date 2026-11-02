import type { Metadata } from "next";
import { ArrowLink, Card, Section, SectionHeading } from "@redcord/ui";
import { PageIntro } from "@/components/blocks";
import { CourseLadder, DownloadList, PathwaySessions } from "@/components/education";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Neurac — vzdělávání pro fyzioterapeuty",
  description: "Struktura kurzů Neurac 1, 2 a 3: pro koho jsou určeny, podmínky účasti a termíny.",
  alternates: { canonical: "/vzdelavani/neurac/" },
};

export const revalidate = 3600;

export default function NeuracEducationPage() {
  const courses = repo.listCourses({ pathway: "neurac" });
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/vzdelavani/", label: "Vzdělávání" }, { label: "Neurac" }]}
        title="Vzdělávání pro fyzioterapeuty"
        intro="Kurzy Neurac® jsou určeny fyzioterapeutům, lékařům a profesionálům se vzděláním v anatomii, fyziologii a patologii."
      />
      <Section labelledBy="structure-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading id="structure-title" title="Struktura kurzů Neurac®" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5 md:p-6">
              <p className="text-3xl font-bold">6 měsíců</p>
              <p className="mt-1 text-sm text-muted">doporučená minimální pauza mezi úrovněmi</p>
            </Card>
            <Card className="p-5 md:p-6">
              <p className="text-3xl font-bold">15–18 měsíců</p>
              <p className="mt-1 text-sm text-muted">ideální délka cesty od Neurac 1 po Neurac 3</p>
            </Card>
            <Card className="p-5 md:p-6">
              <p className="text-3xl font-bold">7 hodin</p>
              <p className="mt-1 text-sm text-muted">výuky denně, přibližně 75 % praxe a 25 % teorie</p>
            </Card>
          </div>
        </div>
        <div className="mt-12">
          <CourseLadder courses={courses} />
        </div>
        <div className="mt-10">
          <h3 className="text-xl font-bold">Ke stažení</h3>
          <div className="mt-3">
            <DownloadList ids={["letak-fyzioterapeuti", "letak-neurac-3"]} />
          </div>
        </div>
        <ArrowLink href="/neurac/" className="mt-8">
          Co je metoda Neurac
        </ArrowLink>
      </Section>
      <PathwaySessions pathway="neurac" title="Termíny kurzů Neurac" />
    </>
  );
}
