/* Pasted TeX and slow-answer UX; mocked provider and browser clock. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[],pending=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>pending.push(r));
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  await page.evaluate(()=>location.hash='#/ask');
  const ta=page.locator('form[data-form="ask"] textarea[name="q"]');await ta.waitFor();
  const raw=String.raw`Find all positive integers \\(n\\) for which \\(n^2+10n+2026\\) is a perfect square.`;
  const expected='Find all positive integers n for which n²+10n+2026 is a perfect square.';
  await ta.fill('Prefix ');
  await ta.evaluate((el,raw)=>{el.setSelectionRange(0,el.value.length);const data=new DataTransfer();data.setData('text/plain',raw);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},raw);
  assert.equal(await ta.inputValue(),expected,'paste should replace selection and unwrap math formatting');
  // Use a separate, unsupported prompt for the delayed-provider UX check;
  // the original perfect-square example now has an exact instant solver.
  const submitted = expected + ' Explain each step.';
  await ta.fill(submitted);
  await page.clock.install();
  await ta.evaluate(el=>el.form.requestSubmit());
  await page.waitForFunction(()=>UP.S.aiState==='loading');
  await page.waitForTimeout(10);
  assert.equal(pending.length,1,'one submitted question should create one request');
  assert.equal(pending[0].request().postDataJSON().question,submitted);
  await page.clock.fastForward(26000);
  assert.equal(await page.evaluate(()=>UP.S.aiState),'loading','do not abort a valid answer at the old 25s cutoff');
  assert((await page.locator('#aiRequestStatus').innerText()).includes('30 seconds'));
  await pending[0].fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'Mock answer',approaches:[1,2,3].map(i=>({name:'Explanation '+i,steps:[{t:'Mock step, not a mathematical solution.'}]}))})});
  await page.waitForFunction(()=>UP.S.aiState==='done');
  assert.equal(await page.locator('#aiRequestStatus').count(),0);
  assert.equal(await page.locator('#aiThinking').count(),0,'loading dots must disappear when the answer is ready');
  assert.equal(await page.locator('.ai-answer .qtext').innerText(),submitted);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: double-escaped paste and selection replacement, clean request/display, one request, 26s response accepted, useful progress cleared`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
