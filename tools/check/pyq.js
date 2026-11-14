const { chromium } = require('playwright');
const questionQuality = require('../../assets/js/question-quality.js');
const BASE = process.env.UPAY_BASE || 'http://127.0.0.1:8090';

// Mathematical signs are meaningful option content; the quality gate must not
// collapse 1 and −1 or x + y and x − y into false duplicates. Five clean
// choices are also valid data, rather than being rejected only by their count.
if (questionQuality.optionIssue(['1', '0', '−1', '2'], 'maths'))
  throw new Error('quality gate falsely rejects positive and negative numeric choices');
if (questionQuality.optionIssue(['x + y', 'x − y', 'x × y', 'x ÷ y'], 'maths'))
  throw new Error('quality gate falsely rejects distinct algebraic choices');
if (questionQuality.optionIssue(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'], 'maths'))
  throw new Error('quality gate must not reject a clean five-choice set by count alone');
if (!questionQuality.optionIssue(['A', 'A', 'B', 'C'], 'maths'))
  throw new Error('quality gate should still catch exact duplicate options');
const malformedHindiChoices = [
  'कथन | और पा सही हैं', 'कथन [ और [५ सही हैं', 'कथन] और 9 सही हैं', 'कथन ॥ और पा सही हैं',
];
if (questionQuality.optionIssue(malformedHindiChoices, 'hindi') !== 'ocr-damaged-option')
  throw new Error('Hindi OCR punctuation must not make corrupted options look clean');
if (questionQuality.optionIssue(['विकल्प [१]', 'विकल्प [२]', 'विकल्प [३]', 'विकल्प [४]'], 'hindi'))
  throw new Error('balanced Hindi square-bracket notation should remain valid');
if (questionQuality.inspect({
  subject: 'hindi', kind: 'mcq', hi: 'प्रश्न [. पाठ से आधारित है', opts: malformedHindiChoices,
}, 'hindi') !== 'ocr-damaged')
  throw new Error('Hindi source question with OCR punctuation should remain withheld');

const englishSource = en => ({
  subject: 'english', y: 2026, set: 1, src: 'CBSE source paper', en, opts: null,
});
const inspectEnglishSource = en => questionQuality.inspect(englishSource(en), 'english');
if (inspectEnglishSource('start car pooling') !== 'incomplete-source-fragment')
  throw new Error('short English source fragment without options should be withheld');
if (inspectEnglishSource('add electric buses') !== 'incomplete-source-fragment')
  throw new Error('second short English source fragment without options should be withheld');
if (inspectEnglishSource('What is the message?'))
  throw new Error('question-shaped English source text should remain eligible');
if (inspectEnglishSource('Write a letter to the editor'))
  throw new Error('a legitimate English writing task should remain eligible');
if (questionQuality.inspect({en: 'start car pooling', y: 2026, set: 1, src: 'CBSE source paper'}, 'science'))
  throw new Error('English fragment screening must not affect other subjects');
if (questionQuality.inspect({en: 'start car pooling', subject: 'english'}, 'english'))
  throw new Error('English fragment screening must require source-paper metadata');
for (const prompt of [
  'Explain this', 'Describe this', 'Write this', 'State this', 'Find this', 'Calculate this',
  'Discuss this', 'Identify this', 'Which option', 'What happened', 'Why this', 'How this',
  'Name this', 'Mention this', 'Give this', 'Compare this', 'Justify this', 'Select this',
  'Choose this', 'Complete this', 'Answer this', 'Attempt this', 'Read this', 'Fill this',
  'Draw this', 'Label this', 'Match this', 'Translate this', 'Construct this',
  'Summarize this', 'Summarise this', 'Analyse this', 'Analyze this',
]) {
  if (inspectEnglishSource(prompt))
    throw new Error(`English task prompt should remain eligible: ${prompt}`);
}

(async () => {
  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.UPAY_CHROMIUM) launchOptions.executablePath = process.env.UPAY_CHROMIUM;
  const b = await chromium.launch(launchOptions);
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR ' + e));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await pg.route('https://fonts.googleapis.com/**', r => r.fulfill({status:200,contentType:'text/css',body:''}));
  await pg.route('https://**/auth/v1/health', r => r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await pg.route('**/api/ai/solve', r => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:'AI is outside this regression check.',approaches:[]})}));
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(900);

  const totals = await pg.evaluate(() => {
    const all = window.UP.pyq || [];
    const sci = all.filter(r => r.subject === 'science');
    return {
      bank: all.length,
      science: sci.length,
      sciMcq: sci.filter(r => r.opts && r.opts.length).length,
      otherBoardScience: sci.filter(r => r.board !== 'cbse').length,
      otherClassScience: sci.filter(r => r.cls !== 10).length,
      years: [...new Set(sci.map(r => r.y))].sort(),
    };
  });
  console.log('BANK:', JSON.stringify(totals, null, 1));

  // Exercise a real source-matched MCQ whose options live in the legacy
  // source-key table. A short-answer row with no source choices must remain
  // choice-free even when its old kind code says "1".
  await pg.locator('#topbar select[data-key="board"]').selectOption('cbse');
  await pg.waitForFunction(() => UP.S.board === 'cbse');
  await pg.locator('#topbar select[data-key="cls"]').selectOption('10');
  await pg.waitForFunction(() => UP.S.cls === 10);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('maths');
  await pg.waitForFunction(() => UP.S.subject === 'maths');
  await pg.evaluate(() => { location.hash = '#/pyq?y=2023'; });
  await pg.waitForSelector('#imp1108670 .q-options-toggle');
  const matchedMcq = pg.locator('#imp1108670');
  if (await matchedMcq.locator('.q-opt').count() !== 4) throw new Error('source-matched PYQ MCQ should expose four options');
  if (!(await matchedMcq.locator('.q-opts').isHidden())) throw new Error('PYQ choices should start collapsed');
  await matchedMcq.locator('.q-options-toggle').click();
  if (!(await matchedMcq.locator('.q-opts').isVisible())) throw new Error('PYQ choices toggle did not open options');
  await matchedMcq.locator('.q-opt').first().click();
  if (await matchedMcq.locator('.q-opt.right,.q-opt.wrong').count() ||
      !/not scored/i.test(await matchedMcq.innerText())) throw new Error('source-only choices must remain ungraded');
  await pg.waitForSelector('#imp11086717');
  const shortAnswer = pg.locator('#imp11086717');
  if (await shortAnswer.locator('.q-options-toggle').count())
    throw new Error('short-answer question without options must not be treated as an MCQ');

  // Test fixtures prove that a clean five-choice array is not rejected merely
  // for exceeding four, while A–D-looking OCR text is never split into choices.
  await pg.evaluate(() => {
    UP.pyq.push({
      id: 'pyq-test-five-choice', cls: 10, subject: 'maths', board: 'cbse', y: 2031,
      set: 'test-only', q: 901, ch: 1, m: 1, kind: 'mcq', d: 1,
      en: 'Test fixture: select one of five separate answer choices.', hi: '', ans: '', keyVerified: false,
      opts: ['First answer', 'Second answer', 'Third answer', 'Fourth answer', 'Fifth answer']
    });
    UP.pyq.push({
      id: 'pyq-test-verified-fallback', cls: 10, subject: 'maths', board: 'cbse', y: 2031,
      set: 'test-only', q: 905, ch: 1, m: 1, kind: 'mcq', d: 1,
      en: 'Test fixture: a verified key may use its nonblank raw answer.', hi: '', ans: '',
      keyVerified: true, raw: { ans: 'C' },
      opts: ['First answer', 'Second answer', 'Third answer', 'Fourth answer']
    });
    UP.pyq.push({
      id: 'pyq-test-math-signs', cls: 10, subject: 'maths', board: 'cbse', y: 2031,
      set: 'test-only', q: 903, ch: 1, m: 1, kind: 1, d: 1,
      en: 'Test fixture: choose among distinct signed values.', hi: '', ans: '', keyVerified: false,
      opts: ['1', '0', '−1', '2']
    });
    UP.pyq.push({
      id: 'pyq-test-numeric-kind', cls: 10, subject: 'maths', board: 'cbse', y: 2031,
      set: 'test-only', q: 904, ch: 1, m: 1, kind: 1, d: 1,
      en: 'Test fixture: numeric kind one has no verified choices.', hi: '', opts: [], ans: ''
    });
    UP.pyq.push({
      id: 'pyq-test-unparsed-inline', cls: 10, subject: 'maths', board: 'cbse', y: 2031,
      set: 'test-only', q: 902, ch: 1, m: 1, kind: 'mcq', d: 1,
      en: 'Test fixture: choose one (A) alpha (B) beta (C) gamma (D) delta.', hi: '', opts: [], ans: ''
    });
    location.hash = '#/pyq?y=2031';
  });
  const fiveChoice = pg.locator('#pyq-test-five-choice');
  await fiveChoice.waitFor({ state: 'attached' });
  if (await fiveChoice.locator('.q-opt').count() !== 5)
    throw new Error('clean five-choice fixture should retain all source options');
  await fiveChoice.locator('.q-options-toggle').click();
  await fiveChoice.locator('.q-opt').nth(4).click();
  if (await fiveChoice.locator('.q-opt.right,.q-opt.wrong').count() ||
      !/not scored/i.test(await fiveChoice.innerText()))
    throw new Error('five-choice fixture without a verified key must remain unscored');
  const verifiedFallback = pg.locator('#pyq-test-verified-fallback');
  await verifiedFallback.waitFor({ state: 'attached' });
  await verifiedFallback.locator('.q-options-toggle').click();
  await verifiedFallback.locator('.q-opt').nth(2).click();
  if (await verifiedFallback.locator('.q-opt.right').count() !== 1
      || !/Correct/i.test(await verifiedFallback.innerText()))
    throw new Error('an explicitly verified raw answer should score against its displayed option');
  const mathSigns = pg.locator('#pyq-test-math-signs');
  await mathSigns.waitFor({ state: 'attached' });
  if (await mathSigns.locator('.q-opt').count() !== 4)
    throw new Error('mathematical options with different signs should remain distinct and visible');
  const numericKind = pg.locator('#pyq-test-numeric-kind');
  if (!/Options missing or suspect/i.test(await numericKind.innerText()))
    throw new Error('numeric kind-1 question without options should show the withheld-choice warning');
  if (!/Question/i.test(await numericKind.locator('.pyq-kind').innerText()))
    throw new Error('kind-1 question without choices should not be labelled as an MCQ');
  const inlineText = pg.locator('#pyq-test-unparsed-inline');
  if (await inlineText.locator('.q-options-toggle').count() ||
      !/Options missing or suspect/i.test(await inlineText.innerText()))
    throw new Error('unverified inline OCR markers must not be converted into answer choices');
  await pg.evaluate(() => {
    UP.pyq = UP.pyq.filter(q => !String(q.id || '').startsWith('pyq-test-'));
    location.hash = '#/pyq';
  });

  // Class 12 page-image mappings should show a compact question-specific
  // preview, open the original image in the lightbox, and close with Escape.
  await pg.locator('#topbar select[data-key="cls"]').selectOption('12');
  await pg.waitForFunction(() => UP.S.cls === 12);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('maths');
  await pg.waitForFunction(() => UP.S.subject === 'maths');
  await pg.evaluate(() => { location.hash = '#/pyq?y=2025'; });
  const preview = pg.locator('#c12-m-65-1-2-q3 .q-figure-thumbnail');
  await preview.waitFor({ state: 'attached' });
  await preview.scrollIntoViewIfNeeded();
  await pg.waitForFunction(() => {
    const image = document.querySelector('#c12-m-65-1-2-q3 .q-figure-thumbnail');
    return image && image.complete && image.naturalWidth > 0;
  });
  const previewHeight = await preview.evaluate(image => image.getBoundingClientRect().height);
  if (previewHeight > 230.5) throw new Error(`PYQ figure preview is not compact: ${previewHeight}px`);
  await preview.click();
  await pg.waitForSelector('.fig-lightbox img');
  if (await pg.locator('.fig-lightbox img').evaluate(image => image.naturalWidth) <= 0)
    throw new Error('question figure did not open in the lightbox');
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('.fig-lightbox', { state: 'detached' });

  // Class 12 original source PDFs are linked from both the empty-bank path
  // and the populated Accountancy sample-paper setup.
  await pg.locator('#topbar select[data-key="subject"]').selectOption('accountancy');
  await pg.waitForFunction(() => UP.S.subject === 'accountancy');
  await pg.evaluate(() => { location.hash = '#/test'; });
  await pg.waitForSelector('.test-setup a[href="#/pyq"]');
  if (!(await pg.locator('.paper-head').count()) || !(await pg.locator('.paper-section .q-card').count()))
    throw new Error('Accountancy paper view should be populated for the source-link test');
  await pg.locator('.test-setup a[href="#/pyq"]').click();
  await pg.waitForSelector('#source-papers .source-paper-link');
  const accountancyLinks = pg.locator('#source-papers .source-paper-link');
  if (await accountancyLinks.count() !== 17) throw new Error('Accountancy source catalogue should expose all 17 PDFs');
  if ((await accountancyLinks.evaluateAll(links => links.map(link => link.getAttribute('href'))))
      .some(href => !/^\/assets\/papers\/.+\.pdf$/i.test(href || '')))
    throw new Error('Accountancy source-paper link is not a local PDF path');
  await pg.locator('#topbar select[data-key="subject"]').selectOption('economics');
  await pg.waitForFunction(() => UP.S.subject === 'economics');
  await pg.evaluate(() => { location.hash = '#/test'; });
  await pg.waitForSelector('#view a[href="#/pyq"]', { timeout: 15000 });
  if (!/No questions for these filters/i.test(await pg.locator('#view').innerText()))
    throw new Error('Economics test view should exercise the empty-bank link path');
  await pg.locator('#view a[href="#/pyq"]').click();
  await pg.waitForSelector('#original-test-papers .source-test-paper');
  const economicsLinks = pg.locator('#original-test-papers .source-test-paper');
  if (await economicsLinks.count() !== 90) throw new Error('Economics source catalogue should expose all 90 PDFs');
  if ((await economicsLinks.evaluateAll(links => links.map(link => link.getAttribute('href'))))
      .some(href => !/^\/assets\/papers\/.+\.pdf$/i.test(href || '')))
    throw new Error('Economics source-paper link is not a local PDF path');

  console.log('PASS: source-matched choices, withheld and unverified-choice handling, compact image/SVG zoom, and populated/empty Class 12 source links');

  await pg.locator('#topbar select[data-key="board"]').selectOption('cbse');
  await pg.waitForFunction(() => UP.S.board === 'cbse');
  await pg.locator('#topbar select[data-key="cls"]').selectOption('10');
  await pg.waitForFunction(() => UP.S.cls === 10);
  await pg.locator('#topbar select[data-key="subject"]').selectOption('science');
  await pg.waitForFunction(() => UP.S.subject === 'science' && UP.loaded.packs.science);
  await pg.evaluate(() => { location.hash = '#/pyq?y=2026'; });

  // A real imported answer letter is not a verified key by itself.
  const unverified = pg.locator('#scp-31BS-11');
  await unverified.waitFor({ state: 'attached', timeout: 20000 });
  if (await unverified.locator('.q-opt').count() !== 4)
    throw new Error('clean source MCQ options should remain visible for practice');
  await unverified.locator('.q-options-toggle').click();
  await unverified.locator('.q-opt').first().click();
  if (await unverified.locator('.q-opt.right,.q-opt.wrong').count() ||
      !/not scored/i.test(await unverified.innerText()))
    throw new Error('an unverified imported answer letter must never score a PYQ choice');

  // This source diagram is beyond the first 60 grouped questions for 2026.
  await pg.evaluate(() => { location.hash = '#/pyq?y=2026&page=2'; });

  // Lazy source SVGs stay compact in the card and remain zoomable in the same
  // lightbox as the original page-image previews.
  const svgCard = pg.locator('#scp-3111-12-b');
  await svgCard.waitFor({ state: 'attached', timeout: 20000 });
  await svgCard.scrollIntoViewIfNeeded();
  await pg.waitForSelector('#scp-3111-12-b .q-question-figure svg', { timeout: 20000 });
  const svgPreview = svgCard.locator('.q-question-figure svg');
  const svgHeight = await svgPreview.evaluate(svg => svg.getBoundingClientRect().height);
  if (svgHeight > 230.5) throw new Error(`PYQ SVG preview is not compact: ${svgHeight}px`);
  await svgPreview.click();
  await pg.waitForSelector('.fig-lightbox svg');
  await pg.locator('.fig-lightbox svg').dblclick();
  if (!/scale\(2\)/.test(await pg.locator('.fig-lightbox svg').getAttribute('style') || ''))
    throw new Error('PYQ SVG lightbox did not zoom');
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('.fig-lightbox', { state: 'detached' });

  await pg.goto(BASE + '#/test', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1800);

  const paper = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.q-card')];
    const first = cards.slice(0, 3).map(c => c.innerText.replace(/\n+/g, ' ').slice(0, 100));
    return {
      count: cards.length,
      withOptions: cards.filter(c => c.querySelector('.q-opts')).length,
      labels: [...new Set([...document.querySelectorAll('.q-ch')].map(e => e.textContent.trim()))].slice(0, 8),
      first,
    };
  });
  console.log('PAPER:', JSON.stringify(paper, null, 1));
  console.log('ERRORS:', errs.slice(0, 6));
  await b.close();
})();
