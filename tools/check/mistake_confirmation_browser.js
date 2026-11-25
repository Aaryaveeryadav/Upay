'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 /* A browser check whose page never reaches the state it waits for must end
    in a named failure. Without this, one unbounded waitForFunction kept the
    whole workflow job alive until GitHub's six-hour ceiling, and the report
    named no check at all. */
 const watchdog=setTimeout(()=>{console.error('TIMEOUT: '+require('node:path').basename(__filename)+' did not finish within '+(+process.env.UPAY_CHECK_TIMEOUT||300)+'s; it hung waiting for a page state.');process.exit(124);},(+process.env.UPAY_CHECK_TIMEOUT||300)*1000);
 watchdog.unref();
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>requests.push(r));
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  const typo='Find all positive integers 7 for which n2 + 10m + 2026 is a perfect square.';
  await page.evaluate(q=>{UP.S.subject='maths';location.hash='#/ask?q='+encodeURIComponent(q);},typo);
  await page.locator('.question-clarification').waitFor();assert.equal(requests.length,0);
  await page.locator('.question-clarification a').click();
  await page.waitForFunction(()=>UP.S.aiAnswer&&UP.S.aiAnswer.source==='exact');
  assert.equal(await page.evaluate(()=>UP.S.aiAnswer.result),'n = 15, 27, 327, 995');assert.equal(requests.length,0);
  await page.evaluate(()=>{
   UP.S.mockTest={scope:'cbse|10|maths',subject:'maths',started:Date.now(),items:[{q:'What is one plus one?',ch:1,source:{m:1,keyVerified:true,ans:'2'}}],answers:{},submitted:{},finished:false};location.hash='#/mock';
  });
  await page.locator('#mock-answer-0').fill('3');await page.locator('[data-mock-submit="0"]').click();
  await page.evaluate(()=>location.hash='#/mistakes');await page.locator('[data-action="recheckMistake"]').waitFor();
  assert.equal(await page.locator('[data-action="removeMistake"]').count(),0,'unresolved checked mistake cannot be dismissed');
  await page.reload();await page.locator('[data-action="recheckMistake"]').waitFor();
  assert.equal(await page.evaluate(()=>UP.S.mistakeQueue.length),1);
  await page.evaluate(()=>{UP.S.subject='science';location.hash='#/mistakes?other=1';});await page.waitForFunction(()=>UP.S.mistakeQueue.length===0);
  await page.evaluate(()=>{UP.S.subject='maths';location.hash='#/mistakes?return=1';});await page.waitForFunction(()=>UP.S.mistakeQueue.length===1);
  // Merely viewing a solution must not resolve a checked wrong answer.
  await page.locator('[data-action="sample"]').first().click();await page.waitForFunction(()=>UP.S.aiState==='loading');
  // The routed request arrives a tick after the loading state; wait for it
  // rather than sleeping, so a loaded machine cannot make this flaky.
  for(let i=0;i<250&&!requests.length;i++) await page.waitForTimeout(20);
  assert(requests.length,'the sample solution must reach the AI endpoint');
  await requests.pop().fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'2',approaches:[1,2,3,4].map(i=>({name:'Mock explanation '+i,steps:[{t:'This is a UI test fixture.'}]}))})});
  await page.waitForFunction(()=>UP.S.aiState==='done');assert.equal(await page.evaluate(()=>UP.S.mistakeQueue.length),1);
  await page.evaluate(()=>location.hash='#/mistakes');await page.locator('[data-action="recheckMistake"]').waitFor();
  await page.locator('#mistake-answer-0').fill('4');await page.locator('[data-action="recheckMistake"]').click();
  assert.equal(await page.evaluate(()=>UP.S.mistakeQueue.length),1);
  await page.locator('#mistake-answer-0').fill('2');await page.locator('[data-action="recheckMistake"]').click();
  await page.waitForFunction(()=>UP.S.mistakeQueue.length===0);
  // A long English response must survive past both the old 35s and 65s cutoffs.
  await page.clock.install();
  /* Once the clock is installed, every timer in the page is fake -- including
     the one Playwright's waitForFunction uses to poll from inside the page. A
     polled wait can then never see a state change, so this section advanced
     90 s and then waited on a clock that was no longer running; the wait timed
     out and the report blamed a check that was behaving correctly. Time is
     driven explicitly here instead: runFor fires the timers that are due, and
     each read is a plain evaluate, which needs no timer to come back. */
  const until = async (fn, label) => {
    for (let i = 0; i < 400; i++) {
      if (await page.evaluate(fn)) return;
      await page.clock.runFor(50);
    }
    throw new Error('never became true: ' + label);
  };
  await page.evaluate(()=>{UP.S.subject='english';location.hash='#/ask?q='+encodeURIComponent('Write a formal letter to the editor arguing for preserving a public park.');});
  await until(()=>UP.S.aiState==='loading','the writing question starts loading');
  await page.clock.fastForward(90000);assert.equal(await page.evaluate(()=>UP.S.aiState),'loading');
  assert.match(await page.locator('#aiRequestStatus').innerText(),/140 seconds/);
  await requests.pop().fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'Mock long response',approaches:[1,2,3,4].map(i=>({name:'Draft '+i,format:'prose',steps:[{t:'Mock prose for timer testing, not a provider quality claim.'}]}))})});
  await until(()=>UP.S.aiState==='done','the writing answer is rendered');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: malformed question confirmation/exact correction, persistent wrong-answer queue/scope isolation/retry resolution and 90s writing response`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
