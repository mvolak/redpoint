import type { SearchDoc } from "@redcord/content";
import { site } from "@/config/site";
import { repo } from "./content";

/** Public search index built only from records visible in the current publish mode. */
export function buildSearchIndex(): SearchDoc[] {
  const pages: SearchDoc[] = [
    { url: "/vybaveni/", title: "Vybavení Redcord", excerpt: "Řady vybavení pro kliniky, trenéry a jednotlivce.", kind: "Stránka", keywords: ["katalog", "produkty"] },
    { url: "/vybaveni/instalace/", title: "Instalace vybavení", excerpt: "Instalace a zaškolení k vybavení Redcord.", kind: "Stránka", keywords: ["montáž"] },
    { url: "/jednotlivec/", title: "Redcord pro jednotlivce", excerpt: "Sestavy pro domácí trénink a nákup v e-shopu.", kind: "Stránka", keywords: ["domácí", "sport"] },
    { url: "/vzdelavani/", title: "Vzdělávání", excerpt: "Kurzy Neurac, Redcord Active a workshopy.", kind: "Stránka", keywords: ["kurzy"] },
    { url: "/vzdelavani/neurac/", title: "Vzdělávání pro fyzioterapeuty", excerpt: "Struktura kurzů Neurac 1–3.", kind: "Stránka", keywords: ["fyzioterapeut", "lékař"] },
    { url: "/vzdelavani/treneri/", title: "Vzdělávání pro trenéry", excerpt: "Redcord Active Intro, Advanced a Pro.", kind: "Stránka", keywords: ["trenér"] },
    { url: "/vzdelavani/vzdelavaci-program/", title: "Termíny kurzů", excerpt: "Kalendář kurzů a archiv.", kind: "Stránka", keywords: ["termín", "kalendář", "program"] },
    { url: "/vzdelavani/workshopy/", title: "Workshopy", excerpt: "Krátké tematické workshopy.", kind: "Stránka" },
    { url: "/neurac/", title: "Metoda Neurac", excerpt: "Vztah vybavení Redcord a metody Neurac.", kind: "Stránka", keywords: ["certifikace"] },
    { url: "/neurac/kdo-jsou-certified-neurac-practitioners/", title: "Certified Neurac Practitioners", excerpt: "Certifikovaní terapeuti podle města.", kind: "Stránka", keywords: ["terapeut", "adresář"] },
    { url: "/bezpecnost/", title: "Servis a bezpečnost", excerpt: "Bezpečnost používání, kontroly, péče.", kind: "Stránka", keywords: ["servis"] },
    { url: "/o-nas/", title: "O nás", excerpt: `${site.legalName} — zastoupení Redcord pro ČR a SR.`, kind: "Stránka" },
    { url: "/kontakt/", title: "Kontakt", excerpt: "Obchod, vzdělávání, servis.", kind: "Stránka", keywords: ["telefon", "email", "poptávka"] },
  ];
  const products: SearchDoc[] = repo.listProducts().map((p) => ({
    url: `/vybaveni/${p.slug}/`,
    title: p.name,
    excerpt: p.summary,
    kind: "Vybavení",
  }));
  const courses: SearchDoc[] = repo.listCourses().map((c) => ({
    url: `/vzdelavani/kurzy/${c.slug}/`,
    title: c.title,
    excerpt: c.eligibility,
    kind: "Kurz",
    keywords: [c.level, ...c.prerequisites],
  }));
  const safety: SearchDoc[] = repo.listSafetyTopics().map((t) => ({
    url: `/bezpecnost/${t.slug}/`,
    title: t.title,
    excerpt: t.summary,
    kind: "Bezpečnost",
  }));
  return [...pages, ...products, ...courses, ...safety];
}
