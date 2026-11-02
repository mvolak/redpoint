import type { Metadata } from "next";
import Link from "next/link";
import { AUDIENCE_LABELS, type Audience, type CoursePathway } from "@redcord/content";
import { ButtonLink, EmptyState, Section, buttonClass } from "@redcord/ui";
import { PageIntro, ReviewOnly, SessionCard } from "@/components/blocks";
import { DownloadList, PATHWAY_LABEL, RegistrationNote } from "@/components/education";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Vzdělávací program — termíny kurzů",
  description: "Aktuální termíny kurzů Neurac, Redcord Active a workshopů. Filtrujte podle cesty, místa a profese.",
  alternates: { canonical: "/vzdelavani/vzdelavaci-program/" },
};

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const asPathway = (v?: string): CoursePathway | undefined =>
  v === "neurac" || v === "active" || v === "workshop" ? v : undefined;
const asAudience = (v?: string): Audience | undefined =>
  v === "klinika" || v === "trener" || v === "jednotlivec" ? v : undefined;

const select =
  "mt-2 block w-full rounded-xl border border-[#c9c9c9] bg-white px-4 py-3 text-base focus:border-ink focus:outline-3 focus:outline-brand";

export default async function ProgramPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const locations = repo.listSessionLocations();
  const pathway = asPathway(one(sp.cesta));
  const audience = asAudience(one(sp.pro));
  const rawLoc = one(sp.misto);
  const location = rawLoc && locations.includes(rawLoc) ? rawLoc : undefined;
  const filtered = Boolean(pathway || audience || location);

  const { upcoming, archive } = repo.listSessions({ now: new Date(), pathway, audience, location });

  return (
    <>
      <PageIntro
        crumbs={[{ href: "/vzdelavani/", label: "Vzdělávání" }, { label: "Vzdělávací program" }]}
        title="Termíny kurzů"
        intro="Přehled vypsaných termínů. Proběhlé kurzy automaticky přesouváme do archivu."
      />

      <Section tone="muted" labelledBy="filter-title" className="lg:py-14">
        <form method="get" action="/vzdelavani/vzdelavaci-program/" role="search" aria-labelledby="filter-title" className="rounded-card bg-white p-6 md:p-8">
          <h2 id="filter-title" className="text-xl font-bold">
            Filtrovat termíny
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="f-cesta" className="font-semibold">
                Vzdělávací cesta
              </label>
              <select id="f-cesta" name="cesta" defaultValue={pathway ?? ""} className={select}>
                <option value="">Všechny</option>
                {(Object.keys(PATHWAY_LABEL) as CoursePathway[]).map((p) => (
                  <option key={p} value={p}>
                    {PATHWAY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-pro" className="font-semibold">
                Profese
              </label>
              <select id="f-pro" name="pro" defaultValue={audience ?? ""} className={select}>
                <option value="">Všechny</option>
                {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-misto" className="font-semibold">
                Místo
              </label>
              <select id="f-misto" name="misto" defaultValue={location ?? ""} className={select}>
                <option value="">Všechna</option>
                {locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" className={buttonClass("dark")}>
              Zobrazit termíny
            </button>
            {filtered && (
              <Link href="/vzdelavani/vzdelavaci-program/" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                Zrušit filtry
              </Link>
            )}
          </div>
        </form>

        <div className="mt-10" aria-live="polite">
          <h2 className="text-2xl font-bold">
            Nadcházející termíny <span className="font-normal text-muted">({upcoming.length})</span>
          </h2>
          <div className="mt-6">
            {upcoming.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((v) => (
                  <SessionCard key={v.session.id} view={v} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={filtered ? "Pro zvolené filtry nemáme vypsaný termín" : "Nové termíny zatím nejsou vypsané"}
                action={
                  <>
                    <ButtonLink href="/kontakt/?oddeleni=vzdelavani#poptavka">Zeptat se na termín</ButtonLink>
                    {filtered && (
                      <ButtonLink href="/vzdelavani/vzdelavaci-program/" variant="outline-dark">
                        Zobrazit vše
                      </ButtonLink>
                    )}
                  </>
                }
              >
                Napište vzdělávacímu oddělení — dáme vám vědět, jakmile bude termín potvrzen.
              </EmptyState>
            )}
          </div>
          <div className="mt-6">
            <RegistrationNote />
          </div>
        </div>
      </Section>

      <Section labelledBy="archive-title">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card border border-line px-6 py-4 [&::-webkit-details-marker]:hidden">
            <h2 id="archive-title" className="text-xl font-bold">
              Archiv proběhlých kurzů <span className="font-normal text-muted">({archive.length})</span>
            </h2>
            <span aria-hidden="true" className="text-2xl text-brand transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-6">
            <p className="text-muted">Historické termíny a ceny slouží jen pro informaci a nejsou aktuální nabídkou.</p>
            {archive.length > 0 ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {archive.map((v) => (
                  <SessionCard key={v.session.id} view={v} headingLevel="h3" />
                ))}
              </div>
            ) : (
              <p className="mt-4">Archiv je pro zvolené filtry prázdný.</p>
            )}
            <div className="mt-6">
              <DownloadList ids={["program-2020"]} />
            </div>
          </div>
        </details>
        <div className="mt-8">
          <ReviewOnly>
            Stávající stránka zobrazuje program roku 2020 jako aktuální. Prototyp jej přesouvá do archivu. Nadcházející karty označené
            „Ilustrační termín“ jsou vymyšlené jen pro ukázku stavů (otevřeno / obsazeno / zrušeno / neověřeno) a v produkci se nezobrazí.
            Registrační systém: stávající web odkazuje na kategorii e-shopu — autoritativní zdroj registrace musí potvrdit vlastník.
          </ReviewOnly>
        </div>
      </Section>
    </>
  );
}
