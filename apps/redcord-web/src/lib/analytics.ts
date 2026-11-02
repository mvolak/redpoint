"use client";

import { sanitiseProps, shouldSend, type AnalyticsEvent, type ConsentState } from "@redcord/integrations";

/**
 * Prototype analytics: no vendor, no consent manager, nothing leaves the browser.
 * Events are emitted as a DOM CustomEvent ("redcord:analytics") so reviewers/tests can observe them.
 */
const consent: ConsentState = "unknown";

export function track(event: AnalyticsEvent, props?: Record<string, string>) {
  const detail = { event, props: sanitiseProps(props), sent: shouldSend(consent) };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("redcord:analytics", { detail }));
    if (process.env.NODE_ENV !== "production") console.debug("[analytics:prototype]", detail);
  }
}
