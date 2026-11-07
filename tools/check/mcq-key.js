const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[2].selectOption({ value: 'science' }); await pg.waitForTimeout(400);
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' }); await pg.waitForTimeout(2000);
  const stats = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.q-card')];
    const mcqs = cards.filter(c => c.querySelector('.q-opts'));
    const withAns = cards.filter(c => c.querySelector('.q-verdict'));
    const figs = cards.filter(c => c.querySelector('.test-fig'));
    return { cards: cards.length, mcqs: mcqs.length, withAns: withAns.length, figs: figs.length };
  });
  console.log('paper stats:', JSON.stringify(stats));
  // click an option on the first MCQ to verify correct-answer reveal
  const mcq = await pg.$('.q-opts');
  if (mcq) {
    await mcq.click(); await pg.waitForTimeout(600);
    const revealed = await pg.evaluate(() => {
      const v = document.querySelector('.q-verdict');
      return v ? v.innerText.slice(0, 40) : null;
    });
    console.log('verdict after click:', revealed);
  }
  console.log('errors:', errs.slice(0, 4));
  await b.close();
})();
