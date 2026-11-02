import { company, referenceClinic, social } from "@redcord/content";
import { SHOP } from "@redcord/integrations";

/**
 * Site configuration — owns identity, navigation, contacts, external endpoints and features.
 * A future apps/redpoint-web supplies its own config with the same shape.
 */

export type SiteEnv = "preview" | "production";

const env: SiteEnv = process.env.SITE_ENV === "production" ? "production" : "preview";

export interface NavItem {
  label: string;
  /** Shorter visible label for the desktop top bar, which has little room; must be the start of `label`. */
  shortLabel?: string;
  href: string;
  description?: string;
  children?: { label: string; href: string }[];
}

export const site = {
  id: "redcord-cz",
  name: "Redcord",
  legalName: company.legalName,
  locale: "cs-CZ",
  env,
  origin: process.env.SITE_ORIGIN ?? "http://localhost:3000",
  /** Review mode shows prototype banners and reviewer notes. Always on outside production. */
  reviewMode: env !== "production",
  logo: {
    /** No approved logo master supplied: the header uses a text wordmark placeholder. */
    approvedAsset: false,
  },
  features: {
    /** Invented sessions to demonstrate the calendar UI; never in production. */
    showIllustrativeSessions: env !== "production",
    enquiryAdapter: process.env.ENQUIRY_ADAPTER ?? "test",
    heroVideo: false,
    analytics: false,
  },
  external: {
    shop: SHOP.home,
    shopEquipment: SHOP.equipment,
    courseRegistration: SHOP.education,
    clinic: { url: referenceClinic.url, label: "Redpoint Clinic CZ" },
    /** Redpoint Clinic booking is embedded in this site (packages/booking, /rezervace/). */
    clinicBooking: { href: "/rezervace/", label: "Objednat se na terapii" },
  },
  social,
  primaryCta: { label: "Konzultace", href: "/kontakt/#poptavka" },
  /** Header button next to Konzultace → embedded clinic booking. */
  bookingCta: { label: "Rezervace", href: "/rezervace/" },
  nav: [
    {
      label: "Vybavení",
      href: "/vybaveni/",
      description: "Řady vybavení pro kliniky, trenéry a jednotlivce",
      children: [
        { label: "Přehled vybavení", href: "/vybaveni/" },
        { label: "Pro fyzioterapeuty", href: "/vybaveni/?pro=klinika" },
        { label: "Pro trenéry", href: "/vybaveni/?pro=trener" },
        { label: "Pro jednotlivce", href: "/jednotlivec/" },
        { label: "Instalace", href: "/vybaveni/instalace/" },
      ],
    },
    {
      label: "Vzdělávání",
      href: "/vzdelavani/",
      description: "Kurzy Neurac a Redcord Active",
      children: [
        { label: "Přehled vzdělávání", href: "/vzdelavani/" },
        { label: "Neurac pro fyzioterapeuty", href: "/vzdelavani/neurac/" },
        { label: "Redcord Active pro trenéry", href: "/vzdelavani/treneri/" },
        { label: "Workshopy", href: "/vzdelavani/workshopy/" },
        { label: "Termíny kurzů", href: "/vzdelavani/vzdelavaci-program/" },
      ],
    },
    {
      label: "Neurac",
      href: "/neurac/",
      children: [
        { label: "Metoda Neurac", href: "/neurac/" },
        { label: "Certified Neurac Practitioners", href: "/neurac/kdo-jsou-certified-neurac-practitioners/" },
      ],
    },
    {
      label: "Servis a bezpečnost",
      shortLabel: "Servis",
      href: "/bezpecnost/",
      children: [
        { label: "Přehled", href: "/bezpecnost/" },
        { label: "Technické kontroly", href: "/bezpecnost/technicke-kontroly/" },
        { label: "Bezpečnostní oznámení", href: "/bezpecnost/bezpecnostni-oznameni/" },
        { label: "Péče a údržba", href: "/bezpecnost/pece-a-udrzba/" },
        { label: "Školení bezpečnosti", href: "/bezpecnost/skoleni-bezpecnosti/" },
      ],
    },
    { label: "O nás", href: "/o-nas/" },
    { label: "Kontakt", href: "/kontakt/" },
  ] satisfies NavItem[],
} as const;

export type Site = typeof site;
