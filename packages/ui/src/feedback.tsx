import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** Honest empty / unavailable state with a route forward. */
export function EmptyState({
  title,
  children,
  action,
  tone = "light",
  headingLevel: H = "h3",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "light" | "dark";
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div
      className={cx(
        "rounded-card border border-dashed p-8 md:p-10",
        tone === "dark" ? "border-white/40 text-white" : "border-[#bdbdbd] bg-surface",
      )}
    >
      <H className="text-xl font-bold">{title}</H>
      {children && <div className={cx("mt-3 max-w-2xl leading-relaxed", tone === "dark" ? "text-white/85" : "text-muted")}>{children}</div>}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}

/**
 * Reviewer-only note explaining why something is hidden or provisional.
 * Rendered only when the site runs in preview/review mode.
 */
export function ReviewNote({ children, title = "Poznámka pro revizi" }: { children: ReactNode; title?: string }) {
  return (
    <aside className="rounded-xl border border-[#f0d9a0] bg-warn-bg p-4 text-sm leading-relaxed text-[#4d3500]">
      <p className="font-semibold">{title}</p>
      <div className="mt-1">{children}</div>
    </aside>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Drobečková navigace" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="underline-offset-4 hover:text-ink hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Native details/summary accordion — keyboard accessible and works without JavaScript. */
export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden="true" className="text-2xl leading-none text-brand transition-transform group-open:rotate-45 motion-reduce:transition-none">
              +
            </span>
          </summary>
          <div className="pb-6 pr-10 leading-relaxed text-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
