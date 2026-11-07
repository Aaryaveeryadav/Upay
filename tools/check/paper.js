const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(700);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(250);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(250);
  await (await pg.$$('select'))[2].selectOption({ value: 'science' }); await pg.waitForTimeout(500);

  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  const body = await pg.innerText('body');
  const stats = {
    hasPaper: /practice paper|Question paper|paper/i.test(body),
    empty: /No questions/i.test(body),
    mathsLeak: /quadratic|polynomial|trigonometric/i.test(body),
    scienceWords: (body.match(/NCERT|Science|chapter/gi) || []).length,
    qCount: await pg.$$eval('.q-card, .paper-q, .q-item', e => e.length).catch(() => 0),
    opts: await pg.$$eval('.q-opts .q-opt, .q-opts button', e => e.length).catch(() => 0),
  };
  console.log(JSON.stringify(stats, null, 1));
  console.log('--- body head ---');
  console.log(body.slice(0, 700).replace(/\n{2,}/g, '\n'));
  console.log('ERRORS:', errs.slice(0, 6));
  await b.close();
})();
