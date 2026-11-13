/* Runtime renderer checks; AI fixtures do not certify provider explanations. */
const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];let mode='parallel';
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/ai/solve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:'Synthetic explanation fixture',approaches:['Textbook description','Cause and effect','Comparison','Application'].map(name=>({name,steps:[{t:'Synthetic explanation, not a numerical method.'}]})),diagram:mode==='parallel'?{type:'circuit',caption:'Two resistors in parallel',resistors:[{value:999},{value:999}]}:{type:'apparatus',parts:[],caption:mode==='copper'?'Electrolytic refining of copper':'No diagram'},conceptDiagram:mode==='copper'?{type:'flow',nodes:['Cu dissolves from anode','Pure Cu deposits at cathode','Impurities remain in solution or mud']}:null})}));
  await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  const parallel='Explain two resistors of 2 Ω and 6 Ω connected in parallel.';
  await page.evaluate(q=>{UP.S.subject='physics';UP.S.cls=12;location.hash='#/ask?q='+encodeURIComponent(q);},parallel);
  const svg=page.locator('.ai-answer .figure-body svg');await svg.waitFor();
  assert.equal(await svg.locator('.circuit-resistor').count(),2);
  const text=await svg.textContent();assert(text.includes('R₁ = 2 Ω')&&text.includes('R₂ = 6 Ω')&&!text.includes('999'));
  assert(await svg.evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
  await svg.screenshot({path:`/tmp/parallel-labelled-${width}.png`});
  mode='copper';
  const copper='Describe how copper is purified by electrolytic refining. Identify the anode, cathode and electrolyte; write the electrode reactions; and explain what happens to soluble and insoluble impurities.';
  await page.evaluate(q=>{UP.S.subject='chemistry';location.hash='#/ask?q='+encodeURIComponent(q);},copper);
  await page.waitForFunction(q=>UP.S.aiAnswer&&UP.S.aiAnswer.question===q,copper);await svg.waitFor();
  const cell=await svg.textContent();for(const t of ['Impure Cu anode (+)','Pure Cu cathode (−)','Acidified CuSO₄','Anode mud','Soluble impurities'])assert(cell.includes(t));
  assert.equal(await page.locator('.ai-answer .ai-concept-diagram').count(),1);
  assert((await page.locator('.ai-answer [data-approaches-heading]').innerText()).includes('Different ways to understand'));
  assert.equal(await page.locator('.ai-answer .show-all-btn').innerText(),'Show all explanations');
  await svg.screenshot({path:`/tmp/copper-labelled-${width}.png`});
  mode='empty';await page.evaluate(()=>location.hash='#/ask?q=Describe%20an%20unsupported%20apparatus%20setup');
  await page.waitForFunction(()=>UP.S.aiAnswer&&UP.S.aiAnswer.question==='Describe an unsupported apparatus setup');
  assert.equal(await page.locator('.ai-answer .figure-body').count(),0);assert.equal(await page.locator('.ai-answer .figure-head').count(),0);
  assert.equal(await page.locator('.ai-answer .approach').count(),4);
  assert.deepEqual(errors,[]);await context.close();
  console.log(`PASS ${width}px: actual parallel branches+given values, labelled copper cell+flow, theory labels, empty diagrams omitted`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
