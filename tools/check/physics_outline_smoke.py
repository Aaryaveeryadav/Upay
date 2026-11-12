#!/usr/bin/env python3
"""Read-only Physics outline/figure smoke. Not a question-bank or live-provider audit.

Set UPAY_BASE to the server and optionally UPAY_CHROMIUM to a browser executable.
"""
import os
from playwright.sync_api import sync_playwright
BASE = os.environ.get("UPAY_BASE", "http://127.0.0.1:8004").rstrip("/")
with sync_playwright() as p:
 options = {'headless': True, 'args': ['--disable-dev-shm-usage']}
 if os.environ.get('UPAY_CHROMIUM'):
  options['executable_path'] = os.environ['UPAY_CHROMIUM']
 b=p.chromium.launch(**options)
 page=b.new_page();errors=[];bad=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 and r.url.startswith(BASE + '/') else None)
 page.goto(BASE + '/',wait_until='networkidle')
 page.wait_for_function('() => window.UP && UP.S && document.body.classList.contains("up-ready")')
 page.locator('#topbar select[data-key="cls"]').select_option('12')
 page.locator('#topbar select[data-key="subject"]').select_option('physics')
 page.wait_for_function('() => UP.S.subject === "physics" && UP.physicsOutlines')
 page.wait_for_timeout(800)
 assert page.evaluate('() => UP.pyqQuestionText({en:"A 1000 W heater",cleanText:true})')=='A 1000 W heater'
 assert page.evaluate('() => UP.pyqQuestionText({en:"A 1000 W heater"})')=='A 1000 W heater'
 counts = [31,31,20,23,8,16,17,6,30,18,5,8,2,20]
 for width in (1280,390):
  page.set_viewport_size({'width':width,'height':844})
  for n in range(601,615):
   page.evaluate('(id) => location.hash = "#/chapter/" + id',n)
   page.wait_for_function('() => document.querySelector(".outline-panel") !== null && document.querySelector("#view").innerText.includes("Outline only")')
   page.wait_for_timeout(100)
   assert 'Outline only' in page.locator('#view').inner_text(), n
   imgs=page.locator('.sci-figgrid img');assert imgs.count()==counts[n-601], (width,n,imgs.count())
   imgs.evaluate_all('(els) => els.forEach(e => e.loading="eager")')
   page.wait_for_function('() => [...document.querySelectorAll(".sci-figgrid img")].every(i=>i.complete && i.naturalWidth>0)')
   assert page.locator('a[href="/assets/notes/index.html#figures-phy"]').count()>0
   assert page.locator('.sci-figgrid').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (width,n)
  print(f'PASS {width}px: all 14 Physics outlines; all 235 images load without figure-grid overflow; inventory links; 1000 W preserved')
 assert not errors,errors
 assert not bad,bad
 print('PASS no browser exceptions or same-origin HTTP errors in Physics checks')
 b.close()
