"use client";

import { useEffect, type ReactNode } from "react";
import { ExternalMark, buttonClass, type ButtonVariant } from "@redcord/ui";
import type { AnalyticsEvent } from "@redcord/integrations";
import { track } from "@/lib/analytics";

/** External handoff link (shop / registration / clinic). A click is a handoff, not a conversion. */
export function HandoffLink({
  href,
  event,
  props,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  event: Extract<AnalyticsEvent, "shop_handoff" | "registration_handoff">;
  props?: Record<string, string>;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <a href={href} rel="noopener" className={buttonClass(variant, className)} onClick={() => track(event, props)}>
      {children}
      <ExternalMark />
    </a>
  );
}

/** Fires a view event once on mount (e.g. equipment_viewed, course_viewed). */
export function TrackView({ event, props }: { event: AnalyticsEvent; props?: Record<string, string> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key]);
  return null;
}
