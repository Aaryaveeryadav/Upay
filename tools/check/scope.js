const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';

(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(800);

  const sels = await pg.$$('select');
  console.log('header selects found:', sels.length);

  async function setScope(board, cls, subject) {
    const s = await pg.$$('select');
    if (board) await s[0].selectOption({ value: board }).catch(() => {});
    if (cls) await s[1].selectOption({ value: String(cls) }).catch(() => {});
    await pg.waitForTimeout(500);
    if (subject) {
      const s2 = await pg.$$('select');
      const vals = await s2[2].$$eval('option', o => o.map(x => x.value));
      if (vals.includes(subject)) await s2[2].selectOption({ value: subject }).catch(() => {});
      await pg.waitForTimeout(500);
    }
    return pg.evaluate(() => (typeof myBank === 'function') ? myBank().length : null);
  }

  const matrix = [];
  for (const [board, cls, sub] of [
    ['cbse', 10, 'maths'], ['cbse', 10, 'science'],
    ['rajasthan', 10, 'maths'], ['rajasthan', 10, 'science'],
    ['cbse', 11, 'maths'], ['cbse', 12, 'physics'],
  ]) {
    const n = await setScope(board, cls, sub);
    const seen = await pg.evaluate(() => {
      const b = (typeof myBank === 'function') ? myBank() : [];
      const boards = [...new Set(b.map(r => r.board))];
      const clss = [...new Set(b.map(r => String(r.cls)))];
      const subs = [...new Set(b.map(r => String(r.subject)))];
      return { boards, clss, subs };
    });
    matrix.push({ scope: `${board}/${cls}/${sub}`, count: n, ...seen });
  }
  console.log(JSON.stringify(matrix, null, 1));
  console.log('ERRORS:', errs.slice(0, 8));
  await b.close();
})();
