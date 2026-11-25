const fs=require('fs'),path=require('path');
const {JSDOM,ResourceLoader}=require('jsdom');
class L extends ResourceLoader{ fetch(u){const x=new URL(u); if(!x.pathname.startsWith('/assets/'))return null;
  try{return Promise.resolve(fs.readFileSync(path.join(process.cwd(),decodeURIComponent(x.pathname))))}catch(_){return null}}}
const p=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'http://127.0.0.1:8004/',runScripts:'dangerously',resources:new L(),pretendToBeVisual:true,
  beforeParse(w){w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};
   w.fetch=async()=>({ok:false,status:503,json:async()=>({error:'offline'}),text:async()=>'{}'});
   w.localStorage.setItem('upay.cls','12');
   w.localStorage.setItem('upay.subject',JSON.stringify('economics'));
   w.localStorage.setItem('upay.recent',JSON.stringify([{q:'Old personal question',subject:'economics',cls:12}]));
  }});
 const w=dom.window,d=w.document;
 for(let i=0;i<240&&!(w.UP?.S&&d.body.classList.contains('up-ready'));i++)await p(50);
 console.log('ready. subject:', w.UP.S.subject, '| recent kept:', (JSON.parse(w.localStorage.getItem('upay.recent'))||[])[0]?.q);
 const opts=[...d.querySelectorAll('select[data-action="set"][data-key="subject"]')][0];
 console.log('subject options:', opts?[...opts.options].map(o=>o.value).join(','):'NO SELECT');
 console.log('catalogue 12 english:', w.UP.catalogue(12,'english').length);
 console.log('catalogue 12 applied-maths:', w.UP.catalogue(12,'applied-maths').length);
 w.location.hash='#/syllabus?cls=12&sub=economics'; await p(600);
 console.log('after retired deep link, subject:', w.UP.S.subject);
 w.location.hash='#/syllabus?cls=12&sub=english'; await p(900);
 console.log('after english, subject:', w.UP.S.subject, '| packs.class12:', !!w.UP.loaded.packs.class12);
 w.location.hash='#/syllabus?cls=12&sub=applied-maths'; await p(900);
 console.log('after applied-maths, subject:', w.UP.S.subject);
 process.exit(0);})();
