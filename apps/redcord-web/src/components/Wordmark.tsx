/**
 * TEXT PLACEHOLDER for the Redcord logo. No approved logo master has been supplied,
 * and the logo is not extracted from redcord.com. Replace with the approved SVG.
 */
export function Wordmark({ tone = "red" }: { tone?: "red" | "white" }) {
  return (
    <span
      className={`text-[1.6rem] font-extrabold lowercase leading-none tracking-[-0.05em] ${tone === "white" ? "text-white" : "text-brand"}`}
      title="Zástupný textový logotyp — čeká na schválený soubor loga"
    >
      redcord<span aria-hidden="true" className="align-super text-xs font-semibold">®</span>
    </span>
  );
}
