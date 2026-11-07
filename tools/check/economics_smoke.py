#!/usr/bin/env python3
"""Guest browser + PDF integrity smoke for Class 12 Economics.

Run locally, or set UPAY_BASE=https://upay-zeta.vercel.app. Checks the direct
entry route, all 11 guides, 24 original PDFs, bilingual labels, narrow layouts,
scoping, practice, PDF-cache bypass and a mocked unauthenticated AI failure.
It does not claim a complete syllabus, a source-content audit or paid AI test.
"""
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')
WIDTHS = (320, 360, 390, 768, 1024, 1440)


def manifest():
    text = (ROOT / 'assets/js/data/economics-sources.js').read_text(encoding='utf-8')
    return json.loads(text.split('UP.economicsSources = ', 1)[1].strip()[:-1])


def goto_hash(page, value, selector):
    page.evaluate('(h) => { location.hash = h; }', value)
    page.wait_for_selector(selector, timeout=30000)


def no_overflow(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), label


def main():
    rows = manifest()
    errors, bad_requests = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage'])
        ctx = browser.new_context(viewport={'width': 390, 'height': 850}, service_workers='block', accept_downloads=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: bad_requests.append((r.status, r.url))
                if r.status >= 400 and r.url.startswith(BASE) and '/api/ai/solve' not in r.url else None)
        page.route('**/api/ai/solve', lambda route: route.fulfill(status=401, content_type='application/json', body='{"error":"Sign in to use AI."}'))
        # A one-time direct entry selects the subject and keeps it when moving to a chapter.
        page.goto(BASE + '/#/economics', wait_until='networkidle', timeout=60000)
        page.wait_for_function('window.UP && UP.S && UP.S.subject === "economics" && UP.S.cls === 12 && document.body.classList.contains("up-ready")')
        page.wait_for_selector('.econ-chapter-group .ch-card')
        assert page.url.endswith('#/syllabus')
        assert page.locator('.econ-chapter-group .ch-card').count() == 11
        assert page.locator('#topbar select[data-key="subject"]').input_value() == 'economics'
        assert page.locator('#rail select[data-key="subject"]').input_value() == 'economics'
        assert page.evaluate('UP.economicsSources.length') == 24
        assert page.evaluate('UP.pyq.filter(q => q.subject === "economics").length') == 0
        print('PASS direct entry, header/rail synchronization, 11 scoped chapters and no fabricated past papers', flush=True)

        # All the important layouts must fit at the smallest supported widths.
        for width in WIDTHS:
            page.set_viewport_size({'width': width, 'height': 850})
            for key in ('board', 'cls', 'subject'):
                assert page.locator(f'#topbar select[data-key="{key}"]').is_visible(), (width, key)
            assert page.locator('#topbar a[href="#/login"]').is_visible(), width
            no_overflow(page, ('syllabus', width))
            goto_hash(page, '#/books', '.econ-source-row')
            no_overflow(page, ('books', width))
            goto_hash(page, '#/chapter/1102', '.econ-chapter-sources')
            no_overflow(page, ('chapter', width))
            goto_hash(page, '#/syllabus', '.econ-chapter-group .ch-card')
        print('PASS syllabus, library and chapter layouts at six desktop/tablet/phone widths', flush=True)

        goto_hash(page, '#/books', '.econ-source-row')
        assert page.locator('.econ-source-row[data-book="macro"]').count() == 6
        assert page.locator('.econ-source-row[data-book="micro"][data-chapter]').count() == 5
        assert page.locator('.econ-source-row[data-kind="glossary"]').count() == 1
        assert page.locator('.econ-source-link').count() == 24
        assert page.locator('.econ-missing').count() == 0
        assert 'Indian Economic Development' in page.locator('.econ-library-note').inner_text()
        # Exercise an actual browser click, not just HTTP access.
        with page.expect_download(timeout=20000) as download:
            page.locator('.econ-source-row[data-book="macro"][data-chapter="1"] .econ-source-link').first.click()
        assert download.value.suggested_filename == 'leec101.pdf'
        assert hashlib.sha256(Path(download.value.path()).read_bytes()).hexdigest() == next(r['sha256'] for r in rows if r['originalFile']=='leec101.pdf')
        print('PASS all 24 PDFs appear in the library and an actual source download matches its upload', flush=True)

        for row in rows:
            resp = ctx.request.get(BASE + row['file'], timeout=60000)
            assert resp.status == 200 and 'application/pdf' in resp.headers.get('content-type', ''), (row['id'], resp.status, resp.headers)
            body = resp.body()
            assert len(body) == row['bytes'] and hashlib.sha256(body).hexdigest() == row['sha256'], row['id']
        print('PASS all 24 served PDF byte lengths, content types and SHA-256 hashes', flush=True)

        chapters = page.evaluate('UP.catalogue(12, "economics").map(c => ({id:c.id,n:c.n,book:c.book,en:c.en,formulas:c.formulas.length}))')
        assert len(chapters) == 11 and len({ch['id'] for ch in chapters}) == 11
        for ch in chapters:
            goto_hash(page, f'#/chapter/{ch["id"]}', '.econ-chapter-sources')
            assert page.locator('#view h1').inner_text() == ch['en'], ch
            expected = sum(1 for r in rows if r['kind']=='chapter' and r['book']==ch['book'] and r['chapter']==ch['n'])
            assert page.locator('.econ-chapter-sources .econ-source-link').count() == expected, ch
            assert page.locator('.kb-list li').count() >= 3, ch
            assert page.locator('.tabs [data-tab="pyq"]').count() == 0, ch
            if ch['formulas']:
                page.locator('.tabs [data-tab="formulas"]').click()
                page.wait_for_selector('.formula-card')
                assert page.locator('.formula-card').count() == ch['formulas']
                assert '[object Object]' not in page.locator('#view').inner_text()
            page.locator('.tabs [data-tab="practice"]').click()
            page.wait_for_selector('.econ-practice-card')
            assert page.locator('.econ-practice-card').count() >= 2
            page.locator('.econ-practice-card summary').first.click()
            assert page.locator('.econ-practice-card details[open] p').first.is_visible()
            page.locator('.tabs [data-tab="planTab"]').click()
            page.wait_for_selector('.study-plan .plan-step')
            assert page.locator('.study-plan .plan-step').count() == 3
        print('PASS all 11 chapter guides, correct source links, formulas, review checks and study plans', flush=True)

        goto_hash(page, '#/chapter/1102', '.econ-chapter-sources')
        page.reload(wait_until='networkidle', timeout=60000)
        page.wait_for_selector('.econ-chapter-sources')
        assert page.evaluate('UP.S.subject === "economics" && UP.S.cls === 12')
        page.locator('a[href="#/cheatsheet/1102"]').click()
        page.wait_for_selector('.cheatsheet')
        assert 'GDP = C + I + G + (X − M)' in page.locator('.cheatsheet').inner_text()
        assert '[object Object]' not in page.locator('.cheatsheet').inner_text()
        print('PASS selected subject persists on reload and the revision sheet renders real formulas', flush=True)

        goto_hash(page, '#/chapter/1202', '.econ-chapter-sources')
        assert page.locator('.econ-chapter-sources .econ-source-link').count() == 2
        assert 'Hindi PDF not supplied' not in page.locator('.econ-chapter-sources').inner_text()
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "hi"')
        assert 'उपभोक्ता व्यवहार' in page.locator('#view h1').inner_text()
        assert 'हिंदी PDF नहीं दी गई' not in page.locator('.econ-chapter-sources').inner_text()
        assert page.locator('.econ-chapter-sources .econ-source-link').count() == 2
        goto_hash(page, '#/books', '.econ-source-row')
        assert page.locator('.econ-source-link').count() == 24
        no_overflow(page, ('hindi-library', 320))
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "en"')
        goto_hash(page, '#/pyq', '.pyq-count')
        assert 'Original test-paper PDFs' in page.locator('#view').inner_text()
        assert page.locator('.source-test-paper').count() == 90
        assert 'Years have not been verified' in page.locator('#original-test-papers').inner_text()
        assert '0 questions' in page.locator('.pyq-count').inner_text()
        print('PASS Hindi guide/bilingual sources and honest source-only past-paper view', flush=True)

        goto_hash(page, '#/ask?q=What%20is%20GDP%3F', '#answerMount')
        page.get_by_text('AI solution unavailable.').wait_for(timeout=20000)
        assert page.locator('[data-action="askLocal"]').count() == 0
        assert 'There is no verified local solution' in page.locator('#answerMount').inner_text()
        assert page.evaluate('UP.S.answer.kind') == 'no-local-solver'
        print('PASS mocked AI failure does not present an unrelated built-in maths solution', flush=True)

        page.locator('#topbar select[data-key="board"]').select_option('mp')
        page.wait_for_function('UP.S.board === "mp"')
        page.reload(wait_until='networkidle', timeout=60000)
        page.wait_for_function('window.UP && UP.S && UP.S.board === "mp" && UP.S.subject === "economics"')
        page.locator('#topbar select[data-key="cls"]').select_option('10')
        # State can update before the asynchronously rerendered selector.
        page.wait_for_function('''UP.S.cls === 10 && UP.S.subject === "maths" &&
            !document.querySelector('#topbar select[data-key="subject"] option[value="economics"]')''')
        assert page.locator('#topbar select[data-key="subject"] option[value="economics"]').count() == 0
        goto_hash(page, '#/books', '.page-head')
        assert page.locator('.econ-source-link').count() == 0
        print('PASS board persistence, class fallback and source separation from other subjects', flush=True)
        assert not errors, errors
        assert not bad_requests, bad_requests
        ctx.close()

        # The service worker should not store large textbook PDFs in its caches.
        ctx = browser.new_context(service_workers='allow')
        page = ctx.new_page()
        page.goto(BASE + '/#/economics', wait_until='networkidle', timeout=60000)
        page.evaluate('navigator.serviceWorker.ready')
        page.reload(wait_until='networkidle', timeout=60000)
        page.wait_for_function('!!navigator.serviceWorker.controller', timeout=20000)
        pdf = rows[0]['file']
        result = page.evaluate('''async (path) => {
          const r = await fetch(path); await r.arrayBuffer();
          return {ok:r.ok, cached:!!(await caches.match(path)), sw:!!navigator.serviceWorker.controller};
        }''', pdf)
        assert result == {'ok': True, 'cached': False, 'sw': True}, result
        print('PASS Economics PDFs bypass the service-worker asset cache', flush=True)
        ctx.close()
        browser.close()
    print('Economics guest smoke: PASS (not a textbook/answer-key audit or real-user AI test)', flush=True)


if __name__ == '__main__':
    main()
