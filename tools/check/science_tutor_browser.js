/* Real-browser check for where asking a question lives.
 *
 * There is one ask-a-question screen, #/ask. The separate Science-tutor page
 * (#/tutor) is gone, and the React Study chat at /app is no longer offered in
 * the rail. That is only trustworthy if a real browser can still get to the
 * Ask screen, so this checks the route a student actually takes:
 *
 *   - the rail offers no separate Study chat entry;
 *   - it does offer the one Ask a question screen, at #/ask;
 *   - there is no separate tutor entry any more;
 *   - an old #/tutor bookmark forwards to #/ask instead of dead-ending;
 *   - nothing throws while that happens.
 *
 * The chat app itself (citations, source cards, stored answers) is covered
 * where it lives: tools/check/react_app.js and tools/check/answer_bank.js.
 *
 *   NODE_PATH=... UPAY_BASE=http://127.0.0.1:8004 node tools/check/science_tutor_browser.js
 */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM ? { executablePath: process.env.UPAY_CHROMIUM } : {}) });
 /* A browser check whose page never reaches the state it waits for must end
    in a named failure. Without this, one unbounded waitForFunction kept the
    whole workflow job alive until GitHub's six-hour ceiling, and the report
    named no check at all. */
 const watchdog=setTimeout(()=>{console.error('TIMEOUT: '+require('node:path').basename(__filename)+' did not finish within '+(+process.env.UPAY_CHECK_TIMEOUT||300)+'s; it hung waiting for a page state.');process.exit(124);},(+process.env.UPAY_CHECK_TIMEOUT||300)*1000);
 watchdog.unref();
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));

      await page.goto((process.env.UPAY_BASE || 'http://127.0.0.1:8005') + '/', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));

      /* The rail no longer offers the React Study chat, which was a second
         parallel ask screen. The one Ask screen is #/ask. */
      assert.equal(await page.locator('[data-nav="app"]').count(), 0, width + ': the rail no longer offers the Study chat');
      assert.equal(await page.locator('[data-nav="tutor"]').count(), 0, width + ': no separate subject-tutor entry');
      assert.equal(await page.locator('form[data-form="science-tutor"]').count(), 0, width + ': no second ask form');
      /* index.html ships two static [data-nav="ask"] links (the desktop rail
         and the mobile bar), so this must assert on the set, not on a single
         node. Both must point at the one Ask screen. */
      const askLinks = page.locator('[data-nav="ask"]');
      const askCount = await askLinks.count();
      assert.ok(askCount >= 1, width + ': the rail offers the one Ask a question screen');
      for (let i = 0; i < askCount; i++) {
        assert.equal(await askLinks.nth(i).getAttribute('href'), '#/ask',
          width + ': every Ask entry points at #/ask');
      }

      /* An old #/tutor bookmark must land somewhere useful. The app navigates
         itself: on the next tick it replaces the location with #/ask, so the
         correct outcome of opening #/tutor is arriving at the one Ask screen,
         not sitting on a page that offers a link. Wait for that arrival. */
      await page.goto((process.env.UPAY_BASE || 'http://127.0.0.1:8005') + '/#/tutor', { waitUntil: 'domcontentloaded' });
      await page.waitForURL(url => url.hash.startsWith('#/ask'), { timeout: 20000 }).catch(() => {});
      const landed = new URL(page.url());
      assert.equal(landed.hash.split('?')[0], '#/ask', width + ': an old #/tutor link forwards to the Ask screen');

      // And the screen it lands on really renders the ask box.
      await page.waitForSelector('form[data-form="ask"]', { timeout: 20000 });
      const ask = await page.evaluate(() => ({
        box: !!document.querySelector('form[data-form="ask"]'),
        label: (document.querySelector('form[data-form="ask"] textarea') || {}).name || ''
      }));
      assert.equal(ask.box, true, width + ': the forwarded page renders the Ask box');
      assert.equal(ask.label, 'q', width + ': the Ask box is the question field');

      assert.deepEqual(errors, [], width + ': no page errors');
      await context.close();
    }
    console.log('PASS Science tutor browser check: one Study-chat entry, no separate tutor page, old links forward and land');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
