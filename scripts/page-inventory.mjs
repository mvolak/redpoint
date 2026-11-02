// Page inventories of the current redcord.cz and of the new app, plus a comparison.
//
//   node scripts/page-inventory.mjs old [--refresh] [--delay=1000]   crawl https://www.redcord.cz
//   node scripts/page-inventory.mjs new [--base=http://localhost:3000] crawl the running new app
//   node scripts/page-inventory.mjs compare [--base=http://localhost:3000]
//
// Output: inventory/old/{pages.json,index.html}, inventory/new/{pages.json,index.html},
//         inventory/comparison.html. Open the HTML files locally in a browser.
// The old site is fetched politely (1 request/second) and cached in inventory/old/cache/;
// re-runs use the cache unless --refresh is given.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [mode = "old", ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const NEW_BASE = (args.base ?? "http://localhost:3000").replace(/\/$/, "");
const OLD_BASE = "https://www.redcord.cz";
const UA = "RedcordRenewal-PageInventory/0.1 (owner-authorised migration inventory)";
const OUT = resolve("inventory");
const today = new Date().toISOString().slice(0, 10);

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENT = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", bdquo: "„", ldquo: "“", rdquo: "”" };
const decode = (s = "") =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const strip = (h = "") => decode(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? "")]));

function analyse(html) {
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const description = metas.find((m) => m.name === "description")?.content ?? "";
  const robots = metas.find((m) => m.name === "robots")?.content ?? "";
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0])).find((l) => l.rel === "canonical")?.href ?? "";
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1])).filter(Boolean);
  const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1])).filter(Boolean);
  // Body text without scripts, styles and site chrome (header/nav/footer)
  const body = (html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html)
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, " ");
  const words = strip(body).split(" ").filter((w) => /\p{L}/u.test(w)).length;
  const images = (body.match(/<img\b/gi) ?? []).length;
  const forms = (body.match(/<form\b/gi) ?? []).length;
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decode(m[1]), text: strip(m[2]).slice(0, 80) }));
  return { title, description, robots, canonical, h1, h2: h2.slice(0, 12), words, images, forms, links };
}

function classify(href, pageUrl, origin) {
  let u;
  try {
    u = new URL(href, pageUrl);
  } catch {
    return { kind: "invalid" };
  }
  if (!/^https?:$/.test(u.protocol)) return { kind: u.protocol.replace(":", "") }; // mailto, tel, javascript
  const sameHost = u.host === new URL(origin).host || (origin === OLD_BASE && u.hostname === "redcord.cz");
  if (!sameHost) return { kind: "external", host: u.hostname, url: u.toString() };
  if (/\.(pdf|docx?|xlsx?|zip)$/i.test(u.pathname)) return { kind: "document", url: origin + u.pathname };
  if (/\.(jpe?g|png|gif|webp|svg)$/i.test(u.pathname)) return { kind: "image" };
  if (/^\/(wp-admin|wp-json|wp-content|wp-includes|_next)\b/.test(u.pathname) || /\/feed\/?$/.test(u.pathname) || /\.php$/i.test(u.pathname))
    return { kind: "system" };
  let path = u.pathname;
  if (!path.endsWith("/")) path += "/";
  return { kind: "page", path, query: u.search };
}

// ---------- fetching (with cache for the old site) ----------
let last = 0;
async function get(url, { delay, cacheDir, refresh, method = "GET" }) {
  const key = createHash("sha1").update(method + url).digest("hex").slice(0, 16);
  const file = cacheDir && join(cacheDir, `${key}.json`);
  if (file && !refresh && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const wait = last + delay - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  let result;
  try {
    const res = await fetch(url, { method, redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    const type = res.headers.get("content-type") ?? "";
    result = {
      url,
      status: res.status,
      location: res.headers.get("location") ?? "",
      type,
      html: method === "GET" && type.includes("text/html") ? await res.text() : "",
    };
  } catch (e) {
    result = { url, status: 0, location: "", type: "", html: "", error: e.message };
  }
  if (result.status === 401 || result.status === 403 || result.status === 429) {
    throw new Error(`${url} answered ${result.status} — the site is blocking requests. Stopping; try again later.`);
  }
  if (file && result.status !== 0) writeFileSync(file, JSON.stringify(result));
  return result;
}

async function fetchXml(url, delay) {
  const wait = last + delay - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (res && [401, 403, 429].includes(res.status)) throw new Error(`${url} answered ${res.status} — the site is blocking requests. Stopping.`);
  return res?.ok && /xml/.test(res.headers.get("content-type") ?? "") ? res.text() : "";
}

async function sitemapSeeds(origin, opts) {
  const seeds = new Set();
  for (const sm of ["/wp-sitemap.xml", "/sitemap_index.xml", "/sitemap.xml"]) {
    const xml = await fetchXml(origin + sm, opts.delay);
    for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
      const loc = decode(m[1]);
      if (/\.xml$/i.test(loc)) {
        for (const s of (await fetchXml(loc, opts.delay)).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) seeds.add(decode(s[1]));
      } else seeds.add(loc);
    }
    if (seeds.size) break;
  }
  return [...seeds];
}

// ---------- crawl ----------
async function crawl(origin, label, opts, maxPages = 250) {
  const toPath = (u) => classify(u, origin + "/", origin);
  const queue = ["/", ...(await sitemapSeeds(origin, opts)).map((u) => toPath(u)).filter((c) => c.kind === "page").map((c) => c.path)];
  const pages = new Map(); // path -> record
  const inbound = new Map(); // path -> Set(from)
  const documents = new Map(); // url -> Set(from)
  const external = new Map(); // host -> Set(from)
  const queryLinks = new Map(); // path?query -> Set(from)
  const fromSitemap = new Set(queue.slice(1));

  while (queue.length && pages.size < maxPages) {
    const path = queue.shift();
    if (pages.has(path)) continue;
    process.stdout.write(`\r  ${label}: ${pages.size + 1} pages   `);
    const r = await get(origin + path, opts);
    const rec = { path, url: origin + path, status: r.status, redirectTo: "", inSitemap: fromSitemap.has(path), error: r.error ?? "" };
    if (r.status >= 300 && r.status < 400 && r.location) {
      const c = classify(r.location, origin + path, origin);
      rec.redirectTo = c.kind === "page" ? c.path + (c.query ?? "") : r.location;
      if (c.kind === "page" && !pages.has(c.path)) queue.push(c.path);
    }
    if (r.html) {
      const a = analyse(r.html);
      Object.assign(rec, { title: a.title, description: a.description, robots: a.robots, canonical: a.canonical, h1: a.h1, h2: a.h2, words: a.words, images: a.images, forms: a.forms });
      if (r.status === 200) {
        for (const l of a.links) {
          const c = classify(l.href, origin + path, origin);
          if (c.kind === "page") {
            if (c.query) {
              const k = c.path + c.query;
              (queryLinks.get(k) ?? queryLinks.set(k, new Set()).get(k)).add(path);
              continue;
            }
            (inbound.get(c.path) ?? inbound.set(c.path, new Set()).get(c.path)).add(path);
            if (!pages.has(c.path)) queue.push(c.path);
          } else if (c.kind === "document") (documents.get(c.url) ?? documents.set(c.url, new Set()).get(c.url)).add(path);
          else if (c.kind === "external") (external.get(c.host) ?? external.set(c.host, new Set()).get(c.host)).add(path);
        }
      }
    }
    pages.set(path, rec);
  }
  console.log(`\r  ${label}: ${pages.size} pages crawled.        `);

  // Document availability (HEAD)
  const docs = [];
  for (const [url, from] of documents) {
    const r = await get(url, { ...opts, method: "HEAD" });
    docs.push({ url, status: r.status, linkedFrom: [...from] });
  }

  const list = [...pages.values()].map((p) => ({ ...p, linkedFrom: [...(inbound.get(p.path) ?? [])] }));
  return {
    origin,
    crawledOn: today,
    pages: list.sort((a, b) => a.path.localeCompare(b.path, "cs")),
    documents: docs,
    external: [...external].map(([host, from]) => ({ host, pages: from.size })).sort((a, b) => b.pages - a.pages),
    queryLinks: [...queryLinks].map(([url, from]) => ({ url, linkedFrom: [...from] })),
  };
}

// ---------- HTML ----------
const STYLE = `<style>
body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#111;background:#fafafa}h1{font-size:24px;margin:0 0 4px}h2{margin-top:32px}
.cards{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px 14px;min-width:120px}.card b{display:block;font-size:22px}
table{border-collapse:collapse;background:#fff;width:100%;margin:8px 0 24px}th,td{border:1px solid #e2e2e2;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f3f3;position:sticky;top:0}
.s2{color:#1d5e2c;font-weight:700}.s3{color:#8a5a00;font-weight:700}.s4,.s0,.s5{color:#c8102e;font-weight:700}.muted{color:#666}.warn{background:#fff6e0}.bad{background:#fdecee}
input{padding:8px 12px;border:1px solid #ccc;border-radius:99px;width:320px;margin:8px 0}code{font-size:12px}a{color:#111}
</style>
<script>function f(i){const q=i.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none')}</script>`;
const sc = (s) => `<span class="s${String(s)[0]}">${s || "ERR"}</span>`;

function inventoryHtml(inv, title) {
  const p = inv.pages;
  const ok = p.filter((x) => x.status === 200);
  const issues = (x) => {
    const out = [];
    if (x.status === 200) {
      if (!x.title) out.push("bez title");
      if (!x.h1?.length) out.push("bez H1");
      if (x.h1?.length > 1) out.push(`${x.h1.length}× H1`);
      if (!x.description) out.push("bez description");
      if (x.words < 80) out.push("málo textu");
    }
    if (x.status >= 400 && x.linkedFrom.length) out.push(`odkazováno z ${x.linkedFrom.length} str.`);
    return out;
  };
  const card = (n, l) => `<div class="card"><b>${n}</b>${l}</div>`;
  return `<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${STYLE}
<h1>${esc(title)}</h1><p class="muted">${esc(inv.origin)} · procházeno ${inv.crawledOn} · stránky nalezené přes sitemapu a odkazy (bez URL s parametry)</p>
<div class="cards">${card(p.length, "URL celkem")}${card(ok.length, "200 OK")}${card(p.filter((x) => x.status >= 300 && x.status < 400).length, "přesměrování")}${card(p.filter((x) => x.status >= 400 || x.status === 0).length, "chyby (4xx/5xx)")}${card(ok.filter((x) => !x.h1?.length || x.h1.length > 1).length, "chybná H1")}${card(inv.documents.filter((d) => d.status !== 200).length + " / " + inv.documents.length, "nefunkční dokumenty")}</div>
<input placeholder="Filtrovat…" oninput="f(this)">
<h2>Stránky</h2><table><thead><tr><th>URL</th><th>Stav</th><th>Title / H1</th><th>Description</th><th>Slov</th><th>Obr.</th><th>Form.</th><th>Odkazy dovnitř</th><th>Upozornění</th></tr></thead><tbody>
${p
  .map((x) => {
    const iss = issues(x);
    return `<tr class="${x.status >= 400 || x.status === 0 ? "bad" : iss.length ? "warn" : ""}"><td><a href="${esc(x.url)}">${esc(x.path)}</a>${x.inSitemap ? ' <span class="muted">(sitemap)</span>' : ""}</td><td>${sc(x.status)}${x.redirectTo ? ` → <code>${esc(x.redirectTo)}</code>` : ""}</td>
<td>${esc(x.title ?? "")}${x.h1?.length ? `<br><b>H1:</b> ${x.h1.map(esc).join(" | ")}` : ""}${x.h2?.length ? `<br><span class="muted">H2: ${x.h2.slice(0, 5).map(esc).join(" · ")}</span>` : ""}</td>
<td class="muted">${esc((x.description ?? "").slice(0, 160))}</td><td>${x.words ?? ""}</td><td>${x.images ?? ""}</td><td>${x.forms ?? ""}</td>
<td>${x.linkedFrom.length}${x.status >= 400 ? `<br><span class="muted">${x.linkedFrom.slice(0, 4).map(esc).join("<br>")}</span>` : ""}</td><td>${iss.map(esc).join(", ")}</td></tr>`;
  })
  .join("\n")}</tbody></table>
<h2>Dokumenty (${inv.documents.length})</h2><table><thead><tr><th>Soubor</th><th>Stav</th><th>Odkazováno z</th></tr></thead><tbody>
${inv.documents.map((d) => `<tr class="${d.status !== 200 ? "bad" : ""}"><td><a href="${esc(d.url)}">${esc(decodeURIComponent(d.url.replace(inv.origin, "")))}</a></td><td>${sc(d.status)}</td><td>${d.linkedFrom.map(esc).join("<br>")}</td></tr>`).join("")}</tbody></table>
<h2>Odkazy s parametry (${inv.queryLinks.length})</h2><table><thead><tr><th>URL</th><th>Odkazováno z</th></tr></thead><tbody>
${inv.queryLinks.map((q) => `<tr><td><code>${esc(q.url)}</code></td><td>${q.linkedFrom.map(esc).join("<br>")}</td></tr>`).join("")}</tbody></table>
<h2>Externí domény</h2><table><thead><tr><th>Doména</th><th>Počet stránek s odkazem</th></tr></thead><tbody>
${inv.external.map((e) => `<tr><td>${esc(e.host)}</td><td>${e.pages}</td></tr>`).join("")}</tbody></table></html>`;
}

// ---------- modes ----------
async function runInventory(which) {
  const dir = join(OUT, which);
  const cacheDir = join(dir, "cache");
  mkdirSync(cacheDir, { recursive: true });
  const origin = which === "old" ? OLD_BASE : NEW_BASE;
  const opts = which === "old"
    ? { delay: Number(args.delay ?? 1000), cacheDir, refresh: args.refresh === "true" }
    : { delay: 0, cacheDir: undefined, refresh: true };
  console.log(which === "old" ? `Crawling ${origin} (1 request per ${opts.delay} ms, cached)…` : `Crawling ${origin}…`);
  const inv = await crawl(origin, which, opts);
  writeFileSync(join(dir, "pages.json"), JSON.stringify(inv, null, 2));
  writeFileSync(join(dir, "index.html"), inventoryHtml(inv, which === "old" ? "Inventura stránek — současný redcord.cz" : "Inventura stránek — nový web (prototyp)"));
  console.log(`Saved ${join(dir, "index.html")}`);
}

async function runCompare() {
  const oldInv = JSON.parse(readFileSync(join(OUT, "old", "pages.json"), "utf8"));
  const newPath = join(OUT, "new", "pages.json");
  const newInv = existsSync(newPath) ? JSON.parse(readFileSync(newPath, "utf8")) : { pages: [] };
  const newByPath = new Map(newInv.pages.map((p) => [p.path, p]));
  // Migration-map decisions (TypeScript file with only erasable syntax — loaded via Node type stripping)
  let rules = [];
  try {
    ({ redirectRules: rules } = await import(new URL("../apps/redcord-web/src/config/redirects.ts", import.meta.url)));
  } catch {
    console.warn("(migration map not loaded — needs Node ≥ 22.18)");
  }
  const ruleFor = (path) => rules.find((r) => r.from === path);

  const rows = [];
  for (const o of oldInv.pages) {
    // Ask the new app what happens to this old URL today (follow at most 3 redirects)
    let url = NEW_BASE + o.path;
    const hops = [];
    let r;
    let externalTo = "";
    for (let i = 0; i < 4; i++) {
      r = await fetch(url, { redirect: "manual" }).then((x) => ({ status: x.status, location: x.headers.get("location") ?? "" })).catch((e) => ({ status: 0, location: "", error: e.message }));
      if (r.status >= 300 && r.status < 400 && r.location) {
        hops.push(r.status);
        const next = new URL(r.location, url);
        // Never follow off-site: an external redirect target is reported, not fetched.
        if (next.origin !== new URL(NEW_BASE).origin) {
          externalTo = next.toString();
          break;
        }
        url = next.toString();
      } else break;
    }
    const finalPath = externalTo || new URL(url).pathname + new URL(url).search + (new URL(url).hash ?? "");
    const target = externalTo ? undefined : newByPath.get(new URL(url).pathname);
    let outcome;
    if (externalTo) outcome = `přesměrováno externě (${hops.join("→")})`;
    else if (r.status === 0) outcome = "nedostupné";
    else if (r.status === 200 && !hops.length) outcome = "zachováno";
    else if (r.status === 200) outcome = `přesměrováno (${hops.join("→")})`;
    else outcome = `chybí (${r.status})`;
    rows.push({ old: o, outcome, finalPath, newStatus: r.status, target, rule: ruleFor(o.path) });
  }
  const oldPaths = new Set(oldInv.pages.map((p) => p.path));
  const reached = new Set(rows.map((r) => r.target?.path).filter(Boolean));
  const newOnly = newInv.pages.filter((p) => p.status === 200 && !oldPaths.has(p.path) && !reached.has(p.path));

  const count = (pred) => rows.filter(pred).length;
  const oldOk = (r) => r.old.status === 200;
  const cls = (r) => (r.outcome.startsWith("chybí") && oldOk(r) ? "bad" : r.outcome.startsWith("chybí") ? "" : r.outcome.startsWith("přesm") ? "warn" : "");
  const card = (n, l) => `<div class="card"><b>${n}</b>${l}</div>`;
  const cell = (p) => (p ? `${esc(p.title ?? "")}${p.h1?.length ? `<br><b>H1:</b> ${p.h1.map(esc).join(" | ")}` : ""}<br><span class="muted">${p.words ?? 0} slov · ${p.images ?? 0} obr. · ${p.forms ?? 0} form.</span>` : "");

  const html = `<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Porovnání starého a nového webu</title>${STYLE}
<h1>Porovnání: redcord.cz → nový web</h1><p class="muted">Starý web procházen ${oldInv.crawledOn}; nový web (${esc(NEW_BASE)}) testován ${today}. Každá stará URL byla vyzkoušena proti novému webu včetně přesměrování.</p>
<div class="cards">${card(count(oldOk), "funkčních starých stránek")}${card(count((r) => oldOk(r) && r.outcome === "zachováno"), "zachováno na stejné URL")}${card(count((r) => oldOk(r) && r.outcome.startsWith("přesm")), "přesměrováno")}${card(count((r) => oldOk(r) && r.outcome.startsWith("chybí")), "funkčních, v novém webu chybí")}${card(count((r) => !oldOk(r) && r.newStatus === 200), "rozbitých dnes, opraveno")}${card(newOnly.length, "nových stránek")}</div>
<p><span class="bad" style="padding:2px 6px">červeně</span> = funkční stará stránka bez náhrady · <span class="warn" style="padding:2px 6px">žlutě</span> = přesměrováno (zkontrolujte obsah)</p>
<input placeholder="Filtrovat…" oninput="f(this)">
<h2>Staré URL a jejich osud</h2><table><thead><tr><th>Stará URL</th><th>Dnes na redcord.cz</th><th>Starý obsah</th><th>V novém webu</th><th>Nový obsah</th><th>Migrační mapa</th></tr></thead><tbody>
${rows
  .map(
    (r) => `<tr class="${cls(r)}"><td><a href="${esc(r.old.url)}">${esc(r.old.path)}</a></td><td>${sc(r.old.status)}${r.old.redirectTo ? ` → <code>${esc(r.old.redirectTo)}</code>` : ""}</td><td>${cell(r.old)}</td>
<td><b>${esc(r.outcome)}</b>${r.outcome.startsWith("přesm") ? `<br><code>${esc(r.finalPath)}</code>` : ""}</td><td>${cell(r.target)}</td>
<td>${r.rule ? `<b>${esc(r.rule.status)}</b><br><span class="muted">${esc(r.rule.reason)}</span>` : '<span class="muted">není v mapě</span>'}</td></tr>`,
  )
  .join("\n")}</tbody></table>
<h2>Nové stránky bez předchůdce (${newOnly.length})</h2><table><thead><tr><th>URL</th><th>Obsah</th></tr></thead><tbody>
${newOnly.map((p) => `<tr><td><a href="${esc(p.url)}">${esc(p.path)}</a></td><td>${cell(p)}</td></tr>`).join("")}</tbody></table>
<h2>Dokumenty starého webu</h2><table><thead><tr><th>Soubor</th><th>Stav</th></tr></thead><tbody>
${oldInv.documents.map((d) => `<tr class="${d.status !== 200 ? "bad" : ""}"><td>${esc(decodeURIComponent(d.url.replace(oldInv.origin, "")))}</td><td>${sc(d.status)}</td></tr>`).join("")}</tbody></table></html>`;
  writeFileSync(join(OUT, "comparison.html"), html);
  console.log(`Saved ${join(OUT, "comparison.html")}`);
}

if (mode === "old" || mode === "new") await runInventory(mode);
else if (mode === "compare") await runCompare();
else {
  console.error("Usage: node scripts/page-inventory.mjs old|new|compare");
  process.exit(1);
}
