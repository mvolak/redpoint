/**
 * External handoffs. These are destinations outside this site: the existing PrestaShop
 * e-shop, the authoritative course registration and the Redpoint Clinic. A click is a
 * handoff, never a sale, enrolment or booking.
 */

export interface ExternalDestination {
  url: string;
  label: string;
  /** Who operates it and whether the link is verified by the owner. */
  operator: string;
  verified: boolean;
}

export const SHOP = {
  home: { url: "https://obchod.redcord.cz", label: "E-shop Redcord", operator: "AHAMA s.r.o. (PrestaShop)", verified: false },
  equipment: { url: "https://obchod.redcord.cz/7-vybaveni", label: "Vybavení v e-shopu", operator: "AHAMA s.r.o. (PrestaShop)", verified: false },
  education: {
    url: "https://obchod.redcord.cz/6-vzdelavani",
    label: "Objednání účasti na kurzu",
    operator: "AHAMA s.r.o. (PrestaShop)",
    verified: false,
  },
} satisfies Record<string, ExternalDestination>;

/** Booking URL must come from owner configuration. Returns undefined rather than guessing. */
export function getClinicBookingUrl(env: string | undefined): string | undefined {
  if (!env) return undefined;
  try {
    const u = new URL(env);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Only allow http(s) external destinations for handoff links. */
export function isSafeExternalUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
