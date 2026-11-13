/* UI regressions with mocked speech and AI; no real audio/provider guarantee. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try {
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(()=>{
    window.__speech={calls:[],canceled:0};
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Microsoft Ravi',lang:'en-IN',default:true},{name:'Microsoft Neerja',lang:'en-IN'},{name:'Microsoft Swara',lang:'hi-IN'}],cancel:()=>{__speech.canceled++},resume:()=>{},speak:u=>__speech.calls.push(u)},configurable:true});
    window.SpeechSynthesisUtterance=function(text){this.text=text;};
   });
   await page.route('**/api/ai/solve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'ai',result:String.raw`K_{max} = h\nu - \Phi_0`,summary:'Photoelectric effect: energy conservation.',approaches:[1,2,3].map(n=>({name:'Explanation '+n,steps:[{t:String.raw`\nu < \nu_0 \implies \text{No emission}`,m:String.raw`V_0 = \frac{h}{e}\nu - \frac{\Phi_0}{e}`,note:'Synthetic test only.'}]})),diagram:{type:'flow',nodes:[String.raw`Incident photon h\nu`,String.raw`Work function \Phi_0`,String.raw`Energy K_{max}`]}})}));
   await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
   await page.evaluate(()=>{UP.S.test.chapters=[8];UP.S.test.seed=2026;UP.S.paper=null;location.hash='#/test';});
   await page.locator('.q-card .q-text').first().waitFor();await page.waitForTimeout(700);
   assert(await page.locator('.q-card .q-opts').count()>=3);
   const checkStems=async()=>{
    const stems=await page.locator('.q-card .q-text').allTextContents();
    const expected=await page.evaluate(()=>UP.S.paper.sections.flatMap(s=>s.questions.map(q=>(UP.S.lang==='hi'?(q.hi||q.en):(q.en||q.hi)))));
    assert.equal(stems.length,expected.length);
    stems.forEach((t,i)=>{assert(t.trim().length>5,`question ${i+1} is blank`);assert.equal(t.trim(),expected[i].trim());});
   };
   await checkStems();
   await page.locator('.lang-btn').click();await checkStems();
   await page.locator('.lang-btn').click();
   await page.evaluate(()=>{location.hash='#/ask?q=Photoelectric%20effect%20formatting%20regression';});
   await page.locator('.ai-answer .ai-flow-nodes').waitFor();
   const text=await page.locator('.ai-answer').innerText();
   assert(text.includes('Kₘₐₓ = hν - Φ₀'));
   assert(text.includes('V₀ = (h/e)ν - (Φ₀/e)'));
   assert(!/\\(?:nu|Phi|frac|text)|_\{|\^2/.test(text));
   const listen=page.locator('.ai-answer [data-action="speak"]');
   await listen.click();
   assert.equal(await listen.getAttribute('aria-pressed'),'true');
   let speech=await page.evaluate(()=>__speech.calls.map(u=>({text:u.text,lang:u.lang,voice:u.voice&&u.voice.name,rate:u.rate,pitch:u.pitch})));
   assert(speech.length && speech[0].text.includes('Question:'));
   assert.equal(speech[0].voice,'Microsoft Neerja');
   assert.equal(speech[0].rate,.88);
   assert.equal(speech[0].pitch,1);
   // Complete the queue, proving long explanations do not become one giant utterance.
   await page.evaluate(()=>{for(let i=0;i<100 && __speech.calls.at(-1)?.onend;i++){
    const u=__speech.calls.at(-1);u.onend();if(__speech.calls.at(-1)===u) break;
   }});
   assert.equal(await listen.getAttribute('aria-pressed'),'false');
   speech=await page.evaluate(()=>__speech.calls.map(u=>u.text));
   assert(speech.length>3 && speech.every(t=>t.length<=220));
   assert(speech.join(' ').includes('Kₘₐₓ = hν - Φ₀'));
   await listen.click();await listen.click();assert.equal(await listen.getAttribute('aria-pressed'),'false');
   await listen.click();await page.evaluate(()=>__speech.calls.at(-1).onerror({error:'voice-unavailable'}));
   assert.equal(await listen.getAttribute('aria-pressed'),'false');
   assert((await page.locator('body').innerText()).includes('Read aloud failed'));
   await listen.click();await page.evaluate(()=>location.hash='#/syllabus');
   await page.waitForFunction(()=>document.querySelector('[data-nav="syllabus"]').classList.contains('active'));
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: all generated trig stems in English/Hindi, Unicode AI answer/steps/labels, Listen chunk queue/Stop/error/navigation`);
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
