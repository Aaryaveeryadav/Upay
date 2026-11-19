/* A slow science answer must never end in "the AI took too long".

   The contract now is: the single call keeps its full budget (40 s of real
   waiting is not thrown away); if it really runs out, the app asks for the
   answer in parts — the core answer with one method, then one method per
   request — so the student still gets an answer. Every extra request is
   bounded: one core request, and a method request stops after a refusal or
   two misses. A timeout with no answer at all still leaves the question in
   place with an explicit retry. */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM ? { executablePath: process.env.UPAY_CHROMIUM } : {}) });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      const page = await context.newPage(), pending = [], errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.route('**/api/ai/solve', route => {
        let part = '';
        try { part = (route.request().postDataJSON() || {}).part || ''; } catch (_) { part = ''; }
        pending.push({ route, part });
      });
      await page.goto(process.env.UPAY_BASE || 'http://127.0.0.1:8005/', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      await page.clock.install();

      /* Take the oldest waiting request of one kind and hand back its route. */
      const take = async (part, label) => {
        for (let i = 0; i < 240; i++) {
          const at = pending.findIndex(p => p.part === part);
          if (at >= 0) return pending.splice(at, 1)[0].route;
          await page.waitForTimeout(25);
        }
        throw new Error(`no ${part || 'whole'} request arrived for ${label}; waiting: ` +
          pending.map(p => p.part || 'whole').join(','));
      };
      const fulfil = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      const partial = { source: 'ai', part: 'core', complete: false, result: 'The sky looks blue because air scatters short wavelengths of sunlight.',
        summary: 'Rayleigh scattering.', check: 'Mock check',
        approaches: [{ name: 'Rayleigh scattering', steps: [{ t: 'Mock working for the timeout test.' }] }] };
      const method = name => ({ source: 'ai', part: 'approach', complete: false,
        approaches: [{ name, steps: [{ t: 'Mock working for the timeout test.' }] }] });

      /* 1. The single call is allowed its whole budget: 40 s is still waiting. */
      const q = 'Why is the sky blue?';
      await page.evaluate(q => { UP.S.subject = 'science'; location.hash = '#/ask?q=' + encodeURIComponent(q); }, q);
      await page.waitForFunction(() => UP.S.aiState === 'loading');
      await page.waitForTimeout(50);
      const whole = await take('', 'the first answer');
      assert.deepEqual(pending.map(p => p.part || 'whole'), [], 'one request at a time');
      await page.clock.fastForward(40000);
      assert.equal(await page.evaluate(() => UP.S.aiState), 'loading', 'a 40-second answer must not be discarded');

      /* 2. It really timed out: the answer arrives in parts instead of an error. */
      await fulfil(whole, 504, { code: 'provider_timeout', error: 'The AI took too long to respond.', fallback: true });
      const core = await take('core', 'the split answer');
      await fulfil(core, 200, partial);
      await page.waitForFunction(() => UP.S.aiState === 'done' && document.querySelectorAll('.ai-answer .approach').length === 1);
      assert.equal(await page.evaluate(() => UP.S.aiQuestion), q, 'the question is preserved');
      assert.match(await page.locator('.ai-answer').innerText(), /scatters short wavelengths/,
        'the answer from the parts is shown');
      assert.equal(await page.locator('.ai-answer .parts-note').count(), 1, 'the card says it arrived in parts');

      /* 3. The provider keeps timing out: the loop stops, the answer stays. */
      const second = await take('approach', 'the second method');
      await fulfil(second, 504, { code: 'provider_timeout', error: 'The AI took too long to respond.' });
      await page.waitForFunction(() => document.querySelectorAll('[data-action="more-approaches"]').length === 1);
      assert.equal(await page.evaluate(() => UP.S.aiState), 'done', 'a refused method never discards the answer');
      assert.equal(await page.locator('.ai-answer .approach').count(), 1);
      assert.equal(pending.length, 0, 'no request storm: the loop stops on the refusal');
      assert.match(await page.locator('.parts-note').innerText(), /1 of 4/, 'the banner counts what arrived');

      /* 4. The missing methods can be asked for again, and then all four show. */
      await page.locator('[data-action="more-approaches"]').click();
      for (const name of ['Substitution', 'Verification', 'Reasoning']) {
        const route = await take('approach', 'a requested method');
        await fulfil(route, 200, method(name));
      }
      await page.waitForFunction(() => document.querySelectorAll('.ai-answer .approach').length === 4);
      assert.match(await page.locator('.parts-note').innerText(), /4 of 4/, 'a finished split answer says so');
      assert.equal(await page.locator('[data-action="more-approaches"]').count(), 0, 'nothing to ask for now');
      assert.equal(await page.locator('[data-action="retryAI"]').count(), 0, 'the answer replaced the retry card');
      assert.equal(await page.locator('#aiRequestStatus').count(), 0);

      /* 5. A timeout with no part answer at all still leaves an explicit retry. */
      const next = 'Explain why a clear daytime sky appears blue.';
      await page.evaluate(q => { location.hash = '#/ask?q=' + encodeURIComponent(q); }, next);
      await page.waitForFunction(() => UP.S.aiState === 'loading');
      await page.waitForTimeout(50);
      await take('', 'the second question');
      await page.clock.fastForward(65001);
      /* The app does try parts once; the provider refuses, so there is no
         answer to show and the honest retry card is what remains. */
      const fallback = await take('core', 'the fallback');
      await fulfil(fallback, 403, { code: 'ai_unavailable', error: 'The AI is unavailable right now.' });
      await page.waitForFunction(() => UP.S.aiState === 'local');
      assert.equal(await page.evaluate(() => UP.S.aiQuestion), next, 'the second question survives the timeout');
      assert.equal(await page.locator('[data-action="retryAI"]').count(), 1, 'browser safety deadline remains recoverable');
      assert.equal(pending.length, 0, 'no request storm after the refusal');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: slow science request survives 40s, a timeout is answered in parts, ` +
        'the loop stops on a refusal, the missing methods can be requested, and a bare timeout keeps a retry');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
