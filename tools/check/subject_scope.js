'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const removed=['accountancy','computerized-accounting','economics','business-studies'];
const ctx={window:{UP:{chapters:[]}},console}; ctx.UP=ctx.window.UP;
vm.runInNewContext(fs.readFileSync('assets/js/data-extra.js','utf8'),ctx);
const list=Array.from(ctx.UP.classes.find(c=>c.id===12).subjects);
assert.deepEqual(list,['maths','applied-maths','physics','chemistry','biology','english','hindi-core','hindi-elective']);
assert(Array.from(ctx.UP.classes.find(c=>c.id===10).subjects).includes('social'));
assert(fs.readFileSync('assets/js/data/social-chapters.js','utf8').includes('Economics'),'Class 10 Social Science remains intact');
for(const s of removed){ assert(!ctx.UP.subjects[s]);assert(!ctx.UP.catalogue(12,s).length); }
const boot=fs.readFileSync('assets/js/boot.js','utf8');
for(const path of ['assets/books/economics','assets/papers/economics','assets/papers/accountancy','assets/answers/accountancy.json','assets/answers/computerized-accounting.json','assets/answers/economics.json','assets/js/data/accountancy-chapters.js','assets/js/data/accountancy-original-papers.js','assets/js/data/chapters12-accountancy.js','assets/js/data/pyq-accountancy-2023-2026-extracted.js','assets/js/data/economics12.js','assets/js/data/economics-sources.js','assets/js/data/business-studies12.js']) {
 assert(!fs.existsSync(path),path);assert(!boot.includes(path),path);
}
const load=(path,variable)=>{const c={window:{UP:{}}};c.UP=c.window.UP;vm.runInNewContext(fs.readFileSync(path,'utf8'),c);return c.UP[variable];};
for(const [file,name] of [['chapter-summary.js','chapterSummary'],['chapter-fulltext.js','chapterFullText']]){
 const data=load('assets/js/data/'+file,name), rows=Object.values(data);
 assert(rows.some(x=>x.book==='flamingo'));assert(rows.some(x=>x.book==='vistas'));assert(rows.some(x=>x.book==='kaleidoscope'));
 assert(!rows.some(x=>x.book==='macro'||x.book==='micro'));
}
const papers=load('assets/js/data/class12-original-test-papers.js','class12OriginalTestPapers');
assert(papers.some(p=>p.subject==='english'));assert(papers.some(p=>p.subject==='biology'));assert(!papers.some(p=>removed.includes(p.subject)));
const notes=JSON.parse(fs.readFileSync('assets/notes/outlines.json'));assert(!notes.business_studies);for(const s of ['chemistry','physics','biology'])assert(notes[s].length);
assert(!fs.readFileSync('assets/notes/index.html','utf8').includes('id="business"'));
assert(fs.existsSync('assets/js/data/chapters12-applied-maths.js'));assert(fs.existsSync('assets/js/data/english12.js'));
console.log('PASS retired subjects: selector/catalogue, static files and shared sources removed; applied maths, English and science retained');
