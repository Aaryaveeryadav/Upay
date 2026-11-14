#!/usr/bin/env python3
"""Read-only guest browser smoke across the site's built-in routes and scopes.

Run against an existing server: UPAY_BASE=http://127.0.0.1:8004 python tools/check/site_smoke.py
Requires Playwright + Chromium. Uses isolated browser contexts and does not
log in, submit forms to the server, create accounts, or exercise paid AI.
A passing smoke test is not proof that all content, external services or every
interaction is correct.
"""
import os
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')
HOST = urlparse(BASE).netloc
SCOPES = {
    10: ['maths', 'science', 'social', 'hindi', 'english', 'sanskrit'],
    11: ['maths', 'physics', 'chemistry', 'biology'],
    12: ['maths', 'applied-maths', 'physics', 'chemistry', 'biology', 'accountancy', 'computerized-accounting', 'economics'],
}
MAIN_ROUTES = [
    '#/home', '#/ask', '#/syllabus', '#/chapter/1', '#/pyq?y=2025',
    '#/test', '#/today', '#/mock', '#/boards', '#/books', '#/saved',
    '#/about', '#/parent', '#/mistakes', '#/login', '#/account',
    '#/apikey', '#/search', '#/cheatsheet/1', '#/mockresult',
]


def main():
    errors = []
    bad_responses = []
    failed_requests = []
    with sync_playwright() as p:
        launch_options = {'headless': True, 'args': ['--disable-dev-shm-usage']}
        if os.environ.get('UPAY_CHROMIUM'):
            launch_options['executable_path'] = os.environ['UPAY_CHROMIUM']
        browser = p.chromium.launch(**launch_options)

        def setup(width=1440, height=950):
            ctx = browser.new_context(service_workers='block', viewport={'width': width, 'height': height})
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: errors.append((pg.url, str(e))))
            def response(r):
                u = urlparse(r.url)
                if u.netloc == HOST and r.status >= 400 and '/api/ai/solve' not in u.path:
                    bad_responses.append((pg.url, r.status, r.url))
            pg.on('response', response)
            pg.on('requestfailed', lambda r: failed_requests.append((pg.url, r.url, r.failure)))
            pg.route('**/api/ai/solve', lambda route: route.fulfill(status=503, content_type='application/json', body='{"error":"AI disabled for smoke test"}'))
            pg.route('**/api/tel', lambda route: route.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
            # The public-route smoke does not depend on remote fonts or auth
            # health. Keep it hermetic when the test environment blocks egress.
            pg.route('https://fonts.googleapis.com/**', lambda route: route.fulfill(status=200, content_type='text/css', body=''))
            pg.route('https://**/auth/v1/health', lambda route: route.fulfill(status=200, content_type='application/json', body='{}'))
            pg.goto(BASE + '/', wait_until='networkidle', timeout=60000)
            pg.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")', timeout=60000)
            return ctx, pg

        def nav(pg, target):
            pg.evaluate('(v) => { location.hash=v; }', target)
            pg.wait_for_timeout(260)
            if not pg.locator('#view').inner_text().strip():
                errors.append((pg.url, 'view is empty'))

        # All main routes in a fresh default guest session.
        ctx, pg = setup()
        for target in MAIN_ROUTES:
            nav(pg, target)
            print('ROUTE', target, 'OK', flush=True)
        nav(pg, '#/test')
        pg.locator('#dd-pickBoard-btn').click()
        pg.locator('#dd-pickBoard-menu [data-value="mp"]').click()
        pg.wait_for_function("UP.S.board==='mp' && UP.S.test.board==='mp' && UP.S.paper && UP.S.paper._scope.includes('mp')",timeout=15000)
        assert pg.locator('#topbar select[data-key="board"]').input_value() == 'mp', 'paper board and active board diverged'
        pg.locator('#dd-pickBoard-btn').click()
        pg.locator('#dd-pickBoard-menu [data-value="cbse"]').click()
        pg.wait_for_function("UP.S.board==='cbse' && UP.S.test.board==='cbse'",timeout=15000)
        card = pg.locator('#view .q-card').first
        card.locator('[data-action="test-reveal"]').click()
        assert card.locator('.q-verdict').count() == 0, 'viewing a solution graded an unanswered question'
        print('TEST board synchronization and unattempted reveal OK', flush=True)
        nav(pg, '#/mock?new=1')
        pg.wait_for_selector('.mock-ans',timeout=30000)
        pg.locator('.mock-ans').first.fill('A practice answer')
        pg.locator('#mock-submit').click()
        pg.wait_for_function('UP.S.mockTest && UP.S.mockTest.finished')
        assert pg.evaluate('UP.S.mockTest.score.pending > 0'), 'unverified questions must remain pending review'
        assert 'need review' in pg.locator('#view').inner_text(), 'pending marks are not clearly labelled'
        print('MOCK no unverified score OK', flush=True)
        ctx.close()

        # Each listed subject in Classes 10–12, with the principal learning
        # routes. Empty-state pages are valid when no bank exists for a scope.
        for cls, subjects in SCOPES.items():
            ctx, pg = setup()
            pg.locator('#topbar select[data-key="cls"]').select_option(str(cls))
            pg.wait_for_function('(c)=>+UP.S.cls===c', arg=cls)
            for sub in subjects:
                pg.locator('#topbar select[data-key="subject"]').select_option(sub)
                pg.wait_for_function('(s)=>UP.S.subject===s', arg=sub)
                pg.wait_for_timeout(350)
                for target in ('#/syllabus', '#/pyq?y=2025', '#/test', '#/today'):
                    nav(pg, target)
                print('SCOPE', cls, sub, 'OK', flush=True)
            ctx.close()

        # Representative board switches including a board with no supplied PYQs.
        ctx, pg = setup()
        for board in ('rajasthan', 'mp', 'cbse'):
            pg.locator('#topbar select[data-key="board"]').select_option(board)
            pg.wait_for_function('(b)=>UP.S.board===b', arg=board)
            pg.wait_for_timeout(450)
            for target in ('#/syllabus', '#/pyq?y=2025', '#/test', '#/today'):
                nav(pg, target)
            print('BOARD', board, 'OK', flush=True)
        ctx.close()

        # Mobile navigation and language switch.
        ctx, pg = setup(390, 844)
        assert pg.locator('#rail').get_attribute('aria-hidden') == 'true', 'closed mobile rail should be hidden from screen readers'
        pg.locator('#topbar [data-action="menu"]').click()
        assert pg.locator('body').evaluate("e=>e.classList.contains('rail-open')"), 'mobile menu did not open'
        assert pg.locator('#rail').get_attribute('aria-hidden') == 'false', 'open mobile rail remains aria-hidden'
        pg.locator('.rail select[data-key="cls"]').select_option('12')
        pg.wait_for_function('UP.S.cls === 12')
        pg.locator('.rail select[data-key="subject"]').select_option('accountancy')
        pg.wait_for_function('UP.S.subject === "accountancy"')
        pg.wait_for_timeout(350)
        pg.locator('.rail a[href="#/syllabus"]').first.click()
        pg.wait_for_timeout(250)
        assert '#/syllabus' in pg.url and pg.locator('#rail').get_attribute('aria-hidden') == 'true', 'mobile menu navigation/close failed'
        pg.locator('#topbar [data-action="menu"]').click()
        pg.locator('#railScrim').click(position={'x': 350, 'y': 400})
        assert pg.locator('#topbar [data-action="menu"]').get_attribute('aria-expanded') == 'false', 'mobile scrim did not close menu'
        pg.locator('#topbar [data-action="lang"]').click()
        pg.wait_for_function('UP.S.lang === "hi"')
        nav(pg, '#/pyq?y=2025')
        nav(pg, '#/test')
        print('MOBILE navigation/scope/language OK', flush=True)
        ctx.close()
        ctx, pg = setup(800, 900)
        pg.locator('#topbar [data-action="menu"]').click()
        pg.locator('.rail a[href="#/today"]').first.click()
        assert '#/today' in pg.url, 'tablet menu navigation failed'
        print('TABLET menu OK', flush=True)
        ctx.close()
        browser.close()

    print('PAGE ERRORS', errors, flush=True)
    print('BAD HTTP RESPONSES', bad_responses, flush=True)
    print('FAILED REQUESTS', failed_requests, flush=True)
    if errors or bad_responses or failed_requests:
        raise AssertionError('site smoke found browser or resource errors')
    print('Site guest route/scope smoke: PASS (not exhaustive)', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('FAIL:', exc, file=sys.stderr)
        raise
