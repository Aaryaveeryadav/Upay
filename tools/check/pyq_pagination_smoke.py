#!/usr/bin/env python3
"""Verify Past Years pagination covers the bank without splitting question groups.

Run against the local server with Playwright and Chromium installed.
This verifies navigation and scope, not transcription accuracy.
"""
import math
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8004').rstrip('/')


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage'])
        ctx = browser.new_context(service_workers='block')
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('**/api/tel', lambda r:r.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
        page.goto(BASE+'/', wait_until='networkidle', timeout=60000)
        page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")')
        page.locator('#topbar select[data-key="cls"]').select_option('12')
        page.wait_for_function('UP.S.cls===12')
        page.locator('#topbar select[data-key="subject"]').select_option('accountancy')
        page.wait_for_function('UP.S.subject==="accountancy"')
        expected = page.evaluate('''() => UP.pyq.filter(q=>q.subject==='accountancy' &&
          +q.cls===12 && (q.board||'cbse')==='cbse').map(q=>q.id)''')
        assert len(expected) == 1156 and len(set(expected)) == len(expected), len(expected)
        count = math.ceil(len(expected)/60)
        seen = []
        for i in range(1,count+1):
            page.evaluate('(i)=>location.hash=i===1?"#/pyq":"#/pyq?page="+i',i)
            page.wait_for_function('(i)=>document.querySelector(".pyq-page-label")?.textContent.includes("Page "+i+" /")',arg=i,timeout=30000)
            ids = page.locator('#view > .q-card').evaluate_all('(nodes)=>nodes.map(x=>x.id)')
            assert 0 < len(ids) <= 60,(i,len(ids))
            seen.extend(ids)
        assert len(seen)==len(set(seen))==len(expected) and set(seen)==set(expected), 'Pagination did not cover every Accountancy root exactly once'
        print(f'PASS all {len(expected)} in-scope Accountancy roots are reachable exactly once across {count} pages',flush=True)

        # Add a disposable fixture at a page boundary to ensure the parent and
        # both nested questions stay together. It exists only in browser memory.
        page.evaluate('''() => {
          const common={cls:12,subject:'accountancy',board:'cbse',y:2099,ch:101,m:0,d:0,opts:null,ans:''};
          for (let i=0;i<59;i++) UP.pyq.push({...common,id:'fixture-ordinary-'+i,q:i+1,en:'Ordinary exercise '+i});
          UP.pyq.push({...common,id:'fixture-parent',q:60,en:'Read the following passage and answer the following questions.'});
          UP.pyq.push({...common,id:'fixture-child-1',q:'i',en:'(i) What is item one?'});
          UP.pyq.push({...common,id:'fixture-child-2',q:'ii',en:'(ii) What is item two?'});
          UP.pyq.push({...common,id:'fixture-final',q:61,en:'Ordinary last exercise.'});
        }''')
        page.evaluate("location.hash='#/pyq?y=2099'")
        page.wait_for_function("document.querySelector('#fixture-parent') !== null")
        assert page.locator('.pyq-group #fixture-parent').count()==1
        assert page.locator('.pyq-group #fixture-child-1').count()==1
        assert page.locator('.pyq-group #fixture-child-2').count()==1
        assert page.locator('#fixture-final').count()==0
        page.locator('.pyq-pages [data-pyq-page="2"]').first.click()
        page.wait_for_function("document.querySelector('#fixture-final') !== null")
        assert page.locator('#fixture-parent').count()==0 and page.locator('#fixture-child-1').count()==0
        print('PASS passage parent and subquestions stay on the same page',flush=True)

        for param, wanted in [('0',1), ('-1',1), ('nonsense',1), ('9999',2)]:
            page.evaluate('(x)=>location.hash="#/pyq?y=2099&page="+x',param)
            page.wait_for_function('(n)=>document.querySelector(".pyq-page-label")?.textContent.includes("Page "+n+" /")',arg=wanted)
        assert not errors, errors
        print('PASS invalid and out-of-range page numbers are safely clamped',flush=True)
        ctx.close(); browser.close()
    print('Past Years pagination smoke: PASS (not a source audit)',flush=True)


if __name__ == '__main__':
    main()
