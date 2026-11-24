/* Real-browser check for the Class 10 Science tutor page (#/tutor).

   Playwright is mocked at the network boundary: /api/science/ask is answered
   with a fixed cited answer, so this checks the page and the UI contract, not
   a live Ollama model. Run where playwright + Chromium are available:

     NODE_PATH=... UPAY_BASE=http://127.0.0.1:8004 node tools/check/science_tutor_browser.js
*/
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const answer = {
  ok: true, question: 'Why are bags of chips flushed with nitrogen gas?',
  answer: 'Chips contain fats and oils that oxidise and turn rancid [1]. Packets are flushed with nitrogen, an unreactive gas, to displace oxygen [1][2].',
  citations: [
    { n: 1, docType: 'activity', label: 'NCERT · Ch 1 · Activity 1.11', chapter: 1, chapterTitle: 'Chemical Reactions and Equations', section: 'Activity 1.11', page: 12, pageSource: 'textbook-pdf', verifiedKey: false, answer: '', question: '', year: null, snippet: 'When fats and oils are oxidised, they become rancid and their smell and taste change.' },
    { n: 2, docType: 'pyq', label: 'CBSE 2026 · Set 31/1/1 · Q 21', chapter: 1, chapterTitle: 'Chemical Reactions and Equations', section: 'assertion', page: null, pageSource: '', verifiedKey: true, answer: 'Nitrogen displaces oxygen and prevents oxidation.', question: 'Why is a chip packet flushed with nitrogen?', year: 2026, set: '31/1/1', snippet: 'A student flushed a chip packet with nitrogen gas before sealing it.' }
  ],
  retrieved: 2, model: 'qwen2.5:3b', grounded: true,
  notice: 'AI draft from a local model — check it against the cited pages; not an official answer key.',
  citationCheck: { used: [1, 2], invalid: [], hasCitation: true }
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM ? { executablePath: process.env.UPAY_CHROMIUM } : {}) });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      const probes = [], asks = [];
      await page.route('**/api/science/ask', async route => {
        if (route.request().method() === 'GET') {
          probes.push(1);
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ ok: true, enabled: true, ready: true, model: 'qwen2.5:3b',
              index: { available: true, chunks: 1435, pageGrounded: 797, verifiedAnswers: 171 } }) });
        }
        asks.push(route.request().postDataJSON());
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer) });
      });
      await page.goto((process.env.UPAY_BASE || 'http://127.0.0.1:8005') + '/#/tutor', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      await page.waitForSelector('form[data-form="science-tutor"]');
      assert(probes.length >= 1, width + ': the page probes the tutor status');
      await page.waitForSelector('.tutor-status');
      assert.match(await page.locator('.tutor-status').innerText(), /1435 chunks/);
      assert.equal(await page.locator('[data-nav="tutor"]').count(), 1, width + ': rail link exists');
      assert.equal(await page.locator('[data-tutor-suggestion]').count(), 6, width + ': starter chips');

      // Ask by typing + Enter.
      await page.locator('#tutorQuestion').fill('Why are bags of chips flushed with nitrogen gas?');
      await page.locator('#tutorQuestion').press('Enter');
      await page.waitForSelector('.tutor-answer-text');
      assert.equal(asks.length, 1);
      assert.equal(asks[0].question, 'Why are bags of chips flushed with nitrogen gas?');
      assert.equal(asks[0].lang, 'en');
      assert.equal(await page.locator('.tutor-source').count(), 2, width + ': two source cards');
      assert.match(await page.locator('.tutor-source[data-source-n="1"]').innerText(), /PDF page 12/);
      assert.match(await page.locator('.tutor-source[data-source-n="2"]').innerText(), /Verified answer key/);
      assert.equal(await page.locator('.tutor-answer-text a.tutor-cite').count(), 3, width + ': citation links');
      const boardHref = await page.locator('.tutor-source[data-source-n="2"] a[href^="#/pyq"]').getAttribute('href');
      assert.equal(boardHref, '#/pyq?sub=science&cls=10&y=2026&ch=1');

      // Clicking [2] highlights the second card.
      await page.locator('.tutor-cite[data-cite="2"]').first().click();
      await page.waitForSelector('#source-2.tutor-source-target');

      // No horizontal overflow at either width; controls stay readable.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert(!overflow, width + ': no horizontal overflow');

      // The transcript survives a reload (settled turns only).
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('.tutor-source');
      assert.equal(await page.locator('.tutor-source').count(), 2, width + ': transcript restored after reload');

      // Clear empties the thread.
      await page.locator('[data-tutor-action="clear"]').click();
      await page.waitForSelector('[data-tutor-suggestion]');
      assert.equal(await page.locator('.tutor-source').count(), 0);
      assert.deepEqual(errors, [], width + ': no page errors');
      await context.close();
    }
    console.log('PASS Science tutor browser check: status probe, ask, citations, source cards, reload persistence, clear, layout');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
