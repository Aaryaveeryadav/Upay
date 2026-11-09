#!/usr/bin/env python3
"""
Build chapter study-text from the supplied Class 12 chapter PDFs.

Reads the authoritative file catalogue from the JS data files, extracts each
PDF's text layer, cleans it, and writes TWO generated data files:

  assets/js/data/chapter-summary.js    -- lean study summary (lead + section
                                          outline + key expressions). Small
                                          enough for CRITICAL_CORE.
  assets/js/data/chapter-fulltext.js   -- cleaned full text per chapter, for
                                          the optional "Read the whole chapter"
                                          view. Lazy-loaded.

Nothing here touches assets/papers/ (test papers) or any question record.

Usage:
  python3 tools/extract/build-chapter-text.py            # write data files
  python3 tools/extract/build-chapter-text.py --report   # print a QC table
"""

import argparse
import json
import os
import re
import sys
import warnings

warnings.filterwarnings('ignore')

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit('pypdf is required:  pip install pypdf')

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SUMMARY_OUT = os.path.join(ROOT, 'assets/js/data/chapter-summary.js')
FULLTEXT_OUT = os.path.join(ROOT, 'assets/js/data/chapter-fulltext.js')
CACHE = os.path.join(ROOT, 'tools/extract/.chapter-text-cache.json')

# --------------------------------------------------------------------------
# 1. Catalogue: read id -> pdf from the existing source JS, so we never guess.
# --------------------------------------------------------------------------

def load_catalogue():
    """Parse UP.english12Sources / UP.economicsSources out of the JS files."""
    out = []

    def read(path):
        with open(os.path.join(ROOT, path), encoding='utf-8') as fh:
            return fh.read()

    for path, kind in (('assets/js/data/english12-sources.js', 'english'),
                       ('assets/js/data/economics-sources.js', 'economics')):
        src = read(path)
        # The arrays are a list of plain JSON object literals.
        for m in re.finditer(r'\{\s*"id".*?\}', src, re.S):
            try:
                rec = json.loads(m.group(0))
            except json.JSONDecodeError:
                continue
            rec['_kind'] = kind
            out.append(rec)
    return out


# --------------------------------------------------------------------------
# 2. Cleaning
# --------------------------------------------------------------------------

# Running headers/footers and print junk that appears on every NCERT page.
JUNK_PATTERNS = [
    r'^\s*Chap\s*\d*\.?\s*indd.*$',
    r'^\s*\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\s*$',
    r'^\s*Reprint\s+20\d\d[-\u2013]\d\d\s*$',
    r'^\s*(?:NOT TO BE REPUBLISHED|not to be republished).*$',
    r'^\s*Rationalised\s+20\d\d[-\u2013]\d\d\s*$',
    r'^\s*\u00a9\s*NCERT.*$',
    r'^\s*\d{1,3}\s*$',
]
JUNK_RE = re.compile('|'.join(JUNK_PATTERNS), re.I)

# A running head such as "The Last Lesson/3" or "4/Flamingo".
RUNHEAD_RE = re.compile(r'^(?:[\w\s\'’&.,\-]{2,42}/\d{1,3}|\d{1,3}/[\w\s\'’&.,\-]{2,42})\s+')

SMART = {
    '\u2019': "'", '\u2018': "'", '\u201c': '"', '\u201d': '"',
    '\u2013': '-', '\u2014': ' - ', '\u00a0': ' ', '\u00ad': '',
}

# An inline running head, e.g. "20/Flamingo" or "The Last Lesson/3".
INLINE_RUNHEAD = re.compile(
    r"(?:\b\d{1,3}/[A-Z][A-Za-z' \-&.,]{1,26}\b|\b[A-Z][A-Za-z'’ \-&.,]{1,26}/\d{1,3}\b)")


def clean_lines(raw):
    """Normalise and drop print junk. Returns a list of lines (blank kept)."""
    t = raw
    for a, b in SMART.items():
        t = t.replace(a, b)
    # Wingdings bullets live in the private-use area.
    t = re.sub(r'[\uf000-\uf8ff]', 'BULLET', t)
    t = t.replace('\u25a1', ' ')          # stray box glyph

    kept = []
    for line in t.split('\n'):
        line = line.rstrip()
        if not line.strip():
            kept.append('')
            continue
        if JUNK_RE.match(line):
            continue
        kept.append(line)
    return kept


# --------------------------------------------------------------------------
# 3. Summary derivation (extractive - no model involved)
# --------------------------------------------------------------------------

# Textbook section labels. Matched case-insensitively, whole phrase only.
HEADING_HINTS = re.compile(
    r'^(about the author|before you read|understanding the text|talking about the text|'
    r'working with words|noticing form|thinking about language|writing|speaking|'
    r'things to do|exercises?|summary|introduction|conclusion|'
    r'key concepts|glossary|in text questions|let us recall|'
    r'know the difference|know more|do you know|points to remember|recap|'
    r'reading comprehension|note ?making|abstract|aim|procedure|observation)'
    r'\s*[:.]?\s*$', re.I)
# Economics textbook style: "1.1 A SIMPLE ECONOMY", "2.3 THE CONSUMER'S BUDGET"
NUMBERED_HEADING = re.compile(r'^\d{1,2}\.\d{1,2}[.)]?\s+\S')
CHAPTER_HEADING = re.compile(r'^Chapter\s*\d{1,2}$', re.I)
ALLCAPS_HEADING = re.compile(r"^[A-Z][A-Z0-9 ,'\-&()/]{3,58}$")
TOC_LINE = re.compile(r'^(.{2,60}?)\s{2,}\d{1,3}$')


def looks_like_toc(p):
    """A paragraph that is really the book's contents page.

    Only dot-leader / page-number runs count. An earlier version also dropped
    any long paragraph that merely mentioned two chapter names, which silently
    deleted real body text from the Economics chapters.
    """
    return len(TOC_LINE.findall(p)) >= 3


def dedupe_repeat(line):
    """Collapse overprinted headings.

    'National Income AccountingNational Income Accounting...' and
    'Introduction IntroductionIntroduction' both come out of NCERT PDFs
    because the heading is drawn once per text run.
    """
    s = line
    # Whole-phrase repetition, possibly with no space between repeats.
    for _ in range(4):
        n = len(s)
        cut = False
        for size in range(4, n // 2 + 1):
            unit = s[:size]
            rest = s[size:]
            while rest.startswith(unit):
                rest = rest[len(unit):]
            if not rest.strip() and n // size >= 2:
                s, cut = unit.strip(), True
                break
        if not cut:
            break
    # Word-level repetition: "Word WordWord Word"
    s = re.sub(r"\b([A-Za-z][A-Za-z'\-]{2,})(?:[ ]*\1\b)+", r"\1", s)
    return s


def is_junk_font_line(line):
    """Teacher-note fonts produce mixed-case words like 'noTiCing' / 'abouT'.

    Short lines carrying any such token are the duplicated teacher-notes
    headings, never real prose, so drop them.
    """
    toks = re.findall(r"[A-Za-z]+", line)
    weird = sum(1 for t in toks if re.search(r'[a-z][A-Z]', t))
    if weird >= 2:
        return True
    return weird >= 1 and len(toks) <= 6


def glued_heading(line):
    """Split a heading glued to following prose, e.g.
    'OF CALCULATING NATIONAL INCOME The description of ...'."""
    m = re.match(r"^((?:[A-Z][A-Z0-9 ,'\-&/()]{3,58})[A-Z])\s+(.{40,})$", line)
    if not m:
        return None
    head, rest = m.group(1).strip(), m.group(2)
    if len(head.split()) < 2 or len(head.split()) > 9:
        return None
    if not rest[:1].isupper():
        return None
    if re.search(r'[=\u2212*]', head):
        return None
    return head, rest


def is_heading(line):
    """A line that is a section/chapter heading rather than body prose."""
    s = line.strip()
    if not s or len(s) > 90 or len(s) < 3:
        return False
    if s.endswith(('.', ',', ';', ':')) and not HEADING_HINTS.match(s):
        return False
    if HEADING_HINTS.match(s):
        return len(s.split()) <= 6
    if CHAPTER_HEADING.match(s) or NUMBERED_HEADING.match(s):
        return True
    words = s.split()
    # A formula/notation line has no lowercase words and no sentence shape.
    if len(words) <= 3 and re.search(r'[=\u2212+\u00d7\u00f7]', s):
        return False
    # Equation working: bare capital letters used as variables ("NFIA D GDP").
    if any(len(w) == 1 and w.isalpha() for w in words):
        return False
    # Headings are mostly letters, not symbols/digits.
    letters = sum(c.isalpha() for c in s)
    if letters < 0.6 * len(s):
        return False
    # Equation working: a run of bare acronyms ("GDP GNP NNP", "NDP NFIA NNP").
    acronyms = sum(1 for w in words if 2 <= len(w) <= 5 and w.isupper())
    if acronyms >= 2 and acronyms >= len(words) - 1:
        return False
    if (len(words) <= 9 and ALLCAPS_HEADING.match(s)
            and s == s.upper() and re.search(r'[A-Z]{3}', s)):
        return True
    return False


def join_split_heading(lines):
    """Join a heading that the PDF broke over two lines.

    '2.2 CIRCULAR FLOW OF INCOME AND METHODS' + 'OF CALCULATING NATIONAL INCOME'
    arrives as two separate lines.
    """
    out, i = [], 0
    while i < len(lines):
        cur = lines[i]
        nxt = None
        for j in range(i + 1, min(i + 4, len(lines))):
            if lines[j].strip():
                nxt = lines[j]
                break
        if (nxt and is_heading(cur) and is_heading(nxt)
                and not NUMBERED_HEADING.match(nxt)
                and not HEADING_HINTS.match(nxt)
                and cur.upper() == cur and nxt.upper() == nxt
                and 2 <= len(nxt.split()) <= 7):
            out.append((cur.rstrip() + ' ' + nxt.strip()).strip())
            i += 2
            continue
        out.append(cur)
        i += 1
    return out


def sentences(text, n=2, cap=260):
    parts = re.split(r'(?<=[.!?])\s+', text)
    out = ' '.join(parts[:n]).strip()
    if len(out) > cap:
        out = out[:cap].rsplit(' ', 1)[0] + '...'
    return out


def split_paragraphs(lines):
    """Reflow wrapped lines into paragraphs, keeping heading lines separate."""
    lines = join_split_heading([l for l in lines])
    paras, buf = [], []

    def flush():
        if buf:
            paras.append(' '.join(buf))
            buf.clear()

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            flush()
            continue
        if is_junk_font_line(line):
            flush()
            continue
        if 'BULLET' in line:
            flush()
            line = re.sub(r'BULLET\s*', '', line).strip()
            if not line:
                continue
        glued = glued_heading(line)
        if glued:
            flush()
            paras.append(glued[0])
            buf.append(glued[1])
            continue
        if is_heading(line):
            flush()
            paras.append(line)
            continue
        buf.append(line)
    flush()

    out = []
    for p in paras:
        p = re.sub(r'\s{2,}', ' ', p).strip()
        p = INLINE_RUNHEAD.sub(' ', p).strip()
        p = dedupe_repeat(p)
        p = re.sub(r'\s{2,}', ' ', p).strip()
        if len(p) > 2:
            out.append(p)
    return out


# Hindi NCERT PDFs on this project use a legacy KrutiDev-style font: the text
# layer is Latin look-alikes, not Unicode Devanagari. These markers appear
# constantly in that encoding and never in English prose.
KRUTIDEV_MARKERS = ('vk;', ' osQ ', 'gS', ' dk ', 'esa ', 'gksrk', 'fd;k', 'ds ')


def is_legacy_hindi(text):
    hits = sum(text.count(m) for m in KRUTIDEV_MARKERS)
    deva = sum(1 for c in text[:4000] if '\u0900' <= c <= '\u097f')
    if deva > 50:
        return False                     # real Unicode Devanagari
    return hits > 12


BAD_KEY = re.compile(
    r'\d|\b(what|why|how|explain|discuss|describe|answer|question|exercise|'
    r'activity|the|and|from|does|would|should)\b', re.I)


def key_expressions(paras):
    """Pick up the 'Notice these expressions' vocabulary list (prose only)."""
    found, grab, budget = [], False, 0
    for p in paras:
        if re.search(r'notice these expressions', p, re.I):
            grab = True
            p = re.sub(r'^.*?notice these expressions[^.]*\.?', '', p, flags=re.I)
            budget = 4                       # only look a few paragraphs ahead
        if not grab:
            continue
        if budget <= 0 or is_heading(p):
            grab = False
            continue
        budget -= 1
        # The list is laid out in two columns, so entries arrive separated by
        # wide gaps or bullets rather than one per line.
        for bit in re.split(r'\u2022|\s{2,}', p):
            bit = bit.strip(' .;,-')
            bit = re.sub(r'^\d+[).]\s*', '', bit)
            words = bit.split()
            if not (2 < len(bit) < 48 and 1 <= len(words) <= 6):
                continue
            if BAD_KEY.search(bit) or bit[:1].isupper():
                continue
            if bit not in found:
                found.append(bit)
        if len(found) >= 10:
            break
    return found[:10]


def derive_summary(paras, meta):
    """lead + section outline + key expressions + stats. Extractive only."""
    body = [p for p in paras if not looks_like_toc(p)]

    lead_parts, seen = [], 0
    for p in body:
        if is_heading(p):
            continue
        if HEADING_HINTS.match(p) and len(p) < 60:
            continue
        if len(p) < 80:
            continue
        lead_parts.append(p)
        seen += len(p.split())
        if seen > 90:
            break
    lead = dedupe_repeat(' '.join(lead_parts))
    title = (meta.get('title') or '').strip()
    if title and lead.lower().startswith(title.lower()):
        lead = lead[len(title):].lstrip(' .:-')
    if len(lead) > 520:
        lead = lead[:520].rsplit(' ', 1)[0] + '...'

    sections = []
    for i, p in enumerate(body):
        if not is_heading(p):
            continue
        if CHAPTER_HEADING.match(p) or len(p.split()) <= 2:
            continue                      # skip the bare chapter title
        gist = ''
        for nxt in body[i + 1:i + 4]:
            if is_heading(nxt) or len(nxt) < 40:
                continue
            gist = sentences(nxt, 2, 230)
            break
        sections.append({'t': p.strip(' .:')[:80], 'g': gist})
        if len(sections) >= 10:
            break

    words = sum(len(p.split()) for p in body)
    return {
        'lead': lead,
        'sections': sections,
        'key': key_expressions(body),
        'words': words,
        'readMin': max(1, round(words / 200)),
        'paras': len(body),
    }


# --------------------------------------------------------------------------
# 4. Build
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--report', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--no-pdf', action='store_true',
                    help='do not read PDFs; only regenerate from the extracted text')
    args = ap.parse_args()

    cat = load_catalogue()
    if args.limit:
        cat = cat[:args.limit]

    # The chapter PDFs are removed from the repo, so a later rebuild must be
    # able to run without them. The cache holds the cleaned paragraphs.
    cache = {}
    if os.path.exists(CACHE):
        with open(CACHE, encoding='utf-8') as fh:
            cache = json.load(fh)

    summaries, fulltext, rows, failures = {}, {}, [], []

    for rec in cat:
        rel = rec.get('file', '').lstrip('/')
        path = os.path.join(ROOT, rel)
        if args.no_pdf or not os.path.exists(path):
            cached = cache.get(rec['id'])
            if not cached:
                failures.append((rec.get('id'), 'missing file ' + rel))
                continue
            meta = cached['meta']
            if cached.get('available') is False:
                summaries[rec['id']] = dict(meta, available=False,
                                            reason='legacy-encoding', lead='',
                                            sections=[], key=[], words=0,
                                            readMin=0, paras=0)
                rows.append((rec['id'], meta.get('pages'), 0, 0, 0, 0))
            else:
                summaries[rec['id']] = dict(meta, available=True, **cached['summary'])
                fulltext[rec['id']] = dict(meta, paras=cached['paras'])
                sm = cached['summary']
                rows.append((rec['id'], meta.get('pages'), 0, sm['words'],
                             len(sm['sections']), len(sm['key'])))
            continue
        try:
            reader = PdfReader(path)
            raw = '\n'.join((pg.extract_text() or '') for pg in reader.pages)
        except Exception as exc:                       # noqa: BLE001
            failures.append((rec.get('id'), 'read error: %s' % exc))
            continue

        paras = split_paragraphs(clean_lines(raw))
        if not paras:
            failures.append((rec.get('id'), 'no text layer'))
            continue
        # Legacy-font Hindi cannot be rendered as-is; record it as unavailable
        # rather than shipping mojibake into the study view.
        if rec.get('lang') == 'hi' and is_legacy_hindi(raw):
            failures.append((rec.get('id'), 'legacy KrutiDev encoding - skipped'))
            summaries[rec['id']] = {
                'id': rec['id'], 'pages': rec.get('pages'), 'book': rec.get('book'),
                'section': rec.get('section'), 'chapter': rec.get('chapter'),
                'chapterId': rec.get('chapterId'), 'lang': 'hi',
                'available': False, 'reason': 'legacy-encoding',
                'lead': '', 'sections': [], 'key': [], 'words': 0,
                'readMin': 0, 'paras': 0,
            }
            rows.append((rec['id'], rec.get('pages'), len(raw), 0, 0, 0))
            continue

        meta = {
            'id': rec['id'],
            'title': '',
            'pages': rec.get('pages'),
            'book': rec.get('book'),
            'section': rec.get('section'),
            'chapter': rec.get('chapter'),
            'chapterId': rec.get('chapterId'),
            'lang': rec.get('lang', 'en'),
        }
        sumry = derive_summary(paras, meta)
        summaries[rec['id']] = dict(meta, available=True, **sumry)
        fulltext[rec['id']] = dict(meta, paras=paras)
        rows.append((rec['id'], rec.get('pages'), len(raw), sumry['words'],
                     len(sumry['sections']), len(sumry['key'])))

    if args.report:
        print(f"{'sourceId':26} {'pg':>3} {'raw':>7} {'words':>6} {'sec':>4} {'key':>4}")
        for r in rows:
            print(f'{r[0]:26} {str(r[1]):>3} {r[2]:>7} {r[3]:>6} {r[4]:>4} {r[5]:>4}')
        print(f'\nok={len(rows)}  failed={len(failures)}')
        for f in failures:
            print('  FAIL', f)
        return

    cache_out = {}
    for sid, s in summaries.items():
        entry = {'meta': {k: s.get(k) for k in
                          ('id', 'pages', 'book', 'section', 'chapter',
                           'chapterId', 'lang', 'title')}}
        if s.get('available') is False:
            entry['available'] = False
        else:
            entry['summary'] = {k: s[k] for k in
                                ('lead', 'sections', 'key', 'words',
                                 'readMin', 'paras')}
            entry['paras'] = fulltext[sid]['paras']
        cache_out[sid] = entry
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, 'w', encoding='utf-8') as fh:
        json.dump(cache_out, fh, ensure_ascii=False, separators=(',', ':'))
    print('cache: %s (%.0f KB)' % (os.path.relpath(CACHE, ROOT),
                                   os.path.getsize(CACHE) / 1024))

    def write(path, varname, payload):
        body = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write('/* GENERATED by tools/extract/build-chapter-text.py.\n')
            fh.write('   Do not edit by hand: re-run the script instead.\n')
            fh.write('   Extracted from the supplied Class 12 chapter PDFs. */\n')
            fh.write('window.UP = window.UP || {};\n')
            fh.write(f'{varname} = {body};\n')
        return len(body)

    s_size = write(SUMMARY_OUT, 'UP.chapterSummary', summaries)
    f_size = write(FULLTEXT_OUT, 'UP.chapterFullText', fulltext)

    print(f'chapters: {len(rows)}')
    print(f'{os.path.relpath(SUMMARY_OUT, ROOT)}  {s_size/1024:.0f} KB')
    print(f'{os.path.relpath(FULLTEXT_OUT, ROOT)}  {f_size/1024:.0f} KB')
    if failures:
        print('failures:')
        for f in failures:
            print('  ', f)


if __name__ == '__main__':
    main()
