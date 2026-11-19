'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const UP={},ctx={window:{UP},UP};for(const name of ['data-extra','data/hindi12','data/hindi12-core-text','data/hindi12-elective-text'])vm.runInNewContext(fs.readFileSync(`assets/js/${name}.js`,'utf8'),ctx);
let count=0; const ids=new Set(),route=require('../../assets/js/task-routing');
for(const [subject,n] of [['hindi-core',18],['hindi-elective',20]]){
 const rows=UP.catalogue(12,subject);assert.equal(rows.length,n);assert.equal(UP.catalogue(10,subject).length,0);
 for(const c of rows){assert(!ids.has(c.id));ids.add(c.id);assert.equal(c.board,'cbse');assert.equal(c.cls,12);assert(c.exercisePage>=1&&c.exercisePage<=c.pages);assert(c.question);assert.equal(route.resolve(c.question,subject).subject,subject);assert(!('marks' in c || 'answer' in c));assert.equal(UP.hindi12Text[c.id].length,c.pages);}
}
for(const [id,pages] of Object.entries(UP.hindi12Text)){
 assert(ids.has(id)||id==='lhvt1lp');for(let i=1;i<=pages.length;i++){const buf=fs.readFileSync(`assets/hindi/class12/${id}/${i}.webp`);assert.equal(buf.toString('ascii',8,12),'WEBP');count++;}
}
assert.equal(ids.size,38);assert.equal(count,354);assert.equal(UP.hindi12Text.lhvt1lp.length,2);console.log('PASS Hindi sources: 38 chapters, 38 exercise links and 354 original page images, scoped to Core/Elective');
