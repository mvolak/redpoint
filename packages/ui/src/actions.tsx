import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "dark" | "outline-light" | "outline-dark" | "white";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-3";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark focus-visible:outline-brand",
  dark: "bg-ink text-white hover:bg-ink-soft focus-visible:outline-ink",
  white: "bg-white text-ink hover:bg-surface-muted focus-visible:outline-white",
  "outline-light": "border border-white/70 text-white hover:bg-white hover:text-ink focus-visible:outline-white",
  "outline-dark": "border border-ink/80 text-ink hover:bg-ink hover:text-white focus-visible:outline-ink",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cx(base, variants[variant], className);
}

/** Internal links use next/link; external links open in the same tab and are marked. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  external?: boolean;
}) {
  const cls = buttonClass(variant, className);
  if (external) {
    return (
      <a href={href} className={cls} rel="noopener">
        {children}
        <ExternalMark />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function ExternalMark() {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 3h7v7M13 3 4 12" />
      </svg>
      <span className="sr-only"> (externí web)</span>
    </>
  );
}

export function ArrowLink({ href, children, className, tone = "light" }: { href: string; children: ReactNode; className?: string; tone?: "light" | "dark" }) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-4 hover:underline",
        tone === "dark" ? "text-white" : "text-ink",
        className,
      )}
    >
      {children}
      <span aria-hidden="true" className="text-brand transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
        →
      </span>
    </Link>
  );
}
