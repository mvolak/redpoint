import type { Metadata } from "next";
import Link from "next/link";
import { SEARCH_MAX_QUERY, sanitiseQuery, searchDocs } from "@redcord/content";
import { EmptyState, Section, buttonClass } from "@redcord/ui";
import { PageIntro } from "@/components/blocks";
import { buildSearchIndex } from "@/lib/search-index";

export const metadata: Metadata = {
  title: "Hledat",
  robots: { index: false, follow: true },
  alternates: { canonical: "/hledat/" },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = sanitiseQuery(Array.isArray(sp.q) ? sp.q[0] : sp.q);
  const results = q ? searchDocs(buildSearchIndex(), q) : [];

  return (
    <>
      <PageIntro crumbs={[{ label: "Hledat" }]} title="Hledat na webu" />
      <Section tone="muted" labelledBy="search-results" className="lg:py-14">
        <form role="search" method="get" action="/hledat/" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="q" className="font-semibold">
              Hledaný výraz
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={SEARCH_MAX_QUERY}
              autoComplete="off"
              className="mt-2 block w-full rounded-full border border-[#c9c9c9] bg-white px-5 py-3 text-lg focus:border-ink focus:outline-3 focus:outline-brand"
            />
          </div>
          <button type="submit" className={buttonClass("dark")}>
            Hledat
          </button>
        </form>

        <div className="mt-10" aria-live="polite">
          <h2 id="search-results" className="text-2xl font-bold">
            {q ? `Výsledky pro „${q}“ (${results.length})` : "Zadejte hledaný výraz"}
          </h2>
          {q && results.length === 0 && (
            <div className="mt-6">
              <EmptyState title="Nic jsme nenašli">
                Zkuste jiné slovo (např. „Neurac“, „instalace“, „kontrola“), nebo{" "}
                <Link href="/kontakt/" className="font-semibold text-ink underline">
                  nám napište
                </Link>
                .
              </EmptyState>
            </div>
          )}
          {results.length > 0 && (
            <ul className="mt-6 divide-y divide-line rounded-card bg-white">
              {results.map((r) => (
                <li key={r.url} className="p-5 md:p-6">
                  <p className="text-sm text-muted">{r.kind}</p>
                  <Link href={r.url} className="text-lg font-bold underline-offset-4 hover:text-brand hover:underline">
                    {r.title}
                  </Link>
                  <p className="mt-1 text-muted">{r.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </>
  );
}
