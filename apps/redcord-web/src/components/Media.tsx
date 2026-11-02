import Image from "next/image";
import { resolveMedia, type MediaRatio } from "@redcord/content";
import { MediaPlaceholder, cx } from "@redcord/ui";
import { site } from "@/config/site";

/**
 * Renders the photo assigned to a media slot (see packages/content/src/media/slots.json),
 * or a labelled placeholder when none is assigned or allowed in the current publish mode.
 * Review mode labels photos that are not yet approved or are below the slot's resolution.
 */
export function Media({
  slot,
  ratio,
  fill,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority,
  tone = "light",
  compact,
  className,
}: {
  slot: string;
  /** Override the slot's default ratio for this rendering (e.g. product card 4/3). */
  ratio?: MediaRatio;
  /** Fill the parent's height instead of reserving an aspect ratio (hero backgrounds). */
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  tone?: "light" | "dark";
  /** Small corner badge instead of the full brief on placeholders (cards). */
  compact?: boolean;
  className?: string;
}) {
  const resolved = resolveMedia(slot, site.env);
  if (!resolved) throw new Error(`Unknown media slot "${slot}" — add it to slots.json`);
  const { slot: def, asset, lowResolution } = resolved;
  const aspect = ratio ?? def.ratio;

  if (!asset) {
    return (
      <div className={cx("relative", fill && "h-full", className)}>
        <MediaPlaceholder brief={def.brief} ratio={aspect} tone={tone} hideLabel={compact} className={fill ? "h-full" : undefined} />
        {compact && <Badge>Foto čeká na schválení</Badge>}
      </div>
    );
  }

  const unapproved = asset.source.approval !== "approved";
  return (
    <div
      className={cx("relative w-full overflow-hidden", tone === "dark" ? "bg-ink-soft" : "bg-[#e9e9e9]", fill && "h-full", className)}
      style={fill ? undefined : { aspectRatio: aspect }}
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ objectPosition: asset.focal }}
      />
      {site.reviewMode && (unapproved || lowResolution) && (
        <Badge title={[asset.id, asset.source.originalUrl, asset.credit].filter(Boolean).join(" · ")}>
          {unapproved
            ? `Foto${asset.source.sourceUrl.startsWith("https://www.redcord.cz") ? ": redcord.cz" : ""} · čeká na schválení`
            : "Schváleno"}
          {lowResolution && " · nízké rozlišení"}
        </Badge>
      )}
    </div>
  );
}

function Badge({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/65 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white"
    >
      {children}
    </span>
  );
}
