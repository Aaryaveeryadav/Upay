/* Answer-labelled figures in the Ask view — mocked provider, real rendering.

   Two questions the student asked for are answered by the mocked AI with
   numbers in the text. The app must draw its OWN figure, computed from the
   question's values, and label the answer on it: a tower with 10√3 m, 30 m
   and 10 m, and the 6 Ω / 3 Ω / 4 Ω / 12 V network with 2 A, 2/3 A and
   4/3 A. A wrong or unsupported AI diagram must not win, and a question the
   parser cannot settle (a ladder) must get no worked figure at all.

   The provider is mocked: this proves the drawing contract, not AI accuracy. */
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = process.env.UPAY_BASE || 'http://127.0.0.1:8004';
const TOWER = 'A tower stands on level ground. From a point P, the angle of elevation to its top is 30°. ' +
  'After walking 20 m toward the tower to point Q, the angle becomes 60°. ' +
  'Find the tower’s height and the original distance from P to its base.';
const TOWER_RETRY = TOWER + ' Also state both answers clearly.';
const LADDER = 'A ladder 10 m long leans against a wall and the angle of elevation of its top is 60°. Find the height of the wall.';
const CIRCUIT = 'A 6 Ω resistor and a 3 Ω resistor are connected in parallel, and that combination is connected ' +
  'in series with a 4 Ω resistor to a 12 V battery. Find the total resistance, the current supplied by ' +
  'the battery, and the current through each parallel resistor.';

const four = () => ['Formula', 'Substitution', 'Verification', 'Reasoning'].map(name => ({
  name, steps: [{ t: 'Mock working for the figure test only.' }]
}));

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.UPAY_CHROMIUM ? { executablePath: process.env.UPAY_CHROMIUM } : {}) });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      let reply = null;
      await page.route('**/api/ai/solve', route => {
        /* A request before the test arms its reply is answered honestly as a
           failure; the figure test must never depend on an accidental cache. */
        if (!reply) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) });
      });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));

      const ask = async (question, subject, answer, diagram) => {
        reply = {
          source: 'ai', question, result: answer, summary: 'Mock summary for the figure regression.',
          approaches: four(), diagram: diagram === undefined ? null : diagram, check: 'Mock check'
        };
        await page.evaluate(([q, s]) => { UP.S.subject = s; location.hash = '#/ask?q=' + encodeURIComponent(q); }, [question, subject]);
      };

      /* 1. The tower: height and both distances labelled from the question. */
      await ask(TOWER, 'maths', 'Height = 10√3 m ≈ 17.32 m; original distance = 30 m; nearer distance = 10 m.', null);
      await page.waitForFunction(() => {
        const figure = document.querySelector('.ai-answer .worked-figure');
        return figure && /17\.32/.test(figure.textContent);
      });
      const towerFigure = page.locator('.ai-answer .worked-figure');
      assert.equal(await page.locator('.ai-answer .worked-figure').count(), 1, 'exactly one worked figure');
      const towerText = await towerFigure.innerText();
      for (const token of ['10√3 m', '17.32', '30 m', '10 m', '20 m walked', 'Calculated from the given values']) {
        assert(towerText.includes(token), `tower figure must show "${token}", got: ${towerText.replace(/\s+/g, ' ')}`);
      }
      const towerSvg = towerFigure.locator('.figure-body svg');
      assert(await towerSvg.count() === 1);
      assert(!/NaN|undefined/.test(await towerSvg.innerHTML()), 'no broken numbers in the drawing');
      assert(await page.locator('.worked-figure-mismatch').count() === 0, 'a matching answer raises no warning');
      const box = await towerSvg.boundingBox();
      assert(box && box.width > 150 && box.width <= width + 1, 'the figure must be visible and fit the viewport');
      assert(await page.locator('.ai-answer .figure-card').count() === 1, 'no duplicate generic figure');

      /* 2. An answer that names a different height is called out, and the
            drawing keeps the calculated value rather than the AI's. */
      await ask(TOWER_RETRY, 'maths', 'Height = 20 m; distance = 20 m.', null);
      await page.locator('.worked-figure-mismatch').waitFor();
      const retryText = await page.locator('.ai-answer .worked-figure').innerText();
      assert(retryText.includes('17.32') || retryText.includes('10√3'),
        'the figure must keep the calculated height');
      assert.equal(await page.locator('.worked-figure-mismatch').count(), 1);

      /* 3. The circuit: a wrong AI circuit diagram must not replace the
            verified network, and no resistance may be invented. */
      await ask(CIRCUIT, 'science', 'Total resistance = 6 Ω; current = 2 A; the 6 Ω branch takes 0.67 A and the 3 Ω branch 1.33 A.',
        { type: 'circuit', topology: 'series', resistors: [{ label: 'R₁', value: 1 }, { label: 'R₂', value: 2 }], caption: 'Mock wrong diagram' });
      await page.waitForFunction(() => {
        const figure = document.querySelector('.ai-answer .worked-figure');
        return figure && /12 V/.test(figure.textContent) && /R_eq = 6 Ω/.test(figure.textContent);
      });
      const circuitFigure = page.locator('.ai-answer .worked-figure');
      const circuitText = await circuitFigure.innerText();
      for (const token of ['6 Ω', '3 Ω', '4 Ω', '12 V', 'R_eq = 6 Ω', 'I = 2 A']) {
        assert(circuitText.includes(token), `circuit figure must show "${token}", got: ${circuitText.replace(/\s+/g, ' ')}`);
      }
      assert(!circuitText.includes('R₁ = 1 Ω') && !circuitText.includes('1 Ω'), 'the AI’s invented resistance must not appear');
      assert(await page.locator('.ai-answer .worked-figure svg polyline').count() >= 2, 'resistor symbols must be drawn');

      /* 4. A ladder is a different triangle: no worked figure, and the
            ordinary AI diagram path still works. */
      await ask(LADDER, 'maths', 'The height of the wall is 5√3 m ≈ 8.66 m.', {
        type: 'triangle', points: [{ x: 0, y: 0, label: 'A' }, { x: 3, y: 0, label: 'B' }, { x: 0, y: 4, label: 'C' }],
        segments: [[0, 0, 3, 0]], caption: 'Mock ladder triangle'
      });
      await page.waitForFunction(() => /Mock ladder triangle/.test(document.body.textContent));
      assert.equal(await page.locator('.ai-answer .worked-figure').count(), 0, 'no worked figure for a ladder');
      assert(await page.locator('.ai-answer .figure-body svg polygon').count() >= 1, 'the ordinary AI triangle still renders');

      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: tower figure 10√3/30/10 m, mismatch warning, verified 6 Ω network replaces a wrong AI circuit, ladder refused, no invented values`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
