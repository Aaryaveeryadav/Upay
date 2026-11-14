const { chromium } = require('playwright');
const BASE = process.env.UPAY_BASE || 'http://127.0.0.1:8090';
(async () => {
  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.UPAY_CHROMIUM) launchOptions.executablePath = process.env.UPAY_CHROMIUM;
  const b = await chromium.launch(launchOptions);
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1100 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
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

  // find a rendered MCQ in the paper
  const info = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.q-card')];
    const c = cards.find(x => x.querySelector('.q-opts'));
    if (!c) return { found: false, cards: cards.length };
    return {
      found: true,
      qno: c.querySelector('.q-no')?.textContent,
      stem: c.querySelector('p')?.textContent.trim().slice(0, 90),
      opts: [...c.querySelectorAll('.q-opts .q-opt, .q-opts button')].map(o => o.innerText.replace(/\n/g, ' ').trim()),
    };
  });
  console.log('MCQ in paper:', JSON.stringify(info, null, 1));

  if (info.found) {
    // click the first option, then reveal solution
    const card = await pg.$('.q-card:has(.q-opts)');
    const toggle = await card.$('.q-options-toggle');
    if (toggle) await toggle.click();
    const btn = await card.$('.q-opts button');
    await btn.click();
    await pg.waitForTimeout(400);
    const updatedCard = await pg.$('.q-card:has(.q-opts)');
    const verdict = await updatedCard.$eval('.q-verdict', e => e.textContent.trim()).catch(() => '(no verdict)');
    const tog = await updatedCard.$('.q-toggle');
    if (tog) { await tog.click(); await pg.waitForTimeout(500); }
    const sol = await updatedCard.$eval('.sol-ans, .q-answer', e => e.textContent.trim().slice(0, 150)).catch(() => '(none)');
    console.log('after click ->', verdict, '| solution:', sol.replace(/\n+/g, ' '));
  }
  console.log('ERRORS:', errs.slice(0, 6));
  await b.close();
})();
