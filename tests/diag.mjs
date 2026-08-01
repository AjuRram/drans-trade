import { chromium, devices } from "@playwright/test";
const BASE = "http://localhost:3100";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#client-code", "DT1042");
await page.click('button[type="submit"]');
await page.waitForTimeout(700);
await page.keyboard.type("481902");
await page.waitForTimeout(500);
await page.keyboard.type("2468");
await page.waitForURL("**/dashboard");

for (const path of ["/funds", "/stock/RELIANCE"]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const vw = 360;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // Report non-fixed elements whose right edge exceeds the viewport.
      if (cs.position !== "fixed" && r.right > vw + 1) {
        out.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 70),
          left: Math.round(r.left),
          right: Math.round(r.right),
          w: Math.round(r.width),
          pos: cs.position,
        });
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScroll: document.body.scrollWidth,
      offenders: out.slice(0, 12),
    };
  });
  console.log(`\n=== ${path} ===`);
  console.log(`doc scrollWidth=${info.scrollWidth} clientWidth=${info.clientWidth} bodyScroll=${info.bodyScroll}`);
  info.offenders.forEach((o) => console.log(`  ${o.tag}.${o.cls} pos=${o.pos} left=${o.left} right=${o.right} w=${o.w}`));
  if (!info.offenders.length) console.log("  (no non-fixed offenders)");
}
await b.close();
