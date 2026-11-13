'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
 const base=process.env.UPAY_BASE||'http://127.0.0.1:8005/';
 try{for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('https://fynlvbtefmawisauzitu.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({external:{google:false}})}));
  let localAttempts=0;
  await page.route('**/api/auth/login',r=>{localAttempts++;return r.fulfill({status:401,contentType:'application/json',body:'{"error":"Invalid credentials"}'});});
  await page.goto(base+'#/login?mode=signup',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.UP&&UP.S&&document.body.classList.contains('up-ready'));
  await page.evaluate(()=>{
   window.signupCalls=0;window.__supabaseOnline=true;
   window.__SUPABASE__={auth:{signUp:async()=>{window.signupCalls++;return new Promise(resolve=>{window.finishSignup=resolve;});}}};
  });
  await page.locator('#authForm [name=name]').fill('Test Student');
  await page.locator('#authForm [name=email]').fill('student@example.invalid');
  await page.locator('#authForm [name=password]').fill('Test-only-password-123');
  await page.evaluate(()=>{const form=document.getElementById('authForm');form.requestSubmit();form.requestSubmit();form.requestSubmit();});
  await page.waitForFunction(()=>window.signupCalls===1);
  assert(await page.locator('#authForm button[type=submit]').isDisabled());
  assert.equal(await page.locator('#authForm button[type=submit]').getAttribute('aria-busy'),'true');
  await page.evaluate(()=>window.finishSignup({error:{code:'over_email_send_rate_limit',status:429,message:'email rate limit exceeded'}}));
  await page.waitForFunction(()=>document.getElementById('authErr').textContent.includes('sending limit'));
  assert(await page.locator('#authErr').isVisible());
  assert.equal(await page.evaluate(()=>window.signupCalls),1);
  assert(page.url().endsWith('#/login?mode=signup'));
  assert.equal(await page.locator('#authForm [name=email]').inputValue(),'student@example.invalid');
  assert.equal(await page.locator('#authForm [name=name]').inputValue(),'Test Student');
  assert(!(await page.locator('#authForm button[type=submit]').isDisabled()));
  assert.equal(await page.locator('#authOk').innerText(),'');
  assert.equal(await page.evaluate(()=>UP.S.user),null);
  // Cloud errors and email credentials must never fall through to local auth.
  for(const error of [
   {code:'over_request_rate_limit',status:429,message:'Service is busy'},
   {code:'email_not_confirmed',status:400,message:'Email not confirmed'},
   {code:'invalid_credentials',status:400,message:'Invalid login credentials'}
  ]){
   const result=await page.evaluate(async error=>{window.__SUPABASE__.auth.signInWithPassword=async()=>({error});return await UP.sbSignIn('student@example.invalid','test-only');},error);
   assert.equal(result.error.code,error.code);
  }
  assert.equal(localAttempts,0,'cloud email/password was not sent to local auth');
  const thrownCloudError=await page.evaluate(async()=>{window.__SUPABASE__.auth.signInWithPassword=async()=>{throw new Error('network error');};return await UP.sbSignIn('student@example.invalid','test-only');});
  assert.match(thrownCloudError.error.message,/email sign-in service/i);
  assert.equal(localAttempts,0,'a network exception did not trigger a local credential retry');
  const offlineEmail=await page.evaluate(async()=>{window.__supabaseOnline=false;return await UP.sbSignIn('student@example.invalid','test-only');});
  assert.match(offlineEmail.error.message,/internet|connection/i);
  assert.equal(localAttempts,0,'offline email/password was not sent to local auth');
  window.__supabaseOnline=true;
  const localUser=await page.evaluate(async()=>UP.sbSignIn('admin','local-only-test'));
  assert.equal(localUser.error.message,'Invalid credentials');
  assert.equal(localAttempts,1,'local username auth remains available for standalone installs');
  await page.evaluate(()=>{window.__SUPABASE__.auth.signUp=async()=>({error:{status:429,code:'over_request_rate_limit',message:'Service is busy'}});});
  await page.locator('#authForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('authErr').textContent.includes('too many requests'));
  // Switching from Google feedback to email feedback cannot leave errors hidden.
  await page.locator('[data-action=google-signin]').click();
  await page.waitForFunction(()=>document.getElementById('authErr').textContent.includes('not configured'));
  await page.locator('#authForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('authErr').textContent.includes('too many requests'));
  assert(await page.locator('#authErr').isVisible());
  await page.evaluate(()=>{window.__SUPABASE__.auth.signUp=async()=>({data:{user:{identities:[{provider:'email'}]},session:null},error:null});});
  await page.locator('#authForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('authOk').textContent.includes('Check your email'));
  await page.waitForTimeout(1600);
  assert(page.url().endsWith('#/login?mode=signup'),'confirmation instructions remain until the student leaves');
  assert(await page.locator('#authOk').isVisible());
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: single in-flight signup, actionable email quota feedback, preserved input/no false success, no email credential fallback, generic throttle and persistent confirmation instructions`);
  await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
