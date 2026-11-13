/* Guest saved-question UI; mocked AI, no remote account-sync assertion. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/api/ai/solve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'Synthetic result',approaches:[1,2,3,4].map(i=>({name:'Test '+i,steps:[{t:'Synthetic test step'}]}))})}));
   await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
   const q='Prove that √5 is irrational. Save regression.';
   await page.evaluate(q=>location.hash='#/ask?q='+encodeURIComponent(q),q);
   const ai=page.locator('.ai-answer [data-action="saveQuestion"]');await ai.waitFor();
   assert.equal(await ai.innerText(),'Save question');await ai.click();assert(await ai.isDisabled());
   assert((await ai.innerText()).includes('Saved'));
   assert.equal(await page.evaluate(q=>UP.S.saved.filter(s=>s.q===q).length,q),1);
   // Disabled repeated save does not add another copy, even on redisplay.
   await page.evaluate(()=>location.hash='#/saved');await page.waitForFunction(()=>document.querySelector('#view').innerText.includes('Saved'));
   assert((await page.locator('#view').innerText()).includes(q));
   await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
   assert.equal(await page.evaluate(q=>UP.S.saved.filter(s=>s.q===q).length,q),1);
   await page.evaluate(()=>location.hash='#/test');await page.locator('.q-card [data-action="saveQuestion"]').nth(3).waitFor();await page.waitForTimeout(500);
   const practice=page.locator('.q-card [data-action="saveQuestion"]').nth(3);
   const pq=await practice.getAttribute('data-q');assert(pq.length>5);
   await practice.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await practice.click();
   assert(await practice.isDisabled());assert(Math.abs(await page.evaluate(()=>scrollY)-y)<3,'saving must not jump to top');
   assert(await page.evaluate(q=>UP.S.saved.some(s=>s.q===q),pq));
   await page.evaluate(()=>{UP.pyq.push({id:'save-ui-fixture',cls:10,subject:'maths',board:'cbse',y:2096,ch:1,q:1,kind:4,m:2,en:'Synthetic source question for saving regression.',hi:'सहेजने के परीक्षण के लिए प्रश्न।',cleanText:true,keyVerified:false});location.hash='#/pyq?y=2096';});
   const pyq=page.locator('#save-ui-fixture [data-action="saveQuestion"]');await pyq.waitFor();await pyq.click();assert(await pyq.isDisabled());
   await page.locator('.lang-btn').click();
   // Switching language exposes a Hindi Save question affordance too.
   const hindi=page.locator('#save-ui-fixture [data-action="saveQuestion"]');assert((await hindi.innerText()).includes('प्रश्न सहेजें'));await hindi.click();
   assert((await hindi.innerText()).includes('सहेजा गया'));
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: AI/practice/PYQ Save question, visible saved state, guest reload persistence, Saved listing, no scroll jump, Hindi label`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
