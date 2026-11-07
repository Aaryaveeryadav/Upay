#!/usr/bin/env python3
"""Exercise source-only PDF catalogue, filtering, downloads and scope isolation.

Run against the Node server: python3 tools/check/source_papers_smoke.py
Requires Python Playwright and Chromium. Uses disposable browser contexts.
"""
import hashlib
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')


def check(ok, description):
    if not ok:
        raise AssertionError(description)
    print('PASS', description, flush=True)


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage'])
        ctx = browser.new_context(service_workers='block', viewport={'width': 1440, 'height': 1000})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/api/tel', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
        page.goto(BASE + '/', wait_until='networkidle', timeout=60000)
        page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")', timeout=30000)

        def pick(key, value):
            page.locator(f'#topbar select[data-key="{key}"]').select_option(value)
            expected = int(value) if key == 'cls' else value
            page.wait_for_function('([key,value]) => UP.S[key] === value', arg=[key, expected])
            page.wait_for_timeout(250)

        def route(hash_value):
            page.evaluate('(value) => {location.hash = value}', hash_value)
            page.wait_for_timeout(300)

        pick('cls', '12')
        pick('subject', 'accountancy')
        page.wait_for_function('UP.accountancyOriginalPapers && UP.accountancyOriginalPapers.length===17', timeout=30000)
        route('#/pyq')
        check(page.locator('#view > .q-card').count() == 60 and
              '1156 questions' in page.locator('#view .pyq-count').inner_text(),
              'large Accountancy question lists render only the first 60 without changing totals')
        first_ids = page.locator('#view > .q-card').evaluate_all('(els) => els.map(el => el.id)')
        page.locator('.pyq-pages [data-pyq-page="2"]').first.click()
        page.wait_for_function("location.hash.includes('page=2') && document.querySelector('.pyq-page-label')?.textContent.includes('Page 2')")
        second_ids = page.locator('#view > .q-card').evaluate_all('(els) => els.map(el => el.id)')
        check(len(second_ids) == 60 and not set(first_ids).intersection(second_ids),
              'question pagination changes pages without duplicating the visible roots')
        page.locator('.filter-line a[href*="y=2023"]').first.click()
        page.wait_for_function("location.hash.includes('y=2023') && !location.hash.includes('page=')")
        check(page.locator('#view > .q-card').count() == 60,
              'changing a year filter resets pagination')
        route('#/pyq')
        rail = page.locator('#rail .rail-note').inner_text()
        footer = page.locator('#footer').inner_text()
        check('Class 12' in rail and 'Accountancy' in rail and 'CBSE' in rail and
              'Class 10 Maths' not in rail and 'Class 12 · Accountancy' in footer and
              'can be wrong' in footer,
              'rail and footer reflect the current scope and do not misrepresent answers')
        section = page.locator('#source-papers')
        links = section.locator('.source-paper-link')
        text = section.inner_text().lower()
        check(links.count() == 17 and 'not in the searchable question bank or its counts' in text and
              'chapter and level filters do not' in text,
              'all 17 source PDFs are clearly separate from searchable questions')
        check(page.evaluate('''() => (UP.pyq||[]).filter(q => q.paperCode && +q.cls===12 &&
              (q.subject==='accountancy'||q.subject==='computerized-accounting')).length === 1428'''),
              'the original 1,428 searchable roots are unchanged')
        check(all(link.get_attribute('target') == '_blank' and
                  'noopener' in link.get_attribute('rel') and
                  link.get_attribute('href').startswith('/assets/papers/accountancy/')
                  for link in links.all()), 'PDF links use safe public asset URLs and open in a new tab')
        expected = page.evaluate('UP.accountancyOriginalPapers')
        for year, code in ((2023, '67/1/1'), (2023, '67/4/2'), (2023, '67/5/1'), (2024, '67/4/2')):
            row = next(row for row in expected if row['year'] == year and row['paperCode'] == code)
            response = ctx.request.get(BASE + row['file'], timeout=60000)
            check(response.status == 200 and 'application/pdf' in response.headers.get('content-type', '') and
                  hashlib.sha256(response.body()).hexdigest() == row['sha256'],
                  f'{year} {code} PDF is served intact with a PDF content type')
        overlapping = [r for r in expected if r['paperCode']=='67/4/2']
        check(len(overlapping)==2 and len({r['sha256'] for r in overlapping})==2,
              'reused paper codes for 2023 and 2024 resolve to different original PDFs')
        # Headless Chromium downloads PDFs instead of opening its native viewer.
        with page.expect_download(timeout=30000) as download_event:
            links.first.click()
        download = download_event.value
        with open(download.path(), 'rb') as file:
            downloaded_hash = hashlib.sha256(file.read()).hexdigest()
        check(download.suggested_filename == expected[0]['originalFile'] and downloaded_hash == expected[0]['sha256'],
              'clicking a source link delivers the intact original PDF')
        for extra in ctx.pages:
            if extra != page:
                extra.close()

        route('#/pyq?y=2023')
        check(page.locator('#source-papers .source-paper-link').count() == 12 and
              page.locator('#source-papers [data-paper="67/4/1"]').count() == 1 and
              '/2023/67_4_2_Accountancy-2.pdf' in page.locator('#source-papers [data-paper="67/4/2"]').get_attribute('href'),
              '2023 filter shows 12 sources and the 2023 copy of reused code 67/4/2')
        route('#/pyq?y=2024&ch=205')
        check(page.locator('#source-papers .source-paper-link').count() == 5 and
              '/2024/67_4_2_Accountancy.pdf' in page.locator('#source-papers [data-paper="67/4/2"]').get_attribute('href') and
              page.locator('#source-papers [data-paper="67/4/1"]').count() == 0,
              '2024 filter shows its five sources, distinct from 2023 and independent of chapter filter')
        route('#/pyq?y=2025')
        check(page.locator('#source-papers').count() == 0, 'no 2023/2024 PDFs appear under 2025')
        pick('subject', 'computerized-accounting')
        route('#/pyq')
        check(page.locator('#source-papers .source-paper-link').count() == 17,
              'source PDFs are available from the Computerised Accounting option too')
        pick('board', 'mp')
        route('#/pyq')
        check(page.locator('#source-papers').count() == 0, 'CBSE source papers do not leak into the MP board scope')
        pick('board', 'cbse')
        pick('subject', 'maths')
        route('#/pyq')
        check(page.locator('#source-papers').count() == 0, 'Accountancy source papers do not leak into Maths')
        pick('subject', 'accountancy')
        page.set_viewport_size({'width': 360, 'height': 800})
        route('#/pyq')
        check(page.locator('#source-papers .source-paper-link').count() == 17 and
              page.evaluate('''() => {
                 const box=document.querySelector('#source-papers');
                 return box && box.scrollWidth <= box.clientWidth + 1 &&
                   [...box.querySelectorAll('.source-paper-link')].every(a => a.getBoundingClientRect().right <= innerWidth+1);
              }'''), 'source links wrap within a narrow mobile viewport')
        # Limit the question list before rerendering the language on mobile.
        route('#/pyq?y=2023')
        page.locator('#topbar [data-action="lang"]').click(timeout=60000)
        page.wait_for_function('UP.S.lang === "hi"', timeout=60000)
        check('मूल प्रश्नपत्र' in page.locator('#source-papers').inner_text(), 'source catalogue has a Hindi UI label')
        check(not errors, 'no uncaught browser errors: ' + repr(errors))
        ctx.close()
        browser.close()
    print('Source-paper browser smoke: PASS (not a transcription audit)', flush=True)


if __name__ == '__main__':
    main()
