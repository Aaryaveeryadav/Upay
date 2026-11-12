/* Run with Playwright installed; UPAY_CHROMIUM optionally selects a browser. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.UPAY_CHROMIUM ? {executablePath: process.env.UPAY_CHROMIUM} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({viewport: {width, height: 844}, serviceWorkers: 'block'});
      const page = await context.newPage();
      const errors = [], pending = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.route('**/api/ai/solve', route => pending.push(route));
      await page.goto(process.env.UPAY_BASE || 'http://127.0.0.1:8005/', {waitUntil: 'networkidle'});
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      await page.locator('#topbar select[data-key="cls"]').selectOption('12');
      await page.locator('#topbar select[data-key="subject"]').selectOption('physics');
      await page.waitForFunction(() => UP.pyq.some(q => q.subject === 'physics'));
      await page.evaluate(() => { location.hash = '#/test'; });
      await page.locator('.q-toggle').nth(3).waitFor();
      await page.waitForTimeout(800); // Let subject-pack hydration finish before interacting.
      const button = page.locator('.q-toggle').nth(3);
      const no = await button.getAttribute('data-q');
      const card = page.locator('#q' + no);
      await button.scrollIntoViewIfNeeded();
      const before = await card.evaluate(el => el.getBoundingClientRect().top);
      assert(await page.evaluate(() => scrollY) > 500);
      await button.click();
      await page.locator('#q' + no + ' .ai-dots').waitFor();
      const stable = async label => {
        const top = await card.evaluate(el => el.getBoundingClientRect().top);
        assert(Math.abs(top - before) < 3, `${label}: card jumped ${top - before}px`);
        assert(await page.evaluate(() => scrollY) > 500, label + ': jumped to top');
      };
      await stable('click');
      // User can scroll elsewhere during loading; response must not pull them back.
      await page.locator('.q-toggle').nth(6).scrollIntoViewIfNeeded();
      const later = page.locator('.q-card').nth(6);
      const laterTop = await later.evaluate(el => el.getBoundingClientRect().top);
      assert.equal(pending.length, 1);
      await pending.shift().fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({
        result: 'Mock answer', approaches: [1,2,3].map(n => ({name: 'Mock method ' + n,
          steps: [{t: 'Synthetic explanation for scroll regression testing only.'}]}))
      })});
      await page.locator('#q' + no + ' .ai-dots').waitFor({state: 'detached'});
      assert(Math.abs(await later.evaluate(el => el.getBoundingClientRect().top) - laterTop) < 3, 'response moved the currently visible question');
      await button.scrollIntoViewIfNeeded();
      const closeTop = await card.evaluate(el => el.getBoundingClientRect().top);
      await button.click();
      assert(Math.abs(await card.evaluate(el => el.getBoundingClientRect().top) - closeTop) < 3, 'closing moved question');
      // A different question's failed request must also preserve position.
      const failed = page.locator('.q-toggle').nth(5);
      await failed.scrollIntoViewIfNeeded();
      await failed.click();
      await page.waitForFunction(() => document.querySelector('.ai-placeholder .ai-dots'));
      const failY = await page.evaluate(() => scrollY);
      await pending.shift().fulfill({status:503,contentType:'application/json',body:'{"error":"Mock unavailable"}'});
      await page.locator('.ai-placeholder').waitFor({state:'detached'});
      assert(Math.abs(await page.evaluate(() => scrollY) - failY) < 3, 'error moved viewport');
      // Actual navigation should still start at the top.
      await page.evaluate(() => { location.hash = '#/syllabus'; });
      await page.waitForFunction(() => scrollY === 0);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: explanation click, delayed success while scrolling, close, failure preserve position; navigation resets`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
