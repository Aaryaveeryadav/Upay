const { chromium } = require('playwright');
const BASE = process.env.UPAY_BASE || 'http://127.0.0.1:8090';
(async () => {
  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.UPAY_CHROMIUM) launchOptions.executablePath = process.env.UPAY_CHROMIUM;
  const b = await chromium.launch(launchOptions);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.route('https://fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
  await pg.route('https://**/auth/v1/health', r => r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await pg.goto(BASE, { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
  await pg.locator('#topbar select[data-key="board"]').selectOption('cbse');
  await pg.waitForFunction(() => UP.S.board === 'cbse');
  await pg.locator('#topbar select[data-key="cls"]').selectOption('10');
  await pg.waitForFunction(() => UP.S.cls === 10);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('science');
  await pg.waitForFunction(() => UP.S.subject === 'science'); await pg.waitForTimeout(400);
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
  const card = await pg.$('.q-card:has(.q-opts)');
  if (card) {
    const toggle = await card.$('.q-options-toggle');
    if (toggle) await toggle.click();
    const option = await card.$('.q-opts button');
    if (option) await option.click();
    await pg.waitForTimeout(600);
    const revealed = await pg.evaluate(() => {
      const v = document.querySelector('.q-verdict');
      return v ? v.innerText.slice(0, 40) : null;
    });
    console.log('verdict after click:', revealed);
  }
  console.log('errors:', errs.slice(0, 4));
  await b.close();
})();
