// Review QA: screenshots at 390/768/1440, horizontal-overflow detection, H1 count,
// keyboard navigation and test-mode form checks. Uses the locally installed Chrome
// through playwright-core (no browser download).
// Usage: node scripts/review-check.mjs [baseUrl]   (server must be running)
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3000";
const out = resolve("review-screenshots");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures.push(msg);
};

const pages = [
  ["home", "/"],
  ["vybaveni", "/vybaveni/"],
  ["produkt", "/vybaveni/workstation-professional/"],
  ["program", "/vzdelavani/vzdelavaci-program/"],
  ["kurz", "/vzdelavani/kurzy/neurac-3/"],
  ["bezpecnost", "/bezpecnost/"],
  ["kontakt", "/kontakt/"],
  ["hledat", "/hledat/?q=neurac"],
];

for (const width of [390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "cs-CZ", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const [name, path] of pages) {
    await page.goto(base + path, { waitUntil: "load" });
    const res = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed";
        })
        // ignore elements inside an overflow-hidden ancestor (clipped, cannot scroll)
        .filter((el) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if (o === "hidden" || o === "clip") return false;
          }
          return true;
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      return { scroll: document.documentElement.scrollWidth, vw, wide, h1: document.querySelectorAll("h1").length };
    });
    ok(res.scroll <= res.vw, `${name}@${width}: no horizontal overflow (${res.scroll}/${res.vw}) ${res.wide.join(" | ")}`);
    ok(res.h1 === 1, `${name}@${width}: exactly one h1 (${res.h1})`);
    await page.screenshot({ path: join(out, `${name}-${width}.png`), fullPage: true });
  }

  if (width === 390) {
    // Mobile menu opens and exposes grouped navigation.
    await page.goto(base + "/", { waitUntil: "load" });
    await page.getByText("Menu", { exact: true }).click();
    const box = await page.getByRole("navigation", { name: "Hlavní navigace (mobil)" }).boundingBox();
    ok(!!box && box.height > 300, `mobile: menu panel opens with real height (${box?.height ?? 0}px)`);
    ok(await page.getByRole("link", { name: "Technické kontroly" }).first().isVisible(), "mobile: grouped sub-links visible");
    await page.screenshot({ path: join(out, "menu-390.png") });
  }

  if (width === 1440) {
    // Skip link is the first focusable element and moves focus to main.
    await page.goto(base + "/vybaveni/", { waitUntil: "load" });
    await page.keyboard.press("Tab");
    ok((await page.evaluate(() => document.activeElement?.textContent)) === "Přeskočit na obsah", "keyboard: skip link first");
    await page.keyboard.press("Enter");
    ok((await page.evaluate(() => document.activeElement?.id)) === "obsah", "keyboard: skip link focuses main");

    // Dropdown: toggle button opens with Enter, closes with Escape and returns focus.
    const toggle = page.getByRole("button", { name: "Podnabídka Vzdělávání" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    ok((await toggle.getAttribute("aria-expanded")) === "true", "keyboard: dropdown opens");
    await page.keyboard.press("Tab");
    ok(
      (await page.evaluate(() => document.activeElement?.textContent)) === "Přehled vzdělávání",
      "keyboard: Tab enters dropdown",
    );
    await page.keyboard.press("Escape");
    ok((await toggle.getAttribute("aria-expanded")) === "false", "keyboard: Escape closes dropdown");
    ok(await toggle.evaluate((el) => el === document.activeElement), "keyboard: focus returns to toggle");

    // Equipment filter.
    await page.getByRole("link", { name: "Jednotlivci", exact: true }).click();
    await page.waitForURL(/pro=jednotlivec/);
    ok((await page.locator("article").count()) === 3, "catalogue: individual filter shows 3 families");

    // Calendar: empty filter result is explained.
    await page.goto(base + "/vzdelavani/vzdelavaci-program/?misto=Ostrava", { waitUntil: "load" });
    const loc = await page.locator("#f-misto").inputValue();
    ok(loc === "", "calendar: unknown location ignored (Ostrava has no sessions)");
    await page.goto(base + "/vzdelavani/vzdelavaci-program/?cesta=workshop&misto=Hradec%20Kr%C3%A1lov%C3%A9", { waitUntil: "load" });
    ok(await page.getByText("Pro zvolené filtry nemáme vypsaný termín").isVisible(), "calendar: empty state for filters");

    // Enquiry form: errors, then honest test-mode result.
    await page.goto(base + "/kontakt/?oddeleni=vzdelavani", { waitUntil: "networkidle" });
    ok((await page.locator("select[name=department]").inputValue()) === "vzdelavani", "form: department preselected from URL");
    await page.getByRole("button", { name: /Ověřit dotaz/ }).click();
    await page.getByText(/Formulář obsahuje \d chyb/).waitFor();
    ok(await page.getByText(/Formulář obsahuje \d chyb/).isVisible(), "form: error summary shown");
    ok(
      await page.evaluate(() => document.activeElement?.textContent?.startsWith("Formulář obsahuje")),
      "form: focus moves to error summary",
    );
    await page.screenshot({ path: join(out, "form-errors-1440.png"), fullPage: false });
    await page.locator("input[name=name]").fill("Test Recenzent");
    await page.locator("input[name=email]").fill("test@example.cz");
    await page.locator("textarea[name=message]").fill("Testovací dotaz pro ověření formuláře.");
    await page.locator("input[name=acknowledged]").check();
    await page.getByRole("button", { name: /Ověřit dotaz/ }).click();
    await page.getByText("Testovací režim", { exact: true }).waitFor();
    ok(await page.getByText("nic nebylo odesláno").isVisible(), "form: test adapter states nothing was sent");
    await page.screenshot({ path: join(out, "form-test-result-1440.png"), fullPage: false });
  }
  await ctx.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nAll checks passed");
process.exit(failures.length ? 1 : 0);
