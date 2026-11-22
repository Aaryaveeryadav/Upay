'use strict';
// Run after build:web. Execute the built React bundle with a public data fixture;
// no browser credentials, server or provider are required.
const assert=require('node:assert/strict');
const fs=require('node:fs'); const path=require('node:path'); const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'assets/react-study/index.html'),'utf8');
const match=html.match(/src="(\/assets\/react-study\/assets\/[^" ]+\.js)"/);
assert(match,'built entry is present');
class Fixtures extends ResourceLoader {
  fetch(url){ if(url.endsWith('/assets/js/data/english10-supplied-practice.js')) return Promise.resolve(Buffer.from(fs.readFileSync(path.join(root,'assets/js/data/english10-supplied-practice.js')))); return null; }
}
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://app.example.test/assets/react-study/index.html',runScripts:'dangerously',resources:new Fixtures(),pretendToBeVisual:true,virtualConsole:vc});
dom.window.eval(fs.readFileSync(path.join(root,match[1].slice(1)),'utf8'));
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  const {document}=dom.window;
  assert.equal(document.querySelectorAll('.question-card').length,33);
  assert(document.body.textContent.includes('not the full English bank'));
  const select=document.querySelectorAll('select')[0];select.value='2023-24';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,30));assert.equal(document.querySelectorAll('.question-card').length,21);
  const input=document.querySelector('input[type=search]');
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'Lencho');
  input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,30));
  assert.equal(document.querySelectorAll('.question-card').length,1);
  const card=document.querySelector('.question-card');assert(card.textContent.includes('A Letter to God'));assert(card.querySelector('a[href^="/assets/papers/"]'));
  assert(card.querySelector('a.action-primary').getAttribute('href').startsWith('/#/ask?q='));
  assert.deepEqual(errors,[]);dom.window.close();console.log('PASS React preview: data, search, paper filter, source and Ask links');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
