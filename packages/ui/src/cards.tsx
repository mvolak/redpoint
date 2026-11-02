import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { MediaPlaceholder } from "./media";

/** Rounded photo-led card with a dark bottom overlay (reference: application cards). */
export function PhotoCard({
  href,
  title,
  kicker,
  description,
  mediaBrief,
  media,
  ratio = "3/4",
  headingLevel: H = "h3",
}: {
  href: string;
  title: string;
  kicker?: string;
  description?: string;
  /** Placeholder brief, used when no `media` element is supplied. */
  mediaBrief?: string;
  /** Rendered image (e.g. the app's <Media> component). Takes precedence over mediaBrief. */
  media?: ReactNode;
  ratio?: "3/4" | "4/5" | "4/3";
  headingLevel?: "h2" | "h3";
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-card bg-ink text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand"
    >
      <div className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none">
        {media ?? <MediaPlaceholder brief={mediaBrief ?? ""} ratio={ratio} tone="dark" hideLabel />}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pt-20">
        {kicker && <p className="mb-2 text-sm font-semibold text-[#ff6b80]">{kicker}</p>}
        <H className="text-2xl font-bold leading-tight">{title}</H>
        {description && <p className="mt-2 text-sm leading-relaxed text-white/80">{description}</p>}
        <span aria-hidden="true" className="mt-4 inline-block text-sm font-semibold">
          Pokračovat →
        </span>
      </div>
      {!media && (
        <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[11px] uppercase tracking-wider text-white/80">
          Foto čeká na schválení
        </span>
      )}
    </Link>
  );
}

/** Bordered content card. */
export function Card({ children, className, tone = "white" }: { children: ReactNode; className?: string; tone?: "white" | "ink" }) {
  return (
    <div
      className={cx(
        "rounded-card p-6 md:p-8",
        tone === "ink" ? "bg-ink-soft text-white" : "border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "red" | "dark" | "warn" | "success" }) {
  const tones = {
    neutral: "border border-line bg-surface text-ink",
    red: "bg-brand text-white",
    dark: "bg-ink text-white",
    warn: "bg-warn-bg text-warn border border-[#f0d9a0]",
    success: "bg-[#e7f4ea] text-[#1d5e2c] border border-[#bfe0c7]",
  } as const;
  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium", tones[tone])}>{children}</span>
  );
}

/** Red vertical rule for quotations / emphasised statements. */
export function RuleQuote({ children, cite }: { children: ReactNode; cite?: string }) {
  return (
    <figure className="border-l-4 border-brand pl-6">
      <blockquote className="text-xl font-medium leading-relaxed">{children}</blockquote>
      {cite && <figcaption className="mt-3 text-sm text-muted">{cite}</figcaption>}
    </figure>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-white/25 py-5 first:border-t-0">
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-white/80">{label}</p>
    </div>
  );
}
