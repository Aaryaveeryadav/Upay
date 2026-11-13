/* Local symbolic solver presentation with AI unavailable; no provider calls. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/api/ai/solve',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Mock AI unavailable"}'}));
   await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
   const q='If the least common multiple (LCM) of two positive integers $p = a^3b^2$ and $q = ab^3$, where $a$ and $b$ are prime numbers, is divided by their highest common factor (HCF), what is the resulting expression?';
   await page.evaluate(q=>location.hash='#/ask?q='+encodeURIComponent(q),q);
   await page.waitForFunction(()=>UP.S.aiState==='local');
   const answer=page.locator('#answerMount');
   assert((await answer.innerText()).includes('a²b'));
   assert((await answer.innerText()).includes('if a = b, the ratio is a'));
   assert(!(await answer.innerText()).includes('HCF = 3'));
   assert.equal(await answer.locator('.approach').count(),3);
   await page.locator('.lang-btn').click();
   assert((await answer.innerText()).includes('a²b'));
   assert.equal(await answer.locator('.approach').count(),3);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: exact reported question gives symbolic quotient, not HCF(3,3); three approaches and ambiguity caveat in English/Hindi with AI unavailable`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
