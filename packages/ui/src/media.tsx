import { cx } from "./cx";

/**
 * Labelled placeholder for a photograph that has not been approved yet.
 * Reserves dimensions (no layout shift) and states plainly that it is not a real image,
 * so nobody mistakes it for an actual clinic, person or installation.
 */
export function MediaPlaceholder({
  brief,
  ratio = "4/3",
  tone = "light",
  className,
  hideLabel,
}: {
  /** What the approved photograph should show. */
  brief: string;
  ratio?: "4/3" | "3/4" | "16/9" | "1/1" | "21/9" | "4/5";
  tone?: "light" | "dark";
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Místo pro schválenou fotografii: ${brief}`}
      style={{ aspectRatio: ratio }}
      className={cx(
        "relative w-full overflow-hidden",
        tone === "dark" ? "bg-ink-soft text-white/60" : "bg-[#e9e9e9] text-muted",
        className,
      )}
    >
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="34" y1="0" x2="44" y2="70" stroke="currentColor" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
        <line x1="66" y1="0" x2="56" y2="70" stroke="currentColor" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
      </svg>
      {!hideLabel && (
        <span className="absolute bottom-3 left-3 right-3 text-xs leading-snug">
          <span className="font-semibold uppercase tracking-wider">Fotografie čeká na schválení</span>
          <span className="block opacity-90">{brief}</span>
        </span>
      )}
    </div>
  );
}
