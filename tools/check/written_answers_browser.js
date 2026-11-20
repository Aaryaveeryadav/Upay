'use strict';
// Real bank cards, isolated browser storage, mocked AI (no provider calls).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const BASE = (process.env.UPAY_BASE || 'http://127.0.0.1:8004').replace(/\/$/, '');

// Exercise the actual renderer, not just the raw opts field: some records have
// recovered choices and others have arrays that are intentionally withheld.
async function checkSubjectCoverage(page) {
  const scopes = await page.evaluate(async () => {
    await UP.loadClass12();
    for (const subject of new Set(UP.classes.flatMap(c => c.subjects))) await UP.loadPack(subject);
    await UP.loadBoardPack('rajasthan');
    return UP.classes.flatMap(c => c.subjects.map(subject => [c.id, subject, 'cbse'])).concat([[10, 'maths', 'rajasthan']]);
  });
  const populated = [];
  for (const scope of scopes) {
    const summary = await page.evaluate(async ([cls, subject, board]) => {
      const rendered = new Promise(resolve => window.addEventListener('hashchange', resolve, { once: true }));
      UP.S.board = board;
      location.hash = `#/pyq?cls=${cls}&sub=${subject}&board=${board}`;
      await rendered;
      const cards = [...document.querySelectorAll('.q-card.pyq')];
      return { count: cards.length, missingOrBoth: cards.filter(card =>
        !!card.querySelector('[data-pick]') === !!card.querySelector('[data-written-draft]')).map(card => card.id) };
    }, scope);
    assert.deepEqual(summary.missingOrBoth, [], `Each card needs exactly one answer mode (${scope})`);
    if (summary.count) populated.push(scope.join('/'));
  }
  assert(populated.includes('12/maths/cbse') && populated.includes('10/science/cbse'));
  console.log('PASS first page of every selectable CBSE class/subject and Rajasthan Maths; populated:', populated.join(', '));
}

async function checkPage(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
  await page.addInitScript(() => {
    if (!localStorage.getItem('upay.subject')) localStorage.setItem('upay.subject', '"science"');
  });
  await page.route('**/api/ai/solve', r => r.fulfill({ status: 503, json: { error: 'Offline for test' } }));
  let reply = { status: 401, json: { code: 'sign_in_required' } }, hold;
  await page.route('**/api/ai/check-answer', async route => {
    requests.push(route.request().postDataJSON());
    const response = reply;
    if (hold) await hold;
    await route.fulfill(response);
  });
  const go = hash => page.evaluate(async h => {
    if (location.hash === h) return;
    const rendered = new Promise(resolve => window.addEventListener('hashchange', resolve, { once: true }));
    location.hash = h; await rendered;
  }, hash);
  try {
    await page.goto(BASE + '/#/pyq?ch=1', { waitUntil: 'networkidle' });
    const mcq = page.locator('#sci10-01-q03'), written = page.locator('#sci10-01-q04');
    const input = written.getByRole('textbox', { name: 'Your answer', exact: true });
    const check = written.getByRole('button', { name: 'Check with AI', exact: true });
    const feedback = written.locator('.written-feedback');
    await input.waitFor();
    assert.equal(await written.locator('[data-pick]').count(), 0);
    assert.equal(await mcq.locator('textarea').count(), 0);
    assert.equal(await mcq.locator('[data-pick]').count(), 4);
    assert(await mcq.locator('.q-opts').isHidden());
    await mcq.locator('.q-options-toggle').click();
    await mcq.locator('[data-pick]').first().click();
    assert.match(await mcq.locator('.pyq-verdict').innerText(), /Correct/);
    assert(await check.isEnabled());
    await check.click(); assert.match(await feedback.innerText(), /Write your answer first/);
    await input.fill('  '); assert(await check.isEnabled());
    const draft = '\nEach element has the same atom count on both sides.\nMass is conserved. <my notes>';
    await input.fill(draft);
    assert(await check.isEnabled());
    assert.equal(await page.locator('#sci10-01-q05 textarea').inputValue(), '');
    assert.equal(requests.length, 0, 'typing must not send anything to AI');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await input.inputValue(), draft);
    const rect = await input.boundingBox();
    assert(rect.width > 180 && rect.x + rect.width <= width, 'editor fits the viewport');

    // The same exercise in the chapter reader uses the same draft, not its list index.
    await go('#/chapter/1');
    const chapterInput = page.locator('.sci-q').filter({ hasText: 'What is a balanced chemical equation?' }).getByRole('textbox');
    assert.equal(await chapterInput.inputValue(), draft);
    await go('#/pyq?ch=1');
    await check.click(); await feedback.filter({ hasText: 'Sign in' }).waitFor();
    assert.equal(await input.inputValue(), draft, 'failed check must leave an editable answer');
    assert.equal(requests[0].studentAnswer, draft.trim());
    assert.equal(requests[0].subject, 'science');
    assert.equal(requests[0].question, await page.evaluate(() => UP.pyqQuestionText(UP.pyq.find(q => q.id === 'sci10-01-q04'))));
    assert.equal(requests[0].referenceAnswer, await page.evaluate(() => UP.pyq.find(q => q.id === 'sci10-01-q04').ans));
    reply = { status: 200, json: { verdict: 'partly-correct', feedback: 'Explain the <reason>.', correctAnswer: 'A suggested answer.' } };
    await check.click(); await feedback.filter({ hasText: 'Partly correct' }).waitFor();
    assert.match(await feedback.innerText(), /Explain the <reason>\./);
    assert.equal(await feedback.locator('reason').count(), 0);
    assert.match(await feedback.innerText(), /Not official/);
    // Edits invalidate both displayed feedback and any response still in flight.
    let release; hold = new Promise(resolve => { release = resolve; });
    await Promise.all([page.waitForRequest('**/api/ai/check-answer'), check.click()]);
    assert(await check.isDisabled());
    await input.fill('A revised explanation.');
    const completed = page.waitForResponse('**/api/ai/check-answer'); release(); hold = null;
    await (await completed).finished();
    assert.equal(await feedback.innerText(), '');
    await page.locator('#topbar .lang-btn').click();
    assert.equal(await written.getByRole('textbox', { name: 'आपका उत्तर' }).inputValue(), 'A revised explanation.');
    await page.locator('#topbar .lang-btn').click();

    // A verified local session on the same browser must not inherit the guest draft.
    await page.route('**/api/auth/me', r => r.fulfill({ json: { user: { user: 'test-student', role: 'student' } } }));
    await page.evaluate(() => localStorage.setItem('upay.token', 'fixture-local-session'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.UP?.S?.savedKey === 'saved.owner.local.test-student');
    assert.equal(await input.inputValue(), ''); await input.fill('Separate account answer.');
    await page.evaluate(() => localStorage.removeItem('upay.token'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await input.inputValue(), 'A revised explanation.');
    await input.fill(''); await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await input.inputValue(), '');

    // Another subject: a keyless open question may request practice feedback,
    // but an MCQ awaiting its options can only keep an ungraded draft.
    await go('#/pyq');
    await page.locator('#topbar select[data-key="subject"]').selectOption('social');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('upay.subject')) === 'social'
      && UP.pyq.find(q => q.id === document.querySelector('.q-card.pyq')?.id)?.subject === 'social');
    const other = page.locator('.q-card.pyq').filter({ has: page.locator('[data-action="check-written"]') }).first();
    await other.getByRole('textbox').fill('My Social Science answer.');
    await other.getByRole('button', { name: 'Check with AI' }).click();
    await other.locator('.written-feedback').filter({ hasText: 'Partly correct' }).waitFor();
    assert.equal(requests.at(-1).subject, 'social'); assert.equal(requests.at(-1).referenceAnswer, '');
    await page.evaluate(() => {
      UP.pyq.push({ id: 'fixture-missing-choices', q: 1, y: 2099, cls: 10, subject: 'social', kind: 1,
        en: 'Which statement describes a federal government?', opts: [], ans: 'B', keyVerified: false });
      location.hash = '#/pyq?y=2099';
    });
    const incomplete = page.locator('#fixture-missing-choices');
    await incomplete.getByRole('textbox').fill('Ungraded notes.');
    assert.match(await incomplete.innerText(), /Options missing or suspect/);
    assert.equal(await incomplete.locator('[data-pick], [data-action="check-written"]').count(), 0);
    if (width === 1280) await checkSubjectCoverage(page);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: Science MCQ and written answers, chapter/reload/owner isolation, Hindi, retry and stale feedback, Social Science, ungraded missing choices`);
  } finally { await ctx.close(); }
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(process.env.UPAY_CHROMIUM ? { executablePath: process.env.UPAY_CHROMIUM } : {}) });
  try { for (const width of [1280, 390]) await checkPage(browser, width); }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
