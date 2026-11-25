const fs=require('fs'),path=require('path');
const {JSDOM,ResourceLoader}=require('jsdom');
class L extends ResourceLoader{ fetch(u){const x=new URL(u); if(!x.pathname.startsWith('/assets/'))return null;
  try{return Promise.resolve(fs.readFileSync(path.join(process.cwd(),decodeURIComponent(x.pathname))))}catch(_){return null}}}
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'http://127.0.0.1:8004/',runScripts:'dangerously',resources:new L(),pretendToBeVisual:true,
 beforeParse(w){w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};
  w.fetch=async()=>({ok:false,status:401,json:async()=>({}),text:async()=>''});}});
const p=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const w=dom.window,d=w.document;
 for(let i=0;i<240&&!(w.UP?.S&&d.body.classList.contains('up-ready'));i++)await p(50);
 const best=pr=>Promise.resolve(pr).catch(()=>{});
 await best(w.UP.loadClass12());
 for(const s of new Set(w.UP.classes.flatMap(c=>c.subjects))) await best(w.UP.loadPack(s));
 await best(w.UP.loadBoardPack('rajasthan'));
 const scopes=w.UP.classes.flatMap(c=>c.subjects.map(s=>[c.id,s,'cbse'])).concat([[10,'maths','rajasthan']]);
 const populated=[]; let bad=0;
 for(const [cls,subject,board] of scopes){
   const next=`#/pyq?cls=${cls}&sub=${subject}&board=${board}`;
   w.UP.S.board=board; if(w.location.hash!==next) w.location.hash=next;
   await p(200);
   const cards=[...d.querySelectorAll('.q-card.pyq')];
   const missingOrBoth=cards.filter(c=>!!c.querySelector('[data-pick]')===!!c.querySelector('[data-written-draft]'));
   if(missingOrBoth.length) { bad++; console.log('  bad scope', cls, subject, missingOrBoth.length); }
   if(cards.length) populated.push([cls,subject,board].join('/'));
 }
 console.log('scopes swept:', scopes.length, '| populated:', populated.length, '| scopes with bad cards:', bad);
 console.log('has 12/maths/cbse:', populated.includes('12/maths/cbse'), '| has 10/science/cbse:', populated.includes('10/science/cbse'));
 process.exit(0);})();
