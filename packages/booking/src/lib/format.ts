// Shared formatting (safe for client and server).

export function formatCzk(minor: number): string {
  const kc = minor / 100;
  const s = Number.isInteger(kc) ? kc.toFixed(0) : kc.toFixed(2).replace(".", ",");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";
}

/** Fixed price, or a clearly labelled range. */
export function formatPrice(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && max !== min) return `${formatCzk(min)} – ${formatCzk(max)} (dle rozsahu)`;
  return formatCzk((min ?? max)!);
}
