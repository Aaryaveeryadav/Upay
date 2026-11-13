/* Kritin welcome: independent of app boot; decorative, non-blocking and bounded. */
(function(){
  'use strict';
  // Never retain or display provider-supplied descriptions or OAuth credentials.
  const query=new URLSearchParams(location.search);
  const hash=new URLSearchParams(location.hash.slice(1));
  if(query.has('error')||query.has('error_code')||hash.has('error')||hash.has('error_code')){
    window.__UPAY_OAUTH_ERROR__=true;
    ['error','error_code','error_description'].forEach(k=>query.delete(k));
    history.replaceState(null,'',location.pathname+(query.size?'?'+query.toString():'')+'#/login');
  }
  if(document.getElementById('kritin-welcome'))return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splash=document.createElement('div');
  splash.id='kritin-welcome'; splash.className='kritin-welcome';
  splash.setAttribute('aria-hidden','true'); splash.inert=true;
  const glow=document.createElement('div');glow.className='welcome-glow';
  const card=document.createElement('div');card.className='welcome-brand';
  const logo=document.createElement('img');logo.src='/assets/brand/kritin-logo.png';logo.alt='';logo.width=112;logo.height=99;
  const title=document.createElement('div');title.className='welcome-title';title.textContent='Kritin Upay';
  const line=document.createElement('div');line.className='welcome-line';
  const caption=document.createElement('p');caption.textContent='One question. Every way to learn.';
  card.append(logo,title,line,caption);splash.append(glow,card);document.body.append(splash);
  const remove=()=>splash.remove();
  logo.addEventListener('error',remove,{once:true});
  // No dependency on fonts, authentication, network responses or app readiness.
  setTimeout(()=>splash.classList.add('welcome-leaving'),reduced?80:1450);
  setTimeout(remove,reduced?160:1950);
  window.addEventListener('pagehide',remove,{once:true});
})();
