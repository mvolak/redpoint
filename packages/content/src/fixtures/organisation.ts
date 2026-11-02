import type { Department, DownloadDoc, Metric, Practitioner, SafetyTopic, Testimonial } from "../types";
import { src } from "./sources";

const KONTAKT = src("/kontakt/", "pending", "Ověřit aktuálnost osob, telefonů a e-mailů.");

export const company = {
  legalName: "AHAMA s.r.o.",
  role: "Výhradní zastoupení Redcord® pro Českou a Slovenskou republiku",
  address: { street: "náměstí 5. května 888/9", postalCode: "500 02", city: "Hradec Králové", country: "Česká republika" },
  ico: "27491579",
  dic: "CZ27491579",
  register: "Vedená u Krajského soudu v Hradci Králové pod spisovou značkou C 22196",
  sukl: "SÚKL registrační č. 042915",
  source: KONTAKT,
} as const;

export const departments: Department[] = [
  {
    id: "obchod",
    name: "Obchod a instalace",
    topics: ["Poptávky vybavení", "Doplňky", "Instalace", "Reklamace"],
    contactPerson: "Aneta Francová",
    phones: [{ number: "+420 603 586 513", label: "doplňky a Redcord" }],
    email: "obchod@redcord.cz",
    enquiryTarget: true,
    source: KONTAKT,
  },
  {
    id: "servis",
    name: "Servis a technické kontroly",
    topics: ["Bezpečnostně technické kontroly", "Péče o vybavení", "Podpora stávajících zákazníků"],
    contactPerson: "Aneta Francová",
    phones: [{ number: "+420 730 517 398", label: "bezpečnostně technické kontroly" }],
    email: "obchod@redcord.cz",
    enquiryTarget: true,
    source: src("/kontakt/", "pending", "Na webu je servis součástí obchodního oddělení. Samostatné směrování je návrh."),
  },
  {
    id: "vzdelavani",
    name: "Vzdělávání",
    topics: ["Kurzy Neurac", "Kurzy Redcord Active", "Workshopy"],
    contactPerson: "Mgr. Lucie Sixtová",
    phones: [{ number: "+420 604 159 517" }],
    email: "kurzy@redcord.cz",
    enquiryTarget: true,
    source: KONTAKT,
  },
  {
    id: "vedeni",
    name: "Vedení společnosti",
    topics: ["Partnerství", "Média"],
    contactPerson: "PhDr. Mgr. Alice Hamáčková",
    phones: [{ number: "+420 730 517 397" }],
    email: "redcord@redcord.cz",
    enquiryTarget: false,
    source: KONTAKT,
  },
];

export const referenceClinic = {
  name: "Redpoint Clinic CZ",
  description:
    "Referenční pracoviště Redcord — rehabilitační, vzdělávací a tréninkové centrum v Hradci Králové a Praze.",
  url: "https://www.redpoint-clinic.cz",
  locations: ["Hradec Králové", "Praha"],
  source: src("/", "pending", "Odkaz na rezervace dodá vlastník; prototyp jej neodhaduje."),
};

export const social = [
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/redcordczsk/" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/redcordczsk/" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com/channel/UCLaizYaXj9tpvgvlfDEOTvw" },
] as const;

export const downloads: DownloadDoc[] = [
  {
    id: "letak-fyzioterapeuti",
    title: "Leták kurzů Neurac pro fyzioterapeuty",
    version: "2019-07",
    fileType: "pdf",
    owner: "AHAMA s.r.o. — vzdělávání",
    url: "https://www.redcord.cz/wp-content/uploads/2019/07/Leták-fyzioterapeuti.pdf",
    category: "kurz",
    source: src("/vzdelavani/neurac/", "pending", "Dokument z roku 2019 — ověřit aktuálnost před publikací."),
  },
  {
    id: "letak-neurac-3",
    title: "Leták kurzu Neurac 3",
    version: "2020",
    fileType: "pdf",
    owner: "AHAMA s.r.o. — vzdělávání",
    category: "kurz",
    source: src("/vzdelavani/neurac/", "pending", "Soubor 2020_Neurac_3_letak.pdf; přesnou URL ověřit v inventuře."),
  },
  {
    id: "letak-treneri",
    title: "Leták kurzů Redcord Active",
    version: "2019-07",
    fileType: "pdf",
    owner: "AHAMA s.r.o. — vzdělávání",
    url: "https://www.redcord.cz/wp-content/uploads/2019/07/Leták-trené_i.pdf",
    category: "kurz",
    source: src("/vzdelavani/vzdelavani/", "pending", "Dokument z roku 2019 — ověřit aktuálnost."),
  },
  {
    id: "program-2020",
    title: "Vzdělávací program 2020 (archiv)",
    version: "2020-04-15",
    fileType: "pdf",
    owner: "AHAMA s.r.o. — vzdělávání",
    category: "program",
    source: src("/vzdelavani/vzdelavaci-program/", "pending", "Historický dokument; jen archiv."),
  },
];

/** Safety hub topics. Bodies intentionally empty: owners must supply approved safety material. */
export const safetyTopics: SafetyTopic[] = [
  {
    slug: "bezpecnostni-oznameni",
    title: "Bezpečnostní oznámení",
    summary: "Oznámení výrobce a výměnné akce týkající se vybavení Redcord.",
    body: [],
    downloadIds: [],
    legacyUrl: "/bezpecnost/bezpecnostni-oznameni/",
    source: src("/bezpecnost/", "pending", "Obsah podstránky nebyl ověřen. Dokumenty dodá vlastník."),
  },
  {
    slug: "technicke-kontroly",
    title: "Technické kontroly",
    summary: "Pravidelné bezpečnostně technické kontroly instalovaného vybavení.",
    body: [],
    downloadIds: [],
    legacyUrl: "/bezpecnost/technicke-kontroly/",
    source: src("/bezpecnost/", "pending", "Odkaz v navigaci vrací 404 (dle zadání). Postup kontrol dodá vlastník."),
  },
  {
    slug: "pece-a-udrzba",
    title: "Péče a údržba",
    summary: "Péče o lana, závěsné body a další součásti pro dlouhou životnost vybavení.",
    body: [],
    downloadIds: [],
    legacyUrl: "/bezpecnost/pece-a-udrzba/",
    source: src("/bezpecnost/", "pending", "Obsah podstránky nebyl ověřen."),
  },
  {
    slug: "skoleni-bezpecnosti",
    title: "Školení bezpečnosti",
    summary: "Zaškolení v bezpečném používání zařízení probíhá vždy s montáží nového vybavení.",
    body: [],
    downloadIds: [],
    legacyUrl: "/bezpecnost/skoleni-bezpecnosti/",
    source: src("/bezpecnost/", "pending", "Věta o zaškolení převzata ze stránky /bezpecnost/."),
  },
];

/**
 * Metrics found on the current site. Kept for review but NOT approved:
 * the home page contradicts itself (200 vs 250 per year). Hidden until approved.
 */
export const metrics: Metric[] = [
  {
    id: "providers",
    value: "150+",
    label: "poskytovatelů zdravotní péče a sportovních zařízení využívá vybavení Redcord",
    scope: "local",
    source: src("/", "pending", "Neověřené tvrzení ze stávajícího webu."),
  },
  {
    id: "trainees",
    value: "200+",
    label: "fyzioterapeutů, lékařů a trenérů ročně ve vzdělávacím programu",
    scope: "local",
    source: src("/", "pending", "Rozpor: jinde na webu „přibližně 250“. Vyžaduje rozhodnutí vlastníka."),
  },
  {
    id: "since",
    value: "1997",
    label: "rok zahájení dovozu systémů Redcord (dříve TerapiMaster)",
    scope: "local",
    source: src("/", "pending"),
  },
];

/** No approved testimonials exist. Do not invent any. */
export const testimonials: Testimonial[] = [];

/**
 * Practitioner directory. The current page lists 13 entries (one marked hidden).
 * Personal records are NOT migrated until owners approve publication per person.
 */
export const practitioners: Practitioner[] = [];

export const practitionerDirectoryNote = {
  observedEntries: 13,
  observedCities: ["Hradec Králové", "Lázně Bohdaneč", "Horažďovice", "Ostrava", "Karlovy Vary", "Plzeň", "Brno", "Praha"],
  source: src(
    "/neurac/kdo-jsou-certified-neurac-practitioners/",
    "pending",
    "Jeden záznam nese štítek „SCHOVÁNO“ — skryté záznamy se nesmí publikovat.",
  ),
};
