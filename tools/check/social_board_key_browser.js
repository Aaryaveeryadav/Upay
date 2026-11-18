/* Printed Social keys must grade locally even when AI is unavailable. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM ? {executablePath:process.env.UPAY_CHROMIUM} : {})});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    let checks = 0;
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/api/ai/**', route => {
      if (new URL(route.request().url()).pathname === '/api/ai/check-answer') checks++;
      return route.fulfill({status:503,contentType:'application/json',body:'{"error":"AI unavailable"}'});
    });
    await page.goto(process.env.UPAY_BASE || 'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
    await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
    await page.locator('#topbar select[data-key="cls"]').selectOption('10');
    await page.locator('#topbar select[data-key="subject"]').selectOption('social');
    await page.waitForFunction(() => UP.pyq.some(q => q.id === 'sscp-2023-3261-2'));
    // Isolate two real, keyed questions from pagination without modifying their answers.
    await page.evaluate(() => {
      for (const id of ['sscp-2023-3261-2','sscp-2023-3251-5']) UP.pyq.find(q => q.id === id).y = 2097;
      location.hash = '#/pyq?y=2097';
    });
    for (const [id, choice, verdict] of [['sscp-2023-3261-2',2,'ok'],['sscp-2023-3251-5',0,'no']]) {
      const card = page.locator('#' + id);
      await card.waitFor();
      assert.equal(await card.locator('.q-opt').count(),4,id);
      await card.locator('.q-options-toggle').click();
      await card.locator(`.q-opt[data-i="${choice}"]`).click();
      await card.locator('.pyq-verdict.' + verdict).waitFor();
      assert.equal(await card.locator('.q-opt.right').count(),1,id);
    }
    assert.equal(checks,0,'verified-key verdict must not call an AI checker');
    assert.deepEqual(errors,[]);
    console.log('PASS Social board keys: correct and incorrect verdicts grade locally with AI unavailable');
    await context.close();
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
