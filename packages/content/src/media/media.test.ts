import { describe, expect, it } from "vitest";
import { productFamilies } from "../fixtures/products";
import { MEDIA_SLOTS, resolveMedia, type MediaAsset } from "./index";

const asset = (over: Partial<MediaAsset> & { approval?: MediaAsset["source"]["approval"] } = {}): MediaAsset => ({
  id: "a1",
  src: "/media/redcord-cz/a1.jpg",
  width: 3000,
  height: 2000,
  alt: "Test",
  focal: "50% 50%",
  credit: "AHAMA s.r.o.",
  ...over,
  source: { sourceUrl: "https://www.redcord.cz/", observedOn: "2026-11-02", approval: over.approval ?? "pending" },
});

const reg = (a: MediaAsset, slot = "home-hero") => ({ assets: { [a.id]: a }, slots: { [slot]: a.id } });

describe("media slots", () => {
  it("has unique slot ids", () => {
    const ids = MEDIA_SLOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a slot for every product family", () => {
    const ids = new Set(MEDIA_SLOTS.map((s) => s.id));
    for (const p of productFamilies) expect(ids, p.slug).toContain(`product-${p.slug}`);
  });

  it("falls back to placeholder when nothing is assigned", () => {
    const r = resolveMedia("home-hero", "preview", { assets: {}, slots: {} });
    expect(r?.asset).toBeUndefined();
    expect(r?.slot.brief).toBeTruthy();
  });

  it("shows pending photos in preview but not in production", () => {
    const data = reg(asset());
    expect(resolveMedia("home-hero", "preview", data)?.asset?.id).toBe("a1");
    expect(resolveMedia("home-hero", "production", data)?.asset).toBeUndefined();
    expect(resolveMedia("home-hero", "production", reg(asset({ approval: "approved" })))?.asset?.id).toBe("a1");
  });

  it("never shows illustrative or proposal photos", () => {
    expect(resolveMedia("home-hero", "preview", reg(asset({ approval: "illustrative" })))?.asset).toBeUndefined();
  });

  it("refuses photos far too small for the slot (no upscaling) and flags borderline ones", () => {
    expect(resolveMedia("home-hero", "preview", reg(asset({ width: 1000 })))?.asset).toBeUndefined();
    const borderline = resolveMedia("home-hero", "preview", reg(asset({ width: 1600 })));
    expect(borderline?.asset).toBeDefined();
    expect(borderline?.lowResolution).toBe(true);
  });

  it("returns undefined for unknown slots", () => {
    expect(resolveMedia("nope", "preview")).toBeUndefined();
  });
});
