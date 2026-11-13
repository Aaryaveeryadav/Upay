'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true, args:['--no-sandbox'], ...(process.env.UPAY_CHROMIUM ? {executablePath:process.env.UPAY_CHROMIUM} : {})});
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
      await page.goto(process.env.UPAY_BASE || 'http://127.0.0.1:8005/', {waitUntil:'networkidle'});
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      assert.equal(await page.locator('.home-outline-links').count(), 0, 'outline section stays removed');
      assert.equal(await page.locator('.daily-reminder b').innerText(), 'Daily task pending');
      assert.equal(await page.locator('.study-shortcuts h2').innerText(), 'Your next study plan');
      assert.equal(await page.locator('#rail [data-nav=pyq]').innerText(), 'PYQ’s');
      assert(await page.locator('.hero').isVisible(), 'home hero remains available');
      assert.equal(await page.locator('.study-shortcuts-actions a').count(), 4);
      assert.equal(await page.locator('.daily-reminder a').getAttribute('href'), '#/today');
      await page.locator('#home-study-goal').selectOption('15');
      await page.reload({waitUntil:'networkidle'});
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      assert.equal(await page.locator('#home-study-goal').inputValue(), '15', 'planning goal persists');
      assert.equal(await page.locator('.daily-reminder,.study-shortcuts').count(), 2, 'restored sections do not duplicate');
      for (const route of ['/', '/syllabus', '/ask', '/login', '/test']) {
        await page.evaluate(route => { location.hash = '#' + route; }, route);
        await page.waitForTimeout(200);
        const result = await page.evaluate(() => {
          const controls = [...document.querySelectorAll('button,[role="button"],a.btn')].filter(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height);
          return {
            count: controls.length,
            bad: controls.filter(el => {
              const s = getComputedStyle(el);
              return s.color !== 'rgb(58, 58, 58)' || s.backgroundColor !== 'rgb(255, 250, 250)' || s.boxShadow === 'none';
            }).map(el => ({text:el.textContent.trim(),class:el.className})),
            overflow:document.documentElement.scrollWidth > innerWidth + 1,
            accent:getComputedStyle(document.documentElement).getPropertyValue('--sky-500').trim()
          };
        });
        assert(result.count > 0); assert.deepEqual(result.bad, [], `${width} ${route}: all controls use reference theme`);
        assert.equal(result.accent, '#e7002c'); assert(!result.overflow, `${width} ${route}: no horizontal overflow`);
      }
      await page.evaluate(() => { location.hash = '#/'; }); await page.waitForTimeout(200);
      if (process.env.UPAY_THEME_SCREENSHOTS) await page.screenshot({path:`/tmp/upay-red-${width}.png`,fullPage:true});
      assert.equal(await page.locator('.hero h1 em').evaluate(el => getComputedStyle(el).color), 'rgb(58, 58, 58)');
      // A representative primary button retains themed hover and keyboard focus.
      const button = page.locator('.btn-primary').filter({visible:true}).first();
      await button.hover();
      assert.equal(await button.evaluate(el => getComputedStyle(el).color), 'rgb(58, 58, 58)');
      await button.focus();
      // Admin styles are independent stylesheets: exercise them separately too.
      for (const sheet of ['portal', 'dash']) {
        await page.goto((process.env.UPAY_BASE || 'http://127.0.0.1:8005/') + `assets/css/${sheet}.css`);
        await page.setContent('<button>Save settings</button><a class="btn">Continue</a><button disabled>Unavailable</button>');
        await page.addStyleTag({url:(process.env.UPAY_BASE || 'http://127.0.0.1:8005/') + `assets/css/${sheet}.css`});
        const styles = await page.locator('button,.btn').evaluateAll(els => els.map(el => ({color:getComputedStyle(el).color, background:getComputedStyle(el).backgroundColor, shadow:getComputedStyle(el).boxShadow})));
        for (const s of styles) { assert.equal(s.color,'rgb(58, 58, 58)'); assert.equal(s.background,'rgb(255, 250, 250)'); assert.notEqual(s.shadow,'none'); }
      }
      console.log(`PASS ${width}px: dark grey text/red accents/off-white/shadows, five routes, no overflow, hover and admin controls`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
