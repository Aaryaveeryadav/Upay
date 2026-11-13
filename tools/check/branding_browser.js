'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 const base=process.env.UPAY_BASE||'http://127.0.0.1:8005/';
 try{
  const shell=await browser.newPage({javaScriptEnabled:false});await shell.goto(base);
  assert((await shell.title()).startsWith('Kritin Upay'));
  assert.equal(await shell.locator('.brand-mark img').getAttribute('src'),'/assets/brand/kritin-logo.png');
  await shell.close();
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
   await page.goto(base,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
   assert((await page.title()).startsWith('Kritin Upay'));
   assert((await page.locator('.brand-name').innerText()).includes('Kritin Upay'));
   assert(await page.locator('.brand-mark img').evaluate(el=>el.complete&&el.naturalWidth===224));
   const manifest=await page.evaluate(async()=>{
    const response=await fetch(document.querySelector('link[rel="manifest"]').href);
    return {type:response.headers.get('content-type'),body:await response.json()};
   });
   assert.equal(manifest.body.name,'Kritin Upay');assert.equal(manifest.body.theme_color,'#e7002c');
   assert(manifest.type.includes('application/manifest+json'));
   for(const icon of manifest.body.icons){const response=await page.request.get(new URL(icon.src,base).href);assert(response.ok());assert(response.headers()['content-type'].includes('image/png'));}
   await page.evaluate(()=>{location.hash='#/about';});
   await page.waitForFunction(()=>document.title.includes('About'));
   assert((await page.title()).startsWith('Kritin Upay'));
   assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#e7002c');
   assert(!(await page.locator('link[rel="icon"]').getAttribute('href')).startsWith('data:'));
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   console.log(`PASS ${width}px: original logo loaded, renamed shell/runtime/title, manifest/icons and theme match, no overflow`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
