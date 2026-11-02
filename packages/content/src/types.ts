/**
 * Typed content schemas for Redcord (and later Redpoint) sites.
 * Every migrated/fixture record carries provenance so reviewers can tell
 * source evidence from proposals and placeholders.
 */

/** Approval workflow state for a record. Only "approved" may render in production. */
export type ApprovalState =
  | "approved" // owner-approved for publication
  | "pending" // taken from a real source, awaiting owner validation
  | "proposal" // new copy/structure written for this prototype
  | "illustrative"; // invented demo data — must never be published

export interface SourceMeta {
  /** Where the content came from (URL) or "prototype" for new proposals. */
  sourceUrl: string;
  /** ISO date the source was observed. */
  observedOn: string;
  approval: ApprovalState;
  /** Free-form reviewer note, e.g. inconsistencies found in the source. */
  note?: string;
}

export type Audience = "klinika" | "trener" | "jednotlivec";

export const AUDIENCE_LABELS: Record<Audience, string> = {
  klinika: "Fyzioterapeuti a klinická pracoviště",
  trener: "Trenéři a sportovní zařízení",
  jednotlivec: "Jednotlivci a domácí použití",
};

export interface MediaRef {
  /** Asset manifest id. Undefined = no approved asset; render a labelled placeholder. */
  assetId?: string;
  alt: string;
  /** What the final photograph should show (brief for the owner/photographer). */
  brief: string;
}

export interface ProductFamily {
  slug: string;
  name: string;
  audiences: Audience[];
  summary: string;
  /** Uses described in approved copy. Empty until supplied. */
  uses: string[];
  /** "consult" = quotation/installation; "shop" = individual purchase via e-shop. */
  purchasePath: "consult" | "shop";
  /** Approved e-shop deep link. Undefined = advice request instead. */
  shopUrl?: string;
  /** Price is never mirrored without a trusted integration. */
  priceDisplay: "on-request";
  relatedCourseSlugs: string[];
  media: MediaRef;
  source: SourceMeta;
}

export type CoursePathway = "neurac" | "active" | "workshop";

export interface CourseDefinition {
  slug: string;
  title: string;
  pathway: CoursePathway;
  level: string;
  audiences: Audience[];
  eligibility: string;
  prerequisites: string[];
  outcomes: string[];
  durationNote?: string;
  /** Approved leaflet/download ids. */
  downloadIds: string[];
  source: SourceMeta;
}

/** Explicit (not inferred) session status as delivered by the source of truth. */
export type SessionStatus = "scheduled" | "full" | "cancelled" | "unknown";
/** Derived display state; "past" is computed from end time, never stored. */
export type SessionState = "open" | "full" | "cancelled" | "past" | "unknown";

export interface CourseSession {
  id: string;
  courseSlug: string;
  /** ISO 8601 with offset, interpreted and displayed in `timezone`. */
  start: string;
  end: string;
  timezone: "Europe/Prague";
  location: string;
  lecturer?: string;
  language: "cs" | "sk" | "en";
  status: SessionStatus;
  /** Authoritative external registration destination. Undefined = registration unknown. */
  registrationUrl?: string;
  price?: { amount: number; currency: "CZK" | "EUR"; note?: string };
  /** Where seat availability comes from. "none" = do not show seats. */
  capacitySource: "none" | "registration-system";
  source: SourceMeta;
}

export type DepartmentId = "obchod" | "vzdelavani" | "servis" | "vedeni";

export interface Department {
  id: DepartmentId;
  name: string;
  topics: string[];
  contactPerson?: string;
  phones: { number: string; label?: string }[];
  email: string;
  /** Whether the department is a routing target in the enquiry form. */
  enquiryTarget: boolean;
  source: SourceMeta;
}

export interface DownloadDoc {
  id: string;
  title: string;
  version: string;
  fileType: "pdf";
  owner: string;
  url?: string;
  category: "kurz" | "bezpecnost" | "pece" | "program";
  source: SourceMeta;
}

export interface Practitioner {
  id: string;
  name: string;
  city: string;
  profession: string;
  certification: string;
  publicVisibility: boolean;
  reviewedOn?: string;
  source: SourceMeta;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  source: SourceMeta;
}

export interface Metric {
  id: string;
  value: string;
  label: string;
  scope: "local" | "global";
  source: SourceMeta;
}

export interface SafetyTopic {
  slug: string;
  title: string;
  summary: string;
  /** Approved body paragraphs. Empty = owner must supply; show unavailable state. */
  body: string[];
  downloadIds: string[];
  legacyUrl: string;
  source: SourceMeta;
}
