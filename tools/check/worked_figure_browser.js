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
      let reply = null, aiCalls = 0, partsMode = false, partCalls = [];
      await page.route('**/api/ai/solve', route => {
        aiCalls++;
        let body = {};
        try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
        /* The split-answer case: the whole-answer call fails, then the app asks
           for the answer and one method at a time. */
        if (partsMode) {
          partCalls.push(body.part || 'full');
          if (body.part === 'core') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
              source: 'ai', part: 'core', complete: false, result: 'Current = 0.5 A',
              summary: 'Mock split summary.', check: 'Mock check',
              approaches: [{ name: 'Formula', steps: [{ t: 'Mock working for the split test.' }] }]
            }) });
          }
          if (body.part === 'approach') {
            const name = ['Substitution', 'Verification', 'Reasoning'][(body.index || 2) - 2] || 'Another method';
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
              source: 'ai', part: 'approach', index: body.index, approaches: [{ name, steps: [{ t: 'Mock working for the split test.' }] }]
            }) });
          }
          return route.fulfill({ status: 504, contentType: 'application/json', body: JSON.stringify({ error: 'provider timeout', code: 'provider_timeout' }) });
        }
        /* A request before the test arms its reply is answered honestly as a
           failure; the figure test must never depend on an accidental cache. */
        if (!reply) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) });
      });
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.UP && UP.S && document.body.classList.contains('up-ready'));
      /* Named waits: a bare 30 s timeout says nothing about which case hung,
         and this check is the only place some of these paths are exercised. */
      const waitFor = (label, fn, arg) => page.waitForFunction(fn, arg, { timeout: 20000 })
        .catch(async e => {
          const state = await page.evaluate(() => ({
            hash: location.hash.slice(0, 60),
            subject: window.UP && UP.S ? UP.S.subject : null,
            answerKind: window.UP && UP.S && UP.S.answer ? UP.S.answer.kind : null,
            aiState: window.UP && UP.S ? UP.S.aiState : null,
            mountChars: (document.getElementById('answerMount') || {}).textContent?.length || 0
          })).catch(() => null);
          throw new Error(label + ' timed out at ' + width + 'px: ' + JSON.stringify(state) + ' — ' + e.message);
        });

      const arm = (question, answer, diagram) => {
        reply = {
          source: 'ai', question, result: answer, summary: 'Mock summary for the figure regression.',
          approaches: four(), diagram: diagram === undefined ? null : diagram, check: 'Mock check'
        };
      };
      const ask = async (question, subject, answer, diagram) => {
        arm(question, answer, diagram);
        await page.evaluate(([q, s]) => { UP.S.subject = s; location.hash = '#/ask?q=' + encodeURIComponent(q); }, [question, subject]);
      };

      /* 1. The tower: height and both distances labelled from the question. */
      await ask(TOWER, 'maths', 'Height = 10√3 m ≈ 17.32 m; original distance = 30 m; nearer distance = 10 m.', null);
      await waitFor('tower worked figure', () => {
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
      await waitFor('ladder diagram', () => /Mock ladder triangle/.test(document.body.textContent));
      assert.equal(await page.locator('.ai-answer .worked-figure').count(), 0, 'no worked figure for a ladder');
      assert(await page.locator('.ai-answer .figure-body svg polygon').count() >= 1, 'the ordinary AI triangle still renders');

      /* 5. A matrix equation is values and one operation. The app solves it in
            exact fractions and draws the matrices it actually used, so the
            AI's misreading of the grid cannot become the picture. */
      /* Exactly what the student pasted in the app: two blocks and one line of
         instruction, with no word "matrix" anywhere. This used to miss the
         engine and time out at the provider. */
      const MATRIX_Q = 'A = [[2, 1, -1], [1, 2, 1], [3, -1, 2]]\nB = [[4, 1], [7, 0], [8, 5]]\n\nFind X such that AX = B.';
      const beforeMatrix = aiCalls;
      await ask(MATRIX_Q, 'maths', 'X = [[-1/5, 12/5, 6/5], [-1/5, 8/5, -7/5]]', null);
      await waitFor('matrix worked figure', () => {
        const figure = document.querySelector('.ai-answer .worked-figure');
        return figure && /37\/18/.test(figure.textContent);
      });
      /* A local answer must not have asked the provider at all: that is the
         whole point of solving it here. */
      assert.equal(aiCalls, beforeMatrix, 'a solved matrix question is answered locally, not by the provider');
      const matrixFigure = page.locator('.ai-answer .worked-figure');
      const matrixText = await matrixFigure.innerText();
      for (const token of ['37/18', '10/9', '-7/9', '|A| = 18', '3×3']) {
        assert(matrixText.includes(token), `matrix figure must show "${token}", got: ${matrixText.replace(/\s+/g, ' ')}`);
      }
      const matrixSvg = matrixFigure.locator('.figure-body svg');
      assert(await matrixSvg.count() === 1);
      const matrixSvgText = await matrixSvg.innerHTML();
      assert(!/NaN|undefined/.test(matrixSvgText), 'no broken numbers in the matrix drawing');
      assert((matrixSvgText.match(/<path/g) || []).length >= 6, 'each matrix needs its bracket strokes');
      assert.equal(await page.locator('.ai-answer .worked-figure').count(), 1, 'exactly one matrix figure');

      /* The answer itself is a drawn grid, not a string with brackets, and the
         local engine's answer wins over the mocked (wrong) AI one. */
      const answerText = await page.locator('.ai-answer .callout.why').innerText();
      assert(/37\/18/.test(answerText), 'the answer line must carry the computed X: ' + answerText);
      assert(!/-1\/5/.test(answerText), 'the wrong AI answer must not be shown as the answer');
      assert(await page.locator('.ai-answer .matrix-grid').count() >= 1, 'the answer must be drawn as a matrix');
      assert(await page.locator('.ai-answer .matrix-grid .mk-row').count() >= 3, 'three rows of X drawn');
      assert(/Solved by exact calculation|सटीक गणना/.test(await page.locator('.ai-answer .answer-head').innerText()),
        'the badge must say the answer was computed, not generated');
      assert.equal(await page.locator('.worked-figure-mismatch').count(), 0,
        'no mismatch warning: there is no model answer to disagree with');

      /* 5b. Products and determinants are answered locally too, and a
             determinant is a number rather than a drawn matrix. */
      const DET_Q = 'Find the determinant of [[1, 2], [3, 4]].';
      const beforeDet = aiCalls;
      await ask(DET_Q, 'maths', '|A| = -6', null);
      await page.waitForFunction(() => /\|A\|\s*=\s*-?2|−2/.test(document.body.innerText) &&
        !!document.querySelector('.ai-answer .worked-figure'));
      assert.equal(aiCalls, beforeDet, 'a determinant is answered locally too');
      const detText = await page.locator('.ai-answer').innerText();
      assert(/-2|−2/.test(detText), 'the determinant value is shown: ' + detText.slice(0, 120));
      assert(!/-6/.test(detText), 'the wrong AI determinant is not shown');

      /* 5c. The same numbers with the grid lost (a PDF copy, a flattened scan):
             the rows are rebuilt into [[…], […]] and the answer is still exact. */
      const FLAT = 'Find X such that A X = B\n2 1 -1 4 1\n1 2 1 7 0\n3 -1 2 8 5';
      const beforeFlat = aiCalls;
      await ask(FLAT, 'maths', 'X = [[0, 0], [0, 0], [0, 0]]', null);
      await page.waitForFunction(() => {
        const fig = document.querySelector('.ai-answer .worked-figure');
        return fig && /37\/18/.test(fig.textContent);
      });
      assert.equal(aiCalls, beforeFlat, 'a flat paste is rebuilt and solved locally');
      const flatText = await page.locator('.ai-answer').innerText();
      assert(/\[\[2, 1, -1\], \[1, 2, 1\], \[3, -1, 2\]\]/.test(flatText),
        'the question is shown in the readable [[row], [row]] form: ' + flatText.slice(0, 200));
      assert(/37\/18/.test(flatText), 'and answered with the exact X');

      /* 6. A paste that lost the grid gets no invented values: the student is
            asked for the matrices, and their values are then solved and drawn. */
      const MANGLED = 'Hard Matrix Question: 2 1 -1 41 : 2 1 | X = : 0]. 3 -1 2 8 5';
      await page.evaluate((q) => { UP.S.subject = 'maths'; location.hash = '#/ask?q=' + encodeURIComponent(q); }, MANGLED);
      await page.locator('.matrix-repair textarea').waitFor();
      assert.equal(await page.locator('.ai-answer .worked-figure').count(), 0, 'nothing is drawn from unreadable text');
      assert.equal(await page.locator('.ai-answer .figure-body svg').count(), 0, 'and no generic figure either');
      await page.fill('.matrix-repair textarea',
        'A = [[2,1,-1],[1,2,1],[3,-1,2]]\nB = [[4,1],[7,0],[8,5]]');
      const beforeRepair = aiCalls;
      await page.locator('[data-action="matrix-repair-solve"]').click();
      await page.waitForFunction(() => {
        const figure = document.querySelector('.ai-answer .worked-figure');
        return figure && /37\/18/.test(figure.textContent);
      });
      assert.equal(aiCalls, beforeRepair, 'the confirmed matrices are solved locally');
      assert(/37\/18/.test(await page.locator('.ai-answer .worked-figure').innerText()),
        'the confirmed matrices are solved and drawn');
      assert(await page.locator('.ai-answer .matrix-grid').count() >= 1,
        'and the answer is a drawn matrix after the repair too');

      /* 7. A question too big for one request: the whole-answer call fails, and
            the answer still arrives — in parts, with the banner saying so. */
      partsMode = true; partCalls = [];
      const LONG = 'A long multi-part physics question about a circuit with several resistors, a battery and ' +
        'two switches. Find the current in each branch, the potential difference across each resistor, ' +
        'the power dissipated, and explain what changes when the second switch is opened.';
      await page.evaluate((q) => { UP.S.subject = 'physics'; location.hash = '#/ask?q=' + encodeURIComponent(q); }, LONG);
      await page.waitForFunction(() => {
        const answer = document.querySelector('.ai-answer');
        return answer && /Current = 0\.5 A/.test(answer.textContent);
      }, { timeout: 30000 });
      await page.waitForFunction(() => document.querySelectorAll('.ai-answer .approach').length >= 4,
        { timeout: 30000 });
      assert.deepEqual(partCalls, ['full', 'core', 'approach', 'approach', 'approach'],
        'one whole-answer attempt, then the answer and one method per request: ' + partCalls.join(','));
      const splitText = await page.locator('.ai-answer').innerText();
      assert(/0\.5 A/.test(splitText), 'the answer arrived despite the failed single call');
      const partsProbe = await page.evaluate(() => {
        const a = UP.S.aiAnswer;
        return JSON.stringify({
          keys: a ? Object.keys(a) : null,
          parts: a ? a._parts : null,
          count: a && a.approaches ? a.approaches.length : null,
          notes: document.querySelectorAll('.parts-note').length,
          text: a ? String(a._partsNote || '') : ''
        });
      });
      assert.equal(await page.locator('.ai-answer .parts-note').count(), 1,
        'the card carries the split-answer banner: ' + partsProbe);
      assert(!/too long/i.test(splitText), 'no "took too long" dead end');
      assert.equal(await page.locator('.ai-answer .approach').count(), 4, 'all four methods were assembled');
      assert.equal(await page.locator('[data-action="more-approaches"]').count(), 0,
        'a complete split answer offers no retry button');
      partsMode = false;

      

      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: tower figure 10√3/30/10 m, mismatch warning, verified 6 Ω network replaces a wrong AI circuit, ladder refused, matrix X = 37/18 drawn from exact fractions with a mismatch warning, mangled matrix paste refused and repaired, no invented values`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
