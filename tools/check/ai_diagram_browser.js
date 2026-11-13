/* Mocked AI rendering + actual screenshot pixels; does not verify AI accuracy. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {PNG} = require('pngjs');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM?{executablePath:process.env.UPAY_CHROMIUM}:{})});
  try {
    for (const width of [1170,390]) {
      const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      let diagram;
      await page.route('**/api/ai/solve',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        source:'ai',result:'Synthetic test only',summary:'Mock diagram regression',
        approaches:['First principles','Example','Comparison'].map(name=>({name,steps:[{t:'Mock step, not a solution.'}]})),diagram
      })}));
      await page.goto(process.env.UPAY_BASE||'http://127.0.0.1:8005/',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>window.UP && UP.S && document.body.classList.contains('up-ready'));
      diagram={type:'triangle',points:[{x:0,y:0,label:'A'},{x:4,y:0,label:'B'},{x:2,y:3,label:'C'}],
        segments:[{x1:'0',y1:'0',x2:'4',y2:'0'}],caption:'Synthetic regression fixture'};
      // This exact object-segment format previously reproduced the screenshot:
      // a huge blank panel with a tiny triangle collapsed into the top left.
      await page.evaluate(()=>{UP.S.subject='maths';UP.S.cls=10;location.hash='#/ask?q=Diagram%20regression%20triangle%20ABC';});
      const svg=page.locator('.ai-answer .figure-body svg');
      await svg.waitFor();
      const polygon=await svg.locator('polygon').getAttribute('points');
      assert.notEqual(polygon,'0,0 0,0 0,0');
      assert(!/NaN|Infinity/.test(await svg.innerHTML()));
      const png=PNG.sync.read(await svg.screenshot({path:`/tmp/ai-diagram-fixed-${width}.png`}));
      let blue=0,centralBlue=0;
      for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){
        const i=(y*png.width+x)*4,[r,g,b]=png.data.subarray(i,i+3);
        if(b>r+15 && g>r+8){blue++;if(x>png.width*.2 && x<png.width*.8 && y>png.height*.2 && y<png.height*.8)centralBlue++;}
      }
      assert(blue>png.width*png.height*.05 && centralBlue>100,'diagram must paint real coloured geometry, not only exist in the DOM');
      assert(await svg.evaluate(e=>e.getBoundingClientRect().width<=innerWidth));
      // PYQ and Ask use the same safe renderer, including flow diagrams.
      diagram={type:'triangle',points:[{x:0,y:0},{x:4,y:0},{x:2,y:3}],segments:[{x1:0,y1:0,x2:4}]};
      await page.evaluate(()=>{location.hash='#/ask?q=Invalid%20diagram%20regression';});
      await page.locator('.ai-diagram-unavailable').waitFor();
      assert.equal(await page.locator('.ai-answer .figure-body').count(),0);
      assert((await page.locator('.ai-answer').innerText()).includes('Comparison'));
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px: object-segment AI drawing paints visible pixels; malformed data gives a notice, not a blank panel; written methods survive`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
