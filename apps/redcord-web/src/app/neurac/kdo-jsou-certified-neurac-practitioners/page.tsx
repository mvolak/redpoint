import type { Metadata } from "next";
import { practitionerDirectoryNote, referenceClinic } from "@redcord/content";
import { ButtonLink, EmptyState, Section } from "@redcord/ui";
import { PageIntro, ReviewOnly } from "@/components/blocks";
import { repo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Certified Neurac Practitioners",
  description: "Seznam certifikovaných terapeutů Neurac v České republice podle města.",
  alternates: { canonical: "/neurac/kdo-jsou-certified-neurac-practitioners/" },
};

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const city = typeof sp.mesto === "string" ? sp.mesto : undefined;
  const all = repo.listPractitioners();
  const cities = [...new Set(all.map((p) => p.city))].sort((a, b) => a.localeCompare(b, "cs"));
  const list = repo.listPractitioners({ city: city && cities.includes(city) ? city : undefined });

  return (
    <>
      <PageIntro
        crumbs={[{ href: "/neurac/", label: "Neurac" }, { label: "Certified Neurac Practitioners" }]}
        title="Kdo jsou Certified Neurac® Practitioners"
        intro="Terapeuti, kteří absolvovali certifikační cestu Neurac. Zobrazujeme pouze záznamy se souhlasem se zveřejněním a s datem poslední kontroly."
      />
      <Section tone="muted" labelledBy="dir-title">
        <h2 id="dir-title" className="sr-only">
          Seznam terapeutů
        </h2>
        {all.length > 0 ? (
          <>
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="mesto" className="font-semibold">
                  Město
                </label>
                <select id="mesto" name="mesto" defaultValue={city ?? ""} className="mt-2 block rounded-xl border border-[#c9c9c9] bg-white px-4 py-3">
                  <option value="">Všechna města</option>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button className="min-h-12 rounded-full bg-ink px-6 font-semibold text-white">Filtrovat</button>
            </form>
            <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <li key={p.id} className="rounded-card bg-white p-6">
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-muted">
                    {p.profession} · {p.city}
                  </p>
                  <p className="mt-2 text-sm">{p.certification}</p>
                  {p.reviewedOn && <p className="mt-2 text-xs text-muted">Ověřeno {p.reviewedOn}</p>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title="Seznam aktualizujeme"
            action={
              <>
                <ButtonLink href="/kontakt/?oddeleni=vzdelavani#poptavka">Zeptat se na terapeuta ve vašem městě</ButtonLink>
                <ButtonLink href={referenceClinic.url} external variant="outline-dark">
                  {referenceClinic.name}
                </ButtonLink>
              </>
            }
          >
            Ověřujeme souhlas terapeutů se zveřejněním. Do té doby vám rádi doporučíme terapeuta e-mailem.
          </EmptyState>
        )}
        <div className="mt-8">
          <ReviewOnly>
            Stávající stránka uvádí {practitionerDirectoryNote.observedEntries} záznamů (města: {practitionerDirectoryNote.observedCities.join(", ")}),
            jeden se štítkem „SCHOVÁNO“. Osobní záznamy nepřebíráme, dokud vlastník nepotvrdí souhlas se zveřejněním a datum kontroly u
            každého terapeuta. Filtr podle města se zobrazí automaticky se schválenými záznamy.
          </ReviewOnly>
        </div>
      </Section>
    </>
  );
}
