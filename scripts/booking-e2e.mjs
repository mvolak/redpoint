// End-to-end check of the embedded booking (/rezervace/) against a running server with a dev database.
// Usage: node scripts/booking-e2e.mjs [baseUrl]   (default http://localhost:3000)
// Writes synthetic data (one appointment for e2e+<time>@example.invalid) to the configured DEV database.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = "review-screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const problems = [];
const results = [];
const ok = (name, cond, detail = "") => {
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
};

async function newPage(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  // No favicon yet (logo not approved, see docs/ASSET_MANIFEST.md); don't let its 404 mask real errors.
  await page.route("**/favicon.ico", (r) => r.fulfill({ status: 204 }));
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text().slice(0, 200)}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
  return page;
}

const latestMailText = async (page, to) => {
  await page.goto(`${BASE}/rezervace/dev/mailbox/`);
  const art = page.locator("article", { hasText: to }).first();
  return (await art.textContent()) ?? "";
};

try {
  // --- patient booking at mobile width -------------------------------------------------------
  const page = await newPage(390);
  const res = await page.goto(`${BASE}/rezervace/`);
  ok("GET /rezervace/ 200", res?.status() === 200);
  ok("CSP header on booking page", (res?.headers()["content-security-policy"] ?? "").includes("frame-ancestors 'none'"));
  ok("site header present", (await page.locator("header").first().count()) === 1);
  await page.getByRole("heading", { level: 1, name: "Vyberte službu" }).waitFor();
  ok("exactly one H1", (await page.locator("h1").count()) === 1);
  await page.screenshot({ path: `${OUT}/booking-1-service-390.png`, fullPage: true });

  const service = page.locator("section[aria-labelledby=h-service] li button").filter({ hasNotText: "na žádost" }).filter({ hasNotText: "Pouze pro stávající" }).first();
  const serviceName = (await service.locator("span.font-semibold").textContent())?.trim();
  await service.click();
  await page.getByRole("heading", { level: 1, name: "Vyberte terapeuta" }).waitFor();
  await page.getByRole("button", { name: "Pokračovat" }).click();
  await page.getByRole("heading", { level: 1, name: "Vyberte termín" }).waitFor();

  const slot = page.locator("fieldset button[aria-pressed]").first();
  let found = false;
  for (let week = 0; week < 6 && !found; week++) {
    // Slots load asynchronously per week; wait for them rather than counting mid-render.
    found = await slot.waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!found) await page.getByRole("button", { name: "Další týden" }).click();
  }
  ok("free slot found", found, serviceName);
  const slotLabel = await slot.textContent();
  await slot.click();
  await page.getByRole("button", { name: "Pokračovat" }).click();

  const email = `e2e+${Date.now()}@example.invalid`;
  await page.getByLabel("Jméno a příjmení").fill("Testovací Pacient");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Telefon").fill("+420 777 000 111");
  await page.getByLabel("Jsem nový klient").check();
  await page.getByRole("button", { name: "Pokračovat" }).click();

  await page.getByRole("heading", { level: 1, name: "Shrnutí rezervace" }).waitFor();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /^Ověřit e-mail/ }).click();
  await page.getByRole("heading", { level: 1, name: "Ověření e-mailu" }).waitFor();

  const mailPage = await newPage(1024);
  const otpMail = await latestMailText(mailPage, email);
  const code = otpMail.match(/\b(\d{6})\b/)?.[1];
  ok("OTP e-mail captured (not sent)", !!code);
  await page.getByLabel("Ověřovací kód").fill(code ?? "");
  await page.getByRole("button", { name: /^Potvrdit/ }).click();
  await page.getByRole("heading", { level: 1, name: "Rezervace je potvrzena" }).waitFor({ timeout: 15000 });
  ok("booking confirmed", true, `${serviceName} · ${slotLabel}`);
  await page.screenshot({ path: `${OUT}/booking-2-confirmed-390.png`, fullPage: true });

  // --- management link from the confirmation e-mail --------------------------------------------
  let manageUrl;
  for (let i = 0; i < 10 && !manageUrl; i++) {
    // The confirmation is queued in the outbox; deliver it once via the worker endpoint semantics.
    manageUrl = (await latestMailText(mailPage, email)).match(/https?:\/\/\S+\/rezervace\/sprava\/#t=[\w-]+/)?.[0];
    if (!manageUrl) await new Promise((r) => setTimeout(r, 1000));
  }
  ok("confirmation e-mail with /rezervace/sprava/ link", !!manageUrl, manageUrl ? "" : "run `pnpm worker:once` if the outbox worker isn't running");
  if (manageUrl) {
    const m = await newPage(390);
    await m.goto(manageUrl.replace(/^https?:\/\/[^/]+/, BASE));
    await m.getByRole("heading", { level: 1, name: "Správa rezervace" }).waitFor();
    ok("management page opens from e-mail link", true);
    await m.screenshot({ path: `${OUT}/booking-3-manage-390.png`, fullPage: true });
  }

  // --- reception admin --------------------------------------------------------------------------
  const admin = await newPage(1440);
  await admin.goto(`${BASE}/rezervace/admin/login/`);
  ok("admin has no public site header", (await admin.getByText("Přeskočit na obsah").count()) === 0);
  await admin.getByLabel("E-mail").fill("recepce@example.invalid");
  await admin.getByLabel("Heslo").fill(process.env.DEV_STAFF_PASSWORD ?? "redpoint-dev");
  await admin.getByRole("button", { name: "Přihlásit" }).click();
  await admin.waitForURL(/\/rezervace\/admin\/calendar\/?/);
  await admin.getByText("Redpoint · Recepce").waitFor();
  ok("reception login → calendar", true);
  await admin.screenshot({ path: `${OUT}/booking-4-admin-calendar-1440.png`, fullPage: true });

  // --- desktop booking page in site chrome -------------------------------------------------------
  const desk = await newPage(1440);
  await desk.goto(`${BASE}/rezervace/`);
  await desk.getByRole("heading", { level: 1, name: "Vyberte službu" }).waitFor();
  await desk.screenshot({ path: `${OUT}/booking-1-service-1440.png`, fullPage: true });
} catch (e) {
  ok("unexpected error", false, e.message.split("\n")[0]);
} finally {
  await browser.close();
}

// Expected noise: the deliberately anonymous /auth/me probe before login.
const unexpected = problems.filter((p) => !/auth\/me\/? /.test(p + " ") && !/401 .*auth\/me/.test(p));
console.log(results.join("\n"));
console.log(unexpected.length ? `\nConsole/HTTP problems:\n${[...new Set(unexpected)].join("\n")}` : "\nNo console errors or failed requests.");
if (unexpected.length) process.exitCode = 1;
