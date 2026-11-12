#!/usr/bin/env python3
"""Ensure retired dark preferences cannot override the light-only site."""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('UPAY_BASE', 'http://127.0.0.1:8005').rstrip('/')
with sync_playwright() as p:
    options = {'headless': True, 'args': ['--disable-dev-shm-usage']}
    if os.environ.get('UPAY_CHROMIUM'):
        options['executable_path'] = os.environ['UPAY_CHROMIUM']
    browser = p.chromium.launch(**options)
    for scheme in ('light', 'dark'):
        context = browser.new_context(color_scheme=scheme, service_workers='block')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until='networkidle')
        page.evaluate('''() => {
            localStorage.setItem('upay.dark', 'true');
            localStorage.setItem('upay.largeText', 'true');
        }''')
        page.reload(wait_until='networkidle')
        page.wait_for_function('() => document.body.classList.contains("up-ready")')
        assert page.evaluate('() => localStorage.getItem("upay.dark")') is None
        assert not page.locator('html').evaluate('(el) => el.classList.contains("upay-dark")')
        assert page.locator('html').evaluate('(el) => getComputedStyle(el).colorScheme') == 'light'
        assert page.locator('html').evaluate('(el) => el.classList.contains("upay-large")')
        for width in (1280, 390):
            page.set_viewport_size({'width': width, 'height': 844})
            page.evaluate('() => location.hash = "#/saved"')
            page.wait_for_selector('[data-toggle="large"]')
            assert page.locator('[data-toggle="dark"]').count() == 0
            assert page.locator('[data-toggle="large"]').is_checked()
            page.locator('[data-toggle="large"]').uncheck()
            assert not page.locator('html').evaluate('(el) => el.classList.contains("upay-large")')
            page.locator('[data-toggle="large"]').check()
            assert page.locator('[data-toggle="dyslexic"]').count() == 1
        assert not errors, errors
        print(f'PASS {scheme} device preference: light-only, saved dark setting cleared, no dark toggle, accessibility preserved at desktop/mobile widths')
        context.close()
    browser.close()
