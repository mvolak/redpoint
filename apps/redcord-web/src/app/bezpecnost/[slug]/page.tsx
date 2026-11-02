import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, EmptyState, Section } from "@redcord/ui";
import { PageIntro, ReviewOnly, SourceBadge } from "@/components/blocks";
import { DownloadList } from "@/components/education";
import { repo } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  // technicke-kontroly has its own route with the service form.
  return repo
    .listSafetyTopics()
    .filter((t) => t.slug !== "technicke-kontroly")
    .map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = repo.getSafetyTopic((await params).slug);
  return t ? { title: t.title, description: t.summary, alternates: { canonical: `/bezpecnost/${t.slug}/` } } : {};
}

export default async function SafetyTopicPage({ params }: Props) {
  const topic = repo.getSafetyTopic((await params).slug);
  if (!topic) notFound();
  return (
    <>
      <PageIntro
        crumbs={[{ href: "/bezpecnost/", label: "Servis a bezpečnost" }, { label: topic.title }]}
        title={topic.title}
        intro={topic.summary}
      />
      <Section>
        <div className="max-w-3xl space-y-6">
          {topic.body.length > 0 ? (
            topic.body.map((p) => (
              <p key={p} className="text-lg leading-relaxed">
                {p}
              </p>
            ))
          ) : (
            <EmptyState
              headingLevel="h2"
              title="Schválené informace doplníme"
              action={
                <>
                  <ButtonLink href="/kontakt/?oddeleni=servis#poptavka">Zeptat se servisu</ButtonLink>
                  <ButtonLink href="tel:+420730517398" variant="outline-dark">
                    +420 730 517 398
                  </ButtonLink>
                </>
              }
            >
              Bezpečnostní informace zveřejňujeme pouze podle dokumentace výrobce. Máte-li dotaz ke stavu vybavení,
              kontaktujte servis.
            </EmptyState>
          )}
          <DownloadList ids={topic.downloadIds} />
          <SourceBadge source={topic.source} />
          <ReviewOnly>
            Původní URL {topic.legacyUrl} zachována.
          </ReviewOnly>
        </div>
      </Section>
    </>
  );
}
