/* Pasted calculus question and AI calculus formatting, with a mocked provider. */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM ? {executablePath:process.env.UPAY_CHROMIUM} : {})});
 /* A browser check whose page never reaches the state it waits for must end
    in a named failure. Without this, one unbounded waitForFunction kept the
    whole workflow job alive until GitHub's six-hour ceiling, and the report
    named no check at all. */
 const watchdog=setTimeout(()=>{console.error('TIMEOUT: '+require('node:path').basename(__filename)+' did not finish within '+(+process.env.UPAY_CHECK_TIMEOUT||300)+'s; it hung waiting for a page state.');process.exit(124);},(+process.env.UPAY_CHECK_TIMEOUT||300)*1000);
 watchdog.unref();
  try {
    for (const width of [1280,390]) {
      const context = await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
      const page = await context.newPage(), errors = [], questions = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.route('**/api/ai/solve', r => {
        questions.push(r.request().postDataJSON().question);
        return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
          source:'ai', result:'∫₀^(π/2) ln(sin x) ln(cos x) dx = (π/2)(ln 2)² − π³/48',
          summary:'A definite integral.', approaches:[1,2,3,4].map(n => ({name:'Method '+n,
            steps:[{t:'Differentiate dy/dx and integrate ∫₀^(π/2) f(x) dx.',m:String.raw`\frac{dy}{dx} = 2x`}]}))
        })});
      });
      await page.goto(process.env.UPAY_BASE || 'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      await page.evaluate(() => { UP.S.subject='maths'; location.hash='#/ask'; });
      const ta = page.locator('form[data-form="ask"] textarea[name="q"]');
      await ta.waitFor();
      const raw = 'Evaluate\n∫\n0\nπ/2\n\nln(sin x)ln(cos x) dx';
      await ta.evaluate((el, text) => {const data=new DataTransfer(); data.setData('text/plain',text);
        el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));}, raw);
      const cleaned = 'Evaluate\n∫_{0}^{π/2} ln(sin x)ln(cos x) dx';
      assert.equal(await ta.inputValue(),cleaned);
      assert.match(await page.locator('.paste-note').innerText(), /check the numbers and signs/);
      await ta.evaluate(el => el.form.requestSubmit());
      await page.waitForFunction(() => UP.S.aiState === 'done');
      assert.deepEqual(questions,[cleaned]);
      const question = page.locator('.ai-answer .qtext .math-integral');
      await question.waitFor();
      assert.equal(await question.getAttribute('aria-label'),'integral from 0 to π/2');
      const upper = await question.locator('.math-integral-upper').boundingBox();
      const lower = await question.locator('.math-integral-lower').boundingBox();
      assert(upper && lower && upper.y < lower.y,'upper limit must be above lower limit');
      assert.equal(await question.locator('.math-integral-upper').innerText(),'π/2');
      assert.equal(await question.locator('.math-integral-lower').innerText(),'0');
      assert(await page.locator('.ai-answer .callout.why .math-integral').count() >= 1);
      assert(await page.locator('.ai-answer .st-t .math-derivative').count() >= 1);
      assert(await page.locator('.ai-answer .st-m .math-frac').count() >= 1);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px: pasted bounds, accessible stacked limits, and derivatives in answer steps`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
