/**
 * Old URL → new URL migration map (machine-readable source for docs/MIGRATION_MAP.md).
 *
 * status:
 *  - keep        URL survives unchanged (no redirect).
 *  - decided     owner-approved equivalent → permanent (308) redirect.
 *  - proposed    prototype proposal → temporary redirect in preview only; needs owner decision.
 *  - needs-owner no equivalent content yet; recover/decide before launch. No redirect.
 *  - gone        intentionally retired; serve 404/410 after owner approval. No redirect.
 *
 * Never blanket-redirect unknown 404s to the homepage.
 *
 * `to` is either an app path ("/kontakt/#poptavka") or an absolute https URL on one of
 * EXTERNAL_REDIRECT_HOSTS (e.g. the clinic or the e-shop). Any other host is rejected by tests.
 */
export type RedirectStatus = "keep" | "decided" | "proposed" | "needs-owner" | "gone";

/** Domains the migration map may redirect to. Add a host only after the owner confirms it. */
export const EXTERNAL_REDIRECT_HOSTS = ["www.redpoint-clinic.cz", "obchod.redcord.cz"] as const;

/** True when a redirect target leaves this site (absolute URL). */
export function isExternalTarget(to: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(to);
}

export interface RedirectRule {
  from: string;
  /** App path, or absolute https URL on an allow-listed host. */
  to?: string;
  status: RedirectStatus;
  reason: string;
  /** Fragment ids on the old page and where they now live. Fragments never reach the server. */
  anchors?: Record<string, string>;
}

export const redirectRules: RedirectRule[] = [
  { from: "/", status: "keep", reason: "Úvod — nová kompozice." },
  { from: "/vybaveni/", status: "keep", reason: "Přehled vybavení — přestavba s filtrem." },
  {
    from: "/vybaveni/fyzioterapeut/",
    to: "/vybaveni/?pro=klinika",
    status: "proposed",
    reason: "Rozcestník publika nahrazen filtrem v katalogu. Ověřit obsah stávající stránky.",
  },
  {
    from: "/vybaveni/trener/",
    to: "/vybaveni/?pro=trener",
    status: "proposed",
    reason: "Rozcestník publika nahrazen filtrem v katalogu.",
  },
  {
    from: "/vybaveni/jednotlivec/",
    to: "/jednotlivec/",
    status: "proposed",
    reason: "Cesta jednotlivce má vlastní stránku s odkazem do e-shopu.",
  },
  { from: "/vybaveni/doplnky/", status: "needs-owner", reason: "Doplňky: obsah nebyl ověřen; možná přímo kategorie e-shopu." },
  { from: "/vybaveni/instalace/", status: "keep", reason: "Odkaz dnes vrací 404 — obnoveno jako stránka instalace." },
  { from: "/vzdelavani/", status: "keep", reason: "Rozcestník vzdělávání." },
  { from: "/vzdelavani/neurac/", status: "keep", reason: "Cesta pro fyzioterapeuty." },
  {
    from: "/vzdelavani/vzdelavani/",
    to: "/vzdelavani/treneri/",
    status: "proposed",
    reason: "Normalizace nevhodné cesty pro trenéry.",
  },
  {
    from: "/vzdelavani/trener/",
    to: "/vzdelavani/treneri/",
    status: "proposed",
    reason: "Dlaždice na /vzdelavani/ odkazuje na /vzdelavani/trener — sjednocení.",
  },
  {
    from: "/vzdelavani/jednotlivec/",
    to: "/jednotlivec/",
    status: "proposed",
    reason: "Vzdělávání pro jednotlivce je součástí stránky jednotlivce.",
  },
  { from: "/vzdelavani/vzdelavaci-program/", status: "keep", reason: "Kalendář; historická tabulka 2020 přesunuta do archivu." },
  { from: "/vzdelavani/workshopy/", status: "keep", reason: "Odkaz dnes vrací 404 — obnoveno s poctivým prázdným stavem." },
  { from: "/vzdelavani/konference/", status: "needs-owner", reason: "Konference: přesná URL a obsah z inventury; žádná náhrada zatím." },
  { from: "/vzdelavani/foto-vzdelavani/", status: "needs-owner", reason: "Foto vzdělávání: ověřit přesnou URL v inventuře; galerie mimo rozsah." },
  {
    from: "/neurac/",
    status: "keep",
    reason: "Dnes přesměrování na vzdělávání; nově samostatná stránka metody. Ověřit příchozí odkazy před spuštěním.",
  },
  {
    from: "/neurac/certified-neurac-practitioner/",
    to: "/neurac/#certifikace",
    status: "proposed",
    reason: "Vysvětlení certifikace sloučeno do stránky metody.",
  },
  { from: "/neurac/kdo-jsou-certified-neurac-practitioners/", status: "keep", reason: "Adresář — pouze schválené záznamy." },
  { from: "/jednotlivec/", status: "keep", reason: "Cesta jednotlivce." },
  { from: "/bezpecnost/", status: "keep", reason: "Rozcestník bezpečnosti a servisu." },
  { from: "/bezpecnost/bezpecnostni-oznameni/", status: "keep", reason: "Obsah dodá vlastník." },
  { from: "/bezpecnost/technicke-kontroly/", status: "keep", reason: "Odkaz dnes vrací 404 — obnoveno s formulářem servisu." },
  { from: "/bezpecnost/pece-a-udrzba/", status: "keep", reason: "Obsah dodá vlastník." },
  { from: "/bezpecnost/skoleni-bezpecnosti/", status: "keep", reason: "Obsah dodá vlastník." },
  { from: "/kontakt/", status: "keep", reason: "Kontakty oddělení a formulář." },
  {
    from: "/kontaktujte-nas/",
    to: "/kontakt/#poptavka",
    status: "proposed",
    reason: "Samostatný formulář sloučen do kontaktní stránky.",
  },
  { from: "/novinky/", status: "needs-owner", reason: "Novinky: rozhodnout o archivu vs. zrušení." },
  {
    from: "/wp-content/uploads/:path*",
    status: "needs-owner",
    reason: "Platné soubory ke stažení zachovat na stejné URL nebo mapovat jednotlivě.",
  },
  // WooCommerce remnants — live (200) on redcord.cz per page inventory 2026-11-02.
  { from: "/obchod/", status: "needs-owner", reason: "Zbytek WooCommerce (200). Návrh: přesměrovat na obchod.redcord.cz — rozhodne vlastník." },
  { from: "/kosik/", status: "needs-owner", reason: "Zbytek WooCommerce — košík. Účty ani objednávky nemigrovat." },
  { from: "/pokladna/", status: "needs-owner", reason: "Zbytek WooCommerce — pokladna." },
  { from: "/muj-ucet/", status: "needs-owner", reason: "Zbytek WooCommerce — zákaznický účet. Účty nemigrovat." },
  // Legacy aliases found by the page inventory 2026-11-02.
  {
    from: "/vzdelavani/fyzioterapeut/",
    to: "/vzdelavani/neurac/",
    status: "proposed",
    reason: "Dnes 301 na /vzdelavani/neurac/ — zachovat stejný cíl.",
  },
  {
    from: "/vybaveni/vybaveni/",
    to: "/vybaveni/",
    status: "proposed",
    reason: "Dnes 301 na /vybaveni/ (cíl řetězce z /vybaveni/fyzioterapeut/).",
  },
  {
    from: "/vybaveni/active/",
    to: "/vybaveni/?pro=trener",
    status: "proposed",
    reason: "Dnes řetězec 301 → /vybaveni/vybaveni-4/ → 404. Opraveno na filtr trenérů.",
  },
  { from: "/vybaveni/vybaveni-3/", status: "gone", reason: "Dnes 404 (cíl rozbitého řetězce z /vybaveni/jednotlivec/)." },
  { from: "/vybaveni/vybaveni-4/", status: "gone", reason: "Dnes 404 (cíl rozbitého řetězce z /vybaveni/active/)." },
  { from: "/fyzioterapeut/", status: "gone", reason: "Dnes 404; odkaz na webu je chybný (relativní URL)." },
  { from: "/trener/", status: "gone", reason: "Dnes 404; odkaz na webu je chybný (relativní URL)." },
  {
    from: "/neurac/lecba-neurac/",
    to: "https://www.redpoint-clinic.cz/fyzioterapie/#neurac",
    status: "proposed",
    reason: "Dnes 301 na stejnou adresu kliniky — zachovat externí přesměrování. Kotva #neurac neověřena.",
  },
];

/** Routes implemented in the prototype app (used by tests to verify redirect targets). */
export const APP_ROUTES = [
  "/",
  "/vybaveni/",
  "/vybaveni/instalace/",
  "/vzdelavani/",
  "/vzdelavani/neurac/",
  "/vzdelavani/treneri/",
  "/vzdelavani/vzdelavaci-program/",
  "/vzdelavani/workshopy/",
  "/neurac/",
  "/neurac/kdo-jsou-certified-neurac-practitioners/",
  "/jednotlivec/",
  "/bezpecnost/",
  "/bezpecnost/technicke-kontroly/",
  "/o-nas/",
  "/kontakt/",
  "/hledat/",
  "/ochrana-osobnich-udaju/",
  "/cookies/",
] as const;

/** Anchor ids that pages must render so mapped fragments resolve. */
export const REQUIRED_ANCHORS: Record<string, string[]> = {
  "/neurac/": ["certifikace"],
  "/kontakt/": ["poptavka"],
};
