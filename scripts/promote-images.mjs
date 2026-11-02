// Turns owner decisions in assets-inbox/redcord-cz/review.csv into site media.
//
//   node scripts/promote-images.mjs [--check]
//
// For every row with a `slot`:
//   - validates slot ids, approval state, Czech alt text and resolution (refuses images
//     narrower than half the slot's minWidth — never upscale small images)
//   - writes an optimised master (max 2560 px, EXIF/GPS stripped) to
//     apps/redcord-web/public/media/redcord-cz/<id>.jpg|png
//   - regenerates packages/content/src/media/registry.generated.json
// --check validates only and writes nothing.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { parseCsv } from "./lib/csv.mjs";

const CHECK_ONLY = process.argv.includes("--check");
const INBOX = resolve("assets-inbox/redcord-cz");
const PUBLIC_DIR = resolve("apps/redcord-web/public/media/redcord-cz");
const REGISTRY = resolve("packages/content/src/media/registry.generated.json");
const SLOTS = JSON.parse(readFileSync(resolve("packages/content/src/media/slots.json"), "utf8")).slots;
const slotById = new Map(SLOTS.map((s) => [s.id, s]));
const MAX_WIDTH = 2560;

const csvPath = join(INBOX, "review.csv");
if (!existsSync(csvPath)) {
  console.error(`Missing ${csvPath}. Run: node scripts/harvest-images.mjs`);
  process.exit(1);
}
// The harvest manifest is optional: owner-supplied files can be promoted without a harvest.
const manifestPath = join(INBOX, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { assets: [] };
const manifestById = new Map(manifest.assets.map((a) => [a.id, a]));
const rows = parseCsv(readFileSync(csvPath, "utf8")).filter((r) => r.slot);

const errors = [];
const warnings = [];
const slotOwner = new Map();

for (const r of rows) {
  const where = `řádek ${r.id}`;
  const slots = r.slot.split("|").map((s) => s.trim()).filter(Boolean);
  r._slots = slots;
  const approval = (r.approval || "pending").toLowerCase();
  r._approval = approval;
  if (!["approved", "pending"].includes(approval)) errors.push(`${where}: approval musí být „approved“ nebo „pending“ (je „${r.approval}“)`);
  if (!r.alt_cs) errors.push(`${where}: chybí alt_cs (český popis fotografie)`);
  if (r.focal && !/^\d{1,3}% \d{1,3}%$/.test(r.focal)) errors.push(`${where}: focal ve tvaru „50% 30%“`);
  if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) errors.push(`${where}: id smí obsahovat jen malá písmena bez diakritiky, číslice a „-“`);
  const filePath = join(INBOX, "files", r.file ?? "");
  if (!r.file || !existsSync(filePath)) {
    errors.push(`${where}: soubor „${r.file ?? ""}“ neexistuje v assets-inbox/redcord-cz/files/`);
    continue;
  }
  // Real dimensions from the file — never trust the sheet (hand-added rows may leave width empty).
  let width = 0;
  try {
    const meta = await sharp(filePath).metadata();
    width = meta.width ?? 0;
    if (!["jpeg", "png", "webp"].includes(meta.format)) errors.push(`${where}: formát ${meta.format} není podporován (jen JPG, PNG, WebP)`);
  } catch {
    errors.push(`${where}: soubor ${r.file} nelze přečíst jako obrázek`);
    continue;
  }
  for (const s of slots) {
    const def = slotById.get(s);
    if (!def) {
      errors.push(`${where}: neznámý slot „${s}“`);
      continue;
    }
    if (slotOwner.has(s)) errors.push(`${where}: slot „${s}“ už má fotografii ${slotOwner.get(s)}`);
    slotOwner.set(s, r.id);
    if (width < def.minWidth / 2) errors.push(`${where}: ${width}px je pro „${s}“ příliš málo (potřeba ≥ ${def.minWidth}px, minimum ${def.minWidth / 2}px)`);
    else if (width < def.minWidth) warnings.push(`${where}: ${width}px je pro „${s}“ méně než doporučených ${def.minWidth}px — v náhledu označeno`);
  }
}

warnings.forEach((w) => console.warn("VAROVÁNÍ  " + w));
if (errors.length) {
  errors.forEach((e) => console.error("CHYBA     " + e));
  console.error(`\n${errors.length} chyb — nic nebylo zapsáno.`);
  process.exit(1);
}
if (CHECK_ONLY) {
  console.log(`OK: ${rows.length} fotografií pro ${slotOwner.size} slotů.`);
  process.exit(0);
}

mkdirSync(PUBLIC_DIR, { recursive: true });
const assets = {};
const slots = {};
const written = new Set();

for (const r of rows) {
  const input = join(INBOX, "files", r.file);
  const meta = await sharp(input).metadata();
  const keepPng = meta.format === "png" && meta.hasAlpha;
  const outName = `${r.id}.${keepPng ? "png" : "jpg"}`;
  let pipeline = sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  pipeline = keepPng ? pipeline.png({ compressionLevel: 9 }) : pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true });
  const info = await pipeline.toFile(join(PUBLIC_DIR, outName)); // sharp drops EXIF/GPS by default
  written.add(outName);
  const m = manifestById.get(r.id);
  const harvested = Boolean(m);
  assets[r.id] = {
    id: r.id,
    src: `/media/redcord-cz/${outName}`,
    width: info.width,
    height: info.height,
    alt: r.alt_cs,
    focal: r.focal || "50% 50%",
    credit: r.credit || (harvested ? "AHAMA s.r.o. (redcord.cz)" : "Dodáno vlastníkem — doplnit autora"),
    source: {
      // Hand-added files are owner-supplied, not harvested from the live site.
      sourceUrl: harvested ? `https://www.redcord.cz${m.pages?.[0] ?? "/"}` : r.original_url || "owner-supplied",
      observedOn: harvested ? manifest.harvestedOn : new Date().toISOString().slice(0, 10),
      approval: r._approval,
      originalUrl: r.original_url || m?.downloadedFrom,
      ...(r.notes ? { note: r.notes } : {}),
    },
  };
  for (const s of r._slots) slots[s] = r.id;
}

// remove files no longer referenced
for (const f of readdirSync(PUBLIC_DIR)) if (!written.has(f)) rmSync(join(PUBLIC_DIR, f));

writeFileSync(
  REGISTRY,
  JSON.stringify(
    { $comment: "GENERATED by scripts/promote-images.mjs from assets-inbox/redcord-cz/review.csv. Do not edit by hand.", assets, slots },
    null,
    2,
  ) + "\n",
);
const approved = Object.values(assets).filter((a) => a.source.approval === "approved").length;
console.log(`Hotovo: ${Object.keys(assets).length} fotografií, ${Object.keys(slots).length} slotů (${approved} schváleno, zbytek pending = jen v náhledu).`);
