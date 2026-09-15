import { chromium } from 'playwright-core';
const URL = process.env.APP_URL ?? 'http://localhost:5199/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
await page.goto(URL, { waitUntil: 'networkidle' });
const bad = [];
for (const t of await page.locator('.tab').all()) {
  await t.click(); await page.waitForTimeout(200);
  const rows = await page.evaluate(() => {
    const out = [];
    for (const card of document.querySelectorAll('.course-card')) {
      const cardBox = card.getBoundingClientRect();
      // Anything laid out inside the card must stay inside it.
      for (const el of card.querySelectorAll('*')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        if (b.right > cardBox.right + 0.5 || b.left < cardBox.left - 0.5) {
          out.push({ cls: el.className, text: (el.textContent || '').trim().slice(0, 14),
                     right: Math.round(b.right), cardRight: Math.round(cardBox.right) });
        }
      }
    }
    return out;
  });
  bad.push(...rows);
}
const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
await browser.close();
if (bad.length || overflow > 0) {
  console.log('FAIL', JSON.stringify({ bodyOverflow: overflow, escaping: bad.slice(0, 6) }));
  process.exit(1);
}
console.log('PASS: nothing escapes a course card at 393px');
