const fs=require('fs'),path=require('path');
const {JSDOM,ResourceLoader}=require('jsdom');
const ROOT='/home/user/Upay';
class L extends ResourceLoader{ fetch(u){const x=new URL(u); if(!x.pathname.startsWith('/assets/'))return null;
 try{return Promise.resolve(fs.readFileSync(path.join(ROOT,decodeURIComponent(x.pathname))))}catch(_){return null}}}
const dom=new JSDOM(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),{url:'http://127.0.0.1:8004/',runScripts:'dangerously',resources:new L(),pretendToBeVisual:true,
 beforeParse(w){w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};
  w.fetch=async()=>({ok:true,status:200,json:async()=>({ok:true,enabled:true,ready:true,model:'x',index:{available:true,chunks:1435}}),text:async()=>''});}});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const w=dom.window,d=w.document;
 for(let i=0;i<200&&!(w.UP?.S&&d.body.classList.contains('up-ready'));i++)await pause(50);
 console.log('booted',!!w.UP?.S,'hash',w.location.hash);
 w.location.hash='#/tutor?ch=11';
 await pause(600);
 console.log('hash now:',w.location.hash,'pathname:',w.location.pathname);
 console.log('main html len:',d.getElementById('main')?.innerHTML.length);
 console.log('has data-app:',!!d.querySelector('a[data-app]'),'has tutor form:',!!d.querySelector('form[data-form="science-tutor"]'));
 console.log('main head:',(d.getElementById('main')?.innerHTML||'').slice(0,300));
})();
