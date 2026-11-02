/**
 * Analytics event contract. Nothing is sent in the prototype: there is no consent manager
 * and no tracking vendor. Events are dispatched to an in-page sink for development only.
 * An outbound click (shop_handoff, registration_handoff) is NOT a sale or enrolment.
 */

export const ANALYTICS_EVENTS = [
  "equipment_viewed",
  "quote_started",
  "enquiry_accepted",
  "course_viewed",
  "registration_handoff",
  "shop_handoff",
  "support_enquiry_accepted",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  /** Content identifiers only. Never personal or health data. */
  props?: Record<string, string>;
}

export type ConsentState = "unknown" | "rejected" | "granted";

export function shouldSend(consent: ConsentState): boolean {
  return consent === "granted";
}

const FORBIDDEN_PROP = /mail|phone|name|message|telefon|jmeno|zprava/i;

/** Strip anything that looks like personal data from event props. */
export function sanitiseProps(props: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(Object.entries(props).filter(([k]) => !FORBIDDEN_PROP.test(k)));
}
