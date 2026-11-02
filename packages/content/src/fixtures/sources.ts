import type { SourceMeta } from "../types";

/** Date the current redcord.cz was observed for this prototype. */
export const OBSERVED = "2026-11-01";

export const src = (
  path: string,
  approval: SourceMeta["approval"] = "pending",
  note?: string,
): SourceMeta => ({
  sourceUrl: path.startsWith("http") ? path : `https://www.redcord.cz${path}`,
  observedOn: OBSERVED,
  approval,
  ...(note ? { note } : {}),
});

/** New copy written for the prototype; requires native Czech review and owner approval. */
export const proposal = (note?: string): SourceMeta => ({
  sourceUrl: "prototype",
  observedOn: OBSERVED,
  approval: "proposal",
  ...(note ? { note } : {}),
});

/** Invented demo data — never publish. */
export const illustrative = (
  note = "Ilustrační data pro ověření rozhraní. Nejde o skutečnou nabídku.",
): SourceMeta => ({
  sourceUrl: "prototype",
  observedOn: OBSERVED,
  approval: "illustrative",
  note,
});
