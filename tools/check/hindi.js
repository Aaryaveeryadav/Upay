const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[2].selectOption({ value: 'hindi' }); await pg.waitForTimeout(600);

  // visit syllabus
  await pg.goto(BASE + '#/syllabus', { waitUntil: 'networkidle' }); await pg.waitForTimeout(1200);
  const sy = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.ch-card, .chapter-card, .syllabus-item, [class*=ch-]')];
    const headings = [...document.querySelectorAll('h1,h2,.ch-title')].map(e => e.textContent.trim()).slice(0,8);
    const hasHindi = document.body.innerText.includes('क्षितिज') || document.body.innerText.includes('स्पर्श');
    return { hasHindi, headings, nCards: cards.length };
  });
  console.log('syllabus:', JSON.stringify(sy));

  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' }); await pg.waitForTimeout(2000);
  const paper = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.q-card')];
    return {
      count: cards.length,
      sample: cards.slice(0,2).map(c => c.innerText.replace(/\n+/g, ' ').slice(0,130)),
      hasDevanagari: cards.some(c => /[\u0900-\u097F]/.test(c.innerText)),
    };
  });
  console.log('paper:', JSON.stringify(paper));
  console.log('errors:', errs.slice(0,4));
  await b.close();
})();
