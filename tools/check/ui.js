const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8090';

(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(900);

  async function setScope(board, cls, subject) {
    const s = await pg.$$('select');
    await s[0].selectOption({ value: board });
    await pg.waitForTimeout(400);
    const s2 = await pg.$$('select');
    await s2[1].selectOption({ value: String(cls) });
    await pg.waitForTimeout(400);
    const s3 = await pg.$$('select');
    const vals = await s3[2].$$eval('option', o => o.map(x => x.value));
    if (subject && vals.includes(subject)) await s3[2].selectOption({ value: subject });
    await pg.waitForTimeout(600);
  }

  const out = [];

  // ---- 1. Class 10 CBSE Science: open a chapter and read a question ----
  await setScope('cbse', 10, 'science');
  await pg.goto(BASE + '#/science/2', { waitUntil: 'networkidle' }).catch(() => {});
  await pg.waitForTimeout(1200);
  let body = await pg.innerText('body');
  out.push({ check: 'science ch2 page', hasChapter: /Acids, Bases/i.test(body), snippet: body.slice(0, 160).replace(/\n+/g, ' | ') });

  // options + answer key visible?
  const optCount = await pg.$$eval('.sci-opts li', els => els.map(e => e.textContent.trim()));
  const ansDetails = await pg.$$eval('.sci-ans', els => els.length);
  out.push({ check: 'ch2 MCQ options', count: optCount.length, first: optCount.slice(0, 4), answerBlocks: ansDetails });

  // ---- 2. Class 11: must be empty, never Class 10 content ----
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(700);
  await setScope('cbse', 11, 'physics');
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' }).catch(() => {});
  await pg.waitForTimeout(1400);
  body = await pg.innerText('body');
  out.push({
    check: 'class 11 test page',
    showsEmpty: /No questions/i.test(body),
    leakedClass10: /red litmus|Ethane|refractive index/i.test(body)
  });

  // ---- 3. Rajasthan board must not see CBSE science ----
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(700);
  await setScope('rajasthan', 10, 'science');
  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' }).catch(() => {});
  await pg.waitForTimeout(1400);
  body = await pg.innerText('body');
  out.push({ check: 'rajasthan/science test', showsEmpty: /No questions/i.test(body), leakedCbse: /red litmus|Ethane/i.test(body) });

  console.log(JSON.stringify(out, null, 1));
  console.log('ERRORS:', errs.slice(0, 8));
  await b.close();
})();
