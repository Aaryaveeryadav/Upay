/* Mock provider responses; assert graphical and conceptual views coexist. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try {
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   let mode='legacy';
   const flow={type:'flow',nodes:['Assume √5 = a/b in lowest terms','a² = 5b²','5 divides both a and b','Contradiction; √5 is irrational'],caption:'Proof by contradiction'};
   await page.route('**/api/ai/solve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'√5 is irrational',approaches:[1,2,3].map(i=>({name:'Explanation '+i,steps:[{t:'Mock step'}]})),diagram:mode==='legacy'?flow:{type:'triangle',points:[{x:0,y:0,label:'O'},{x:2,y:0,label:'A'},{x:2,y:1,label:'B'}],caption:'Illustration of a length √5, not a proof of irrationality'},...(mode==='legacy'?{}:{conceptDiagram:flow})})}));
   await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
   for(const variant of ['legacy','dual']){
    mode=variant;
    await page.evaluate(variant=>location.hash='#/ask?q='+encodeURIComponent('Prove that √5 is irrational. '+(variant==='dual'?'Use three explanations.':'')),variant);
    await page.waitForFunction(variant=>UP.S.aiAnswer && (variant==='dual' ? !!UP.S.aiAnswer.conceptDiagram : !UP.S.aiAnswer.conceptDiagram),variant);
    await page.locator('.ai-answer .ai-flow-nodes').waitFor();
    await page.locator('.ai-answer .figure-body svg').waitFor();
    assert.equal(await page.locator('.ai-answer .figure-body svg').count(),1,'one graphical drawing');
    assert.equal(await page.locator('.ai-answer .ai-concept-diagram').count(),1,'one proof flow');
    assert.equal(await page.locator('.ai-answer > .figure-card').count(),2,'both figures, no replacement/duplicate');
    assert(await page.locator('.ai-answer .ai-flow-nodes').evaluate(e=>e.scrollWidth<=e.clientWidth));
    assert(await page.locator('.ai-answer .figure-body svg').evaluate(e=>e.getBoundingClientRect().width<=innerWidth));
   }
   // No unrelated/stale sqrt diagram may leak into another flow-only answer.
   mode='legacy';
   await page.evaluate(()=>location.hash='#/ask?q=Explain%20an%20unrelated%20abstract%20topic');
   await page.waitForFunction(()=>UP.S.aiAnswer && UP.S.aiAnswer.question==='Explain an unrelated abstract topic');
   await page.locator('.ai-answer .ai-flow-nodes').waitFor();
   assert.equal(await page.locator('.ai-answer .figure-body svg').count(),0);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: legacy flow retains matching √5 drawing; dual-field answer shows drawing AND concept flow; no stale figure leakage`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
