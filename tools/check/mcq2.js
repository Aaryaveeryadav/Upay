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
  await pg.waitForTimeout(600);
  await pg.locator('#topbar select[data-key="board"]').selectOption('cbse');
  await pg.waitForFunction(() => UP.S.board === 'cbse');
  await pg.locator('#topbar select[data-key="cls"]').selectOption('10');
  await pg.waitForFunction(() => UP.S.cls === 10);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('science');
  await pg.waitForFunction(() => UP.S.subject === 'science'); await pg.waitForTimeout(400);
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);

  // old-style click via dispatch through the app's delegated handler
  await pg.evaluate(() => {
    const c = [...document.querySelectorAll('.q-card')].find(x => x.querySelector('.q-opts'));
    c.querySelector('.q-options-toggle')?.click();
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
