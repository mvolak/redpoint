import type { ApprovalState, SourceMeta } from "../types";
import registry from "./registry.generated.json";
import slotsFile from "./slots.json";

export type MediaRatio = "21/9" | "16/9" | "4/3" | "3/4" | "4/5" | "1/1";

export interface MediaSlot {
  id: string;
  page: string;
  /** What the photograph should show — shown on placeholders until a photo is assigned. */
  brief: string;
  ratio: MediaRatio;
  /** Source width needed to look sharp at the largest rendered size. */
  minWidth: number;
}

export interface MediaAsset {
  id: string;
  /** Public path of the optimised master, e.g. /media/redcord-cz/stimula-01.jpg */
  src: string;
  width: number;
  height: number;
  /** Czech alt text describing what is in the photo. */
  alt: string;
  /** CSS object-position, e.g. "50% 30%". */
  focal: string;
  /** Rights holder / credit line, e.g. "AHAMA s.r.o." or "Redcord AS". */
  credit: string;
  source: SourceMeta & { originalUrl?: string };
}

interface RegistryFile {
  assets: Record<string, MediaAsset>;
  slots: Record<string, string>;
}

const reg = registry as unknown as RegistryFile;

export const MEDIA_SLOTS: readonly MediaSlot[] = (slotsFile.slots as MediaSlot[]).map((s) => ({ ...s }));

const slotById = new Map(MEDIA_SLOTS.map((s) => [s.id, s]));

export function getMediaSlot(id: string): MediaSlot | undefined {
  return slotById.get(id);
}

export interface ResolvedMedia {
  slot: MediaSlot;
  /** Undefined → render the labelled placeholder. */
  asset?: MediaAsset;
  /** Asset is narrower than the slot needs (shown in review mode only as a warning). */
  lowResolution: boolean;
}

/**
 * Resolve a slot to an asset honouring publish rules:
 * production shows approved photos only; preview also shows pending ones (labelled).
 * Photos far too small for the slot are never used — no upscaling small images.
 */
export function resolveMedia(
  slotId: string,
  mode: "preview" | "production",
  data: RegistryFile = reg,
): ResolvedMedia | undefined {
  const slot = slotById.get(slotId);
  if (!slot) return undefined;
  const assetId = data.slots[slotId];
  const asset = assetId ? data.assets[assetId] : undefined;
  const allowed: ApprovalState[] = mode === "production" ? ["approved"] : ["approved", "pending"];
  if (!asset || !allowed.includes(asset.source.approval) || asset.width < slot.minWidth / 2) {
    return { slot, lowResolution: false };
  }
  return { slot, asset, lowResolution: asset.width < slot.minWidth };
}
