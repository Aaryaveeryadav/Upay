const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[2].selectOption({ value: 'science' }); await pg.waitForTimeout(400);
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);

  // old-style click via dispatch through the app's delegated handler
  await pg.evaluate(() => {
    const c = [...document.querySelectorAll('.q-card')].find(x => x.querySelector('.q-opts'));
    const btn = c.querySelector('.q-opts button');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await pg.waitForTimeout(600);

  const after = await pg.evaluate(() => {
    const c = [...document.querySelectorAll('.q-card')].find(x => x.querySelector('.q-opts'));
    return {
      classes: c.className,
      picked: [...c.querySelectorAll('.q-opts button')].map(b => b.className),
      verdict: (c.querySelector('.q-verdict') || {}).textContent || '(none)',
    };
  });
  console.log(JSON.stringify(after, null, 1));
  console.log('ERRORS:', errs.slice(0, 6));
  await b.close();
})();
