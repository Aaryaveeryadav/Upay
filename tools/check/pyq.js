const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(900);

  const totals = await pg.evaluate(() => {
    const all = window.UP.pyq || [];
    const sci = all.filter(r => r.subject === 'science');
    return {
      bank: all.length,
      science: sci.length,
      sciMcq: sci.filter(r => r.opts && r.opts.length).length,
      otherBoardScience: sci.filter(r => r.board !== 'cbse').length,
      otherClassScience: sci.filter(r => r.cls !== 10).length,
      years: [...new Set(sci.map(r => r.y))].sort(),
    };
  });
  console.log('BANK:', JSON.stringify(totals, null, 1));

  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(250);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(250);
  await (await pg.$$('select'))[2].selectOption({ value: 'science' }); await pg.waitForTimeout(500);
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1800);

  const paper = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.q-card')];
    const first = cards.slice(0, 3).map(c => c.innerText.replace(/\n+/g, ' ').slice(0, 100));
    return {
      count: cards.length,
      withOptions: cards.filter(c => c.querySelector('.q-opts')).length,
      labels: [...new Set([...document.querySelectorAll('.q-ch')].map(e => e.textContent.trim()))].slice(0, 8),
      first,
    };
  });
  console.log('PAPER:', JSON.stringify(paper, null, 1));
  console.log('ERRORS:', errs.slice(0, 6));
  await b.close();
})();
