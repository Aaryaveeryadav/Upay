'use strict';
// Integration test: no provider calls, isolated browser storage.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 try {
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'}), requests=[];
   await page.route('**/api/ai/solve',r=>r.fulfill({status:503,json:{error:'mock unavailable'}}));
   await page.route('**/api/ai/check-answer',r=>{requests.push(r.request().postDataJSON());return r.fulfill({status:200,json:{verdict:'correct',feedback:'Mock feedback'}});});
   await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8006/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
   await page.evaluate(async()=>{await UP.loadPack('hindi'); location.hash='#/pyq?cls=10&sub=hindi';});
   const card=page.locator('#hind10-kr01-q01'); await card.waitFor();
   assert.match(await card.locator('.q-source').innerText(), /jhkr101\.pdf.*1/);
   const box=card.locator('[data-written-draft]'),check=card.locator('[data-action="check-written"]');
   assert(await check.isEnabled()); await check.click(); assert.match(await card.locator('.written-feedback').innerText(),/Write your answer first/);
   await box.fill('मुझे अपने माता-पिता का स्नेह याद आता है।'); await check.click();
   await card.locator('.written-feedback').filter({hasText:'Mock feedback'}).waitFor();
   assert.equal(requests.at(-1).studentAnswer,'मुझे अपने माता-पिता का स्नेह याद आता है।');
   await page.evaluate(()=>location.hash='#/test');
   await page.waitForSelector('.paper-section .q-card');
   const written=page.locator('.paper-section .q-card').filter({has:page.locator('[data-written-draft]')}).first();
   await written.waitFor(); assert(await written.locator('[data-written-draft]').isVisible());
   await page.evaluate(()=>location.hash='#/ask?q='+encodeURIComponent('Prove 1−cos⁡Asin⁡A=sin⁡A1+cos⁡A'));
   await page.getByText('Check the question first').waitFor();
   assert.match(await page.locator('#answerMount').innerText(),/fraction bars/);
   console.log(`PASS ${width}px: source metadata, answer checks, test editor and ambiguous fractions`);
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
