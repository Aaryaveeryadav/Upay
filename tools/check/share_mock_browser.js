'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',acceptDownloads:true}),page=await context.newPage(),errors=[];let downloads=0;
  page.on('pageerror',e=>errors.push(String(e)));page.on('download',()=>downloads++);
  await page.addInitScript(()=>{
   window.__draws=[];const fill=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(t,x,y,...rest){window.__draws.push({t,x,y,font:this.font});return fill.call(this,t,x,y,...rest);};
   Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});
  });
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  await page.route('**/api/ai/solve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'2.4 Ω',approaches:[1,2,3,4].map(i=>({name:'Reciprocal formula '+i,tag:'Standard textbook approach for parallel circuits',steps:[{t:'State the formula for two resistors in parallel.',m:'1/R = 1/R₁ + 1/R₂'},{t:'Substitute the given values. Find a common denominator and add the fractions.',m:'1/R = 1/4 + 1/6 = 5/12'},{t:'Invert the result to obtain the equivalent resistance.',m:'R = 12/5 = 2.4 Ω'}]}))})}));
  await page.evaluate(()=>{UP.S.subject='science';location.hash='#/ask?q=Two%20resistors%204%CE%A9%20and%206%CE%A9%20in%20parallel';});
  await page.waitForFunction(()=>UP.S.aiState==='done');
  await page.locator('[data-action="shareImage"]').first().click();
  await page.locator('#share-preview img').waitFor();
  assert.equal(downloads,0,'preview must not silently download');
  assert.equal(await page.locator('[data-share-native]').isVisible(),false,'unsupported native share button stays hidden');
  assert.match(await page.locator('#share-preview [data-share-status]').innerText(),/not supported/);
  const rows=await page.evaluate(()=>window.__draws);
  const body=rows.filter(r=>r.y>=100);
  for(let i=1;i<body.length;i++)assert(body[i].y-body[i-1].y>=25,JSON.stringify(body.slice(i-1,i+1)));
  assert(rows.some(r=>r.t.includes('12/5 = 2.4')),'include actual working, not just step titles');
  if(width===1280)await page.locator('#share-preview').screenshot({path:'/tmp/upay-share-preview.png'});
  await page.locator('[data-share-download]').click();await page.waitForTimeout(100);assert.equal(downloads,1);
  await page.locator('[data-share-close]').click();
  // Native share cancellation must not trigger a surprise fallback download.
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
   Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Canceled','AbortError');}});
  });
  await page.locator('[data-action="shareImage"]').first().click();await page.locator('#share-preview img').waitFor();
  await page.locator('[data-share-native]').click();await page.waitForTimeout(100);assert.equal(downloads,1);
  await page.locator('[data-share-close]').click();
  // Synthetic verified keys, an unverified theory question and unknown marks.
  await page.evaluate(()=>{
   UP.S.subject='maths';UP.S.cls=10;UP.S.board='cbse';
   UP.S.mockTest={scope:'cbse|10|maths',subject:'maths',started:Date.now(),items:[
    {q:'What is one plus one?',ch:1,chName:'Real Numbers',source:{m:1,keyVerified:true,ans:'2'}},
    {q:'Choose the prime number.',ch:1,chName:'Real Numbers',source:{m:1,keyVerified:true,ans:'A',opts:[{en:'2'},{en:'4'},{en:'6'},{en:'8'}]}},
    {q:'Explain why water conservation matters.',ch:2,chName:'Resources',source:{m:3,keyVerified:false,ans:'unverified'}},
    {q:'Describe a practical local example.',ch:2,chName:'Resources',source:{keyVerified:false}}
   ],answers:{},submitted:{},finished:false};location.hash='#/mock';
  });
  await page.locator('#mock-answer-0').waitFor();
  await page.locator('[data-mock-question="0"] summary').click();
  assert.match(await page.locator('#mock-info-0').innerText(),/Real Numbers/);assert.match(await page.locator('#mock-info-0').innerText(),/Marks: 1/);
  await page.locator('#mock-answer-0').fill('3');await page.locator('[data-mock-submit="0"]').click();
  assert.equal(await page.locator('#mock-answer-0').getAttribute('readonly'),'');
  assert.match(await page.locator('[data-mock-question="0"] .mock-feedback').innerText(),/Incorrect · 0 \/ 1/);
  await page.locator('[data-mock-edit="0"]').click();await page.locator('#mock-answer-0').fill('2');await page.locator('[data-mock-submit="0"]').click();
  assert.match(await page.locator('[data-mock-question="0"] .mock-feedback').innerText(),/Correct · 1 \/ 1/);
  await page.reload();await page.locator('#mock-answer-0').waitFor();assert.equal(await page.locator('#mock-answer-0').inputValue(),'2');assert(await page.locator('#mock-answer-0').isEditable()===false);
  await page.locator('#mock-answer-1').fill('B');await page.locator('[data-mock-submit="1"]').click();
  await page.locator('#mock-answer-2').fill('A descriptive answer that needs review.');await page.locator('[data-mock-submit="2"]').click();
  assert.match(await page.locator('[data-mock-question="2"] .mock-feedback').innerText(),/review needed/);
  await page.locator('#mock-submit').click();await page.waitForFunction(()=>UP.S.mockTest.finished);
  assert.match(await page.locator('.page-head h1').innerText(),/1 \/ 2 auto-marked marks/);
  assert.equal(await page.evaluate(()=>UP.S.mockTest.score.pending),2);
  await page.locator('[data-mock-question="1"] .mock-correction summary').click();
  await page.locator('#mock-revision-1').fill('A');await page.locator('[data-mock-recheck="1"]').click();
  assert.match(await page.locator('[data-mock-revision-status="1"]').innerText(),/matches the verified key/);
  assert.equal(await page.evaluate(()=>UP.S.mockTest.score.earned),1,'correction must not overwrite original score');
  assert.equal(await page.evaluate(()=>UP.S.mockTest.answers[1]),'B');
  await page.locator('#mock-review-2').fill('2.5');await page.locator('[data-mock-review="2"]').click();
  assert.match(await page.locator('.mock-estimate').innerText(),/3.5 \/ 5/);
  assert.equal(await page.evaluate(()=>UP.S.mockTest.score.earned),1,'manual review must not change confirmed score');
  await page.evaluate(()=>{
   UP.S.mockTest={scope:'cbse|10|maths',subject:'maths',started:Date.now()-3*3600000-100,items:[{q:'Find the sum of one and one.',source:{m:1,ans:'2',keyVerified:true}}],answers:{0:'2'},finished:false};location.hash='#/mock?expiry=1';
  });
  await page.waitForFunction(()=>UP.S.mockTest.finished);
  assert.equal(await page.evaluate(()=>UP.S.mockTest.score.earned),1,'timer auto-submission scores the saved answer');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: readable share preview, explicit download/cancel safety, question submit/edit/reload, chapter/marks, verified scoring and corrections`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
