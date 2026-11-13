'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>requests.push(r));
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  await page.locator('#topbar select[data-key="subject"]').selectOption('sanskrit');
  await page.waitForFunction(()=>UP.S.subject==='sanskrit'&&UP.sanskritPapers&&UP.sanskritPapers.length===9);
  await page.evaluate(()=>location.hash='#/pyq');await page.locator('.sanskrit-source-note').waitFor();
  assert.equal(await page.locator('.sanskrit-source-note a').count(),9);
  assert.equal(await page.locator('.q-card.pyq').count(),0,'unverified Hindi prompts must not be Sanskrit board questions');
  assert(!(await page.locator('.pyq-filter').innerText()).includes('__san-div'));
  await page.evaluate(()=>location.hash='#/test');await page.locator('.sanskrit-source-note').waitFor();assert.equal(await page.locator('.q-card').count(),0);
  // Reviewed synthetic Sanskrit rows prove actual filtering, without translating real sources.
  await page.evaluate(()=>{
   UP.pyq.push(...[1,2,3].map(lv=>({id:'san-verified-fixture-'+lv,cls:10,subject:'sanskrit',board:'cbse',ch:lv===3?'san10-sk02':'san10-sk01',sourceVerified:true,sa:'सन्धिं कुरुत। प्रश्नः '+lv,hi:'Wrong Hindi fallback',m:1,lv,src:'reviewed fixture'})));
   location.hash='#/pyq?lvl=1&ch=san10-sk01';
  });
  await page.locator('#san-verified-fixture-1').waitFor();assert.equal(await page.locator('.q-card.pyq').count(),1);
  assert(!(await page.locator('#san-verified-fixture-1').innerText()).includes('Wrong Hindi'));
  await page.evaluate(()=>location.hash='#/pyq?lvl=2&ch=san10-sk01');await page.locator('#san-verified-fixture-2').waitFor();assert.equal(await page.locator('.q-card.pyq').count(),1);
  await page.evaluate(()=>location.hash='#/pyq?lvl=3&ch=san10-sk02');await page.locator('#san-verified-fixture-3').waitFor();assert.equal(await page.locator('.q-card.pyq').count(),1);
  await page.locator('#topbar select[data-key="subject"]').selectOption('hindi');await page.waitForFunction(()=>UP.S.subject==='hindi'&&UP.hindi10Chapters);
  await page.evaluate(()=>location.hash='#/pyq?ch=hind10-kr01&lvl=2');
  await page.waitForFunction(()=>location.hash.includes('hind10-kr01'));await page.waitForTimeout(100);
  assert.equal(await page.locator('#hind10-kr01-q02').count(),0,'glossary fragment withheld');
  assert.equal(await page.locator('#hind10-kr01-t').count(),0,'passage is not a standalone question');
  const diary='पाठ पढ़ते-पढ़ते आपको भी अपने माता-पिता का लाड-प्यार याद आ रहा होगा। अपनी इन भावनाओं को डायरी में अंकित कीजिए';
  await page.evaluate(q=>location.hash='#/ask?q='+encodeURIComponent(q),diary);
  await page.waitForFunction(()=>UP.S.aiState==='loading');await page.waitForTimeout(50);
  assert.equal(requests.length,1);
  assert.match(requests[0].request().postDataJSON().chapterTitle,/माता का आँचल/);
  await requests.pop().fulfill({status:503,contentType:'application/json',body:'{"error":"Mock unavailable"}'});await page.waitForFunction(()=>UP.S.aiState==='local');
  await page.evaluate(()=>location.hash='#/ask?q='+encodeURIComponent('बरामदा 22. साफ़, शुद्ध'));
  await page.locator('.language-context').waitFor();assert.equal(requests.length,0);
  const passage='साना-साना हाथ जोड़ि... '+ 'हम पहाड़ी रास्ते पर चलते गए। '.repeat(60);
  await page.evaluate(q=>location.hash='#/ask?q='+encodeURIComponent(q),passage);await page.locator('.language-context').waitFor();assert.equal(requests.length,0);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: nine source PDFs, no Hindi Sanskrit substitutes, numeric level/string chapter filters, Hindi chapter context and fragment/passage guards`);
  await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
