const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';
(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1200 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(800);
  const s = await pg.$$('select');
  await s[0].selectOption({ value: 'cbse' });
  await pg.waitForTimeout(300);
  const s2 = await pg.$$('select');
  await s2[1].selectOption({ value: '10' });
  await pg.waitForTimeout(300);
  const s3 = await pg.$$('select');
  await s3[2].selectOption({ value: 'science' });
  await pg.waitForTimeout(600);

  const out = [];
  for (const ch of [2, 4, 8]) {
    await pg.goto(BASE + '#/chapter/' + ch, { waitUntil: 'networkidle' });
    await pg.waitForTimeout(1500);
    const title = await pg.title();
    const h1 = await pg.$eval('.sci-title, h1', e => e.textContent.trim()).catch(() => '(none)');
    const opts = await pg.$$eval('.sci-opts li', els => els.map(e => e.textContent.trim()));
    const ansBlocks = await pg.$$eval('.sci-ans', els => els.map(e => ({ open: e.hasAttribute('open'), txt: e.textContent.trim().slice(0, 90) })));
    const figs = await pg.$$eval('.sci-fig img', els => els.length);
    const qs = await pg.$$eval('.sci-q', els => els.length);
    out.push({ ch, h1, questions: qs, optsShown: opts.length, firstOpts: opts.slice(0, 5), answers: ansBlocks.slice(0, 2), figs });
  }

  // expand the first answer to prove it is really there
  await pg.goto(BASE + '#/chapter/2', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1400);
  const det = await pg.$('.sci-ans summary');
  if (det) { await det.click(); await pg.waitForTimeout(400); }
  const shown = await pg.$eval('.sci-ans', e => ({ open: e.hasAttribute('open'), txt: e.textContent.trim().slice(0, 140) })).catch(() => null);
  out.push({ check: 'answer expands', shown });

  console.log(JSON.stringify(out, null, 1));
  console.log('ERRORS:', errs.slice(0, 8));
  await b.close();
})();
