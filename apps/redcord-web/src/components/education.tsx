import Link from "next/link";
import type { CourseDefinition, CoursePathway } from "@redcord/content";
import { ArrowLink, ButtonLink, EmptyState, Pill, Section, SectionHeading } from "@redcord/ui";
import { repo } from "@/lib/content";
import { SessionCard, SourceBadge } from "./blocks";

/** Ordered course ladder with prerequisites made explicit. */
export function CourseLadder({ courses }: { courses: CourseDefinition[] }) {
  return (
    <ol className="grid gap-5 lg:grid-cols-3">
      {courses.map((c, i) => (
        <li key={c.slug} className="relative flex flex-col rounded-card border border-line bg-white p-6 md:p-8">
          <span aria-hidden="true" className="text-sm font-bold text-brand">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-3 text-2xl font-bold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted">{c.level}</p>
          <p className="mt-4 leading-relaxed">{c.eligibility}</p>
          <div className="mt-4">
            <p className="text-sm font-semibold">Podmínky účasti</p>
            {c.prerequisites.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-muted">
                {c.prerequisites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[15px] text-muted">Bez předchozího kurzu</p>
            )}
          </div>
          <div className="mt-auto pt-6">
            <ArrowLink href={`/vzdelavani/kurzy/${c.slug}/`}>Detail kurzu</ArrowLink>
            <div className="mt-2">
              <SourceBadge source={c.source} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Upcoming sessions for a pathway; honest empty state when none. */
export function PathwaySessions({ pathway, title = "Nejbližší termíny" }: { pathway?: CoursePathway; title?: string }) {
  const { upcoming } = repo.listSessions({ now: new Date(), pathway });
  return (
    <Section tone="muted" labelledBy={`sessions-${pathway ?? "all"}`}>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading id={`sessions-${pathway ?? "all"}`} title={title} />
        <ButtonLink href={`/vzdelavani/vzdelavaci-program/${pathway ? `?cesta=${pathway}` : ""}`} variant="outline-dark">
          Celý kalendář
        </ButtonLink>
      </div>
      <div className="mt-8">
        {upcoming.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((v) => (
              <SessionCard key={v.session.id} view={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Termíny zatím nejsou vypsané"
            action={<ButtonLink href="/kontakt/?oddeleni=vzdelavani#poptavka">Zeptat se na termín</ButtonLink>}
          >
            Jakmile budou nové termíny potvrzeny, zveřejníme je zde. Do té doby vám rádi odpovíme e-mailem.
          </EmptyState>
        )}
      </div>
    </Section>
  );
}

export const PATHWAY_LABEL: Record<CoursePathway, string> = {
  neurac: "Neurac — fyzioterapeuti a lékaři",
  active: "Redcord Active — trenéři",
  workshop: "Workshopy",
};

export function DownloadList({ ids }: { ids: string[] }) {
  const docs = repo.getDownloads(ids);
  if (docs.length === 0) return null;
  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-3">
          {d.url ? (
            <a href={d.url} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
              {d.title}
            </a>
          ) : (
            <span className="font-semibold">{d.title}</span>
          )}
          <Pill>
            {d.fileType.toUpperCase()} · verze {d.version}
          </Pill>
          {!d.url && <span className="text-sm text-muted">Soubor bude doplněn</span>}
          <SourceBadge source={d.source} />
        </li>
      ))}
    </ul>
  );
}

export function RegistrationNote() {
  return (
    <p className="text-muted">
      Registrace probíhá v externím systému. Kliknutím na registraci odcházíte z webu; účast potvrzuje až vzdělávací oddělení.{" "}
      <Link href="/kontakt/?oddeleni=vzdelavani#poptavka" className="font-semibold text-ink underline">
        Dotaz na vzdělávání
      </Link>
    </p>
  );
}
