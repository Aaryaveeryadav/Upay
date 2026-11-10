#!/usr/bin/env python3
"""Check a Class 12 Physics data file before it is sent to Upay.

    python3 tools/curate/validate-physics-data.py my-physics.json
    python3 tools/curate/validate-physics-data.py my-questions.csv
    python3 tools/curate/validate-physics-data.py my-questions.xlsx   # needs openpyxl

The syntax is documented in docs/physics-data-syntax.md; copy-ready templates
are tools/curate/physics-data.template.json and
tools/curate/physics-questions.template.csv.

This checks shape, types, ranges and the rules the site depends on (chapter
numbers, option letters, Unicode Hindi, English-only outlines). It cannot tell
whether a question, an answer or a summary is *correct* -- that stays a human
review step.

Exit status: 0 = no errors (warnings allowed), 1 = errors, 2 = could not read.
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# The 14 NCERT chapters (number, title, unit) come from the live outlines, so
# this file never drifts from what the site already shows.
CANON = {c['chapter']: c for c in
         json.loads((ROOT / 'assets/notes/outlines.json').read_text())['physics']}

# Question type -> marks it carries in the current CBSE 042 paper.
TYPES = {'mcq': 1, 'assertion-reason': 1, 'very-short': 2, 'short': 3,
         'case-study': 4, 'long': 5}
TYPE_HINTS = {'multiple-choice': 'mcq', 'objective': 'mcq', 'ar': 'assertion-reason',
              'assertion': 'assertion-reason', 'a-r': 'assertion-reason',
              'vsa': 'very-short', 'very-short-answer': 'very-short',
              'sa': 'short', 'short-answer': 'short', 'numerical': 'short',
              'la': 'long', 'long-answer': 'long', 'case': 'case-study',
              'case-based': 'case-study', 'cbq': 'case-study'}
SOURCES = {'board-paper', 'sample-paper', 'ncert', 'exemplar'}
SOURCE_HINTS = {'cbse': 'board-paper', 'board': 'board-paper', 'pyq': 'board-paper',
                'sqp': 'sample-paper', 'sample': 'sample-paper',
                'ncert-exemplar': 'exemplar', 'textbook': 'ncert'}

QUESTION_KEYS = {'id', 'chapter', 'type', 'marks', 'question', 'options', 'answer',
                 'from', 'year', 'paper', 'q_no', 'difficulty', 'hindi_question',
                 'hindi_options', 'figure_file', 'figure_page'}
CHAPTER_KEYS = {'id', 'chapter', 'title', 'summary', 'sections', 'objectives',
                'terms', 'unit', 'unit_title', 'source'}
TOP_KEYS = {'_readme', 'subject', 'class', 'chapters', 'questions'}

DEVANAGARI = re.compile('[\u0900-\u097f]')
LATEX = re.compile(r'\\(frac|times|sqrt|mu|omega|lambda|alpha|beta|theta|pi|epsilon|'
                   r'varepsilon|Delta|delta|cdot|vec|hat|text|mathrm|left|right)\b|\$[^$]+\$')
LETTER = re.compile(r'^\(?\s*([A-Da-d])\s*\)?$')


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, where, message):
        self.errors.append('%s: %s' % (where, message))

    def warn(self, where, message):
        self.warnings.append('%s: %s' % (where, message))


def norm_title(s):
    s = str(s).replace('\u2019', "'").replace('\u2018', "'").replace('\u2013', '-').replace('\u2014', '-')
    return re.sub(r'\s+', ' ', s).strip().lower()


def as_int(record, key, where, rep, required=False, lo=None, hi=None, label=None):
    """Whole number from JSON or a spreadsheet cell ('3', 3, 3.0); None if absent."""
    label = label or key
    value = record.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            rep.err(where, '"%s" is required' % label)
        return None
    number = None
    if isinstance(value, bool):
        number = None
    elif isinstance(value, int):
        number = value
    elif isinstance(value, float) and value.is_integer():
        number = int(value)
    elif isinstance(value, str) and re.fullmatch(r'\s*-?\d+(\.0+)?\s*', value):
        number = int(float(value))
    if number is None:
        rep.err(where, '"%s" must be a whole number, got %r' % (label, value))
        return None
    if (lo is not None and number < lo) or (hi is not None and number > hi):
        rep.err(where, '"%s" must be %s-%s, got %d' % (label, lo, hi, number))
        return None
    return number


def as_text(record, key, where, rep, required=False):
    value = record.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            rep.err(where, '"%s" is required' % key)
        return None
    if not isinstance(value, str):
        rep.err(where, '"%s" must be text, got %r' % (key, value))
        return None
    return value.strip()


def text_list(record, key, where, rep, lo, hi):
    items = record.get(key)
    if not isinstance(items, list):
        rep.err(where, '"%s" must be a list of %d-%d text items' % (key, lo, hi) if lo != hi
                else '"%s" must be a list of exactly %d text items' % (key, lo))
        return []
    clean = [x.strip() for x in items if isinstance(x, str) and x.strip()]
    if len(clean) != len(items):
        rep.err(where, 'every item in "%s" must be non-empty text' % key)
    if not lo <= len(items) <= hi:
        rep.err(where, '"%s" needs %s items, found %d' % (
            key, ('%d-%d' % (lo, hi)) if lo != hi else ('exactly %d' % lo), len(items)))
    if len({norm_title(x) for x in clean}) != len(clean):
        rep.err(where, '"%s" contains a duplicate' % key)
    return clean


# ----------------------------------------------------------------- chapters
def check_chapter(ch, where, rep, seen):
    if not isinstance(ch, dict):
        rep.err(where, 'each chapter must be an object { ... }')
        return
    number = as_int(ch, 'chapter', where, rep, required=True)
    if number in CANON:
        where = '%s (chapter %d)' % (where, number)
    for key in sorted(set(ch) - CHAPTER_KEYS):
        if key == 'marks':
            rep.err(where, 'leave "marks" out: Physics pages publish no unit marks unless an '
                           'official CBSE source is supplied separately')
        elif key == 'figures':
            rep.err(where, 'leave "figures" out: figures are cropped from the NCERT PDF you '
                           'upload, never typed in')
        else:
            rep.warn(where, 'unknown field "%s" is ignored (typo?)' % key)

    if number is None:
        return
    if number not in CANON:
        rep.err(where, '"chapter" must be 1-14 (the NCERT chapter number), got %d%s' % (
            number, ' -- use the chapter number, not the site id 6xx' if 601 <= number <= 614 else ''))
        return
    canon = CANON[number]
    if number in seen:
        rep.err(where, 'chapter %d appears twice' % number)
    seen.add(number)

    if 'id' in ch and ch['id'] != canon['id']:
        rep.err(where, '"id" for chapter %d is %s (or leave it out)' % (number, canon['id']))
    title = as_text(ch, 'title', where, rep, required=True)
    if title and norm_title(title) != norm_title(canon['title']):
        rep.warn(where, 'title differs from the NCERT title "%s"' % canon['title'])
    if 'unit' in ch and ch['unit'] != canon['unit']:
        rep.err(where, 'chapter %d belongs to unit %d (or leave "unit" out)' % (number, canon['unit']))
    if 'unit_title' in ch and norm_title(ch['unit_title']) != norm_title(canon['unit_title']):
        rep.err(where, 'unit title is "%s" (or leave "unit_title" out)' % canon['unit_title'])

    summary = as_text(ch, 'summary', where, rep, required=True)
    if summary and not 150 <= len(summary) <= 320:
        rep.err(where, '"summary" must be 150-320 characters (2-3 sentences), found %d' % len(summary))
    sections = text_list(ch, 'sections', where, rep, 6, 10)
    objectives = text_list(ch, 'objectives', where, rep, 3, 3)
    terms = text_list(ch, 'terms', where, rep, 8, 16)
    as_text(ch, 'source', where, rep)

    for label, value in [('title', title), ('summary', summary)] + \
            [('sections', s) for s in sections] + [('objectives', s) for s in objectives] + \
            [('terms', s) for s in terms]:
        if value and DEVANAGARI.search(value):
            rep.err(where, '"%s" must be English only -- outlines carry no Hindi body text' % label)
            break


# ---------------------------------------------------------------- questions
def check_question(q, where, rep, seen_ids, seen_text):
    if not isinstance(q, dict):
        rep.err(where, 'each question must be an object { ... }')
        return
    for key in sorted(set(q) - QUESTION_KEYS):
        rep.warn(where, 'unknown field "%s" is ignored (typo?)' % key)

    qid = q.get('id')
    if qid not in (None, ''):
        qid = str(qid).strip()
        if qid in seen_ids:
            rep.err(where, 'duplicate id "%s"' % qid)
        seen_ids.add(qid)
        if qid.startswith('example-'):
            rep.warn(where, 'template example -- replace it with your own question or delete it')

    chapter = as_int(q, 'chapter', where, rep, required=True)
    if chapter == 0:
        rep.warn(where, 'chapter 0 = not sure: it will be listed in the bank but under no chapter')
    elif chapter is not None and chapter not in CANON:
        rep.err(where, '"chapter" must be 1-14 (the NCERT chapter number), got %d%s' % (
            chapter, ' -- use the chapter number, not the site id 6xx' if 601 <= chapter <= 614 else ''))

    qtype = as_text(q, 'type', where, rep, required=True)
    if qtype:
        qtype = qtype.lower()
        if qtype not in TYPES:
            hint = TYPE_HINTS.get(re.sub(r'[\s_]+', '-', qtype))
            rep.err(where, '"type" must be one of %s; got "%s"%s' % (
                ', '.join(TYPES), q['type'], ' -- did you mean "%s"?' % hint if hint else ''))
            qtype = None

    source = as_text(q, 'from', where, rep, required=True)
    if source:
        source = source.lower()
        if source not in SOURCES:
            hint = SOURCE_HINTS.get(re.sub(r'[\s_]+', '-', source))
            rep.err(where, '"from" must be one of %s; got "%s"%s' % (
                ', '.join(sorted(SOURCES)), q['from'], ' -- did you mean "%s"?' % hint if hint else ''))
            source = None

    is_paper = source in ('board-paper', 'sample-paper')
    marks = as_int(q, 'marks', where, rep, required=is_paper, lo=1, hi=5)
    if marks and qtype and marks != TYPES[qtype]:
        rep.warn(where, '%s questions carry %d mark%s in the current CBSE paper; this says %d' % (
            qtype, TYPES[qtype], '' if TYPES[qtype] == 1 else 's', marks))
    as_int(q, 'year', where, rep, required=is_paper, lo=2010, hi=2027)
    paper = as_text(q, 'paper', where, rep, required=source == 'board-paper')
    if paper and not re.match(r'^\d{2}', paper):
        rep.warn(where, '"paper" should be the code printed on the paper, like 55/1/1')
    if 'q_no' in q and q['q_no'] is not None and not isinstance(q['q_no'], (str, int, float)):
        rep.err(where, '"q_no" must be a number or text like "3.5"')
    as_int(q, 'difficulty', where, rep, lo=1, hi=3)

    text = as_text(q, 'question', where, rep, required=True)
    if text:
        if len(text) < 10:
            rep.err(where, '"question" is too short to be a full question')
        if DEVANAGARI.search(text):
            rep.err(where, '"question" is the English text; put Hindi in "hindi_question"')
        if LATEX.search(text):
            rep.warn(where, 'LaTeX is shown as raw text on the site; write symbols directly '
                            '(x 10^-7 -> \u00d7 10\u207b\u2077, mu -> \u03bc, ohm -> \u03a9)')
        key = re.sub(r'[\W_]+', '', text.lower())
        if key in seen_text:
            rep.warn(where, 'same question text as %s' % seen_text[key])
        else:
            seen_text[key] = where

    options = q.get('options')
    if qtype == 'mcq' or (qtype == 'assertion-reason' and options is not None):
        if isinstance(options, dict):
            rep.err(where, '"options" must be a list ["...", "...", "...", "..."] in A-D order, '
                           'not an object {"A": ...} (the site does not show object-style options)')
        elif not isinstance(options, list) or len(options) != 4 or \
                not all(isinstance(o, str) and o.strip() for o in options):
            rep.err(where, '"options" must be 4 non-empty texts in A, B, C, D order%s' % (
                ' (or leave it out to use the standard A-R options)' if qtype == 'assertion-reason' else ''))
    elif options is not None and qtype:
        rep.err(where, '"options" is only for mcq and assertion-reason questions')

    answer = q.get('answer')
    if qtype in ('mcq', 'assertion-reason'):
        if answer is None or not LETTER.match(str(answer)):
            rep.err(where, '"answer" must be the option letter A, B, C or D, got %r' % (answer,))
    elif answer is not None and not isinstance(answer, str):
        rep.err(where, '"answer" must be text')

    hindi = as_text(q, 'hindi_question', where, rep)
    if hindi and not DEVANAGARI.search(hindi):
        rep.err(where, '"hindi_question" is not Unicode Hindi -- it looks like a legacy-font '
                       '(KrutiDev/Chanakya) paste; retype it or convert it to Unicode first')
    hindi_options = q.get('hindi_options')
    if hindi_options is not None:
        if qtype not in ('mcq', 'assertion-reason'):
            rep.err(where, '"hindi_options" is only for mcq and assertion-reason questions')
        elif not isinstance(hindi_options, list) or len(hindi_options) != 4:
            rep.err(where, '"hindi_options" must be 4 texts in A, B, C, D order')

    fig_file = as_text(q, 'figure_file', where, rep)
    fig_page = as_int(q, 'figure_page', where, rep, lo=1, hi=999)
    if bool(fig_file) != bool(fig_page):
        rep.err(where, '"figure_file" and "figure_page" go together (the PDF and the page the diagram is on)')
    elif fig_file:
        if not fig_file.lower().endswith('.pdf'):
            rep.err(where, '"figure_file" must name the PDF the diagram is printed in')
        else:
            rep.warn(where, 'upload %s as well -- the diagram is cropped from page %d of it' % (fig_file, fig_page))


# ---------------------------------------------------------------- readers
def rows_to_questions(header, rows, rep):
    """Spreadsheet rows -> question dicts. Row numbers match the sheet (header = row 1)."""
    cols = [re.sub(r'\s+', '_', str(h or '').strip().lower()) for h in header]
    option_cols = ['option_a', 'option_b', 'option_c', 'option_d']
    hindi_cols = ['hindi_option_a', 'hindi_option_b', 'hindi_option_c', 'hindi_option_d']
    allowed = (QUESTION_KEYS - {'options', 'hindi_options'}) | set(option_cols) | set(hindi_cols)
    for c in cols:
        if c and c not in allowed:
            rep.warn('header', 'unknown column "%s" is ignored (typo?)' % c)
    for c in ('chapter', 'type', 'question', 'from'):
        if c not in cols:
            rep.err('header', 'missing required column "%s"' % c)
    out = []
    for n, row in enumerate(rows, start=2):
        cells = {}
        for c, v in zip(cols, row):
            if v is None or (isinstance(v, str) and not v.strip()):
                continue
            if c in ('question', 'hindi_question', 'answer', 'paper', 'figure_file') and not isinstance(v, str):
                v = ('%d' % v) if isinstance(v, float) and v.is_integer() else str(v)
            cells[c] = v.strip() if isinstance(v, str) else v
        if not cells:
            continue
        opts = [cells.pop(c, None) for c in option_cols]
        if any(o is not None for o in opts):
            cells['options'] = ['' if o is None else str(o) for o in opts]
        hopts = [cells.pop(c, None) for c in hindi_cols]
        if any(o is not None for o in hopts):
            cells['hindi_options'] = ['' if o is None else str(o) for o in hopts]
        out.append(('row %d' % n, cells))
    return out


def load(path, rep):
    """Return (chapters, questions) as lists of (where, record)."""
    suffix = path.suffix.lower()
    if suffix == '.csv':
        try:
            with open(path, newline='', encoding='utf-8-sig') as f:
                table = list(csv.reader(f))
        except UnicodeDecodeError:
            rep.err(str(path.name), 'not UTF-8 -- save it as "CSV UTF-8" so Hindi and symbols survive')
            return [], []
        if not table:
            rep.err(str(path.name), 'the file is empty')
            return [], []
        return [], rows_to_questions(table[0], table[1:], rep)
    if suffix == '.xlsx':
        try:
            import openpyxl
        except ImportError:
            print('reading .xlsx needs openpyxl (pip install openpyxl), or export the sheet as CSV UTF-8')
            sys.exit(2)
        sheet = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
        table = [list(r) for r in sheet.iter_rows(values_only=True)]
        if not table:
            rep.err(str(path.name), 'the first sheet is empty')
            return [], []
        return [], rows_to_questions(table[0], table[1:], rep)

    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        rep.err(str(path.name), 'not valid JSON: %s at line %d, column %d (a missing comma or '
                                'quote is the usual cause)' % (exc.msg, exc.lineno, exc.colno))
        return [], []
    if not isinstance(data, dict):
        rep.err(str(path.name), 'the file must be one object: { "subject": "physics", "class": 12, '
                                '"chapters": [...], "questions": [...] }')
        return [], []
    for key in sorted(set(data) - TOP_KEYS):
        rep.warn(key, 'unknown top-level key is ignored (expected chapters / questions)')
    if data.get('subject') != 'physics':
        rep.err('subject', 'must be "physics", got %r' % (data.get('subject'),))
    if data.get('class') != 12:
        rep.err('class', 'must be 12, got %r' % (data.get('class'),))
    chapters, questions = data.get('chapters', []), data.get('questions', [])
    if not isinstance(chapters, list):
        rep.err('chapters', 'must be a list [ ... ]')
        chapters = []
    if not isinstance(questions, list):
        rep.err('questions', 'must be a list [ ... ]')
        questions = []
    if not chapters and not questions:
        rep.err(str(path.name), 'nothing to check: "chapters" and "questions" are both empty')
    return ([('chapters[%d]' % i, c) for i, c in enumerate(chapters)],
            [('questions[%d]' % i, q) for i, q in enumerate(questions)])


def check_file(path):
    rep = Report()
    if not path.is_file():
        print('%s: no such file' % path)
        return 2
    chapters, questions = load(path, rep)
    seen_chapters, seen_ids, seen_text = set(), set(), {}
    for where, ch in chapters:
        check_chapter(ch, where, rep, seen_chapters)
    for where, q in questions:
        check_question(q, where, rep, seen_ids, seen_text)

    print('%s: %d chapter outline%s, %d question%s' % (
        path, len(chapters), '' if len(chapters) == 1 else 's',
        len(questions), '' if len(questions) == 1 else 's'))
    for line in rep.warnings:
        print('  WARN  ' + line)
    for line in rep.errors:
        print('  ERROR ' + line)
    if rep.errors:
        print('  %d error%s -- fix and run again.' % (len(rep.errors), '' if len(rep.errors) == 1 else 's'))
        return 1
    print('  OK -- ready to send. (Whether the physics is right is still a human check.)')
    return 0


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip())
        return 2
    return max(check_file(Path(p)) for p in argv[1:])


if __name__ == '__main__':
    sys.exit(main(sys.argv))
