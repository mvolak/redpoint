import { proposal, sourceFrom } from "@redcord/content";

/**
 * Page copy records. Everything marked `proposal` is new Czech copy written for the review
 * prototype and needs native-speaker review and owner approval. `pending` copy is taken from
 * the current redcord.cz and needs validation.
 */
export const homeCopy = {
  hero: {
    title: "Redcord vybavení. Neurac metoda. Podpora pro vaši praxi.",
    lead: "Vybavení Redcord dodáváme, instalujeme a servisujeme pro fyzioterapeutická pracoviště, trenéry i jednotlivce. K němu nabízíme vzdělávání v metodě Neurac a programu Redcord Active.",
    services: ["Dodávka a instalace vybavení", "Technické kontroly a servis", "Kurzy Neurac a Redcord Active"],
    source: proposal("Pracovní titulek ze zadání. Zmínku o místním zastoupení doplnit až po schválení."),
  },
  audiences: {
    title: "Pro koho je Redcord",
    source: proposal(),
  },
  equipment: {
    title: "Vybavení přizpůsobené vašemu prostoru",
    lead: "Veškeré vybavení, které dodáváme, na přání klienta také instalujeme. Řešení vždy přizpůsobíme vašim potřebám a možnostem.",
    source: sourceFrom("/vybaveni/", "pending", "Druhá věta převzata ze stávajícího webu."),
  },
  method: {
    title: "Vybavení a metoda nejsou totéž",
    body: [
      "Redcord® je závěsný systém — vybavení, které se využívá ve fyzioterapii i v tréninku.",
      "Neurac® je terapeutický přístup, který s vybavením Redcord pracuje. Fyzioterapeuti a lékaři se jej učí ve strukturovaných kurzech Neurac 1–3.",
    ],
    source: proposal("Formulace vztahu vybavení a metody vyžaduje odborné schválení. Bez tvrzení o účinnosti."),
  },
  installation: {
    title: "Instalace, zaškolení a pravidelné kontroly",
    lead: "Zaškolení v bezpečném používání zařízení probíhá vždy s montáží nového vybavení. Pro instalované vybavení zajišťujeme bezpečnostně technické kontroly.",
    source: sourceFrom("/bezpecnost/", "pending", "Sloučeno ze stránek bezpečnost a kontakt."),
  },
  clinic: {
    title: "Referenční pracoviště Redpoint Clinic CZ",
    lead: "Rehabilitační, vzdělávací a tréninkové centrum, kde se vybavení Redcord denně používá a kde probíhá část kurzů.",
    source: sourceFrom("/", "pending"),
  },
} as const;
