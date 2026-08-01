import { chromium, devices } from '@playwright/test';

const OUT = process.argv[2] || './shots';
const base = 'http://localhost:3100';

const browser = await chromium.launch();

async function login(page) {
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.fill('#client-code', 'DT1042');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(700);
  for (const d of '481902') await page.keyboard.type(d);
  await page.waitForTimeout(500);
  for (const d of '2468') await page.keyboard.type(d);
  await page.waitForTimeout(1200);
}

// Desktop
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await dctx.newPage();
await dp.goto(base + '/login', { waitUntil: 'networkidle' });
await dp.screenshot({ path: `${OUT}/desktop-login.png` });
await login(dp);
await dp.waitForTimeout(1500);
await dp.screenshot({ path: `${OUT}/desktop-dashboard.png`, fullPage: true });
console.log('desktop url:', dp.url());

// Mobile
const mctx = await browser.newContext({ ...devices['iPhone 13'] });
const mp = await mctx.newPage();
await mp.goto(base + '/login', { waitUntil: 'networkidle' });
await mp.screenshot({ path: `${OUT}/mobile-login.png` });
await login(mp);
await mp.waitForTimeout(1500);
await mp.screenshot({ path: `${OUT}/mobile-dashboard.png`, fullPage: true });
console.log('mobile url:', mp.url());

// horizontal overflow check
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('mobile horizontal overflow px:', overflow);

await browser.close();
