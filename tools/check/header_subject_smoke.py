#!/usr/bin/env python3
"""Check the top-bar board/class/subject selectors at desktop and phone sizes.

Run against the local Upay server or set UPAY_BASE to the hosted origin. Guest
only: the test does not create accounts or call a paid AI provider.
"""
import os
from playwright.sync_api import sync_playwright

BASE=os.environ.get('UPAY_BASE','http://127.0.0.1:8004').rstrip('/')
WIDTHS=(320,360,390,768,900,1024,1100,1280,1320,1366,1440)


def main():
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
        for width in WIDTHS:
            ctx=browser.new_context(viewport={'width':width,'height':850},service_workers='block')
            page=ctx.new_page()
            page.on('pageerror',lambda err:errors.append(str(err)))
            page.goto(BASE+'/',wait_until='networkidle',timeout=60000)
            page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")',timeout=30000)
            for key in ('board','cls','subject'):
                sel=page.locator(f'#topbar select[data-key="{key}"]')
                assert sel.count()==1 and sel.is_visible(),(width,key,'hidden')
                box=sel.bounding_box()
                assert box and box['width']>=30 and box['x']>=0 and box['x']+box['width']<=width+1,(width,key,box)
                assert sel.get_attribute('aria-label'),(width,key,'no accessible name')
            assert page.locator('#topbar a[href="#/login"]').is_visible(),(width,'no sign in')
            assert page.locator('#topbar .top-scope-pickers .hdr-pick-lbl').nth(2).is_visible(),(width,'no subject label')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),(width,'horizontal overflow')
            assert page.locator('.daily-reminder svg').bounding_box()['width'] <= 26,(width,'oversized reminder icon')
            print('PASS visible Board / Class / Subject and sign-in at',width,'px',flush=True)
            ctx.close()

        # Exercise the actual header selector and persistence on a small phone.
        ctx=browser.new_context(viewport={'width':390,'height':850},service_workers='block')
        page=ctx.new_page(); page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto(BASE+'/',wait_until='networkidle',timeout=60000)
        page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")')
        page.locator('#topbar select[data-key="cls"]').select_option('12')
        page.wait_for_function('UP.S.cls===12')
        page.wait_for_selector('#topbar select[data-key="subject"] option[value="accountancy"]',state='attached')
        page.locator('#topbar select[data-key="subject"]').select_option('accountancy')
        page.wait_for_function('UP.S.subject==="accountancy"')
        page.wait_for_function('document.querySelector("#rail select[data-key=subject]").value === "accountancy"')
        page.evaluate("location.hash='#/pyq?y=2023'")
        page.wait_for_function("document.querySelectorAll('#source-papers .source-paper-link').length===12")
        assert page.locator('#topbar select[data-key="subject"]').input_value()=='accountancy'
        page.locator('#topbar select[data-key="subject"]').select_option('computerized-accounting')
        page.wait_for_function('UP.S.subject==="computerized-accounting"')
        page.locator('#topbar select[data-key="board"]').select_option('mp')
        page.wait_for_function('UP.S.board==="mp"')
        page.reload(wait_until='networkidle',timeout=60000)
        page.wait_for_function('window.UP && UP.S && document.body.classList.contains("up-ready")')
        page.wait_for_function('UP.S.cls===12 && UP.S.board==="mp" && UP.S.subject==="computerized-accounting"')
        for key,value in [('cls','12'),('board','mp'),('subject','computerized-accounting')]:
            assert page.locator(f'#topbar select[data-key="{key}"]').input_value()==value,(key,value)
        page.locator('#topbar select[data-key="cls"]').select_option('10')
        page.wait_for_function('UP.S.cls===10 && UP.S.subject==="maths"')
        assert page.locator('#topbar select[data-key="subject"]').input_value()=='maths'
        assert page.locator('#topbar select[data-key="subject"] option[value="accountancy"]').count()==0
        page.locator('#topbar [data-action="lang"]').click()
        page.wait_for_function('UP.S.lang==="hi"')
        assert page.locator('#topbar select[data-key="subject"]').get_attribute('aria-label')=='विषय चुनिए'
        assert page.locator('#topbar .hdr-pick-lbl').nth(2).inner_text()=='विषय'
        print('PASS header changes scope, syncs with the rail, persists on reload and translates',flush=True)
        assert not errors,errors
        ctx.close();browser.close()
    print('Header subject selection smoke: PASS',flush=True)


if __name__=='__main__':
    main()
