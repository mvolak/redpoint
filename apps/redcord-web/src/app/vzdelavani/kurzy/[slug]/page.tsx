import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AUDIENCE_LABELS } from "@redcord/content";
import { ButtonLink, Card, EmptyState, Pill, Section } from "@redcord/ui";
import { PageIntro, SessionCard, SourceBadge } from "@/components/blocks";
import { DownloadList, PATHWAY_LABEL, RegistrationNote } from "@/components/education";
import { TrackView } from "@/components/Tracked";
import { repo } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return repo.listCourses().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = repo.getCourse((await params).slug);
  if (!c) return {};
  return { title: `Kurz ${c.title}`, description: c.eligibility, alternates: { canonical: `/vzdelavani/kurzy/${c.slug}/` } };
}

const PATHWAY_HREF = { neurac: "/vzdelavani/neurac/", active: "/vzdelavani/treneri/", workshop: "/vzdelavani/workshopy/" } as const;

export default async function CoursePage({ params }: Props) {
  const course = repo.getCourse((await params).slug);
  if (!course) notFound();
  const { upcoming } = repo.listSessions({ now: new Date(), courseSlug: course.slug });

  return (
    <>
      <TrackView event="course_viewed" props={{ course: course.slug }} />
      <PageIntro
        crumbs={[
          { href: "/vzdelavani/", label: "Vzdělávání" },
          { href: PATHWAY_HREF[course.pathway], label: PATHWAY_LABEL[course.pathway].split(" — ")[0] ?? "" },
          { label: course.title },
        ]}
        title={course.title}
        intro={course.eligibility}
      >
        <ButtonLink href="#terminy">Termíny</ButtonLink>
        <ButtonLink href={`/kontakt/?oddeleni=vzdelavani&ref=${encodeURIComponent(course.title)}#poptavka`} variant="outline-dark">
          Dotaz ke kurzu
        </ButtonLink>
      </PageIntro>

      <Section labelledBy="course-facts">
        <h2 id="course-facts" className="sr-only">
          Informace o kurzu
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <h3 className="text-lg font-bold">Úroveň a rozsah</h3>
            <p className="mt-2">{course.level}</p>
            {course.durationNote && <p className="mt-2 text-muted">{course.durationNote}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {course.audiences.map((a) => (
                <Pill key={a}>{AUDIENCE_LABELS[a]}</Pill>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-bold">Podmínky účasti</h3>
            {course.prerequisites.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {course.prerequisites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">Bez předchozího kurzu.</p>
            )}
          </Card>
          <Card>
            <h3 className="text-lg font-bold">Obsah</h3>
            {course.outcomes.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {course.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Podrobný obsah doplní vzdělávací oddělení.</p>
            )}
          </Card>
        </div>
        <div className="mt-8 space-y-3">
          <DownloadList ids={course.downloadIds} />
          <SourceBadge source={course.source} />
        </div>
      </Section>

      <Section tone="muted" labelledBy="terminy-title" id="terminy">
        <h2 id="terminy-title" className="text-section font-bold">
          Termíny
        </h2>
        <div className="mt-8">
          {upcoming.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((v) => (
                <SessionCard key={v.session.id} view={v} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Termín zatím není vypsaný"
              action={
                <ButtonLink href={`/kontakt/?oddeleni=vzdelavani&ref=${encodeURIComponent(course.title)}#poptavka`}>
                  Mám zájem o termín
                </ButtonLink>
              }
            >
              Ozveme se vám, jakmile bude nový termín potvrzen.
            </EmptyState>
          )}
        </div>
        <div className="mt-6">
          <RegistrationNote />
        </div>
      </Section>
    </>
  );
}
