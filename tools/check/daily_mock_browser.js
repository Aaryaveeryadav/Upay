'use strict';
// Real bank records for the missing figure/marks and display regressions;
// controlled choices, provider replies and local sign-in for timing/isolation.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.UPAY_BASE || 'http://127.0.0.1:8004';

async function run(browser, width) {
  const ctx = await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  try {
    const page = await ctx.newPage(), errors = [], unexpected = [], awaiting = new Map();
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/api/auth/login', r => r.fulfill({json:{token:'fixture-token',user:{user:'fixture-learner',role:'student'}}}));
    await page.route('**/api/auth/logout', r => r.fulfill({json:{ok:true}}));
    await page.route('**/api/ai/**', r => {
      const kind = r.request().url().split('/').pop(), take = awaiting.get(kind);
      if (take) { awaiting.delete(kind); take(r); return; }
      unexpected.push(kind); return r.fulfill({status:503,json:{error:'Unexpected fixture request'}});
    });
    async function intercept(kind, action) {
      const next = new Promise(resolve => awaiting.set(kind, resolve));
      const [route] = await Promise.all([next, page.waitForRequest('**/api/ai/'+kind), action()]);
      return route;
    }
    async function reply(r, json, status=200) {
      const [res] = await Promise.all([page.waitForResponse(r.request().url()), r.fulfill({status,json})]);
      await res.finished();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const go = hash => page.evaluate(h => { location.hash=h; }, hash);
    const check = i => page.locator(`[data-action="dailyCheck"][data-i="${i}"]`).click();
    await page.goto(base, {waitUntil:'networkidle'});
    await page.waitForFunction(() => window.UP?.S && document.body.classList.contains('up-ready'));
    const source = await page.evaluate(() => {
      const find = id => UP.pyq.find(q => q.id === id);
      window.fixtureMark = find('y202373111'); // real source has options but m:null
      const figure = find('imp11086710');
      const displayed = ['imp3365983','imp33659820','imp90892386'].map(id=>UP.pyqQuestionText(find(id)));
      const wordLimit = UP.pyqQuestionText({hi:'लगभग 100 शब्दों में उत्तर लिखिए।'});
      const row = window.fixtureChoice = {id:'daily-six', subject:'maths',cls:10,board:'cbse',ch:1,kind:1,m:2,
        en:'Choose the value of 1/2 + 3/4 from the following options.',hi:'1/2 + 3/4 का सही विकल्प चुनिए।',
        opts:['one','two','three','four','five','six'].map((en,i)=>({en,hi:['एक','दो','तीन','चार','पाँच','छह'][i]})),
        ans:'B',keyVerified:false};
      // Simulate a pre-fix saved daily whose raw record is no longer ready.
      UP.pyq = [row, figure, {...row,id:'broken-choices',opts:row.opts.slice(0,2)}];
      const date = new Date();
      UP.S.dailySet = {date:`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`,scope:'cbse|10|maths|en',
        items:[{q:UP.pyqQuestionText(figure),raw:figure,ch:figure.ch}]};
      location.hash='#/today';
      return {displayed,wordLimit,missing:UP.questionQuality.testReadyIssue(figure),m:fixtureMark.m};
    });
    assert.equal(source.m, null); assert.equal(source.missing,'missing-figure');
    assert.match(source.displayed[0], /Frequency 15 10 12 17 4$/);
    assert.match(source.displayed[1], /ratio 3 : 2\./); assert.doesNotMatch(source.displayed[1], /P\.T\.O\./);
    assert.match(source.displayed[2], /PQ \|\| BC/); assert.equal(source.wordLimit, 'लगभग 100 शब्दों में उत्तर लिखिए।');
    await page.locator('#daily-input-0').waitFor();
    assert.deepEqual(await page.evaluate(()=>UP.S.dailySet.items.map(it=>it.raw.id)),['daily-six']);
    await go('#/mock?new=1'); await page.locator('#mock-answer-0').waitFor();
    assert.deepEqual(await page.evaluate(()=>UP.S.mockTest.items.map(it=>it.source.id)),['daily-six']);
    await go('#/today');
    await page.locator('.lang-btn[data-lang="hi"]').first().click();
    await page.locator('#daily-input-0').fill('F');
    assert.deepEqual(await page.evaluate(()=>UP.S.mockTest.answers),{},'daily input must not write a phantom mock answer');
    const reveal = await intercept('solve',()=>page.locator('#daily-0 .q-think-action').click());
    assert.equal(await page.locator('#daily-input-0').inputValue(),'F','rerender kept the draft');
    const marking = await intercept('check-answer',()=>check(0));
    const body = marking.request().postDataJSON();
    assert.equal(body.referenceAnswer,''); assert.equal(body.studentAnswer,'F');
    assert.equal(body.question, '1/2 + 3/4 का सही विकल्प चुनिए।\nOptions: A. एक  B. दो  C. तीन  D. चार  E. पाँच  F. छह');
    assert.equal(reveal.request().postDataJSON().question,body.question);
    await page.locator('[data-action="dailyRefresh"]').click(); // same ID, same text, same slot, *new set*
    await reply(reveal,{result:'Old reveal',approaches:[]});
    await reply(marking,{verdict:'incorrect',feedback:'Old verdict'});
    assert.equal(await page.locator('#daily-input-0').inputValue(),'');
    assert(await page.locator('#daily-0 .q-answer-reveal').isHidden());
    assert.deepEqual(await page.evaluate(()=>[UP.S.dailyAI,UP.S.dailyReveal,UP.S.dailyOpen]),[{},{},{}]);

    await page.locator('#daily-input-0').fill('E');
    const failure = await intercept('check-answer',()=>check(0));
    await reply(failure,{code:'ai_disabled',error:'Fixture failure'},503);
    await page.locator('#daily-0 [role="alert"]').waitFor();
    const retry = await intercept('check-answer',()=>check(0));
    assert.equal(retry.request().postDataJSON().studentAnswer,'E');
    await page.evaluate(async()=>{await UP.sbSignIn('fixture-learner','fixture'); location.hash='#/today?owner=1';});
    await page.locator('#daily-input-0').waitFor();
    await reply(retry,{code:'ai_disabled',error:'Late error'},503);
    assert.equal(await page.locator('#daily-0 [role="alert"]').count(),0);
    assert.equal(await page.locator('#daily-input-0').inputValue(),'');
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('upay.mistakeQueue.scope.')&&k.includes('fixture-learner')).length),0);

    // Two attempted answers: a bulk loop must not keep checking the same
    // slots after a new test starts or after this owner signs out.
    await page.locator('.lang-btn[data-lang="en"]').first().click();
    await page.evaluate(()=>{UP.pyq=[fixtureMark,fixtureChoice];location.hash='#/mock?new=1';});
    await page.locator('#mock-answer-1').waitFor();
    const ids=await page.evaluate(()=>UP.S.mockTest.items.map(it=>it.source.id));
    const real=ids.indexOf('y202373111'), six=ids.indexOf('daily-six');
    assert.match(await page.locator(`[data-mock-question="${real}"] .meta-row`).innerText(),/no marks supplied/);
    assert.match(await page.locator('.page-head').innerText(),/Known marks: 2 \(subtotal\).*1 question has no supplied marks/);
    await page.locator(`#mock-answer-${real}`).fill('A'); await page.locator(`#mock-answer-${six}`).fill('F');
    await page.locator('#mock-submit').click();
    assert.match(await page.locator('.page-head').innerText(),/Known marks: 2 \(subtotal\)/);
    const one = await intercept('check-answer',()=>page.locator(`[data-mock-ai-check="${six}"]`).click());
    assert.match(one.request().postDataJSON().question,/A\. one  B\. two  C\. three  D\. four  E\. five  F\. six$/);
    assert.equal(one.request().postDataJSON().referenceAnswer,'');
    await reply(one,{verdict:'cannot-tell',feedback:'Practice only'});
    await page.evaluate(()=>{delete UP.S.mockTest.aiChecks;}); // exercise both slots in the bulk action
    const bulk = await intercept('check-answer',()=>page.locator('[data-mock-ai-check-all]').click());
    await page.locator('.mock-ai-pending').waitFor();
    await go('#/mock?new=1'); await page.locator('#mock-answer-1').waitFor();
    await reply(bulk,{verdict:'correct',feedback:'Do not store in new test'});
    const stored = () => page.evaluate(()=>JSON.parse(localStorage.getItem('upay.mockTest.owner.'+encodeURIComponent(UP.S.savedKey))));
    assert.deepEqual((await stored()).answers,{}); assert.equal((await stored()).finished,false);
    assert.equal((await stored()).aiChecks,undefined);
    await page.locator('#mock-answer-0').fill('B'); await page.locator('#mock-submit').click();
    const late = await intercept('check-answer',()=>page.locator('[data-mock-ai-check="0"]').click());
    await page.evaluate(()=>UP.sbSignOut()); await page.locator('#mock-answer-0').waitFor(); // guest's original unfinished test
    await reply(late,{error:'late owner failure'},503);
    const guest = await page.evaluate(()=>JSON.parse(localStorage.getItem('upay.mockTest')));
    assert.deepEqual(guest.answers,{}); assert.equal(guest.finished,false);

    // A real old snapshot had a made-up one mark and could contain NaN: a
    // Daily draft. Keep the actual mock answer and timer across migration.
    await page.evaluate(()=>{
      const t={...UP.S.mockTest,started:Date.now(),items:[{q:fixtureMark.en,ch:fixtureMark.ch,source:{...fixtureMark,m:1}}],answers:{0:'B',NaN:'not a mock answer'}};
      delete t.sourceVersion; localStorage.setItem('upay.mockTest',JSON.stringify(t));
    });
    await page.reload({waitUntil:'networkidle'}); await page.locator('#mock-answer-0').waitFor();
    assert.equal(await page.locator('#mock-answer-0').inputValue(),'B');
    assert.match(await page.locator('.page-head').innerText(),/Total marks not supplied/);
    assert.deepEqual(await page.evaluate(()=>UP.S.mockTest.answers),{0:'B'});
    assert.equal(await page.evaluate(()=>UP.mockAssessment.marks(UP.S.mockTest.items[0])),null);
    await go('#/today'); await page.locator('#daily-input-0').waitFor();
    const dailyIds = () => page.evaluate(()=>UP.S.dailySet.items.map(it=>it.raw.id));
    const before = await dailyIds(); await page.locator('[data-action="dailyRefresh"]').click();
    const after = await dailyIds(); assert.equal(new Set(after).size,10); assert.notDeepEqual(after,before);
    await page.reload({waitUntil:'networkidle'}); await page.locator('#daily-input-0').waitFor();
    assert.deepEqual(await dailyIds(),after,'ordinary reload preserves the draw');
    await page.locator('#daily-input-0').fill('x'.repeat(4001)); await check(0);
    await page.locator('#daily-0 [role="alert"]').waitFor();
    assert.match(await page.locator('#daily-0 [role="alert"]').innerText(), /No partial answer was checked/);
    assert.equal((await page.locator('#daily-input-0').inputValue()).length,4001);
    await page.locator('#daily-input-0').fill('Answer before subject switch');
    const switched = await intercept('check-answer',()=>check(0));
    await page.locator('#topbar select[data-key="subject"]').selectOption('science');
    await page.waitForFunction(()=>UP.S.dailySet?.items[0]?.raw.subject==='science');
    await reply(switched,{verdict:'correct',feedback:'Late Maths reply'});
    assert.deepEqual(await page.evaluate(()=>UP.S.dailyAI),{});
    // Matching a choice list from the legacy source table does not match
    // an answer key. A displayed letter on its own must not become a reference.
    await page.locator('#topbar select[data-key="subject"]').selectOption('maths');
    await page.waitForFunction(()=>UP.pyq.some(q=>q.id==='imp1108670'));
    await page.evaluate(()=>{UP.pyq=UP.pyq.filter(q=>q.id==='imp1108670');UP.S.dailySet=null; location.hash='#/today?legacy=1';});
    await page.locator('#daily-input-0').fill('C');
    const legacy = await intercept('check-answer',()=>check(0));
    assert.match(legacy.request().postDataJSON().question,/Options: A\..*D\./s);
    assert.equal(legacy.request().postDataJSON().referenceAnswer,'');
    await reply(legacy,{verdict:'cannot-tell',feedback:'Unverified practice feedback'});
    await page.locator('#daily-0 [role="status"]').filter({hasText:'Unverified practice feedback'}).waitFor();
    assert.deepEqual(unexpected,[]); assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: faithful source text, screened Daily/mock sets, complete choice prompts, retry, owner/refresh/bulk response isolation, supplied-only marks and restored drafts`);
  } finally { await ctx.close(); }
}
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.UPAY_CHROMIUM});
  try { for (const width of [1280,390]) await run(browser,width); } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
