/* Exact mathematics, with a deliberately incorrect provider fixture as a trap. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];let calls=0;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>{calls++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'n = 191',approaches:[1,2,3].map(i=>({name:'Incorrect fixture '+i,steps:[{t:'Deliberately incorrect test.'}]}))})});});
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  const q='Find all positive integers n for which n²+10n+2026 is a perfect square.';
  await page.evaluate(q=>location.hash='#/ask?q='+encodeURIComponent(q),q);
  await page.waitForSelector('.ai-answer');
  assert((await page.locator('.ai-answer').innerText()).includes('n = 15, 27, 327, 995'));
  assert((await page.locator('.ai-answer').innerText()).includes('Solved by exact calculation'));
  assert.equal(await page.locator('.ai-answer .approach').count(),3);
  assert.equal(calls,0,'known exact problem must not call AI');
  // Simulate an old/stale AI answer in state; presentation AND speech/copy state
  // must be repaired, not just the visible final line.
  await page.evaluate(()=>{UP.S.aiAnswer={...UP.S.aiAnswer,source:'ai',result:'n = 191',summary:'Old wrong answer'};location.hash+='&redisplay=1';});
  await page.waitForFunction(()=>UP.S.aiAnswer.result==='n = 15, 27, 327, 995');
  assert(!(await page.locator('.ai-answer').innerText()).includes('n = 191'));
  await page.locator('.lang-btn').click();
  assert((await page.locator('.ai-answer').innerText()).includes('n = 15, 27, 327, 995'));
  await page.locator('.lang-btn').click();
  await page.evaluate(()=>location.hash='#/test');await page.locator('.q-toggle').first().waitFor();
  await page.evaluate(q=>{const row=UP.S.paper.sections[0].questions[0];Object.assign(row,{en:q,hi:q,raw:null,ans:'',steps:[],opts:[],keyVerified:false});location.hash='#/test?fixture=1';},q);
  await page.locator('#q1 .q-toggle').click();
  assert((await page.locator('#q1 .q-solution').innerText()).includes('n = 15, 27, 327, 995'));
  assert(/exact calculation/i.test(await page.locator('#q1 .sol-ans').innerText()));
  assert.equal(calls,0);
  await page.evaluate(q=>{UP.S.lang='en';UP.pyq.push({id:'square-key-fixture',board:'cbse',subject:'maths',cls:10,y:2099,ch:1,q:1,m:2,kind:4,en:q,cleanText:true,ans:'n = 191',keyVerified:false});location.hash='#/pyq?y=2099';},q);
  await page.locator('#square-key-fixture').waitFor();
  await page.locator('#square-key-fixture [data-reveal]').click();
  assert((await page.locator('#sol-square-key-fixture').innerText()).includes('n = 15, 27, 327, 995'));
  assert.equal(calls,0);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: exact full set in Ask/practice/PYQ, old 191 replaced including speech state, Hindi, three explanations, zero provider requests`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
