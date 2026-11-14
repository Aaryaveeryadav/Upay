'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 const base=process.env.UPAY_BASE||'http://127.0.0.1:8005/';
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   let enabled=false;
   await page.route('https://fynlvbtefmawisauzitu.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({external:{google:enabled}})}));
   await page.goto(base+'#/login',{waitUntil:'domcontentloaded'});
   const welcomeMotion=await page.locator('#kritin-welcome .welcome-line').evaluate(el=>({
    lineDelay:getComputedStyle(el).animationDelay,
    lineDuration:getComputedStyle(el).animationDuration,
    brandDuration:getComputedStyle(el.parentElement).animationDuration
   }));
   assert.equal(welcomeMotion.lineDelay,'0s','underline starts immediately');
   assert.equal(welcomeMotion.lineDuration,'0.2s','underline uses the requested 200ms reveal');
   assert.equal(welcomeMotion.brandDuration,'0.42s','brand reveal no longer stretches the underline');
   await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
   await page.waitForFunction(()=>!document.getElementById('kritin-welcome'));
   await page.evaluate(()=>{window.__SUPABASE__={auth:{signInWithOAuth:async args=>{window.oauthArgs=args;return {error:{message:'Test refusal'}};}}};});
   assert.equal(await page.locator('[data-action=google-signin]').count(),1);
   await page.locator('[data-action=google-signin]').click();
   await page.waitForFunction(()=>document.getElementById('authErr').textContent.includes('not configured'));
   assert.equal(await page.evaluate(()=>window.oauthArgs),undefined,'disabled provider never redirects');
   assert(!(await page.locator('[data-action=google-signin]').isDisabled()));
   await page.locator('[data-tab=signup]').first().click();
   assert.equal(await page.locator('[data-action=google-signin]').count(),1,'signup also offers Google');
   assert.equal(await page.locator('#authForm').count(),1,'email signup remains');
   enabled=true;
   await page.locator('[data-action=google-signin]').click();
   await page.waitForFunction(()=>document.getElementById('authErr').textContent.includes('Could not start'));
   const args=await page.evaluate(()=>window.oauthArgs);
   assert.equal(args.provider,'google');assert.equal(args.options.redirectTo,new URL(base).origin+'/');assert.equal(args.options.skipBrowserRedirect,true);
   await page.evaluate(()=>{window.__SUPABASE__.auth.signInWithOAuth=async args=>({data:{url:'https://fynlvbtefmawisauzitu.supabase.co/auth/v1/authorize?provider=google'}});});
   await page.route('**/auth/v1/authorize?**',r=>r.fulfill({status:200,contentType:'text/html',body:'<h1>Mock Google handoff</h1>'}));
   await page.locator('[data-action=google-signin]').click();
   await page.waitForURL('**/auth/v1/authorize?**');
   // A cancelled callback gets a safe local message, never raw provider HTML.
   await page.goto(base+'#error=access_denied&error_description=%3Cscript%3Ebad%3C/script%3E',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
   assert(page.url().endsWith('#/login'));assert((await page.locator('#authErr').innerText()).includes('cancelled'));
   assert(!(await page.locator('#authErr').innerText()).includes('<script>'));
   assert.equal(await page.locator('#kritin-welcome').evaluate(el=>getComputedStyle(el).pointerEvents).catch(()=> 'none'),'none');
   await page.waitForFunction(()=>!document.getElementById('kritin-welcome'));
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px: signin/signup Google, disabled provider, error/retry, redirect parameters/handoff, safe cancellation, bounded welcome`);
   await page.close();
  }
  const page=await browser.newPage({reducedMotion:'reduce',serviceWorkers:'block'});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.getElementById('kritin-welcome'),{},{timeout:1000});
  await page.close();
  const broken=await browser.newPage({serviceWorkers:'block'});
  await broken.route('**/assets/js/boot.js*',r=>r.abort());
  await broken.goto(base,{waitUntil:'domcontentloaded'});
  assert.equal(await broken.locator('#kritin-welcome').count(),1,'fresh load plays welcome');
  await broken.waitForFunction(()=>!document.getElementById('kritin-welcome'),{},{timeout:3000});
  await broken.reload({waitUntil:'domcontentloaded'});
  assert.equal(await broken.locator('#kritin-welcome').count(),1,'reload replays welcome');
  await broken.waitForFunction(()=>!document.getElementById('kritin-welcome'),{},{timeout:3000});
  console.log('PASS reduced motion and welcome cleanup despite failed app boot');
  await broken.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
