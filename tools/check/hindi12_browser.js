'use strict';
const assert=require('node:assert/strict'), {chromium}=require('playwright-core');
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage'],executablePath:process.env.UPAY_CHROMIUM});
 /* A browser check whose page never reaches the state it waits for must end
    in a named failure. Without this, one unbounded waitForFunction kept the
    whole workflow job alive until GitHub's six-hour ceiling, and the report
    named no check at all. */
 const watchdog=setTimeout(()=>{console.error('TIMEOUT: '+require('node:path').basename(__filename)+' did not finish within '+(+process.env.UPAY_CHECK_TIMEOUT||300)+'s; it hung waiting for a page state.');process.exit(124);},(+process.env.UPAY_CHECK_TIMEOUT||300)*1000);
 watchdog.unref();
try { for(const [width,sub,id,other] of [[1280,'hindi-core','lhvt102','lhat102'],[390,'hindi-core','lhvt102','lhat102'],[390,'hindi-elective','lhat102','lhvt102']]){
 const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));let payload;
 await page.route('**/api/ai/solve',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:403,contentType:'application/json',body:'{"error":"AI not enabled"}'});});
 await ctx.addInitScript(()=>{if(!localStorage.getItem('upay.cls')){localStorage.setItem('upay.cls','10');localStorage.setItem('upay.subject','"hindi"');localStorage.setItem('upay.saved',JSON.stringify([{q:'पहले सहेजा प्रश्न',subject:'hindi',cls:10}]));}});
 const base=process.env.UPAY_BASE||'http://127.0.0.1:8005/';const go=async hash=>{await page.evaluate(h=>location.hash=h,hash);};
 await page.goto(base);await page.waitForFunction(()=>window.UP?.S?.subject==='hindi');
 if(width===1280){
   const picker=key=>page.locator(`select[data-action=set][data-key=${key}]`).first();
   await picker('cls').selectOption('12',{force:true});await page.waitForFunction(()=>document.querySelector('select[data-key=subject] option[value=hindi-core]'));await picker('subject').selectOption(sub,{force:true});await page.waitForFunction(s=>UP.S.subject===s,sub);await go('#/syllabus');
 }else await go(`#/syllabus?cls=12&sub=${sub}`);await page.locator(`#view a[href*="${id}"]`).first().waitFor();
 await page.locator('#view input[type=search]').fill(id);await page.waitForFunction(()=>document.querySelectorAll('#view a.card').length===1);
 await page.locator('#view a.card').click();await page.locator('#view img').waitFor();await page.locator('#view a').filter({hasText:'प्रश्न-अभ्यास'}).first().click();
 await page.waitForFunction(()=>document.querySelector('#view img')?.naturalWidth>0);await page.locator('#view details summary').click();
 assert((await page.locator('#view details').innerText()).length>100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#view [data-hindi-draft]').fill('मेरा अभ्यास');await page.reload();await page.waitForFunction(()=>document.querySelector('#view [data-hindi-draft]')?.value==='मेरा अभ्यास');
 await page.locator('#view [data-action=saveQuestion]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upay.saved'))[0].subject),sub);
 await go('#/test');await page.getByText('अगला अभ्यास सेट →').waitFor();assert.equal(await page.locator('#view article.card').count(),3);
 await go('#/pyq');
 if(sub==='hindi-core'){
   const reader=page.locator('hindi-paper-reader');await reader.locator('article').first().waitFor();assert.equal(await reader.locator('article').count(),38);
   await reader.locator('input').fill('संस्कृति');assert(await reader.locator('article a[href*=number]').count()>0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await reader.locator('input').fill('2/1/1');assert.equal(await reader.locator('article').count(),2);
   await reader.locator('input').fill('QR1SP');assert.equal(await reader.locator('article').count(),3);await reader.locator('article a').first().click();
   await reader.getByRole('link',{name:'प्रश्न 12',exact:true}).click();await reader.getByRole('heading',{name:/प्रश्न 12/}).waitFor();assert.match(await reader.locator('section a').first().getAttribute('href'),/2-1-1.pdf#page=15$/);
 }else{await page.getByText(/इस पाठ्यक्रम के पिछले प्रश्नपत्र/).waitFor();assert.equal(await page.locator('hindi-paper-reader').count(),0);}
 await go('#/chapter/'+other);await page.getByText('इस पाठ्यक्रम में यह अध्याय नहीं है।').waitFor();
 await page.reload();await page.waitForFunction(s=>window.UP?.S?.subject===s,sub);await go('#/saved');await page.getByText('पहले सहेजा प्रश्न',{exact:true}).waitFor();
 const request=page.waitForRequest(r=>r.url().includes('/api/ai/solve'));await page.locator('[data-saved-index="0"]').click();payload=(await request).postDataJSON();await page.getByText(/AI व्याख्या असत्यापित है/).waitFor();assert.equal(payload?.cls,12);assert.equal(payload?.board,'cbse');assert.equal(payload?.subject,sub);assert.equal(payload?.chapter,id);assert.equal(payload?.lang,'hi');
 await page.evaluate(()=>{localStorage.setItem('upay.board','"rajasthan"');location.hash='#/syllabus';});await page.reload();await page.getByText('इस पाठ्यसामग्री के लिए CBSE बोर्ड चुनें।').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS',width,sub);await ctx.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
