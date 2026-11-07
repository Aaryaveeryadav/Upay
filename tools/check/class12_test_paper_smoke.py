#!/usr/bin/env python3
"""Browser + byte-integrity smoke for source-only Class 12 Economics/Biology papers.

Set UPAY_BASE for hosted checks. Tests scoping, duplicate-code distinctions,
visually-impaired labeling, English/Hindi and narrow layouts, browser downloads,
all 94 publicly served PDF hashes, and service-worker cache bypass. It does not
verify answers, infer exam years or audit the full exam contents.
"""
import hashlib
import json
import os
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')
WIDTHS = (320, 360, 390, 768, 1024, 1440)


def manifest():
    text = (ROOT / 'assets/js/data/class12-original-test-papers.js').read_text(encoding='utf-8')
    rows = json.loads(text.split('UP.class12OriginalTestPapers = ', 1)[1].strip()[:-1])
    return [r for r in rows if r['subject'] in ('economics', 'biology')]


def goto(page, value, selector):
    page.evaluate('(hash) => { location.hash = hash; }', value)
    page.wait_for_selector(selector, timeout=30000)


def no_overflow(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), label


def main():
    rows = manifest()
    errors, bad_requests = [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--disable-dev-shm-usage'])
        ctx = browser.new_context(viewport={'width': 320, 'height': 850}, service_workers='block', accept_downloads=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: bad_requests.append((r.status, r.url)) if r.status >= 400 and r.url.startswith(BASE) else None)
        page.goto(BASE + '/#/economics', wait_until='networkidle', timeout=60000)
        page.wait_for_function('window.UP && UP.S && UP.S.subject === "economics" && UP.S.cls === 12')
        goto(page, '#/pyq', '#original-test-papers')
        assert page.locator('.source-test-paper').count() == 90
        assert page.locator('.source-paper-group h3').all_inner_texts() == [
            'Series QPSR1', 'Series XY1ZW', 'Series R1PQS/1', 'Series HFG1E/1', 'Series AABB3/1',
            'Series R2SQP', 'Series Z2YWX', 'Series R2PQS/2', 'Series HFG1E/2', 'Series AABB1/2',
            'Series PQS3R', 'Series R3PQS/3', 'Series HFG1E/3', 'Series AABB4/3',
            'Series RP4QS', 'Series Z4WYX', 'Series R4PSQ/4', 'Series HFG1E/4', 'Series AABB2/4',
            'Series R5QPS', 'Series Z5YWX', 'Series RR5SP/5', 'Series HFG1E/5', 'Series AABB5/5',
            'Series A6BAB/C', 'Series YWX6Z', 'Series S7PQR', 'Series Y7XWZ',
            'Series WXYZ/S', 'Series &RQPS/S']
        repeated = {**{f'58/S/{i}': ('WXYZ/S', '&RQPS/S') for i in (1, 2, 3)},
                    **{f'58/1/{i}': ('QPSR1', 'XY1ZW', 'R1PQS/1', 'HFG1E/1', 'AABB3/1') for i in (1, 2, 3)},
                    **{f'58/2/{i}': ('R2SQP', 'Z2YWX', 'R2PQS/2', 'HFG1E/2', 'AABB1/2') for i in (1, 2, 3)},
                    **{f'58/3/{i}': ('PQS3R', 'R3PQS/3', 'HFG1E/3', 'AABB4/3') for i in (1, 2, 3)},
                    **{f'58/4/{i}': ('RP4QS', 'Z4WYX', 'R4PSQ/4', 'HFG1E/4', 'AABB2/4') for i in (1, 2, 3)},
                    **{f'58/5/{i}': ('R5QPS', 'Z5YWX', 'RR5SP/5', 'HFG1E/5', 'AABB5/5') for i in (1, 2, 3)},
                    **{f'58/6/{i}': ('A6BAB/C', 'YWX6Z') for i in (1, 2, 3)},
                    **{f'58/7/{i}': ('S7PQR', 'Y7XWZ') for i in (1, 2, 3)}}
        for code, labels in repeated.items():
            links = page.locator('.source-test-paper').filter(has_text=code)
            assert links.count() == len(labels), code
            assert len({links.nth(i).get_attribute('href') for i in range(len(labels))}) == len(labels), code
            for i, label in enumerate(labels):
                assert 'series ' + label in links.nth(i).get_attribute('aria-label'), code
        assert page.locator('.source-test-paper').filter(has_text='Scanned PDF').count() == 24
        assert page.locator('.source-test-paper').filter(has_text='cover says 23 printed pages').count() == 21
        assert page.locator('.source-test-paper').filter(has_text='cover says 31 printed pages').count() == 3
        assert page.locator('.source-test-paper').filter(has_text='cover says 11 printed pages').count() == 3
        assert page.locator('.source-test-paper').filter(has_text='58/2/3').count() == 5
        hfg4 = page.locator('.source-paper-group').filter(has=page.locator('h3', has_text='Series HFG1E/4'))
        assert hfg4.locator('.source-test-paper').count() == 3
        assert hfg4.locator('.source-test-paper').filter(has_text='58/4/1').count() == 1
        assert page.locator('.source-test-paper').filter(has_text='40 marks').count() == 18
        assert '40 marks' in page.locator('.source-test-paper[data-paper-id="economics-a6bab-c-1"]').inner_text()
        assert '40 marks' in page.locator('.source-test-paper[data-paper-id="economics-aabb5-5-1"]').inner_text()
        assert '80 marks' in page.locator('.source-test-paper[data-paper-id="economics-hfg1e-4-1"]').inner_text()
        assert '80 marks' in page.locator('.source-test-paper[data-paper-id="economics-ywx6z-1"]').inner_text()
        assert 'Years have not been verified' in page.locator('#original-test-papers').inner_text()
        assert 'not been added to the searchable bank' in page.locator('#original-test-papers').inner_text()
        assert '0 questions' in page.locator('.pyq-count').inner_text()
        for width in WIDTHS:
            page.set_viewport_size({'width': width, 'height': 850})
            no_overflow(page, ('economics original papers', width))
        goto(page, '#/pyq?y=2024&ch=1101', '#original-test-papers')
        assert page.locator('.source-test-paper').count() == 90, 'source PDFs must not be silently filtered by unverified year/chapter'
        for original in ('58-S-1 Economics.pdf', '58-1-1_Economics.pdf', '58-1-1 ECONOMICS.pdf', '58-2-3 ECONOMICS.pdf', '58-6-1 ECONOMICS-2.pdf',
                         '58_1_1_Economics.pdf', '58_2_2_Economics.pdf', '58_3_3_Economics.pdf', '58_4_1_Economics.pdf', '58_5_1_Economics.pdf',
                         '58_1_1_Economics-2.pdf', '58_2_2_Economics-2.pdf', '58_3_3_Economics-2.pdf', '58_4_2_Economics-2.pdf', '58_5_3_Economics-2.pdf',
                         '58_4_1_Economics-2.pdf', '58-1-1 Economics.pdf', '58-2-2 Economics.pdf', '58-3-3 Economics.pdf', '58-4-1 Economics.pdf', '58-5-2 (Economics).pdf'):
            row = next(r for r in rows if r['originalFile'] == original)
            with page.expect_download(timeout=30000) as download:
                page.locator(f'.source-test-paper[data-paper-id="{row["id"]}"]').click()
            assert hashlib.sha256(Path(download.value.path()).read_bytes()).hexdigest() == row['sha256'], original
        page.set_viewport_size({'width': 320, 'height': 850})
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "hi"')
        assert page.locator('.source-test-paper').filter(has_text='स्कैन PDF').count() == 24
        assert page.locator('.source-test-paper').filter(has_text='मुखपृष्ठ पर 23 मुद्रित पृष्ठ').count() == 21
        assert page.locator('.source-test-paper').filter(has_text='मुखपृष्ठ पर 31 मुद्रित पृष्ठ').count() == 3
        assert page.locator('.source-test-paper').filter(has_text='मुखपृष्ठ पर 11 मुद्रित पृष्ठ').count() == 3
        no_overflow(page, ('economics Hindi papers', 320))
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "en"')
        print('PASS 90 Economics papers, duplicate series, scan/page labels, bilingual layouts and twenty-one browser downloads', flush=True)

        page.locator('#topbar select[data-key="subject"]').select_option('biology')
        page.wait_for_function('UP.S.subject === "biology"')
        goto(page, '#/pyq', '#original-test-papers')
        page.wait_for_function('UP.S.subject === "biology" && document.querySelectorAll(".source-test-paper").length === 4', timeout=30000)
        assert page.locator('.source-paper-group h3').all_inner_texts() == ['Series EF1GH/C', 'Series FGHE/C']
        vi = page.locator('.source-test-paper').filter(has_text='57(B)')
        assert vi.count() == 1 and 'Visually impaired candidates only' in vi.inner_text()
        assert 'visually impaired candidates only' in vi.get_attribute('aria-label')
        for width in WIDTHS:
            page.set_viewport_size({'width': width, 'height': 850})
            no_overflow(page, ('biology original papers', width))
        page.set_viewport_size({'width': 320, 'height': 850})
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang === "hi"')
        assert 'केवल दृष्टिबाधित परीक्षार्थियों के लिए' in page.locator('.source-test-paper').filter(has_text='57(B)').inner_text()
        no_overflow(page, ('biology Hindi papers', 320))
        row = next(r for r in rows if r['visuallyImpaired'])
        with page.expect_download(timeout=30000) as download:
            page.locator(f'.source-test-paper[data-paper-id="{row["id"]}"]').click()
        assert hashlib.sha256(Path(download.value.path()).read_bytes()).hexdigest() == row['sha256']
        page.reload(wait_until='networkidle', timeout=60000)
        page.wait_for_selector('#original-test-papers')
        assert page.evaluate('UP.S.subject === "biology" && UP.S.cls === 12')
        assert page.locator('.source-test-paper').count() == 4
        print('PASS 4 Biology papers, visible and accessible special designation, bilingual labels, layouts and download', flush=True)

        for row in rows:
            # Stream large files outside the browser to avoid retaining hundreds
            # of megabytes in the Playwright/Chromium process after downloads.
            digest, size = hashlib.sha256(), 0
            with urlopen(BASE + row['file'], timeout=60) as resp:
                assert resp.status == 200 and resp.headers.get_content_type() == 'application/pdf', (row['id'], resp.status)
                for block in iter(lambda: resp.read(1024 * 1024), b''):
                    digest.update(block); size += len(block)
            assert size == row['bytes'] and digest.hexdigest() == row['sha256'], row['id']
        print('PASS all 94 served paper PDFs match original byte lengths, content types and SHA-256 hashes', flush=True)

        page.locator('#topbar select[data-key="board"]').select_option('mp')
        page.wait_for_function('UP.S.board === "mp"')
        goto(page, '#/pyq', '.pyq-count')
        # State changes before the async subject pack finishes rendering; wait for
        # the scoped view, not just the old, still-mounted .pyq-count element.
        page.wait_for_function('UP.S.board === "mp" && document.querySelectorAll(".source-test-paper").length === 0', timeout=30000)
        assert 'CBSE' in page.locator('#view').inner_text()
        page.locator('#topbar select[data-key="board"]').select_option('cbse')
        page.wait_for_function('UP.S.board === "cbse"')
        page.locator('#topbar select[data-key="subject"]').select_option('accountancy')
        page.wait_for_function('UP.S.subject === "accountancy"')
        goto(page, '#/pyq', '.pyq-count')
        page.wait_for_function('UP.S.subject === "accountancy" && document.querySelectorAll(".source-test-paper").length === 0 && document.querySelectorAll(".source-paper-link").length === 17', timeout=30000)
        print('PASS board and subject scoping; Accountancy sources remain separate', flush=True)
        assert not errors, errors
        assert not bad_requests, bad_requests
        ctx.close()

        ctx = browser.new_context(service_workers='allow')
        page = ctx.new_page()
        page.goto(BASE + '/#/economics', wait_until='networkidle', timeout=60000)
        page.evaluate('navigator.serviceWorker.ready')
        page.reload(wait_until='networkidle', timeout=60000)
        page.wait_for_function('!!navigator.serviceWorker.controller', timeout=20000)
        for row in (rows[0], next(r for r in rows if r['originalFile'] == '58_4_1_Economics.pdf'),
                    next(r for r in rows if r['originalFile'] == '58_5_1_Economics.pdf'),
                    next(r for r in rows if r['originalFile'] == '58_2_1_Economics-2.pdf'),
                    next(r for r in rows if r['originalFile'] == '58_5_1_Economics-2.pdf'),
                    next(r for r in rows if r['originalFile'] == '58-1-1 Economics.pdf'),
                    next(r for r in rows if r['originalFile'] == '58-5-1 (Economics).pdf')):
            result = page.evaluate('''async (path) => {
              const r = await fetch(path); await r.arrayBuffer();
              return {ok:r.ok, cached:!!(await caches.match(path)), sw:!!navigator.serviceWorker.controller};
            }''', row['file'])
            assert result == {'ok': True, 'cached': False, 'sw': True}, (row['id'], result)
        print('PASS supplied test PDFs bypass the service-worker cache', flush=True)
        ctx.close()
        browser.close()
    print('Class 12 source-only test-paper smoke: PASS (not a question or answer-key audit)', flush=True)


if __name__ == '__main__':
    main()
