#!/usr/bin/env python3
"""Verify the 17 source-only Accountancy PDFs and their local manifest.

Run from any directory: python3 tools/check/source_papers.py
Optionally compare the preserved uploaded originals as well:
  python3 tools/check/source_papers.py --uploads /home/user/uploads
This validates file integrity and the stated catalogue, not transcriptions.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/js/data/accountancy-original-papers.js'
EXPECTED = {
    2023: ('67/1/1', '67/1/2', '67/1/3', '67/3/1', '67/3/2', '67/3/3',
           '67/4/1', '67/4/2', '67/4/3', '67/5/1', '67/5/2', '67/5/3'),
    2024: ('67/4/2', '67/4/3', '67/5/1', '67/5/2', '67/5/3'),
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest():
    marker = 'UP.accountancyOriginalPapers = '
    text = MANIFEST.read_text(encoding='utf-8')
    if text.count(marker) != 1:
        raise ValueError('Could not locate the catalogue assignment')
    data = text.split(marker, 1)[1].strip()
    if not data.endswith(';'):
        raise ValueError('Catalogue is not a single JSON assignment')
    return json.loads(data[:-1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uploads', type=Path, help='directory with the preserved uploaded PDFs')
    args = parser.parse_args()
    rows = load_manifest()
    if not isinstance(rows, list) or len(rows) != 17:
        raise AssertionError('Expected exactly 17 catalogue records')
    actual = {(r['year'], r['paperCode']) for r in rows}
    wanted = {(year, code) for year, codes in EXPECTED.items() for code in codes}
    if actual != wanted or len(actual) != len(rows):
        raise AssertionError('Missing, duplicated or mislabelled year/paper codes')
    for row in rows:
        year, code = row['year'], row['paperCode']
        new_2023 = year == 2023 and code in ('67/4/2', '67/4/3', '67/5/1', '67/5/2', '67/5/3')
        name = code.replace('/', '_') + ('_Accountancy-2.pdf' if new_2023 else '_Accountancy.pdf')
        expected = f'/assets/papers/accountancy/{year}/{name}'
        if row['session'] != 'Main' or row['file'] != expected or row['originalFile'] != name:
            raise AssertionError(f'Bad metadata: {year} {code}')
        expected_pages = 40 if year == 2023 and code.startswith('67/5/') else (39 if year == 2023 else 32)
        if row['pages'] != expected_pages:
            raise AssertionError(f'Unexpected source page count metadata: {year} {code}')
        file = ROOT / expected.lstrip('/')
        if not file.is_file() or file.is_symlink() or not file.resolve().is_relative_to(ROOT.resolve()):
            raise AssertionError(f'Missing or unsafe source file: {file}')
        with file.open('rb') as stream:
            if not stream.read(8).startswith(b'%PDF-'):
                raise AssertionError(f'Not a PDF: {file}')
        if file.stat().st_size != row['bytes'] or sha256(file) != row['sha256']:
            raise AssertionError(f'PDF content or length mismatch: {file}')
        if args.uploads:
            original = args.uploads / name
            if not original.is_file() or sha256(original) != row['sha256']:
                raise AssertionError(f'Original missing or does not match: {original}')
        print('PASS', year, code, row['pages'], 'pages, checksum matches', flush=True)
    print('PASS 17 unique source-only PDFs: 12 from 2023 and 5 from 2024')
    print('The existing searchable question bank and answer status are not certified by this check.')


if __name__ == '__main__':
    main()
