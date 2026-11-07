#!/usr/bin/env python3
"""Browser regression for the Class XII Accountancy import and mock lifecycle.

Run against an already-running Upay server; the test never writes server data.
  UPAY_BASE=http://127.0.0.1:8004 python tools/check/accountancy_smoke.py
Requires Python Playwright and its Chromium browser. A fresh isolated browser
context is used; service workers are disabled to exercise current source files.
This checks representative integration paths, not source-text accuracy.
"""
import os
import json
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')


def check(ok, message):
    if not ok:
        raise AssertionError(message)
    print('PASS', message, flush=True)


def main():
    errors = []
    failures = []
    ai_calls = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage'])
        context = browser.new_context(service_workers='block', viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('requestfailed', lambda req: failures.append((req.url, req.failure)))

        # Do not depend on network/auth/paid AI; exercise its unavailable path.
        def ai_offline(route):
            ai_calls.append(route.request.url)
            route.fulfill(status=503, content_type='application/json',
                          body='{"error":"AI unavailable in regression test"}')
        page.route('**/api/ai/solve', ai_offline)
        page.route('**/api/tel', lambda route: route.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
        page.goto(BASE + '/', wait_until='networkidle', timeout=60000)
        page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")')
        check(page.locator('#view').inner_text().strip() != '', 'fresh home renders')

        def pick(key, value):
            page.locator(f'#topbar select[data-key="{key}"]').select_option(value)
            wanted = int(value) if key == 'cls' else value
            field = {'cls': 'cls', 'subject': 'subject', 'board': 'board'}[key]
            page.wait_for_function('([field,value]) => UP.S[field] === value', arg=[field, wanted])
            page.wait_for_timeout(350)

        def route(fragment):
            page.evaluate('(hash) => { location.hash = hash; }', fragment)
            page.wait_for_timeout(400)

        def wait_mock():
            page.wait_for_selector('.mock-ans', timeout=30000)
            page.wait_for_function('UP.S.mockTest && UP.S.mockTest.items.length === 80')

        pick('cls', '12')
        pick('subject', 'accountancy')
        page.wait_for_function('UP.pyq.filter(q => q.paperCode && +q.cls===12 && (q.subject==="accountancy" || q.subject==="computerized-accounting")).length === 1428', timeout=30000)
        stats = page.evaluate('''() => {
          const a=UP.pyq.filter(q=>q.paperCode && +q.cls===12 && (q.subject==='accountancy'||q.subject==='computerized-accounting'));
          return {count:a.length, papers:new Set(a.map(q=>[q.y,q.session,q.paperCode].join('|'))).size,
                  badMethods:a.filter(q=>q.approaches && q.approaches.length).length};
        }''')
        check(stats == {'count': 1428, 'papers': 34, 'badMethods': 0},
              '34 papers / 1,428 records loaded without fabricated maths approaches')
        route('#/home')
        home = page.locator('#view').inner_text()
        placeholder = page.locator('#view textarea[name="q"]').get_attribute('placeholder')
        check('cash-flow statement' in home.lower() and '2x²' not in home and 'accountancy' in placeholder.lower(),
              'home examples and placeholder match the Accountancy scope')
        route('#/ask')
        ask = page.locator('#view').inner_text()
        check('cash-flow statement' in ask.lower() and 'completing the square' not in ask.lower(),
              'Ask suggestions do not display unrelated maths examples')
        route('#/chapter/1')
        check(page.locator('#view .empty').count() > 0 and 'Real Numbers' not in page.locator('#view').inner_text(),
              'stale chapter route does not open a different subject')

        for ch in (102, 103):
            route(f'#/pyq?y=2025&ch={ch}')
            check(page.locator('#acc12-2025-67-1-1-a-q26').count() == 1,
                  f'multi-chapter question appears under chapter {ch}')
        route('#/pyq?y=2025&ch=205')
        target = page.locator('#acc12-2025-67-2-1-bi-q33')
        check(target.count() == 1 and '1/3rd of Credit Revenue' in target.inner_text(),
              'source-backed fraction visible in chapter-filtered PYQ')
        target.locator('[data-action="sample"]').click()
        page.wait_for_function('UP.S.answer && UP.S.answer.kind === "accountancy-unavailable"', timeout=15000)
        text = page.locator('#answerMount').inner_text()
        check('no verified local solution or official answer key' in text.lower() and 'trig identity' not in text.lower(),
              'AI failure states there is no verified local answer, not a maths template')
        page.locator('#answerMount [data-action="retryAI"]').click()
        page.wait_for_function('UP.S.answer && UP.S.answer.kind === "accountancy-unavailable"', timeout=15000)
        check(len(ai_calls) >= 2, 'AI retry remains available and safe')
        # A synthetic AI success tests rendering only; it is not a source key.
        captured = []
        page.unroute('**/api/ai/solve', ai_offline)
        def ai_success(route):
            captured.append(route.request.post_data_json)
            route.fulfill(status=200, content_type='application/json', body='{"source":"ai","model":"mock-test","result":"Illustrative AI result","approaches":[{"name":"Example","steps":[{"t":"Illustrative step"}]}],"check":{"state":"unchecked"},"figure":{"svg":"<svg onload=window.__aiSvgExecuted=true></svg>"}}')
        page.route('**/api/ai/solve', ai_success)
        page.evaluate("window.lastLocalSolve = {result:'STALE-MATH-12345'}")
        route('#/pyq?y=2025&ch=205')
        page.locator('#acc12-2025-67-2-1-bi-q33 [data-action="sample"]').click()
        page.wait_for_function('UP.S.aiState === "done" && UP.S.aiAnswer', timeout=15000)
        result = page.locator('#answerMount').inner_text()
        check('Illustrative AI result' in result and 'Not independently checked' in result and
              'STALE-MATH-12345' not in result and captured[-1]['subject'] == 'accountancy' and captured[-1]['cls'] == 12,
              'simulated Accountancy AI success is labelled unchecked and uses the correct scope')
        pick('subject', 'computerized-accounting')
        page.wait_for_function('UP.S.aiState === "done" && UP.S.aiAnswer', timeout=15000)
        check(captured[-1]['subject'] == 'computerized-accounting',
              'the same question is re-requested when its subject scope changes')
        pick('subject', 'accountancy')
        page.wait_for_function('UP.S.aiState === "done" && UP.S.aiAnswer', timeout=15000)
        check(captured[-1]['subject'] == 'accountancy', 'returning to Accountancy re-requests in scope')

        route('#/search?q=Credit%20Revenue')
        check('1/3rd of Credit Revenue' in page.locator('#view').inner_text() and
              all(x == 'accountancy' for x in page.locator('#view .pmeta .tag.grey').all_inner_texts()),
              'dedicated search preserves source fractions and current subject')
        page.keyboard.press('Control+k')
        page.locator('.cmdk-input').fill('1/3rd of Credit Revenue')
        check(page.locator('.cmdk-item[data-go*="1%2F3rd"]').count() > 0,
              'command search preserves the source fraction in its question link')
        page.keyboard.press('Escape')

        route('#/test')
        page.wait_for_selector('#view .q-card', timeout=15000)
        paper = page.evaluate('''() => {
          let qs=UP.S.paper.sections.flatMap(s=>s.questions||[]);
          return {n:qs.length, bad:qs.filter(q=>!q.raw || q.raw.subject!=='accountancy' || q.raw.board!=='cbse' || +q.raw.cls!==12).length,
                  keys:qs.filter(q=>q.ans).length, marks:UP.S.paper.total};
        }''')
        check(paper['n'] > 0 and paper['bad'] == 0 and paper['keys'] == 0 and paper['marks'] is None,
              'sample paper contains only in-scope, unkeyed Accountancy source questions')
        check(page.evaluate('''() => {let q=UP.S.paper.sections.flatMap(s=>s.questions);return new Set(q.map(x=>x.no)).size===q.length}'''),
              'sample paper question numbers are unique across sections')
        # Add disposable in-memory option buttons to exercise unkeyed selection.
        page.evaluate('''() => {const q=UP.S.paper.sections[0].questions[0];
          q.opts=[{en:'Choice A'},{en:'Choice B'}];q.ans='';}''')
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "hi"')
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "en"')
        card = page.locator('#view .q-card').first
        card.locator('[data-action="test-pick"]').first.click()
        check(card.locator('.q-opt.chosen').count() == 1 and
              card.locator('.q-opt.right,.q-opt.wrong,.q-verdict').count() == 0 and
              page.evaluate('UP.S.answers[UP.S.paper.sections[0].questions[0].no].ok === null'),
              'unkeyed sample-paper option is neutral and ungraded')
        card.locator('[data-action="test-pick"]').nth(1).click()
        check(card.locator('.q-opt.chosen').count() == 1,
              'unkeyed sample-paper choice can be changed')
        card.locator('[data-action="test-reveal"]').click()
        page.wait_for_function('UP.S.paper.sections[0].questions[0].aiAnswer === "Illustrative AI result"', timeout=15000)
        card = page.locator('#view .q-card').first
        check('ai answer (unverified)' in card.inner_text().lower() and
              'not been verified against an official answer key' in card.inner_text() and
              page.evaluate('UP.S.paper.sections[0].questions[0].ans === ""') and
              page.evaluate('window.__aiSvgExecuted !== true'),
              'sample AI explanation is unchecked, does not fill the key or inject provider SVG')
        page.unroute('**/api/ai/solve', ai_success)
        page.route('**/api/ai/solve', ai_offline)
        page.evaluate('UP.S.test.chapters = [999]')
        page.locator('[data-action="test-new"]').click()
        check('No questions for these filters' in page.locator('#view').inner_text() and
              page.locator('#view .q-card').count() == 0,
              'an empty chapter filter does not borrow another chapter')
        page.locator('[data-action="test-reset-filters"]').click()
        check(page.locator('#view .q-card').count() > 0, 'empty-filter state can be cleared')

        route('#/today')
        page.wait_for_selector('.daily-list .q-card')
        daily = page.evaluate('''() => ({scope:UP.S.dailySet.scope, n:UP.S.dailySet.items.length,
          bad:UP.S.dailySet.items.filter(x => !UP.pyq.some(q=>q.en===x.q && q.subject==='accountancy' && q.board==='cbse' && +q.cls===12)).length})''')
        check(daily['n'] == 10 and daily['bad'] == 0 and 'accountancy' in daily['scope'],
              'daily set has ten in-scope Accountancy questions')
        daily_question = page.evaluate('UP.S.dailySet.items[0].q')
        page.locator('#daily-0 [data-action="dailyMark"][data-ok="0"]').click()
        check(page.evaluate('(q) => UP.S.hardList.includes(q)', daily_question) and
              page.locator('#daily-0 [data-action="dailyMark"]:disabled').count() == 2,
              'daily self-assessment updates the scoped mistake list and prevents duplicate marks')
        route('#/saved')
        with page.expect_download() as pending:
            page.locator('[data-action="exportPrg"]').click()
        backup_path = pending.value.path()
        with open(backup_path, encoding='utf-8') as file:
            backup = json.load(file)
        check(backup['v'] == 4 and any(row['kind']=='hardList' and row['subject']=='accountancy' and daily_question in row['value'] for row in backup['scopedStudy']) and
              'legacyUnscoped' in backup, 'guest backup exports scoped practice and retains legacy unscoped data')
        route('#/today')
        page.reload(wait_until='networkidle')
        page.wait_for_function('window.UP && UP.S && UP.S.dailySet && UP.S.dailySet.items[0].marked === "hard"',timeout=30000)
        check(page.locator('#daily-0 [data-action="dailyMark"]:disabled').count() == 2,
              'daily self-assessment survives reload')
        route('#/mistakes')
        check(page.locator('#view .pyq-item').count() == 1 and daily_question in page.locator('#view').inner_text(),
              'mistake book shows one copy of the marked question')
        pick('subject', 'computerized-accounting')
        check(page.locator('#view .pyq-item').count() == 0 and not page.evaluate('UP.S.hardList.length'),
              'mistakes and mastery do not cross subjects')
        pick('subject', 'accountancy')
        check(page.locator('#view .pyq-item').count() == 1 and daily_question in page.locator('#view').inner_text(),
              'returning to a subject restores its own mistakes')
        page.locator('[data-action="removeMistake"]').click()
        check(page.locator('#view .pyq-item').count() == 0, 'a mistake can be removed without deleting its practice card')
        route('#/saved')
        page.locator('#importPrgFile').set_input_files(backup_path)
        page.wait_for_function('(q) => UP.S.hardList.includes(q)', arg=daily_question, timeout=15000)
        route('#/mistakes')
        check(page.locator('#view .pyq-item').count() == 1, 'backup import restores the scoped mistake list')
        page.locator('[data-action="removeMistake"]').click()

        route('#/mock?new=1')
        wait_mock()
        snap = page.evaluate('''() => ({ids:UP.S.mockTest.items.map(x=>x.source.id), started:UP.S.mockTest.started,
          bad:UP.S.mockTest.items.filter(x=>x.source.subject!=='accountancy'||x.source.board!=='cbse'||+x.source.cls!==12).length,
          ungraded:UP.S.mockTest.ungraded})''')
        check(len(set(snap['ids'])) == 80 and snap['bad'] == 0 and snap['ungraded'],
              'fresh ungraded Accountancy mock has 80 distinct in-scope roots')
        check('new=' not in page.url, 'new-mock query is consumed only once')
        page.locator('.mock-ans').nth(0).fill('First answer <not HTML>')
        page.locator('.mock-ans').nth(2).fill('Second answer')
        check(page.locator('#mock-progress').inner_text().strip() == '2 / 80', 'answer input updates attempted count')
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "hi"')
        check(page.locator('.mock-ans').nth(0).input_value() == 'First answer <not HTML>' and
              page.locator('#mock-progress').inner_text().strip() == '2 / 80' and
              page.evaluate('UP.S.mockTest.started') == snap['started'],
              'rerender preserves mock questions, escaped answers, progress and timer start')
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "en"')
        page.reload(wait_until='networkidle')
        wait_mock()
        restored = page.evaluate('''() => ({ids:UP.S.mockTest.items.map(x=>x.source.id), started:UP.S.mockTest.started,
                                      answers:UP.S.mockTest.answers})''')
        check(restored['ids'] == snap['ids'] and restored['started'] == snap['started'] and
              page.locator('.mock-ans').nth(0).input_value() == 'First answer <not HTML>' and
              page.locator('.mock-ans').nth(2).input_value() == 'Second answer' and
              page.locator('#mock-progress').inner_text().strip() == '2 / 80',
              'reload restores the same active mock and answers')
        page.locator('#mock-submit').click()
        page.wait_for_function('UP.S.mockTest && UP.S.mockTest.finished')
        check('Attempted 2 of 80' in page.locator('#view').inner_text() and
              'no score was assigned' in page.locator('#view').inner_text().lower(),
              'submission reports attempted count without an invented score')
        page.reload(wait_until='networkidle')
        check('Attempted 2 of 80' in page.locator('#view').inner_text(), 'completed mock result survives reload')
        page.locator('#view a[href="#/mock?new=1"]').click()
        wait_mock()
        new_ids = page.evaluate('UP.S.mockTest.items.map(x=>x.source.id)')
        check(new_ids != snap['ids'] and page.locator('#mock-progress').inner_text().strip() == '0 / 80' and
              page.locator('.mock-ans').nth(0).input_value() == '', 'new practice clears answers and draws a fresh set')

        # Force elapsed time in storage, reload, and verify auto-submission.
        page.locator('.mock-ans').first.fill('timed answer')
        page.evaluate('''() => {let m=JSON.parse(localStorage.getItem('upay.mockTest'));
          m.started=Date.now()-3*3600*1000-2000; localStorage.setItem('upay.mockTest',JSON.stringify(m));}''')
        page.reload(wait_until='networkidle')
        page.wait_for_function('UP.S.mockTest && UP.S.mockTest.finished', timeout=10000)
        check('Attempted 1 of 80' in page.locator('#view').inner_text() and
              page.evaluate('UP.S.mockTest.score.ungraded === true'), 'expired timer auto-finishes ungraded practice')

        pick('subject', 'computerized-accounting')
        # The completed Accountancy mock must be cleared, not reused.
        wait_mock()
        cas = page.evaluate('''() => ({scope:UP.S.mockTest.scope, n:UP.S.mockTest.items.length,
          bad:UP.S.mockTest.items.filter(x=>x.source.subject!=='computerized-accounting'||x.source.option!=='II').length,
          unique:new Set(UP.S.mockTest.items.map(x=>x.source.id)).size})''')
        check(cas['n'] == 80 and cas['unique'] == 80 and cas['bad'] == 0 and 'computerized-accounting' in cas['scope'],
              'subject switch starts a distinct Option II mock')
        route('#/today')
        page.wait_for_selector('.daily-list .q-card')
        check(page.evaluate('''() => UP.S.dailySet.items.length===10 && UP.S.dailySet.items.every(x =>
          UP.pyq.some(q=>q.en===x.q && q.subject==='computerized-accounting' && q.option==='II'))'''),
              'Option II daily set is isolated from Option I')
        route('#/pyq?y=2025&ch=302')
        check(page.locator('#acc12-2025-67-4-1-bii-q27').count() == 1 and
              'LABELS' in page.locator('#acc12-2025-67-4-1-bii-q27').inner_text(),
              'restored Option II MCQ stem is visible')
        # Current extracted options are often inline in the source stem. Add a
        # disposable in-memory unkeyed MCQ to cover the separate-buttons path.
        page.evaluate('''() => UP.pyq.push({id:'fixture-unkeyed-mcq',cls:12,subject:'computerized-accounting',
          board:'cbse',y:2025,ch:302,q:99,paperCode:'test-only',part:'B',option:'II',
          en:'Which item is an example?',opts:[{en:'Choice A'},{en:'Choice B'}],ans:''})''')
        # The fixture is appended after the existing Option II questions, on
        # the final page of this chapter-filtered list.
        route('#/today'); route('#/pyq?y=2025&ch=302&page=2')
        mcq = page.locator('#fixture-unkeyed-mcq')
        before_ai = len(ai_calls)
        mcq.locator('[data-pick]').first.click()
        check('not scored' in mcq.inner_text().lower() and mcq.locator('.q-opt.right,.q-opt.wrong').count() == 0 and
              mcq.locator('.q-opt.chosen').count() == 1 and len(ai_calls) == before_ai,
              'unkeyed MCQ selection is not marked or sent to AI automatically')
        page.evaluate("UP.pyq = UP.pyq.filter(q => q.id !== 'fixture-unkeyed-mcq')")
        route('#/test')
        page.wait_for_selector('#view .q-card')
        check(page.evaluate('''() => UP.S.paper.sections.flatMap(s=>s.questions).every(q=>
            q.raw.subject==='computerized-accounting' && q.raw.option==='II')'''),
              'sample paper changes scope with the subject')
        pick('board', 'mp')
        route('#/mock')
        check('No questions yet' in page.locator('#view').inner_text() and
              page.evaluate('UP.S.mockTest === null'), 'board switch does not leak CBSE questions into MP mock')
        route('#/today')
        check(page.locator('.daily-list .q-card').count() == 0, 'board switch clears CBSE daily set')
        route('#/test')
        check(page.locator('#view .q-card').count() == 0, 'board switch clears CBSE sample paper')
        route('#/search?q=Credit%20Revenue')
        check(page.locator('#view .pyq-item').count() == 0, 'board switch clears CBSE search results')

        check(not errors, 'no uncaught browser errors: ' + repr(errors))
        check(not failures, 'no failed resource requests: ' + repr(failures))
        context.close()
        browser.close()
    print('Accountancy integration smoke: PASS (not a source audit)', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('FAIL:', exc, file=sys.stderr)
        raise
