import type { ReactNode } from "react";
import { cx } from "./cx";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-content px-5 md:px-8 lg:px-12", className)}>{children}</div>;
}

export type Tone = "white" | "muted" | "ink" | "red";

const toneClass: Record<Tone, string> = {
  white: "bg-surface text-ink",
  muted: "bg-surface-muted text-ink",
  ink: "bg-ink text-white",
  red: "bg-brand text-white",
};

export function Section({
  children,
  tone = "white",
  className,
  id,
  labelledBy,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx("py-14 lg:py-24", toneClass[tone], className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-brand", className)}>{children}</p>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  tone = "light",
  as: Tag = "h2",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: "light" | "dark";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cx("max-w-3xl", className)}>
      {eyebrow && <Eyebrow className={tone === "dark" ? "text-white/80" : undefined}>{eyebrow}</Eyebrow>}
      <Tag id={id} className={cx("font-bold", Tag === "h1" ? "text-display" : "text-section")}>
        {title}
      </Tag>
      {intro && (
        <div className={cx("mt-5 text-lg leading-relaxed", tone === "dark" ? "text-muted-on-ink" : "text-muted")}>
          {intro}
        </div>
      )}
    </div>
  );
}
