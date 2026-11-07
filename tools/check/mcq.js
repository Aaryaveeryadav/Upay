const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[2].selectOption({ value: 'science' }); await pg.waitForTimeout(400);
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);

  // find a rendered MCQ in the paper
  const info = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.q-card')];
    const c = cards.find(x => x.querySelector('.q-opts'));
    if (!c) return { found: false, cards: cards.length };
    return {
      found: true,
      qno: c.querySelector('.q-no')?.textContent,
      stem: c.querySelector('p')?.textContent.trim().slice(0, 90),
      opts: [...c.querySelectorAll('.q-opts .q-opt, .q-opts button')].map(o => o.innerText.replace(/\n/g, ' ').trim()),
    };
  });
  console.log('MCQ in paper:', JSON.stringify(info, null, 1));

  if (info.found) {
    // click the first option, then reveal solution
    const card = await pg.$('.q-card:has(.q-opts)');
    const btn = await card.$('.q-opts button');
    await btn.click();
    await pg.waitForTimeout(400);
    const verdict = await card.$eval('.q-verdict', e => e.textContent.trim()).catch(() => '(no verdict)');
    const tog = await card.$('.q-toggle');
    if (tog) { await tog.click(); await pg.waitForTimeout(500); }
    const sol = await card.$eval('.sol-ans, .q-answer', e => e.textContent.trim().slice(0, 150)).catch(() => '(none)');
    console.log('after click ->', verdict, '| solution:', sol.replace(/\n+/g, ' '));
  }
  console.log('ERRORS:', errs.slice(0, 6));
  await b.close();
})();
