#!/usr/bin/env python3
"""Service-worker privacy and offline-shell regression; no real user data."""
import json
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage'])
        ctx = browser.new_context(service_workers='allow')
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.route('**/api/tel', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
        # Seed caches before the app installs its worker. Unrelated applications'
        # data should survive; obsolete Upay-version caches should be cleaned up.
        pg.goto(BASE + '/assets/answers/maths.json', wait_until='load')
        pg.evaluate("""async () => {
          const other = await caches.open('other-application');
          await other.put('/unrelated-test', new Response('keep'));
          await caches.open('upay-v-obsolete-test');
        }""")
        pg.goto(BASE + '/', wait_until='networkidle', timeout=60000)
        pg.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")', timeout=60000)
        pg.wait_for_function('navigator.serviceWorker.controller !== null', timeout=30000)
        pg.locator('#topbar select[data-key="cls"]').select_option('12')
        pg.wait_for_function('UP.S.cls===12')
        pg.locator('#topbar select[data-key="subject"]').select_option('accountancy')
        pg.wait_for_function('UP.S.subject==="accountancy" && (UP.pyq||[]).filter(q=>q.paperCode && q.subject==="accountancy").length===1156', timeout=60000)
        # A controlled online reload populates public runtime assets for this scope.
        pg.reload(wait_until='networkidle', timeout=60000)
        pg.wait_for_function('UP.S.subject==="accountancy" && (UP.pyq||[]).filter(q=>q.paperCode && q.subject==="accountancy").length===1156', timeout=60000)
        online = pg.evaluate("""async () => {
          const r = await fetch('/api/auth/me');
          const pdf = await fetch('/assets/papers/accountancy/2023/67_1_1_Accountancy.pdf', {cache:'no-store'});
          const pdfBytes = (await pdf.arrayBuffer()).byteLength;
          const names = await caches.keys();
          const entries = [];
          for (const name of names) for (const req of await (await caches.open(name)).keys()) entries.push({name, url:req.url});
          return {status:r.status, pdfStatus:pdf.status, pdfBytes, names, entries};
        }""")
        assert online['status'] == 401, online
        assert online['pdfStatus'] == 200 and online['pdfBytes'] > 1000000, online
        assert 'other-application' in online['names'] and 'upay-v-obsolete-test' not in online['names'], online['names']
        assert not any('/api/' in entry['url'] for entry in online['entries']), online['entries']
        assert not any('/assets/papers/' in entry['url'] for entry in online['entries']), online['entries']
        assert any('pyq-accountancy-2023-2026-extracted.js' in entry['url'] for entry in online['entries'])
        ctx.set_offline(True)
        pg.reload(wait_until='domcontentloaded', timeout=30000)
        pg.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")', timeout=30000)
        pg.wait_for_function('UP.S.subject==="accountancy" && (UP.pyq||[]).filter(q=>q.paperCode && q.subject==="accountancy").length===1156', timeout=30000)
        offline = pg.evaluate("""async () => {
          const r=await fetch('/api/auth/me'); return {status:r.status, body:await r.json()};
        }""")
        assert offline['status'] == 503 and offline['body'].get('offline') is True, offline
        pg.evaluate("location.hash='#/pyq?y=2025'")
        pg.wait_for_function("document.querySelector('#view') && document.querySelector('#view').innerText.includes('2025')", timeout=30000)
        assert not errors, errors
        print('Service worker install, cache isolation, online warmup and Accountancy offline reload: PASS')
        browser.close()

if __name__ == '__main__':
    main()
