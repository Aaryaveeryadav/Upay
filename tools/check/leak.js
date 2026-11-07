const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(600);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[1].selectOption({ value: '10' }); await pg.waitForTimeout(200);
  await (await pg.$$('select'))[2].selectOption({ value: 'science' }); await pg.waitForTimeout(400);
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  const hits = await pg.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const out = [];
    let n;
    while ((n = walk.nextNode())) {
      const t = n.textContent.trim();
      if (/quadratic|polynomial|trigonometric/i.test(t))
        out.push({ text: t.slice(0, 120), parent: n.parentElement.className || n.parentElement.tagName });
    }
    return out;
  });
  console.log(JSON.stringify(hits, null, 1).slice(0, 1500));
  const paperQs = await pg.$$eval('.q-card, .paper-q, .q-item', els => els.slice(0, 6).map(e => e.innerText.replace(/\n+/g, ' ').slice(0, 110)));
  console.log('FIRST QUESTIONS:', JSON.stringify(paperQs, null, 1));
  await b.close();
})();
