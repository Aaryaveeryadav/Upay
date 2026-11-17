#!/usr/bin/env python3
"""Audit the owner-supplied Hindi practice papers and marking schemes.

What this does
--------------
1. **Judges the text layer first.** Several of these files were typeset with the
   legacy *Kokila* font or with subsetted *Nirmala UI* fonts whose ToUnicode
   table is wrong. The extracted "Devanagari" is then *shifted*: it looks like
   Hindi but characters are wrong -- ``ल`` comes out as ``ि``, ``भि`` as
   ``शि``, ``हिं`` as ``त ं``, ``दो`` as ``र्दो``. A Devanagari syllable can
   never begin with a dependent vowel sign, and clusters such as ``शि`` cannot
   occur, so such files are detected mechanically by
   :func:`glyph_report`. Anything that fails that test is *never* transcribed
   into the question bank: the extracted string is not the printed text.
2. **Reads structure, which survives** even when the Hindi does not, because
   question numbers, sub-part letters and key letters are Latin/digit runs.
   That yields an exact *printed* count for every paper and scheme without
   trusting a single corrupted word.
3. **Classifies** each file as a question paper (QP) or marking scheme (MS)
   from its own parsed structure and headings, and records the identity it
   prints (code, series, set, session, marks, printed pages, printed question
   count).
4. **Matches keys to questions only when everything agrees**: faithful text on
   both sides, the same printed paper identity, aligned question/part numbers,
   and the printed key's option text actually occupying the printed letter's
   slot. Anything else is reported as unresolved. No key is ever inferred, and
   nothing is written into the bank by this tool.
5. **Cross-checks the shipped Hindi bank** so a "missing question" claim is only
   made after looking.

Usage
-----
::

    python3 tools/extract/hindi_practice_papers.py --pdf-dir <dir> [--json out.json]

Requires ``pymupdf``. The PDFs are not committed; only this tool, its JSON
report and the derived fixture are.
"""
from __future__ import annotations

import argparse
import difflib
import glob
import hashlib
import json
import os
import re
import sys
import unicodedata

try:
    import pymupdf
except ImportError:  # pragma: no cover - environment guard
    try:
        import fitz as pymupdf  # type: ignore
    except ImportError:
        raise SystemExit('pymupdf is required: pip install pymupdf')

DEVANAGARI = re.compile(r'[\u0900-\u097f]')
DEV_WORD = re.compile(r'[\u0900-\u097f\u200d]+')

# A Devanagari syllable can never start with a dependent vowel sign, a virama,
# an anusvara/visarga, a candrabindu or a nukta.
IMPOSSIBLE_INITIAL = set('ािीुूृॄेैोौंःँ़्')

# Detectors for the font shifts seen in these files. They are used only to
# *detect* damage; this tool never rewrites text with them.
SHIFT_SIGNATURES = [
    ('word-initial-ल-emitted-as-ि', re.compile(r'(?<![\u0900-\u097f])ि')),
    ('word-initial-matra', re.compile(r'(?<![\u0900-\u097f])[ाीुूृेैोौंःँ]')),
    ('नहीं-emitted-as-नहीों', re.compile('नहीों')),
    ('लिए-emitted-as-शलए', re.compile('शलए')),
    ('अभिव्यक्त-emitted-as-अशिव्यक्त', re.compile('अशिव्यक्त')),
    ('होता/कितने-emitted-as-होिा/कििे', re.compile('होिा|कििे|कििा')),
    ('लैसे/लोग-emitted-as-िैसे/िोग', re.compile('िैसे|िोग|िेककन')),
    ('हिंदी/व्याकरण-emitted-as-त ंदी/र्ा', re.compile('त ंदी|व िंदी|र्ा')),
    ('द-emitted-as-र्द', re.compile('र्द')),
    ('क्ष-emitted-as-ठ', re.compile('ठि|ठक|ठश')),
]
SHIFT_THRESHOLD = 1

PART_INDEX = {'क': 1, 'ख': 2, 'ग': 3, 'घ': 4, 'ङ': 5}
QP_HEAD = re.compile(r'^प्रश्.{0,2}?\s*[-–]?\s*(\d{1,2})\s*[\.।:)]?(?:\s|$)')
MS_HEAD = re.compile(r'^प्रश्.{0,2}?\s*[-–]?\s*(\d{1,2})(?:\s*[\.।:)]|\s|$)')
A_OPTION = re.compile(r'^([A-D])\.\s*(.*)$')
A_PART = re.compile(r'^([क-ङ])\.\s*(.*)$')
# Hindi B prints "(क) stem" instead of "क. stem".
B_PART = re.compile(r'^\(([क-ङ])\)\s*(.*)$')
B_OPTION = re.compile(r'^\(([A-D])\)\s*(.*)$')
# The 2021-22 Course A practice paper numbers sub-parts (i)…(x) and prints
# its options as (क)…(घ).
ROMAN_PART = re.compile(r'^\(([ivx]{1,3})\)\s*(.*)$')
DEV_OPTION = re.compile(r'^\(([क-घ])\)\s*(.*)$')
LOW_OPTION = re.compile(r'^\(([a-d])\)\s*(.*)$')
ROMAN_INDEX = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7,
               'viii': 8, 'ix': 9, 'x': 10, 'xi': 11, 'xii': 12}
PRINTED_COUNT = re.compile(r'(\d{1,2})\s*प्रश्.{0,3}\s*(?:हैं|है|ह¢)')
PAGE_CLAIM = re.compile(r'मुद्रित\s*पृष्ठ\s*(\d{1,2})')


def norm_word(text: str) -> str:
    text = unicodedata.normalize('NFKC', text or '')
    return re.sub(r'[^\w\u0900-\u097f]+', '', text).lower()


def sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def glyph_report(text: str) -> dict:
    """Decide mechanically whether the extracted text is a faithful transcript."""
    words = DEV_WORD.findall(text)
    bad_initial = sum(1 for w in words if w and w[0] in IMPOSSIBLE_INITIAL)
    signatures = {name: len(pattern.findall(text)) for name, pattern in SHIFT_SIGNATURES}
    hits = {name: count for name, count in signatures.items() if count >= SHIFT_THRESHOLD}
    faithful = bool(words) and bad_initial == 0 and not hits
    return {
        'devanagariChars': len(DEVANAGARI.findall(text)),
        'latinLetters': len(re.findall(r'[A-Za-z]', text)),
        'devanagariWords': len(words),
        'impossibleInitialWords': bad_initial,
        'signatures': hits,
        'faithful': faithful,
    }


# ------------------------------------------------------------------ question paper
def print_style(text: str) -> dict:
    """What convention does this paper print? Detected from wrapping glyphs."""
    part = re.findall(r'(?<![\(\u0900-\u097f])[क-ङ]\.', text)
    part_paren = re.findall(r'\([क-ङ]\)', text)
    opt = re.findall(r'(?<![A-Za-z])[A-D]\.(?=\s)', text)
    opt_paren = re.findall(r'\([A-D]\)', text)
    return {
        'part': 'dot' if len(part) >= len(part_paren) else 'paren',
        'option': 'dot' if len(opt) >= len(opt_paren) else 'paren',
        'partDot': len(part), 'partParen': len(part_paren),
        'optionDot': len(opt), 'optionParen': len(opt_paren),
    }


def parse_qp(lines):
    """Return [{q, sub, stem, opts}] for MCQ sub-parts that printed four options.

    Three printed styles occur: Hindi A/Course A use ``क. stem`` with ``A. text``
    options, Hindi B uses ``(क) stem`` with ``(A) text`` options, and the 2021-22
    Course A paper uses ``(i) stem`` with ``(क)`` options. All three are read, so
    a paper is counted whatever convention it prints.
    """
    items, qno, part, stem, opts = [], None, None, [], []

    def flush():
        nonlocal stem, opts
        if qno is not None and part is not None and 3 <= len(opts) <= 5:
            items.append({'q': qno, 'sub': part, 'stem': ' '.join(stem).strip(),
                          'opts': [o.strip() for o in opts]})
        stem, opts = [], []

    for raw in lines:
        line = raw.strip()
        head = QP_HEAD.match(line)
        if head:
            flush()
            num = int(head.group(1))
            qno, part = (num if num <= 20 else None), None
            continue
        if qno is None:
            continue
        option = (A_OPTION.match(line) or B_OPTION.match(line) or LOW_OPTION.match(line)
                  or DEV_OPTION.match(line))
        if option:
            opts.append(option.group(2))
            continue
        rom = ROMAN_PART.match(line)
        if rom and rom.group(1) in ROMAN_INDEX:
            if part is not None:
                flush()
            part, stem = ROMAN_INDEX[rom.group(1)], [rom.group(2)]
            continue
        pm = (B_PART if line[:1] == '(' else A_PART).match(line)
        if pm:
            if part is not None:
                flush()
            part, stem = PART_INDEX[pm.group(1)], [pm.group(2)]
            continue
        if part is not None and len(opts) <= 4:
            stem.append(line)
        elif len(opts) >= 3:
            flush()
            part = None
    flush()
    return items


def count_option_blocks(lines) -> dict:
    """Count MCQ blocks that print four options in order.

    Independent of how the paper numbers its questions: the 2021-22 paper and
    both "अभ्यास" sets print bare sub-numbers, so a slot-by-slot reading is not
    always possible. A run of four option letters in order is still a
    structural fact about the page, and it bounds how many MCQs the paper
    prints. Nothing here reads a question's meaning.
    """
    latin = re.compile(r'^[\(]?([a-dA-D])[\)\.]?\s+\S')
    dev = re.compile(r'^[\(]?([क-घ])[\)\.]?\s+\S')
    latin_seq, dev_seq = [], []
    for raw in lines:
        line = raw.strip()
        m = latin.match(line)
        if m:
            latin_seq.append(m.group(1).lower())
            continue
        m = dev.match(line)
        if m:
            dev_seq.append('कखगघ'.index(m.group(1)))
    def runs(seq, order):
        out, i = 0, 0
        while i + 4 <= len(seq):
            if seq[i:i + 4] == order:
                out += 1
                i += 4
            else:
                i += 1
        return out
    return {'latinOptionTokens': len(latin_seq),
            'latinFourOptionBlocks': runs(latin_seq, ['a', 'b', 'c', 'd']),
            'devanagariOptionTokens': len(dev_seq),
            'devanagariFourOptionBlocks': runs(dev_seq, [0, 1, 2, 3])}


# ------------------------------------------------------------------ marking scheme
DOTTED_Q = re.compile(r'^(\d{1,2})\.(\d{1,2})$')
KEY_LETTER = re.compile(r'^\(([a-dA-D])\)\s*(.*)$')
PART_KEY = re.compile(r'^([क-ङ])\.\s*([A-D])\.?\s*(.*)$')
ROW_Q = re.compile(r'^(\d{1,2})$')
ROW_KEY = re.compile(r'^\(([a-dA-D])\)\s*(.*)$')
INLINE_ROW = re.compile(r'^(\d{1,2})\s*\(([a-dA-D])\)\s*(.*)$')
PAREN_KEY = re.compile(r'^\((\d{1,2})\)\s*\(([A-D])\)\s*(.*)$')
PAREN_Q_SPLIT = re.compile(r'^\((\d{1,2})\)\s*$')
PAREN_KEY_SPLIT = re.compile(r'^\(([A-D])\)\s*(.*)$')
MARKS_ONLY = re.compile(r'^[\d\.\s]+$')
SECTION_KEY_END = re.compile(r'खंड\s*[‘\'\"]?\s*ब')   # Section B begins the descriptive half


def parse_scheme(lines) -> dict:
    """Parse the printed MCQ-key layouts; report the best-scoring one.

    Layouts in use: ``1.1`` + ``(d) text``; ``क. C text`` under ``प्रश्न 1``;
    ``1`` + ``(a) text``; ``(1) (A) text``. Parsing stops where Section B (the
    descriptive half) begins, because its marking points also print numbering.
    """
    layouts = {'dotted': {}, 'part': {}, 'row': {}, 'paren': {}}
    q = pending_row = pending_dot = pending_paren = None
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if SECTION_KEY_END.search(line):
            break
        head = MS_HEAD.match(line)
        if head and not PART_KEY.match(line):
            q, pending_row = int(head.group(1)), None
            continue
        dot = DOTTED_Q.match(line)
        if dot:
            pending_dot = (int(dot.group(1)), int(dot.group(2)))
            continue
        if pending_dot:
            key = KEY_LETTER.match(line)
            if key:
                layouts['dotted'][pending_dot] = (key.group(1).upper(), key.group(2).strip())
                pending_dot = None
                continue
        pk = PART_KEY.match(line)
        if pk and q is not None:
            layouts['part'][(q, PART_INDEX[pk.group(1)])] = (
                pk.group(2).upper(), pk.group(3).strip())
            continue
        inline = INLINE_ROW.match(line)
        if inline and q is not None:
            layouts['row'][(q, int(inline.group(1)))] = (
                inline.group(2).upper(), inline.group(3).strip())
            pending_row = None
            continue
        rq = ROW_Q.match(line)
        if rq and q is not None:
            pending_row = int(rq.group(1))
            continue
        if pending_row is not None:
            rk = ROW_KEY.match(line)
            if rk:
                layouts['row'][(q, pending_row)] = (rk.group(1).upper(), rk.group(2).strip())
                pending_row = None
                continue
        ak = PAREN_KEY.match(line)
        if ak and q is not None:
            layouts['paren'][(q, int(ak.group(1)))] = (
                ak.group(2).upper(), ak.group(3).strip())
            pending_paren = None
            continue
        pq = PAREN_Q_SPLIT.match(line)
        if pq and q is not None:
            pending_paren = int(pq.group(1))
            continue
        if pending_paren is not None:
            sk = PAREN_KEY_SPLIT.match(line)
            if sk:
                layouts['paren'][(q, pending_paren)] = (sk.group(1).upper(), sk.group(2).strip())
                pending_paren = None
                continue
    best = max(layouts, key=lambda name: len(layouts[name]))
    parsed = layouts[best]
    return {
        'layout': best if parsed else None,
        'keyCount': len(parsed),
        'layoutCounts': {name: len(rows) for name, rows in layouts.items() if rows},
        'keys': [{'q': q, 'sub': sub, 'letter': letter, 'text': text}
                 for (q, sub), (letter, text) in sorted(parsed.items())],
        'optionLetters': sorted({letter for letter, _ in parsed.values()}),
    }


def identity(doc, text: str, name: str) -> dict:
    head = '\n'.join(doc[i].get_text() for i in range(min(2, len(doc)))) or ''
    blob = head + '\n' + text[:4000]
    code = re.search(r'(?<!\d)(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{1,2})(?!\d)', head)
    series = re.search(r'Series\s*[:\-]?\s*([A-Z0-9/]+)', head)
    setno = re.search(r'SET\s*[~\-]?\s*(\d)', head)
    session = re.search(r'(20\d{2})\s*-\s*(\d{4}|\d{2})(?!\d)', blob)
    marks = re.search(r'पूर्णांक\s*[:\-]?\s*(\d{2,3})', blob) or \
        re.search(r'अधिकतम\s+अंक\s*[:\-]?\s*(\d{2,3})', blob)
    hours = re.search(r'(\d)\s*घंटे', blob) or re.search(r'(\d)\s*घिींटे', blob)
    counts = sorted({int(n) for n in PRINTED_COUNT.findall(blob) if int(n) <= 40})
    pages = PAGE_CLAIM.search(blob)
    course = None
    # The printed course label sits on the cover; read it by code number because
    # the surrounding Hindi may itself carry the font shift.
    if re.search(r'HINDI\s*\(B\)|कोड\s*[-–]?[\s\S]{0,12}085', head):
        course = 'B'
    elif re.search(r'HINDI\s*\(A\)|कोड\s*[-–]?[\s\S]{0,12}002', head):
        course = 'A'
    if session:
        end = session.group(2)
        session_text = f'{session.group(1)}-{end if len(end) == 2 else end[2:]}'
    else:
        session_text = None
    return {
        'code': '/'.join(code.groups()) if code else None,
        'series': series.group(1) if series else None,
        'set': int(setno.group(1)) if setno else None,
        'session': session_text,
        'marks': int(marks.group(1)) if marks else None,
        'hours': int(hours.group(1)) if hours else None,
        'printedQuestionCounts': counts,
        'printedPages': int(pages.group(1)) if pages else None,
        'course': course,
        'pdfPages': len(doc),
        'filename': name,
    }


def classify(text: str, scheme: dict, questions: list) -> str:
    if re.search(r'अ.{0,2}ंक\s*योजना', text) or scheme['keyCount'] >= 20:
        return 'marking-scheme'
    if re.search(r'सामान्य\s*निर्देश|सामान्य\s*विदेश|निर्देश\s*:|अभ्यास\s*प्रश्', text) \
            or len(questions) >= 5:
        return 'question-paper'
    return 'unclassified'


# ------------------------------------------------------------------ bank cross-check
BANK_FILES = ['pyq-hindi-a5b4', 'pyq-hindi-a6b5', 'pyq-hindi-final', 'hindi10-q']


def bank_rows(repo_root: str):
    rows = []
    for name in BANK_FILES:
        path = os.path.join(repo_root, 'assets', 'js', 'data', name + '.js')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as handle:
            src = handle.read()
        payload = src[src.index('['):src.rindex(']') + 1]
        for row in json.loads(payload):
            row['_file'] = name
            rows.append(row)
    return rows


def bank_stem_match(rows, text, min_ratio=0.97):
    """A near-identical stem already in the bank. Only meaningful for faithful text."""
    target = norm_word(text)
    if len(target) < 30:
        return []
    hits = []
    for row in rows:
        for candidate in (row.get('hi'), row.get('en')):
            value = norm_word(candidate)
            if not value or abs(len(value) - len(target)) > len(target) * 0.4:
                continue
            ratio = difflib.SequenceMatcher(None, target, value).ratio()
            if ratio >= min_ratio:
                hits.append((round(ratio, 3), row.get('id'), row.get('src')))
                break
    hits.sort(reverse=True)
    return hits[:3]


def verify_keys(scheme, questions, ms_faithful, qp_faithful) -> dict:
    by_slot = {(item['q'], item['sub']): item for item in questions}
    reasons = []
    if not ms_faithful:
        reasons.append('marking-scheme text layer is not a faithful transcription, '
                       'so the printed option text cannot be compared')
    if not qp_faithful:
        reasons.append('question-paper text layer is not a faithful transcription, '
                       'so the printed option order cannot be compared')
    detail, agree, mismatch, missing = [], 0, 0, 0
    for key in scheme.get('keys', []):
        slot = (key['q'], key['sub'])
        item = by_slot.get(slot)
        if not item:
            missing += 1
            detail.append({'slot': slot, 'result': 'no question with four options at this slot'})
            continue
        index = 'ABCD'.index(key['letter']) if key['letter'] in 'ABCD' else -1
        if index < 0 or index >= len(item['opts']):
            missing += 1
            detail.append({'slot': slot, 'result': 'key letter outside the printed options'})
            continue
        scores = [difflib.SequenceMatcher(None, norm_word(key['text']), norm_word(o)).ratio()
                  for o in item['opts']]
        best = max(range(len(scores)), key=lambda i: scores[i])
        entry = {'slot': slot, 'letter': key['letter'],
                 'letterScore': round(scores[index], 3),
                 'bestLetter': 'ABCDE'[best], 'bestScore': round(scores[best], 3)}
        if ms_faithful and qp_faithful and best == index and scores[index] >= 0.75:
            agree += 1
            entry['result'] = 'printed letter and option text agree'
        else:
            mismatch += 1
            entry['result'] = ('cannot attach: text layer untrusted'
                               if not (ms_faithful and qp_faithful)
                               else 'printed letter and option text disagree')
        detail.append(entry)
    return {'attachable': agree, 'unresolved': mismatch, 'noQuestion': missing,
            'reasons': reasons, 'detail': detail}


def page_of(doc, needle: str):
    target = norm_word(needle)[:24]
    if not target:
        return None
    for index, page in enumerate(doc):
        if target and target in norm_word(page.get_text()):
            return index + 1
    return None


def audit_file(path, repo_root, rows) -> dict:
    doc = pymupdf.open(path)
    text = '\n'.join(page.get_text() for page in doc)
    glyphs = glyph_report(text)
    ident = identity(doc, text, os.path.basename(path))
    lines = text.splitlines()
    style = print_style(text) if text.strip() else None
    scheme = parse_scheme(lines) if text.strip() else {'keyCount': 0, 'keys': [], 'layout': None,
                                                       'layoutCounts': {}, 'optionLetters': []}
    questions = parse_qp(lines) if text.strip() else []
    kind = classify(text, scheme, questions) if text.strip() else 'unclassified'
    # Only a paper's own structure is recorded: asking a scheme for questions
    # (or a paper for keys) yields coincidental matches, not evidence.
    if kind != 'marking-scheme':
        scheme = {'keyCount': 0, 'keys': [], 'layout': None, 'layoutCounts': {},
                  'optionLetters': []}
    if kind != 'question-paper':
        questions = []
    record = {
        'file': os.path.basename(path),
        'sha256': sha256(path),
        'bytes': os.path.getsize(path),
        'identity': ident,
        'classification': kind,
        'hasTextLayer': bool(text.strip()),
        'printStyle': style,
        'textLayer': glyphs,
        'bankRowsCitingThisFilename': [row['id'] for row in rows
                                       if row.get('src') == os.path.basename(path)],
    }
    if not text.strip():
        record['note'] = ('Image-only scan: there is no text layer, so no question or key '
                          'could be read. The cover of each of these files was inspected '
                          'visually and is a HINDI (B) main-board question paper.')
        record['coverInspection'] = 'question paper (visually confirmed)'
        return record
    if kind == 'marking-scheme':
        record['scheme'] = {k: v for k, v in scheme.items() if k != 'keys'}
        record['scheme']['keySlots'] = [[k['q'], k['sub'], k['letter'], k['text']]
                                        for k in scheme['keys']]
        record['note'] = ('Printed key letters are readable; ' +
                          ('option text is trustworthy' if glyphs['faithful']
                           else 'option text is NOT trustworthy (font shift)'))
        return record
    if kind == 'question-paper':
        record['questionCount'] = len(questions)
        record['optionBlocks'] = count_option_blocks(lines)
        record['printedSubPartClaim'] = sorted({n for n in ident['printedQuestionCounts']
                                                if n in (10, 17, 18)})
        record['questionSlots'] = [[item['q'], item['sub'], len(item['opts'])] for item in questions]
        record['note'] = ('MCQ stems/options readable' if glyphs['faithful']
                          else 'MCQ stems/options NOT readable (font shift)')
        if glyphs['faithful']:
            record['bankStemMatches'] = {f"{item['q']}.{item['sub']}":
                                         bank_stem_match(rows, item['stem'])
                                         for item in questions}
        return record
    record['note'] = 'Neither a question paper nor a marking scheme could be established'
    return record


def pair(report) -> list:
    schemes = [f for f in report['files'] if f['classification'] == 'marking-scheme']
    papers = [f for f in report['files'] if f['classification'] == 'question-paper']
    pairs = []
    for scheme in schemes:
        course = scheme['identity']['course']
        session = scheme['identity']['session']
        candidates = [p for p in papers if p['identity']['course'] == course
                      and p['identity']['session'] == session]
        entry = {'scheme': scheme['file'], 'course': course, 'session': session,
                 'candidates': [p['file'] for p in candidates]}
        # Two papers can carry the same printed session; without any set number
        # there is no way to tell which one a scheme belongs to, so every
        # candidate is compared and the ambiguity is reported as such.
        entry['questionPaper'] = None
        if len(candidates) == 1:
            entry['questionPaper'] = candidates[0]['file']
        ambiguity = ([] if len(candidates) == 1 else
                     ['no unique question paper printing the same course and session '
                      '(%d candidates)' % len(candidates)])
        verdicts = []
        for paper in candidates:
            scheme_view = {'keys': [{'q': q, 'sub': s, 'letter': letter, 'text': text}
                                    for q, s, letter, text
                                    in scheme['scheme']['keySlots']]}
            verdict = verify_keys(scheme_view,
                                  [{'q': q, 'sub': s, 'opts': [''] * n, 'stem': ''}
                                   for q, s, n in paper['questionSlots']],
                                  scheme['textLayer']['faithful'],
                                  paper['textLayer']['faithful'])
            verdict['questionPaper'] = paper['file']
            verdict['reasons'] = ambiguity + verdict['reasons']
            verdicts.append(verdict)
        if verdicts:
            entry['verdict'] = {
                'attachable': sum(v['attachable'] for v in verdicts),
                'unresolved': sum(v['unresolved'] for v in verdicts),
                'noQuestion': sum(v['noQuestion'] for v in verdicts),
                'reasons': sorted({r for v in verdicts for r in v['reasons']}),
                'detail': verdicts}
        else:
            entry['verdict'] = {'attachable': 0, 'unresolved': 0, 'noQuestion': 0,
                                'reasons': ambiguity, 'detail': []}
        pairs.append(entry)
    return pairs


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pdf-dir', required=True)
    ap.add_argument('--repo-root', default=os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))))
    ap.add_argument('--json')
    ap.add_argument('--quiet', action='store_true')
    args = ap.parse_args(argv)

    rows = bank_rows(args.repo_root)
    files = sorted(glob.glob(os.path.join(args.pdf_dir, '*.pdf')))
    if not files:
        raise SystemExit('no PDFs found in ' + args.pdf_dir)
    report = {'pdfDir': os.path.abspath(args.pdf_dir),
              'bankRows': len(rows),
              'bankRowsWithKey': sum(1 for row in rows if row.get('keyVerified')),
              'files': [audit_file(path, args.repo_root, rows) for path in files]}
    report['pairs'] = pair(report)
    if not args.quiet:
        for rec in report['files']:
            i = rec['identity']
            print(rec['file'])
            print(f"   kind={rec['classification']:15s} course={i['course']} code={i['code']} "
                  f"set={i['set']} series={i['series']} session={i['session']} "
                  f"marks={i['marks']} printedQ={i['printedQuestionCounts']} "
                  f"printedPages={i['printedPages']} pdfPages={i['pdfPages']}")
            if 'scheme' in rec:
                print(f"   printed keys: {rec['scheme']['keyCount']} "
                      f"layout={rec['scheme']['layout']} "
                      f"per-section={rec['scheme']['layoutCounts']}")
            if 'questionCount' in rec:
                print(f"   MCQs with four/five options: {rec['questionCount']}")
            print(f"   textLayer faithful={rec['textLayer']['faithful']} "
                  f"impossibleInitial={rec['textLayer']['impossibleInitialWords']} "
                  f"signatures={rec['textLayer']['signatures']}")
            print(f"   bank rows citing this filename: {len(rec['bankRowsCitingThisFilename'])}")
        for p in report['pairs']:
            v = p['verdict']
            print(f"PAIR {p['scheme']} -> {p['questionPaper']}: attachable={v['attachable']} "
                  f"unresolved={v['unresolved']} noQuestion={v['noQuestion']}")
            for reason in v['reasons']:
                print('   - ' + reason)
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as handle:
            json.dump(report, handle, ensure_ascii=False, indent=1)
        if not args.quiet:
            print('report written to', args.json)
    return 0


if __name__ == '__main__':
    sys.exit(main())
