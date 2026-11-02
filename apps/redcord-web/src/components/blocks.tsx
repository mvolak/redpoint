import Link from "next/link";
import type { ReactNode } from "react";
import {
  AUDIENCE_LABELS,
  SESSION_STATE_LABELS,
  formatPrice,
  formatSessionRange,
  type ProductFamily,
  type SessionView,
  type SourceMeta,
} from "@redcord/content";
import { isSafeExternalUrl } from "@redcord/integrations";
import { Breadcrumbs, Container, Pill, ReviewNote, cx } from "@redcord/ui";
import { Media } from "./Media";
import { site } from "@/config/site";
import { repo } from "@/lib/content";
import { HandoffLink } from "./Tracked";

/** Renders only in review/preview mode. */
export function ReviewOnly({ children, title }: { children: ReactNode; title?: string }) {
  if (!site.reviewMode) return null;
  return <ReviewNote title={title}>{children}</ReviewNote>;
}

const APPROVAL_LABEL: Record<SourceMeta["approval"], string> = {
  approved: "Schváleno",
  pending: "Ze stávajícího webu — čeká na ověření",
  proposal: "Návrh textu — čeká na schválení",
  illustrative: "Ilustrační — nepublikovat",
};

/** Small provenance label shown to reviewers next to migrated records. */
export function SourceBadge({ source }: { source: SourceMeta }) {
  if (!site.reviewMode || source.approval === "approved") return null;
  return (
    <span
      className="inline-flex items-center rounded-full border border-[#f0d9a0] bg-warn-bg px-2.5 py-0.5 text-xs font-medium text-[#4d3500]"
      title={[source.sourceUrl, source.note].filter(Boolean).join(" — ")}
    >
      {APPROVAL_LABEL[source.approval]}
    </span>
  );
}

/** Inner-page introduction: breadcrumbs, single H1, intro. */
export function PageIntro({
  crumbs,
  title,
  intro,
  children,
  aside,
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-surface">
      <Container className="pb-12 pt-8 lg:pb-16 lg:pt-10">
        <Breadcrumbs items={[{ href: "/", label: "Úvod" }, ...crumbs]} />
        <div className={cx("mt-8 grid gap-10", !!aside && "lg:grid-cols-[1.3fr_1fr] lg:items-end")}>
          <div className="max-w-3xl">
            <h1 className="text-display font-bold">{title}</h1>
            {intro && <div className="mt-6 text-lg leading-relaxed text-muted md:text-xl">{intro}</div>}
            {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
          </div>
          {aside}
        </div>
      </Container>
    </div>
  );
}

export const AUDIENCE_SHORT = { klinika: "Klinika", trener: "Trenér", jednotlivec: "Jednotlivec" } as const;

export function ProductCard({ product, headingLevel: H = "h3" }: { product: ProductFamily; headingLevel?: "h2" | "h3" }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-white focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-brand">
      <div className="overflow-hidden">
        <div className="transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none">
          <Media slot={`product-${product.slug}`} ratio="4/3" compact sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap gap-2">
          {product.audiences.map((a) => (
            <Pill key={a}>{AUDIENCE_SHORT[a]}</Pill>
          ))}
        </div>
        <H className="mt-4 text-xl font-bold">
          <Link href={`/vybaveni/${product.slug}/`} className="after:absolute after:inset-0 group-hover:text-brand focus-visible:outline-none">
            {product.name}
          </Link>
        </H>
        <p className="mt-2 flex-1 leading-relaxed text-muted">{product.summary}</p>
        <p className="mt-4 text-sm font-semibold">
          {product.purchasePath === "shop" ? "Nákup přes e-shop" : "Cena a konfigurace na dotaz"}
        </p>
        <div className="mt-3">
          <SourceBadge source={product.source} />
        </div>
      </div>
    </article>
  );
}

const STATE_TONE = {
  open: "success",
  full: "dark",
  cancelled: "red",
  past: "neutral",
  unknown: "warn",
} as const;

export function SessionCard({ view, headingLevel: H = "h3" }: { view: SessionView; headingLevel?: "h2" | "h3" | "h4" }) {
  const { session, course, state, illustrative } = view;
  const canRegister = state === "open" && isSafeExternalUrl(session.registrationUrl);
  return (
    <article className={cx("flex flex-col rounded-card border bg-white p-6", illustrative ? "border-dashed border-warn" : "border-line")}>
      {illustrative && (
        <p className="mb-3 inline-flex self-start rounded-full bg-warn-bg px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#4d3500]">
          Ilustrační termín — nejde o skutečnou nabídku
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={STATE_TONE[state]}>{SESSION_STATE_LABELS[state]}</Pill>
        <span className="text-sm text-muted">{course.level}</span>
      </div>
      <H className="mt-4 text-xl font-bold">
        <Link href={`/vzdelavani/kurzy/${course.slug}/`} className="hover:text-brand">
          {course.title}
        </Link>
      </H>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
        <dt className="text-muted">Termín</dt>
        <dd className={cx("font-semibold", state === "cancelled" && "line-through")}>
          <time dateTime={session.start}>{formatSessionRange(session)}</time>
        </dd>
        <dt className="text-muted">Místo</dt>
        <dd>{session.location}</dd>
        <dt className="text-muted">Lektor</dt>
        <dd>{session.lecturer ?? "Upřesníme"}</dd>
        <dt className="text-muted">Pro koho</dt>
        <dd>{course.eligibility}</dd>
        <dt className="text-muted">Cena</dt>
        <dd>
          {session.price ? (
            <>
              {formatPrice(session.price)}
              {session.price.note && <span className="block text-sm text-muted">{session.price.note}</span>}
            </>
          ) : (
            "Na dotaz"
          )}
        </dd>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        {canRegister ? (
          <HandoffLink href={session.registrationUrl!} event="registration_handoff" props={{ course: course.slug, session: session.id }}>
            Registrace{session.capacitySource === "registration-system" ? " a volná místa" : ""}
          </HandoffLink>
        ) : state === "past" ? null : (
          <Link href={`/kontakt/?oddeleni=vzdelavani&ref=${encodeURIComponent(course.title)}#poptavka`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            {state === "open" || state === "unknown" ? "Zeptat se na registraci" : "Zeptat se na další termín"}
          </Link>
        )}
      </div>
    </article>
  );
}

/** Contact routing block shared by home and inner pages. */
export function ContactRouting({ tone = "muted" }: { tone?: "muted" | "white" }) {
  const deps = repo.listDepartments();
  const show = deps.filter((d) => d.id !== "vedeni");
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {show.map((d) => (
        <div key={d.id} className={cx("rounded-card p-6", tone === "muted" ? "bg-white" : "border border-line bg-surface-muted")}>
          <h3 className="text-xl font-bold">{d.name}</h3>
          <p className="mt-2 text-sm text-muted">{d.topics.join(" · ")}</p>
          <ul className="mt-4 space-y-1">
            {d.phones.map((p) => (
              <li key={p.number}>
                <a href={`tel:${p.number.replace(/\s/g, "")}`} className="inline-flex min-h-10 items-center font-semibold hover:text-brand">
                  {p.number}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${d.email}`} className="inline-flex min-h-10 items-center font-semibold hover:text-brand">
                {d.email}
              </a>
            </li>
          </ul>
          <Link href={`/kontakt/?oddeleni=${d.id}#poptavka`} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
            Napsat dotaz
          </Link>
          <div className="mt-2">
            <SourceBadge source={d.source} />
          </div>
        </div>
      ))}
    </div>
  );
}
