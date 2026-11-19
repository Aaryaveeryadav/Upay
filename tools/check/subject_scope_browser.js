'use strict';
const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
try{for(const width of [1280,390])for(const old of ['accountancy','computerized-accounting','economics','business-studies']){
 const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(old=>{localStorage.setItem('upay.cls','12');localStorage.setItem('upay.subject',JSON.stringify(old));localStorage.setItem('upay.recent',JSON.stringify([{q:'Old personal question',subject:old,cls:12}]));},old);
 await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
 assert.equal(await page.evaluate(()=>UP.S.subject),'maths');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upay.recent'))[0].q),'Old personal question');
 const options=await page.locator('select[data-action="set"][data-key="subject"]').first().locator('option').evaluateAll(els=>els.map(e=>e.value));
 assert.deepEqual(options,['maths','applied-maths','physics','chemistry','biology','english']);
 await page.evaluate(old=>{location.hash='#/syllabus?cls=12&sub='+old;},old);await page.waitForFunction(()=>UP.S.subject==='maths');
 await page.evaluate(()=>{location.hash='#/syllabus?cls=12&sub=english';});await page.waitForFunction(()=>UP.S.subject==='english'&&UP.loaded.packs.class12);
 assert(await page.evaluate(()=>UP.catalogue(12,'english').length>0));
 await page.evaluate(()=>{location.hash='#/syllabus?cls=12&sub=applied-maths';});await page.waitForFunction(()=>UP.S.subject==='applied-maths');
 assert(await page.evaluate(()=>UP.catalogue(12,'applied-maths').length>0));
 for(const path of ['/assets/js/data/economics12.js','/assets/books/economics/macro/lhec101.pdf','/assets/papers/accountancy/2023/67_1_1_Accountancy.pdf']) assert.equal((await page.request.get(path)).status(),404);
 assert.deepEqual(errors,[]);await ctx.close();console.log(`PASS ${width}px ${old}: migrated saved scope, retired deep link blocked, retained subjects and missing assets`);
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
