#!/usr/bin/env python3
"""Check the 90 Economics and 4 Biology source-only test-paper PDFs.

Run: python3 tools/check/class12_test_paper_sources.py --uploads /home/user/uploads
Checks original identity, first-page identifiers, metadata and SHA-256. Twenty-four
scans have no text layer; tesseract, if installed, checks their cover labels.
The scanned covers were also inspected visually: full-page OCR can confuse
digits, so focused OCR crops are retried when necessary. OCR alone is not an
authoritative source. No answer-key, question-extraction or exam-year audit
is performed.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
from collections import Counter
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/js/data/class12-original-test-papers.js'
EXPECTED = {}
for i in range(1, 4):
    EXPECTED[f'58-7-{i}.pdf'] = ('economics', f'58/7/{i}', 'S7PQR', i, 27, 80, 34, '180 minutes', False)
    EXPECTED[f'58-S-{i}_Economics.pdf'] = ('economics', f'58/S/{i}', 'WXYZ/S', i, 23, 80, 34, '180 minutes', False)
    name = '58-S-1 Economics.pdf' if i == 1 else f'58-S-{i} ECONOMICS.pdf'
    EXPECTED[name] = ('economics', f'58/S/{i}', '&RQPS/S', i, 27, 80, 34, '180 minutes', False)
    EXPECTED[f'58-6-{i} ECONOMICS.pdf'] = ('economics', f'58/6/{i}', 'A6BAB/C', i, 11, 40, 13, '120 minutes', False)
    EXPECTED[f'57_C_{i} Biology.pdf'] = ('biology', f'57/C/{i}', 'EF1GH/C', i, 23 if i == 3 else 19, 70, 33, '180 minutes', False)
EXPECTED['57_C_B Biology.pdf'] = ('biology', '57(B)', 'FGHE/C', 5, 23, 70, 33, '180 minutes', True)
for group, series in ((1, 'QPSR1'), (2, 'R2SQP'), (3, 'PQS3R'), (4, 'RP4QS'), (5, 'R5QPS')):
    for i in range(1, 4):
        EXPECTED[f'58-{group}-{i}_Economics.pdf'] = ('economics', f'58/{group}/{i}', series, i, 24 if group < 3 else 27, 80, 34, '180 minutes', False)
for group, series, sets in ((1, 'XY1ZW', (1, 2, 3)), (2, 'Z2YWX', (1, 2, 3))):
    for i in sets:
        EXPECTED[f'58-{group}-{i} ECONOMICS.pdf'] = ('economics', f'58/{group}/{i}', series, i, 24, 80, 34, '180 minutes', False)
for group, series, pages in ((4, 'Z4WYX', 23), (5, 'Z5YWX', 27), (6, 'YWX6Z', 27), (7, 'Y7XWZ', 23)):
    for i in range(1, 4):
        name = f'58-{group}-{i} ECONOMICS' + ('-2' if group == 6 else '') + '.pdf'
        EXPECTED[name] = ('economics', f'58/{group}/{i}', series, i, pages, 80, 34, '180 minutes', False)
for group, series in ((1, 'R1PQS/1'), (2, 'R2PQS/2'), (3, 'R3PQS/3'), (4, 'R4PSQ/4'), (5, 'RR5SP/5')):
    for i in range(1, 4):
        EXPECTED[f'58_{group}_{i}_Economics.pdf'] = ('economics', f'58/{group}/{i}', series, i, 27 if group <= 3 else 24, 80, 34, '180 minutes', False)
for group, pages in ((1, 27), (2, 32), (3, 31), (4, 27), (5, 24)):
    for i in (1, 2, 3):
        EXPECTED[f'58_{group}_{i}_Economics-2.pdf'] = ('economics', f'58/{group}/{i}', f'HFG1E/{group}', i, pages, 80, 34, '180 minutes', False)
for group, series, pages in ((1, 'AABB3/1', 12), (2, 'AABB1/2', 11), (3, 'AABB4/3', 12), (4, 'AABB2/4', 11)):
    for i in (1, 2, 3):
        EXPECTED[f'58-{group}-{i} Economics.pdf'] = ('economics', f'58/{group}/{i}', series, i, pages, 40, 13, '120 minutes', False)
for i in (1, 2, 3):
    EXPECTED[f'58-5-{i} (Economics).pdf'] = ('economics', f'58/5/{i}', 'AABB5/5', i, 12, 40, 13, '120 minutes', False)


def has_code(text, code):
    # Do not accept e.g. a misread 58/5/38 as proof of 58/5/3.
    return bool(re.search(r'(?<!\d)' + re.escape(code) + r'(?!\d)', text))


def ocr_cover(page, executable, fractions=None, crop_scale=3):
    """OCR a full cover or a focused crop; caller still needs to verify scans visually."""
    clip = None
    scale = 1.45
    if fractions:
        width, height = page.rect.width, page.rect.height
        left, top, right, bottom = fractions
        clip = pymupdf.Rect(left * width, top * height, right * width, bottom * height)
        scale = crop_scale
    png = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=clip, alpha=False).tobytes('png')
    result = subprocess.run([executable, 'stdin', 'stdout', '--psm', '6'], input=png, capture_output=True, check=True)
    return ' '.join(result.stdout.decode('utf-8', errors='replace').split())


def digest(path):
    sha = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(block)
    return sha.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uploads', type=Path, help='directory of preserved uploaded originals')
    args = parser.parse_args()
    text = MANIFEST.read_text(encoding='utf-8')
    marker = 'UP.class12OriginalTestPapers = '
    assert text.count(marker) == 1
    all_rows = json.loads(text.split(marker, 1)[1].strip().removesuffix(';'))
    # English papers have their own course-specific checker.
    rows = [r for r in all_rows if r['subject'] in ('economics', 'biology')]
    assert len(rows) == len(EXPECTED) == 94
    assert {r['originalFile'] for r in rows} == set(EXPECTED)
    assert len({r['id'] for r in rows}) == len({r['file'] for r in rows}) == len({r['sha256'] for r in rows}) == 94
    assert Counter(r['subject'] for r in rows) == {'economics': 90, 'biology': 4}
    assert Counter(r['marks'] for r in rows if r['subject'] == 'economics') == {80: 72, 40: 18}
    old_scanned = {f'58-{g}-{i} ECONOMICS.pdf' for g in (1, 2) for i in (1, 2, 3)}
    prior_scanned = {f'58_{g}_{i}_Economics.pdf' for g in (4, 5) for i in (1, 2, 3)}
    latest_scanned = {f'58_{g}_{i}_Economics-2.pdf' for g in (2, 5) for i in (1, 2, 3)}
    shorter_scanned = {f'58-{g}-{i} Economics.pdf' for g in (1, 3) for i in (1, 2, 3)}
    scanned = old_scanned | prior_scanned | latest_scanned | shorter_scanned
    with_cover_count_23 = old_scanned | prior_scanned | {f'58-{g}-{i}_Economics.pdf' for g in (1, 2) for i in (1, 2, 3)} | {f'58_5_{i}_Economics-2.pdf' for i in (1, 2, 3)}
    with_cover_count_31 = {f'58_2_{i}_Economics-2.pdf' for i in (1, 2, 3)}
    with_cover_count_11 = {f'58-5-{i} (Economics).pdf' for i in (1, 2, 3)}
    assert {r['originalFile'] for r in rows if r.get('imageOnly')} == scanned
    assert {r['originalFile'] for r in rows if r.get('printedPages') == 23} == with_cover_count_23
    assert {r['originalFile'] for r in rows if r.get('printedPages') == 31} == with_cover_count_31
    assert {r['originalFile'] for r in rows if r.get('printedPages') == 11} == with_cover_count_11
    assert {r['originalFile'] for r in rows if r.get('printedPages')} == with_cover_count_23 | with_cover_count_31 | with_cover_count_11
    assert sorted(r['set'] for r in rows if r['series'] == 'HFG1E/4') == [1, 2, 3]
    ocr = shutil.which('tesseract')
    for row in rows:
        name = row['originalFile']
        meta = tuple(row[k] for k in ('subject', 'paperCode', 'series', 'set', 'pages', 'marks', 'questions', 'duration', 'visuallyImpaired'))
        assert meta == EXPECTED[name], (name, meta)
        assert row['cls'] == 12 and row['board'] == 'cbse' and row['year'] is None
        assert row['file'].startswith(f"/assets/papers/{row['subject']}/") and row['file'].endswith('.pdf')
        path = ROOT / row['file'].lstrip('/')
        assert path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(ROOT.resolve()), path
        assert path.read_bytes()[:5] == b'%PDF-' and path.stat().st_size == row['bytes']
        assert digest(path) == row['sha256'], name
        with pymupdf.open(path) as doc:
            assert len(doc) == row['pages']
            first = ' '.join(doc[0].get_text().split())
            if name in scanned:
                assert not any(page.get_text().strip() for page in doc), name
                if ocr:
                    first = ocr_cover(doc[0], ocr)
                    # These visually inspected scans have cover layouts where whole-page OCR
                    # can misread 34 as 84 or miss the code. Retry focused regions rather
                    # than accepting an unrelated occurrence of the expected number.
                    if name in prior_scanned and not has_code(first, row['paperCode']):
                        first += ' ' + ocr_cover(doc[0], ocr, (.62, .13, .95, .225))
                    if name in prior_scanned and not re.search(rf"\b{row['questions']}\s+questions\b", first, re.I):
                        first += ' ' + ocr_cover(doc[0], ocr, (.08, .33, .92, .45))
                    if name in latest_scanned and not has_code(first, row['paperCode']):
                        first += ' ' + ocr_cover(doc[0], ocr, (.74, .198, .87, .229), crop_scale=4)
                    if name in latest_scanned and row['series'] not in first:
                        first += ' ' + ocr_cover(doc[0], ocr, (.14, .18, .41, .23))
                    if name in shorter_scanned and not has_code(first, row['paperCode']):
                        first += ' ' + ocr_cover(doc[0], ocr, (.787, .16, .892, .189), crop_scale=4)
                    if name in shorter_scanned and row['subject'].upper() not in first.upper():
                        first += ' ' + ocr_cover(doc[0], ocr, (.34, .67, .66, .72), crop_scale=4)
                    if name in shorter_scanned and row['series'] not in first:
                        first += ' ' + ocr_cover(doc[0], ocr, (.105, .115, .335, .155), crop_scale=4)
                else:
                    print('SKIP cover OCR (tesseract not installed):', name, flush=True)
            if first:
                assert row['subject'].upper() in first.upper(), name
                assert has_code(first, row['paperCode']) and row['series'] in first, name
                assert re.search(rf"\b{row['questions']}\s+questions\b", first, re.I), name
                if name in shorter_scanned:
                    assert f"{row['pages']} printed pages" in first.lower(), name
                assert re.search(rf"maximum\s+marks\s*:\s*{row['marks']}\b", first, re.I), name
                hours = int(row['duration'].split()[0]) // 60
                assert re.search(rf"time\s+allowed\s*:\s*{hours}\s+hours?\b", first, re.I), name
                assert ('FOR VISUALLY IMPAIRED CANDIDATES ONLY' in first.upper()) == row['visuallyImpaired'], name
                if row.get('printedPages'):
                    assert f"{row['printedPages']} printed pages" in first.lower(), name
        if args.uploads:
            original = args.uploads / name
            assert original.is_file() and digest(original) == row['sha256'], name
        print('PASS', name, row['series'], row['paperCode'], row['pages'], 'pages; SHA-256 matches', flush=True)
    repeats = Counter(r['paperCode'] for r in rows if r['subject'] == 'economics')
    expected_repeats = {f'58/S/{i}': 2 for i in (1, 2, 3)}
    expected_repeats.update({f'58/{group}/{i}': (4 if group == 3 else 5 if group <= 5 else 2) for group in range(1, 8) for i in (1, 2, 3)})
    assert {k: v for k, v in repeats.items() if v > 1} == expected_repeats
    print('PASS 90 Economics and 4 Biology originals, duplicate codes separated by series and the visually-impaired paper')
    if not ocr:
        print('WARNING: cover OCR skipped for 24 image-only scans; inspect those covers separately.')
    print('No year, answer-key or searchable-question accuracy is asserted.')


if __name__ == '__main__':
    main()
