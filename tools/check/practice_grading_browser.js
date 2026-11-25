/* Real reported seeds and Science import; conflicting AI replies below are fixtures. */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'], executablePath:process.env.UPAY_CHROMIUM });
 /* A browser check whose page never reaches the state it waits for must end
    in a named failure. Without this, one unbounded waitForFunction kept the
    whole workflow job alive until GitHub's six-hour ceiling, and the report
    named no check at all. */
 const watchdog=setTimeout(()=>{console.error('TIMEOUT: '+require('node:path').basename(__filename)+' did not finish within '+(+process.env.UPAY_CHECK_TIMEOUT||300)+'s; it hung waiting for a page state.');process.exit(124);},(+process.env.UPAY_CHECK_TIMEOUT||300)*1000);
 watchdog.unref();
  try {
    const context = await browser.newContext({ serviceWorkers:'block' });
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', e => errors.push(String(e)));
    let online = false;
    const explanation = { policyVersion:'four-approaches-v4', result:'Fixture explanation result',
      approaches:[1,2,3,4].map(n => ({ name:`Fixture method ${n}`, steps:[{ t:'Synthetic test explanation.' }] })) };
    await page.route('**/api/ai/**', route => {
      requests.push(route.request().url());
      return online && route.request().url().endsWith('/solve')
        ? route.fulfill({ json:explanation }) : route.fulfill({ status:503, json:{ error:'Fixture offline' } });
    });
    await page.goto(process.env.UPAY_BASE || 'http://127.0.0.1:8004', {waitUntil:'networkidle'});
    await page.waitForFunction(() => window.UP?.S && document.body.classList.contains('up-ready'));
    async function paper(seed, chapters, run) {
      await page.evaluate(({seed, chapters, run}) => {
        Object.assign(UP.S.test, { board:'cbse', level:'mixed', seed, chapters });
        UP.S.paper = null;
        location.hash = '#/test?run=' + run;
      }, {seed, chapters, run});
      await page.waitForFunction(seed => UP.S.paper?.seed === seed, seed);
    }
    for (const i of [2,3]) {
      await paper(67, [], i);
      const card = page.locator('#q5');
      await card.locator('.q-options-toggle').click();
      await card.locator(`[data-i="${i}"]`).click();
      assert.equal(await card.locator('.q-opt.right').getAttribute('data-opt'), '−40');
      assert.equal(await card.locator('.q-opt.wrong').count(), i === 3 ? 0 : 1);
      assert.equal(await page.evaluate(() => UP.S.answers[5].ok), i === 3);
      assert.equal(await page.evaluate(() => UP.S.mistakeQueue.length), i === 3 ? 0 : 1);
    }
    await paper(1, [1], 'hcf');
    assert.match(await page.locator('.paper-title').innerText(), /53 marks/);
    assert.match(await page.locator('.paper-meta').innerText(), /23 questions/);
    await page.locator('#q2 .q-toggle').click();
    const workings = await page.locator('#q2 .q-solution').innerText();
    assert.match(workings, /819 − 3×7 = 798/);
    assert.doesNotMatch(workings, /\b(?:28|49|196|175)\b/);
    for (const [answer,ok] of [['5°',false], ['5.0000001 cm',false], ['50 mm',true]]) {
      await paper(1, [], 'radius-'+encodeURIComponent(answer));
      const card = page.locator('#q14');
      assert.match(await card.locator('.q-text').innerText(), /tangent of length 12 cm.*13 cm.*radius/i);
      await card.locator('input[data-answer]').fill(answer);
      await card.locator('[data-action="test-check"]').click();
      assert.equal(await page.evaluate(() => UP.S.answers[14].ok), ok, answer);
    }
    assert.equal(requests.length, 0, 'generated workings and local scoring need no provider');

    await page.locator('#topbar select[data-key="subject"]').selectOption('science');
    await page.waitForFunction(() => UP.pyq.some(q => q.id === 'scp-31BS-11'));
    assert.match(await page.evaluate(() => UP.pyq.find(q => q.id === 'scp-31BS-11').ans), /^c$/i);
    await page.evaluate(() => { location.hash = '#/pyq?y=2026'; });
    const real = page.locator('#scp-31BS-11');
    await real.locator('[data-reveal]').click();
    await real.locator('.pyq-sol .callout.warn').waitFor();
    assert.match(await real.locator('.q-review').innerText(), /No independently verified answer key/);
    assert.equal(await real.locator('.pyq-ans').count(), 0, 'no raw C in the card, even offline');

    online = true;
    await page.evaluate(explanation => {
      const row = { board:'cbse', cls:10, subject:'science', y:2096, ch:1, m:1, kind:1,
        en:'Which of the following is a chemical change?', opts:['Rusting','Melting','Freezing','Boiling'], ans:'A', keyVerified:true };
      const fixtures = [{ id:'grade-cached', q:1 }, { id:'grade-live', q:2 },
        { id:'grade-unverified', q:3, keyVerified:false }, { id:'grade-empty', q:4, ans:'' },
        { id:'grade-review', q:5, raw:{ keyVerified:false } }, { id:'grade-mismatch', q:6, ans:'F' }];
      fixtures.forEach(f => UP.pyq.push({...row, ...f}));
      UP.answers.warm = () => {}; // keep fresh-vs-cached cases independent of prefetch timing
      // A stored reply cannot promote itself to an exact calculation or a key.
      UP.answers.set('grade-cached', { ...explanation, source:'exact' });
      location.hash = '#/pyq?y=2096';
    }, explanation);
    for (const [id, eligible, cached] of [['cached',true,true],['live',true,false],
      ['unverified',false,false],['empty',false,false],['review',false,false],['mismatch',false,false]]) {
      const card = page.locator('#grade-' + id);
      await card.locator('[data-reveal]').click();
      await card.locator('.sol-answer').waitFor();
      assert.match(await card.locator('.sol-head').innerText(), cached ? /Saved AI explanation/i : /AI-generated/i);
      assert.match(await card.locator('.pyq-sol').innerText(), /not been verified against an official answer key/);
      assert.match(await card.locator('.sol-answer').innerText(), /Fixture explanation result/);
      assert.equal(await card.locator('.pyq-ans').count(), eligible ? 1 : 0);
      if (eligible) assert.equal(await card.locator('.pyq-ans b').innerText(), 'A', 'never overwrite a verified key');
      assert.match(await card.locator('.q-review').innerText(), eligible ? /Verified answer key available/ : /No independently verified answer key/);
    }
    const unkeyed = page.locator('#grade-unverified');
    await unkeyed.locator('[data-reveal]').click();
    await unkeyed.locator('[data-reveal]').click();
    assert.match(await unkeyed.locator('.sol-head').innerText(), /Saved AI explanation/i);
    assert.equal(await unkeyed.locator('.pyq-ans').count(), 0, 'reopening a solved card does not create a key');
    assert.deepEqual(errors, []);
    console.log('PASS signed picks and mistake queue, 53-mark generated paper and instance solution, unverified Science reveal offline, fresh/cached explanations isolated from keys');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
