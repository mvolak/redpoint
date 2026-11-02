export interface SearchDoc {
  url: string;
  title: string;
  excerpt: string;
  kind: "Stránka" | "Vybavení" | "Kurz" | "Bezpečnost";
  keywords?: string[];
}

export const SEARCH_MAX_QUERY = 80;
export const SEARCH_MAX_RESULTS = 20;

/** Lowercase and strip Czech diacritics so "skoleni" matches "školení". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function sanitiseQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_QUERY);
}

/** Simple ranked search over approved public records only (index is built from visible content). */
export function searchDocs(index: SearchDoc[], query: string): SearchDoc[] {
  const terms = normalise(sanitiseQuery(query)).split(" ").filter((t) => t.length >= 2);
  if (terms.length === 0) return [];
  const scored = index
    .map((doc) => {
      const title = normalise(doc.title);
      const body = normalise(`${doc.excerpt} ${(doc.keywords ?? []).join(" ")}`);
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 3;
        else if (body.includes(t)) score += 1;
        else return { doc, score: 0 };
      }
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, SEARCH_MAX_RESULTS).map((r) => r.doc);
}
