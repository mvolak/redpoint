// Collects images from the current redcord.cz (WordPress) for owner review.
//
//   node scripts/harvest-images.mjs [--max-pages=200] [--delay=400]
//
// Output (assets-inbox/redcord-cz/, not published):
//   files/       full-size downloads (largest available: WordPress original > -scaled > srcset > src)
//   thumbs/      480px previews for the contact sheet
//   manifest.json  everything known about each image (pages, URLs, alt, captions, hashes)
//   review.csv   the sheet the owner fills in: slot, approval, Czech alt text, focal point, credit
//   index.html   contact sheet: open locally in a browser to review
//
// Re-running merges with an existing review.csv: owner-entered columns are kept.
// Requires: sharp (root devDependency). The owner has authorised reuse of redcord.cz content.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { OWNER_COLUMNS, parseCsv, toCsv } from "./lib/csv.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]),
);
const MAX_PAGES = Number(args["max-pages"] ?? 200);
const DELAY = Number(args.delay ?? 400);
const ORIGIN = "https://www.redcord.cz";
const PAGE_HOSTS = new Set(["www.redcord.cz", "redcord.cz"]);
const IMAGE_HOSTS = new Set(["www.redcord.cz", "redcord.cz", "202499.w99.wedos.ws"]);
const UA = "RedcordRenewal-ImageInventory/0.1 (owner-authorised migration inventory)";
const MAX_BYTES = 30 * 1024 * 1024;
const MIN_SIDE = 300; // smaller images are icons/thumbnails: listed in the manifest, not downloaded

const OUT = resolve("assets-inbox/redcord-cz");
const FILES = join(OUT, "files");
const THUMBS = join(OUT, "thumbs");
for (const d of [OUT, FILES, THUMBS]) mkdirSync(d, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;
async function politeFetch(url, init = {}) {
  const wait = lastRequest + DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  return fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) }, redirect: "follow", signal: AbortSignal.timeout(30000) });
}

// ---------- HTML helpers ----------
const ENTITIES = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s = "") =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const text = (html = "") => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? "");
  return out;
}

function abs(url, base) {
  try {
    return new URL(url.trim(), base).toString();
  } catch {
    return undefined;
  }
}

/** Extract image references from one page. */
function extractImages(html, pageUrl) {
  const found = []; // { url, alt, title, caption, srcsetWidth }
  const push = (url, meta = {}) => {
    const u = url && abs(url, pageUrl);
    if (!u) return;
    const { hostname, pathname } = new URL(u);
    if (!IMAGE_HOSTS.has(hostname) || !/\.(jpe?g|png|webp)$/i.test(pathname)) return;
    found.push({ url: u, ...meta });
  };

  // <figure> blocks first, so captions attach to their image
  const figureCaption = new Map();
  for (const fig of html.matchAll(/<figure\b[\s\S]*?<\/figure>/gi)) {
    const cap = fig[0].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    if (!cap) continue;
    for (const img of fig[0].matchAll(/<img\b[^>]*>/gi)) {
      const a = attrs(img[0]);
      const src = a["data-src"] || a["data-lazy-src"] || a.src;
      if (src) figureCaption.set(abs(src, pageUrl), text(cap[1]));
    }
  }

  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(img[0]);
    const src = a["data-src"] || a["data-lazy-src"] || a.src;
    const meta = { alt: a.alt ?? "", title: a.title ?? "", caption: figureCaption.get(src && abs(src, pageUrl)) ?? "" };
    push(src, meta);
    const srcset = a["data-srcset"] || a["data-lazy-srcset"] || a.srcset || "";
    for (const part of srcset.split(",")) {
      const [u, w] = part.trim().split(/\s+/);
      if (u) push(u, { ...meta, srcsetWidth: parseInt(w ?? "0", 10) || 0 });
    }
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) push(m[1], { alt: "", title: "", caption: "", from: "css" });
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+\.(?:jpe?g|png|webp))["'][^>]*>/gi)) push(m[1], { from: "link" });
  for (const m of html.matchAll(/<meta\b[^>]*property=["']og:image["'][^>]*>/gi)) push(attrs(m[0]).content, { from: "og" });
  return found;
}

function extractLinks(html, pageUrl) {
  const links = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)/gi)) {
    const u = abs(m[1], pageUrl);
    if (u) links.push(u);
  }
  return links;
}

function normalisePage(u) {
  try {
    const url = new URL(u);
    if (!PAGE_HOSTS.has(url.hostname)) return undefined;
    if (/^\/(wp-admin|wp-json|wp-content|wp-includes|feed|comments)\b/.test(url.pathname)) return undefined;
    if (/\/feed\/?$/.test(url.pathname)) return undefined;
    if (/\.(pdf|jpe?g|png|webp|gif|svg|zip|docx?|xlsx?|mp4)$/i.test(url.pathname)) return undefined;
    if (url.search) return undefined; // query-ID / search / cart URLs are out of scope here
    url.hostname = "www.redcord.cz";
    url.protocol = "https:";
    url.hash = "";
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  } catch {
    return undefined;
  }
}

// ---------- WordPress size variants ----------
/** Group key and candidate originals for an uploads URL. */
function variants(url) {
  const u = new URL(url);
  u.search = "";
  const path = decodeURIComponent(u.pathname);
  const m = path.match(/^(.*?)(-\d+x\d+)?(-scaled)?(\.[a-z0-9]+)$/i);
  if (!m) return { key: path.toLowerCase(), candidates: [u.toString()] };
  const [, stem, , , ext] = m;
  const make = (p, host = "www.redcord.cz") => `https://${host}${encodeURI(p)}`;
  const candidates = [make(stem + ext), make(`${stem}-scaled${ext}`), make(path)];
  if (u.hostname !== "www.redcord.cz") candidates.push(make(stem + ext, u.hostname), make(path, u.hostname));
  return { key: (stem + ext).toLowerCase(), candidates: [...new Set(candidates)] };
}

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";

const quality = (w) => (w >= 2400 ? "hero" : w >= 1600 ? "široké" : w >= 1000 ? "karta" : w >= 600 ? "malé" : "náhled");

// ---------- crawl ----------
async function seedFromSitemaps() {
  const seeds = new Set();
  for (const sm of ["/wp-sitemap.xml", "/sitemap_index.xml", "/sitemap.xml"]) {
    try {
      const res = await politeFetch(ORIGIN + sm);
      if (!res.ok) continue;
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1]));
      for (const loc of locs) {
        if (/\.xml$/i.test(loc)) {
          const sub = await politeFetch(loc);
          if (sub.ok) for (const m of (await sub.text()).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) seeds.add(decode(m[1]));
        } else seeds.add(loc);
      }
      if (seeds.size) break;
    } catch {
      /* sitemap optional */
    }
  }
  return [...seeds];
}

console.log(`Crawling ${ORIGIN} (max ${MAX_PAGES} pages, ${DELAY} ms between requests)…`);
const queue = [ORIGIN + "/", ...(await seedFromSitemaps())].map(normalisePage).filter(Boolean);
const seen = new Set();
const groups = new Map(); // key -> { key, candidates:Set, pages:Set, alts:Set, captions:Set, titles:Set, maxSrcset }
const failedPages = [];

while (queue.length && seen.size < MAX_PAGES) {
  const page = queue.shift();
  if (seen.has(page)) continue;
  seen.add(page);
  let html;
  try {
    const res = await politeFetch(page);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) {
      failedPages.push(`${res.status} ${page}`);
      continue;
    }
    html = await res.text();
  } catch (e) {
    failedPages.push(`ERR ${page} ${e.message}`);
    continue;
  }
  const imgs = extractImages(html, page);
  for (const img of imgs) {
    if (!/\/wp-content\/uploads\//.test(img.url)) continue;
    const { key, candidates } = variants(img.url);
    const g = groups.get(key) ?? { key, candidates: new Set(), pages: new Set(), alts: new Set(), captions: new Set(), titles: new Set(), maxSrcset: 0 };
    candidates.forEach((c) => g.candidates.add(c));
    g.pages.add(new URL(page).pathname);
    if (img.alt) g.alts.add(img.alt);
    if (img.caption) g.captions.add(img.caption);
    if (img.title) g.titles.add(img.title);
    g.maxSrcset = Math.max(g.maxSrcset, img.srcsetWidth ?? 0);
    groups.set(key, g);
  }
  for (const l of extractLinks(html, page)) {
    const n = normalisePage(l);
    if (n && !seen.has(n)) queue.push(n);
  }
  process.stdout.write(`\r  pages ${seen.size}, image groups ${groups.size}   `);
}
console.log(`\nCrawled ${seen.size} pages; ${groups.size} distinct images referenced.`);

// ---------- download ----------
const oldManifest = existsSync(join(OUT, "manifest.json")) ? JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8")) : { assets: [] };
const oldByKey = new Map(oldManifest.assets.map((a) => [a.key, a]));
const assets = [];
const skipped = [];
const usedIds = new Set();
const byHash = new Map();

let i = 0;
for (const g of groups.values()) {
  i++;
  process.stdout.write(`\r  downloading ${i}/${groups.size}   `);
  let got;
  for (const url of g.candidates) {
    try {
      const res = await politeFetch(url);
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) continue;
      const meta = await sharp(buf).metadata();
      if (!meta.width || !meta.height) continue;
      if (!got || meta.width > got.meta.width) got = { url, buf, meta };
      break; // candidates are ordered largest-first
    } catch {
      /* try next candidate */
    }
  }
  if (!got) {
    skipped.push({ key: g.key, reason: "download-failed", pages: [...g.pages] });
    continue;
  }
  const { width, height, format } = got.meta;
  if (Math.min(width, height) < MIN_SIDE || !["jpeg", "png", "webp"].includes(format)) {
    skipped.push({ key: g.key, reason: `small-or-icon ${width}x${height} ${format}`, url: got.url, pages: [...g.pages] });
    continue;
  }
  const sha1 = createHash("sha1").update(got.buf).digest("hex");
  if (byHash.has(sha1)) {
    const dup = byHash.get(sha1);
    g.pages.forEach((p) => dup.pages.includes(p) || dup.pages.push(p));
    continue;
  }
  let id = oldByKey.get(g.key)?.id ?? slugify(g.key.split("/").pop().replace(/\.[a-z0-9]+$/i, ""));
  if (usedIds.has(id)) id = `${id}-${sha1.slice(0, 6)}`;
  usedIds.add(id);
  const ext = format === "jpeg" ? "jpg" : format;
  const file = `${id}.${ext}`;
  writeFileSync(join(FILES, file), got.buf);
  await sharp(got.buf).rotate().resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 72 }).toFile(join(THUMBS, `${id}.jpg`));
  const asset = {
    id,
    key: g.key,
    file,
    width,
    height,
    format,
    bytes: got.buf.length,
    sha1,
    quality: quality(width),
    downloadedFrom: got.url,
    maxSrcsetSeen: g.maxSrcset,
    pages: [...g.pages],
    alt: [...g.alts],
    captions: [...g.captions],
    titles: [...g.titles],
    flags: [/logo/i.test(g.key) ? "logo" : "", /alice|hamackova|instructor|tym|team/i.test(g.key) ? "osoba" : ""].filter(Boolean),
  };
  byHash.set(sha1, asset);
  assets.push(asset);
}
console.log(`\nDownloaded ${assets.length} images; skipped ${skipped.length} (small/icons/failed).`);

const harvestedOn = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(OUT, "manifest.json"),
  JSON.stringify({ origin: ORIGIN, harvestedOn, pagesCrawled: seen.size, failedPages, assets, skipped }, null, 2),
);

// ---------- review sheet (merge with owner edits) ----------
const csvPath = join(OUT, "review.csv");
const previous = existsSync(csvPath) ? parseCsv(readFileSync(csvPath, "utf8")) : [];
const prevById = new Map(previous.map((r) => [r.id, r]));
const rows = assets
  .sort((a, b) => b.width - a.width)
  .map((a) => {
    const prev = prevById.get(a.id) ?? {};
    const base = {
      id: a.id,
      file: a.file,
      width: String(a.width),
      height: String(a.height),
      quality: a.quality,
      flags: a.flags.join(" "),
      pages: a.pages.join(" "),
      original_url: a.downloadedFrom,
      alt_source: a.alt.join(" | "),
      caption: [...a.captions, ...a.titles].join(" | "),
    };
    const owner = Object.fromEntries(OWNER_COLUMNS.map((c) => [c, prev[c] ?? ""]));
    if (!owner.alt_cs) owner.alt_cs = a.captions[0] ?? a.alt[0] ?? "";
    if (!owner.focal) owner.focal = "50% 50%";
    return { ...base, ...owner };
  });
// keep owner rows whose image vanished, so no decisions are lost
for (const r of previous) if (!rows.some((x) => x.id === r.id)) rows.push({ ...r, notes: `${r.notes ?? ""} [nenalezeno při posledním sběru]`.trim() });
writeFileSync(csvPath, toCsv(rows));

// ---------- contact sheet ----------
const slots = JSON.parse(readFileSync(resolve("packages/content/src/media/slots.json"), "utf8")).slots;
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = `<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redcord.cz — inventura fotografií ${harvestedOn}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:24px;color:#111;background:#fafafa}h1{font-size:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.c{background:#fff;border:1px solid #ddd;border-radius:12px;overflow:hidden}.c img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#eee}
.m{padding:10px 12px;font-size:13px}.id{font-weight:700;font-size:14px;word-break:break-all}.q{display:inline-block;padding:1px 8px;border-radius:99px;background:#eee;margin-right:4px}
.q.hero{background:#c8102e;color:#fff}.q.široké{background:#111;color:#fff}.slot{color:#c8102e;font-weight:700}
table{border-collapse:collapse;background:#fff;margin:12px 0 32px}td,th{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:13px}</style>
<h1>Inventura fotografií z redcord.cz</h1>
<p>Sebráno ${harvestedOn} z ${seen.size} stránek · ${assets.length} fotografií (${skipped.length} ikon/miniatur vynecháno). Rozhodnutí zapisujte do <b>review.csv</b>: sloupce <code>slot</code> (id místa níže; více míst oddělte „|“), <code>approval</code> (approved / pending), <code>alt_cs</code>, <code>focal</code> (např. „50% 30%“), <code>credit</code>.</p>
<h2>Místa pro fotografie (sloty)</h2>
<table><tr><th>slot</th><th>stránka</th><th>co má fotka ukazovat</th><th>poměr</th><th>min. šířka</th></tr>
${slots.map((s) => `<tr><td class="slot">${esc(s.id)}</td><td>${esc(s.page)}</td><td>${esc(s.brief)}</td><td>${s.ratio}</td><td>${s.minWidth}px</td></tr>`).join("")}</table>
<h2>Fotografie (od největší)</h2><div class="grid">
${rows
  .filter((r) => r.file)
  .map(
    (r) => `<div class="c"><a href="files/${esc(r.file)}"><img loading="lazy" src="thumbs/${esc(r.id)}.jpg" alt=""></a><div class="m">
<div class="id">${esc(r.id)}</div><span class="q ${esc(r.quality)}">${esc(r.quality)}</span>${esc(r.width)}×${esc(r.height)} ${r.flags ? `· <b>${esc(r.flags)}</b>` : ""}
<div>${esc(r.pages)}</div>${r.alt_source ? `<div>alt: ${esc(r.alt_source)}</div>` : ""}${r.caption ? `<div>popisek: ${esc(r.caption)}</div>` : ""}
${r.slot ? `<div class="slot">→ ${esc(r.slot)} (${esc(r.approval || "pending")})</div>` : ""}</div></div>`,
  )
  .join("\n")}
</div></html>`;
writeFileSync(join(OUT, "index.html"), html);

console.log(`Review sheet: ${csvPath}\nContact sheet: ${join(OUT, "index.html")}`);
if (failedPages.length) console.log(`Pages that failed (${failedPages.length}): see manifest.json → failedPages`);
