const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  const BASE = 'http://127.0.0.1:8090';
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(900);

  // helper: set board+class through the real UI selects
  async function pick(sel, label) {
    const el = await pg.$(sel);
    if (!el) return false;
    await pg.selectOption(sel, { label }).catch(() => null);
    await pg.waitForTimeout(700);
    return true;
  }

  const report = {};
  report.selects = await pg.$$eval('select', els => els.map(e => ({
    id: e.id, name: e.name, val: e.value,
    opts: [...e.options].slice(0, 12).map(o => o.textContent.trim())
  })));

  // count what the bank exposes for the current scope
  report.scope = await pg.evaluate(() => ({
    cls: window.S && S.cls, board: window.S && S.board,
    subject: window.S && S.subject,
    bank: (window.UP && UP.pyq) ? UP.pyq.length : 0,
    sci: (window.UP && UP.science10Q) ? UP.science10Q.length : 0,
    myBank: (typeof myBank === 'function') ? myBank().length : null
  }));

  console.log(JSON.stringify(report, null, 1));
  console.log('ERRORS:', errs.slice(0, 10));
  await b.close();
})();
