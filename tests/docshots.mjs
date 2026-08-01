import { chromium, devices } from "@playwright/test";
const BASE = "http://localhost:3100";
const OUT = "./docs/screenshots";
const b = await chromium.launch();

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#client-code", "DT1042");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  await page.keyboard.type("481902");
  await page.waitForTimeout(500);
  await page.keyboard.type("2468");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForTimeout(1400);
}

/* ---------------- Desktop ---------------- */
const d = await b.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await d.newPage();

await dp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await dp.waitForTimeout(600);
await dp.screenshot({ path: `${OUT}/01-login-desktop.png` });

await signIn(dp);
await dp.screenshot({ path: `${OUT}/02-dashboard-desktop.png`, fullPage: true });

await dp.goto(`${BASE}/watchlist`, { waitUntil: "networkidle" });
await dp.waitForTimeout(1200);
await dp.screenshot({ path: `${OUT}/03-watchlist-desktop.png` });

// Order ticket open (drawer)
await dp.getByRole("button", { name: "BUY", exact: true }).first().click();
await dp.waitForTimeout(900);
await dp.screenshot({ path: `${OUT}/04-order-ticket-desktop.png` });
await dp.keyboard.press("Escape");
await dp.waitForTimeout(400);

await dp.goto(`${BASE}/stock/RELIANCE`, { waitUntil: "networkidle" });
await dp.waitForTimeout(1200);
await dp.screenshot({ path: `${OUT}/05-instrument-desktop.png`, fullPage: true });

await dp.goto(`${BASE}/orders`, { waitUntil: "networkidle" });
await dp.waitForTimeout(1000);
await dp.screenshot({ path: `${OUT}/06-orders-desktop.png` });

await dp.goto(`${BASE}/positions`, { waitUntil: "networkidle" });
await dp.waitForTimeout(1200);
await dp.screenshot({ path: `${OUT}/07-positions-desktop.png` });

await dp.goto(`${BASE}/funds`, { waitUntil: "networkidle" });
await dp.waitForTimeout(1000);
await dp.screenshot({ path: `${OUT}/08-funds-desktop.png` });

// Light theme
await dp.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await dp.waitForTimeout(900);
await dp.getByRole("button", { name: "Toggle theme" }).click();
await dp.waitForTimeout(700);
await dp.screenshot({ path: `${OUT}/09-dashboard-light.png` });

/* ---------------- Mobile ---------------- */
const m = await b.newContext({ ...devices["iPhone 13"] });
const mp = await m.newPage();

await mp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await mp.waitForTimeout(600);
await mp.screenshot({ path: `${OUT}/10-login-mobile.png` });

await signIn(mp);
await mp.screenshot({ path: `${OUT}/11-dashboard-mobile.png` });

await mp.goto(`${BASE}/watchlist`, { waitUntil: "networkidle" });
await mp.waitForTimeout(1200);
await mp.screenshot({ path: `${OUT}/12-watchlist-mobile.png` });

// Order ticket as a bottom sheet
await mp.getByRole("button", { name: "BUY", exact: true }).first().click();
await mp.waitForTimeout(900);
await mp.screenshot({ path: `${OUT}/13-order-ticket-mobile.png` });

await mp.goto(`${BASE}/stock/TCS`, { waitUntil: "networkidle" });
await mp.waitForTimeout(1200);
await mp.screenshot({ path: `${OUT}/14-instrument-mobile.png` });

await b.close();
console.log("screenshots captured");
