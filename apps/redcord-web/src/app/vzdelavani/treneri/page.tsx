import type { Metadata } from "next";
import { Section, SectionHeading } from "@redcord/ui";
import { PageIntro } from "@/components/blocks";
import { CourseLadder, DownloadList, PathwaySessions } from "@/components/education";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Redcord Active — vzdělávání pro trenéry",
  description: "Kurzy Redcord Active Intro, Advanced a Pro pro osobní trenéry a instruktory.",
  alternates: { canonical: "/vzdelavani/treneri/" },
};

export const revalidate = 3600;

export default function TrainerEducationPage() {
  const courses = repo.listCourses({ pathway: "active" });
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/vzdelavani/", label: "Vzdělávání" }, { label: "Pro trenéry" }]}
        title="Vzdělávání pro trenéry"
        intro="Program Redcord Active pro certifikované osobní trenéry, instruktory pilates a domácí trénink. Kurzy na sebe navazují a končí certifikátem Redcord Active Specialist."
      />
      <Section labelledBy="active-title">
        <SectionHeading id="active-title" title="Kurzy Redcord Active" />
        <div className="mt-10">
          <CourseLadder courses={courses} />
        </div>
        <div className="mt-10">
          <h3 className="text-xl font-bold">Ke stažení</h3>
          <div className="mt-3">
            <DownloadList ids={["letak-treneri"]} />
          </div>
        </div>
      </Section>
      <PathwaySessions pathway="active" title="Termíny kurzů Redcord Active" />
    </>
  );
}
