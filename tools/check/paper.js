const { chromium } = require('playwright');
const BASE = process.env.UPAY_BASE || 'http://127.0.0.1:8090';
(async () => {
  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.UPAY_CHROMIUM) launchOptions.executablePath = process.env.UPAY_CHROMIUM;
  const b = await chromium.launch(launchOptions);
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.route('https://fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
  await pg.route('https://**/auth/v1/health', r => r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(700);
  await pg.locator('#topbar select[data-key="board"]').selectOption('cbse');
  await pg.waitForFunction(() => UP.S.board === 'cbse');
  await pg.locator('#topbar select[data-key="cls"]').selectOption('10');
  await pg.waitForFunction(() => UP.S.cls === 10);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('science');
  await pg.waitForFunction(() => UP.S.subject === 'science'); await pg.waitForTimeout(500);

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
