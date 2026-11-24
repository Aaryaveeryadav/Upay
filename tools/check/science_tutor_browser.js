/* Real-browser check for where the tutor went.
 *
 * The separate Science-tutor page (#/tutor) is gone: there is one
 * ask-a-question screen now, the Study chat at /app#/chat. That change is only
 * trustworthy if a real browser can still get there, so this checks the route
 * a student actually takes:
 *
 *   - the rail offers "Study chat" and it points at /app;
 *   - there is no separate tutor entry any more;
 *   - an old #/tutor bookmark forwards to the chat instead of dead-ending;
 *   - nothing throws while that happens.
 *
 * The chat itself (citations, source cards, stored answers) is covered where
 * it lives: tools/check/react_app.js and tools/check/answer_bank.js.
 *
 *   NODE_PATH=... UPAY_BASE=http://127.0.0.1:8004 node tools/check/science_tutor_browser.js
 */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM ? { executablePath: process.env.UPAY_CHROMIUM } : {}) });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));

      await page.goto((process.env.UPAY_BASE || 'http://127.0.0.1:8005') + '/', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));

      // One entry point, and it is the Study chat.
      assert.equal(await page.locator('[data-nav="app"]').count(), 1, width + ': the rail offers the Study chat');
      const href = await page.locator('[data-nav="app"]').getAttribute('href');
      assert.equal(href, '/app', width + ': the rail link opens the React Study chat');
      assert.equal(await page.locator('[data-nav="tutor"]').count(), 0, width + ': no separate subject-tutor entry');
      assert.equal(await page.locator('form[data-form="science-tutor"]').count(), 0, width + ': no second ask form');

      /* An old #/tutor bookmark must land somewhere useful. The app navigates
         itself: on the next tick it replaces the location with /app#/chat, so
         the correct outcome of opening #/tutor is arriving at the chat, not
         sitting on a page that offers a link. Wait for that arrival. */
      await page.goto((process.env.UPAY_BASE || 'http://127.0.0.1:8005') + '/#/tutor', { waitUntil: 'domcontentloaded' });
      await page.waitForURL(url => url.pathname === '/app', { timeout: 20000 }).catch(() => {});
      const landed = new URL(page.url());
      assert.equal(landed.pathname, '/app', width + ': an old #/tutor link forwards to the Study chat');
      assert.match(landed.hash, /^#\/chat/, width + ': the forwarded page opens the chat route');

      // And the shell it lands on is the Study chat: reachable, bundled, and
      // rendering something a visitor can act on (sign-in, for a guest).
      await page.waitForLoadState('networkidle');
      const chat = await page.evaluate(() => ({
        hasRoot: !!document.getElementById('root'),
        booted: !!document.querySelector('#root > *'),
        script: !!document.querySelector('script[src*="/assets/app/"]')
      }));
      assert.equal(chat.script, true, width + ': the Study chat shell loads its bundle');
      assert.equal(chat.hasRoot, true, width + ': the Study chat shell has its mount point');
      assert.equal(chat.booted, true, width + ': the Study chat shell renders');

      assert.deepEqual(errors, [], width + ': no page errors');
      await context.close();
    }
    console.log('PASS Science tutor browser check: one Study-chat entry, no separate tutor page, old links forward and land');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
