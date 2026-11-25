/* End-to-end paste, exact answer, diagram and mobile layout regression. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM ? {executablePath:process.env.UPAY_CHROMIUM} : {})});
 /* A browser check whose page never reaches the state it waits for must end
    in a named failure. Without this, one unbounded waitForFunction kept the
    whole workflow job alive until GitHub's six-hour ceiling, and the report
    named no check at all. */
 const watchdog=setTimeout(()=>{console.error('TIMEOUT: '+require('node:path').basename(__filename)+' did not finish within '+(+process.env.UPAY_CHECK_TIMEOUT||300)+'s; it hung waiting for a page state.');process.exit(124);},(+process.env.UPAY_CHECK_TIMEOUT||300)*1000);
 watchdog.unref();
 try { for (const width of [1280,390]) {
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  const page=await context.newPage(), errors=[]; let calls=0;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>{calls++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'wrong fixture'})});});
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  await page.evaluate(()=>{UP.S.subject='physics';location.hash='#/ask';});
  const ta=page.locator('form[data-form="ask"] textarea[name="q"]'); await ta.waitFor();
  const raw='A particle of charge\nq\nq and mass\nm\nm is released from rest a distance\nd\nd from a fixed charge\nQ\nQ of the same sign. Using conservation of energy, derive the particle’s speed when it is a distance\n2\nd\n2d from\nQ\nQ. State any assumptions.';
  await ta.evaluate((el,text)=>{const d=new DataTransfer();d.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true,cancelable:true}));},raw);
  assert.match(await ta.inputValue(), /charge q and mass m.*distance 2d from Q/);
  assert.match(await page.locator('.paste-note').innerText(),/check the numbers and signs/i);
  await ta.evaluate(el=>el.form.requestSubmit());
  await page.waitForFunction(()=>UP.S.aiAnswer&&UP.S.aiAnswer.kind==='charge-energy');
  await page.locator('.ai-answer').waitFor();
  assert.equal(calls,0,'the checked setup must not call the provider');
  assert.match(await page.locator('.ai-answer').innerText(),/energy conservation/i);
  assert.equal(await page.locator('.ai-answer .approach').count(),4);
  assert.equal(await page.locator('.ai-answer .figure-card svg').count(),1);
  assert.match(await page.locator('.ai-answer .figure-card').innerText(), /2d/);
  assert.match(await page.locator('.ai-answer .answer-math').innerText(),/4 × π × ε₀/);
  assert(!(await page.locator('.ai-answer').innerText()).includes('factor enumeration'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'answer must not overflow the viewport');
  await page.evaluate(()=>{UP.S.aiAnswer={...UP.S.aiAnswer,source:'ai',result:'stale incorrect answer'};location.hash+='&refresh=1';});
  await page.waitForFunction(()=>UP.S.aiAnswer && UP.S.aiAnswer.kind==='charge-energy' && UP.S.aiAnswer.result.includes('4 × π'));
  assert(!(await page.locator('.ai-answer').innerText()).includes('stale incorrect answer'));
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: paste, first-try checked answer, schematic, safe layout and stale answer repair`);
  await context.close();
 }} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
