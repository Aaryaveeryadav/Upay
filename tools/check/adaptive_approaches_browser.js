'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[],pending=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>pending.push(r));
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  const paragraphs=[
   'Federalism divides government power between a central authority and constituent units. Each level has powers defined by the Constitution.',
   'India originally had Union and State governments. Local government later became a constitutionally recognised third tier.',
   'Legislative powers are divided through the Union, State and Concurrent Lists. Courts resolve constitutional disputes between governments.'
  ];
  await page.evaluate(()=>{UP.S.subject='social';location.hash='#/ask?q=Explain%20federalism.';});
  await page.waitForFunction(()=>UP.S.aiState==='loading');await page.waitForTimeout(50);
  await pending.shift().fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',policyVersion:'useful-approaches-v1',result:'Power is constitutionally divided between levels of government.',approaches:[1,2,3].map(i=>({name:'Complete explanation '+i,format:'prose',steps:paragraphs.map(t=>({t}))}))})});
  await page.waitForFunction(()=>UP.S.aiState==='done');assert.equal(await page.locator('.ai-answer .approach').count(),3);
  const spacing=await page.locator('.ai-answer .approach').first().locator('ol.prose-answer > li').evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height,whiteSpace:getComputedStyle(el).whiteSpace,after:getComputedStyle(el,'::after').display})));
  for(let i=0;i<spacing.length;i++){
   assert.equal(spacing[i].whiteSpace,'normal');assert.equal(spacing[i].after,'none');
   assert(spacing[i].height<230,'paragraph must not contain hundreds of pixels of template whitespace');
   if(i)assert(spacing[i].top-spacing[i-1].bottom<=25,'paragraph gap should remain compact');
  }
  const first=page.locator('.ai-answer .approach').nth(0);
  for(let i=0;i<12;i++){
   await first.locator('[data-action="toggle"]').click();assert.equal(await first.locator('.next-method-cta').count(),0);
   await first.locator('[data-action="toggle"]').click();assert.equal(await first.locator('.next-method-cta').count(),1);
   assert.equal(await page.locator('.show-all-btn').count(),1);
  }
  await first.locator('.next-method-cta').click();
  assert.equal(await first.locator('.next-method-cta').count(),0);
  assert.equal(await page.locator('.ai-answer .approach').nth(1).locator('.next-method-cta').count(),1);
  await page.locator('.show-all-btn').click();assert.equal(await page.locator('.next-method-cta').count(),0);assert.equal(await page.locator('.show-all-btn').count(),0);
  await page.locator('.ai-answer .approach').nth(1).locator('[data-action="toggle"]').click();assert.equal(await first.locator('.next-method-cta').count(),1);
  await page.evaluate(()=>location.hash='#/ask?q=Define%20federalism%20briefly.');
  await page.waitForFunction(()=>UP.S.aiState==='loading');await page.waitForTimeout(50);
  await pending.shift().fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',policyVersion:'useful-approaches-v1',result:'A constitutional division of government powers.',approaches:[{name:'Direct definition',format:'prose',steps:[{t:paragraphs[0]}]}]})});
  await page.waitForFunction(()=>UP.S.aiState==='done');assert.equal(await page.locator('.ai-answer .approach').count(),1);
  assert.equal(await page.locator('.next-method-cta,.show-all-btn').count(),0);
  assert(!(await page.locator('.ai-answer').innerText()).includes('at least four'));
  if(width===1280)await page.locator('.ai-answer').screenshot({path:'/tmp/upay-adaptive-prose.png'});
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: one/three complete approaches, compact prose/no step connector, repeated toggles without duplicate navigation, correct next/show-all state`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
