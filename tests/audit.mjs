/**
 * Full-route audit: loads every page at desktop and mobile widths, captures
 * screenshots, and reports console errors plus horizontal overflow.
 *
 * Horizontal overflow is the single most common responsive defect — a page that
 * scrolls sideways on a phone. It is checked programmatically rather than by eye.
 */
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:3100";
const OUT = "./shots";
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["dashboard", "/dashboard"],
  ["watchlist", "/watchlist"],
  ["orders", "/orders"],
  ["positions", "/positions"],
  ["holdings", "/holdings"],
  ["funds", "/funds"],
  ["stock", "/stock/RELIANCE"],
];

const browser = await chromium.launch();
const problems = [];

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#client-code", "DT1042");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  await page.keyboard.type("481902");
  await page.waitForTimeout(500);
  await page.keyboard.type("2468");
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

async function audit(label, contextOpts, tag) {
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${String(e).slice(0, 160)}`));

  await signIn(page);

  for (const [name, path] of ROUTES) {
    errors.length = 0;
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    // Assert we actually landed on the route. Without this a redirect back to
    // /login reports a false pass — the login page has no overflow either.
    const landed = new URL(page.url()).pathname;
    if (landed !== path) {
      problems.push({ label, name, overflow: 0, errors: [`REDIRECTED to ${landed}`], widest: null });
      console.log(`REDIRECT  ${label.padEnd(8)} ${name.padEnd(11)} -> ${landed}`);
      continue;
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );

    // Any element wider than the viewport is the usual culprit.
    const widest = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      let worst = null;
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width > vw + 1 && (!worst || r.width > worst.w)) {
          worst = { tag: el.tagName, cls: String(el.className).slice(0, 60), w: Math.round(r.width) };
        }
      }
      return worst;
    });

    await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });

    const status = overflow > 1 ? "OVERFLOW" : errors.length ? "ERRORS" : "OK";
    if (status !== "OK") {
      problems.push({ label, name, overflow, errors: [...errors], widest });
    }
    console.log(
      `${status.padEnd(9)} ${label.padEnd(8)} ${name.padEnd(11)} overflow=${overflow}px errors=${errors.length}` +
        (widest ? ` widest=${widest.tag}.${widest.cls}@${widest.w}px` : "")
    );
  }

  await ctx.close();
}

await audit("desktop", { viewport: { width: 1440, height: 900 } }, "d");
await audit("tablet", { viewport: { width: 820, height: 1180 } }, "t");
await audit("mobile", { ...devices["iPhone 13"] }, "m");
// 360px is the narrowest common Android width and where layouts usually break.
await audit("narrow", { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true }, "n");

console.log("\n" + "=".repeat(60));
console.log(problems.length === 0 ? "ALL ROUTES CLEAN" : `${problems.length} PROBLEM(S)`);
for (const p of problems) {
  console.log(`  ${p.label}/${p.name}: overflow=${p.overflow}px`);
  p.errors.slice(0, 3).forEach((e) => console.log(`     ${e}`));
  if (p.widest) console.log(`     widest: ${p.widest.tag}.${p.widest.cls} = ${p.widest.w}px`);
}

await browser.close();
process.exit(problems.length ? 1 : 0);
