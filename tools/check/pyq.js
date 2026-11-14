const { chromium } = require('playwright');
const BASE = process.env.UPAY_BASE || 'http://127.0.0.1:8090';
(async () => {
  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.UPAY_CHROMIUM) launchOptions.executablePath = process.env.UPAY_CHROMIUM;
  const b = await chromium.launch(launchOptions);
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.route('https://fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
  await pg.route('https://**/auth/v1/health', r => r.fulfill({status:200,contentType:'application/json',body:'{}'}));
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

  await pg.locator('#topbar select[data-key="board"]').selectOption('cbse');
  await pg.waitForFunction(() => UP.S.board === 'cbse');
  await pg.locator('#topbar select[data-key="cls"]').selectOption('10');
  await pg.waitForFunction(() => UP.S.cls === 10);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('science');
  await pg.waitForFunction(() => UP.S.subject === 'science'); await pg.waitForTimeout(500);
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
