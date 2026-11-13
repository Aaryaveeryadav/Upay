/* Mock AI proves request routing/UI safety, not essay quality/word-count compliance. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),pending=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>pending.push(r));
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  const q='“जल संरक्षण केवल सरकार की जिम्मेदारी नहीं, हर नागरिक का कर्तव्य है।” इस विषय पर लगभग 150–200 शब्दों में अपने विचार लिखिए। तर्क, उदाहरण और कम-से-कम दो व्यावहारिक उपाय शामिल कीजिए।';
  await page.evaluate(q=>{UP.S.subject='social';location.hash='#/ask?q='+encodeURIComponent(q);},q);
  await page.waitForFunction(()=>UP.S.aiState==='loading');await page.waitForTimeout(50);
  assert.equal(pending.length,1);
  const body=pending[0].request().postDataJSON();assert.equal(body.subject,'hindi');assert.equal(body.selectedSubject,'social');assert.equal(body.lang,'hi');
  assert.equal(await page.evaluate(()=>UP.S.subject),'social','do not silently switch selected syllabus');
  assert.equal(await page.locator('#answerMount .figure-body').count(),0);
  assert(!/HCF|LCM|600|150, 200/.test(await page.locator('#answerMount').innerText()));
  const fixture={source:'ai',policyVersion:'four-approaches-v2',result:'जल संरक्षण सभी की साझा जिम्मेदारी है।',approaches:['तर्क आधारित','उदाहरण आधारित','समस्या और समाधान','प्रेरक शैली'].map(name=>({name,steps:[{t:'यह केवल परीक्षण का पाठ है, पूरा निबंध नहीं।'}]})),diagram:{type:'triangle',points:[{x:0,y:0},{x:1,y:0},{x:0,y:1}]}};
  await pending.shift().fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)});
  await page.waitForFunction(()=>UP.S.aiState==='done');
  assert.equal(await page.locator('.ai-answer .approach').count(),4);
  assert((await page.locator('.ai-answer .tag.cream').first().innerText()).includes('4 explanations'));
  assert.equal(await page.locator('.ai-answer .figure-body').count(),0,'no unrelated maths diagram');
  assert((await page.locator('.ai-answer').innerText()).includes('Detected task subject: hindi'));
  assert(!/LCM|HCF/.test(await page.locator('.ai-answer').innerText()));
  await page.evaluate(()=>location.hash='#/ask?q=Explain%20glucose%20breakdown%20in%20muscle%20cells');
  await page.waitForFunction(()=>UP.S.aiState==='loading');await page.waitForTimeout(50);
  assert.equal(pending[0].request().postDataJSON().subject,'biology');
  await pending.shift().fulfill({status:503,contentType:'application/json',body:'{"error":"Mock unavailable"}'});
  await page.waitForFunction(()=>UP.S.aiState==='local');
  assert.equal(await page.locator('#answerMount .figure-body').count(),0);
  assert(!/LCM|HCF/.test(await page.locator('#answerMount').innerText()));
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: Hindi writing under Social routes to Hindi, four explanations, no numeric/diagram fallback, selected syllabus unchanged; Biology inferred`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
