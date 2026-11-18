#!/usr/bin/env python3
"""Structural/source-integrity checks; not full semantic answer verification."""
import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'extracted/2018-all-india'
EXPECTED = {
    'Communicative Question Paper': (12, 'question-paper'),
    'Communicative Solution': (37, 'marking-scheme'),
    'Language & Literature Paper': (8, 'question-paper'),
    'Language & Literature Solution': (10, 'marking-scheme'),
    'Maths Question Paper': (12, 'question-paper'),
    'Maths Solution': (12, 'marking-scheme'),
    'Science Question Paper': (12, 'question-paper'),
    'Science Solution': (9, 'marking-scheme'),
    'Social Science Question Paper': (12, 'question-paper'),
    'Social Science Solution': (12, 'marking-scheme'),
}


def unit_checks():
    spec = importlib.util.spec_from_file_location('extract2018', ROOT / 'tools/extract/all_india_2018.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    class Page:
        def __init__(self, lines):
            self.lines = lines

        def get_text(self, mode):
            return {'blocks': [{'lines': [{'spans': line} for line in self.lines]}]}

    def span(font, text):
        return {'font': font, 'text': text}

    # Drop a whole Hindi line, including embedded Latin digits; retain actual English.
    page = Page([[span('CIDFont+F4', '\ue019\ue03f'), span('English', '30')],
                 [span('English', 'Find the HCF of 2 and 4.')],
                 [span('Symbol', '\uf044 ABC')]])
    text, omitted = module.english_text(page, {'CIDFont+F4'})
    assert omitted == 1 and text == 'Find the HCF of 2 and 4.\n\uf044 ABC'
    # The same CID identifier must not be globally excluded in other documents.
    assert module.english_text(Page([[span('CIDFont+F4', 'English')]]), set()) == ('English', 0)
    assert module.english_text(Page([[span('Other', 'हिन्दी')]]), set()) == ('', 1)
    for bad in ['corrupt\x01', '\ue019']:
        try:
            module.english_text(Page([[span('Unexpected', bad)]]), set())
        except ValueError:
            pass
        else:
            raise AssertionError('Corruption should fail closed')
    print('PASS: unit checks for document-specific Hindi filtering, Symbol preservation and corruption rejection.')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pdf-dir', type=Path, help='Optionally compare all hashes with original uploads')
    ap.add_argument('--unit', action='store_true', help='Also test extraction helpers (requires pymupdf)')
    args = ap.parse_args()
    manifest = json.loads((OUT / 'manifest.json').read_text())
    by_name = {x['file']: x for x in manifest}
    assert len(manifest) == len(by_name) == 16
    assert all(x['year'] == 2018 and '2018(All India)' in x['file'] for x in manifest)
    assert all(re.fullmatch('[a-f0-9]{64}', x['sha256']) for x in manifest)
    included = [x for x in manifest if 'output' in x]
    excluded = [x for x in manifest if x['status'] == 'excluded-subject']
    assert len(included) == 10 and len(excluded) == 6
    assert len({x['sha256'] for x in included}) == 10
    assert all(x['file'].startswith(('Hindi', 'Sanskrit')) and 'output' not in x for x in excluded)
    counts = {'question-paper': 0, 'marking-scheme': 0}
    methods = {'text-layer': 0, 'english-ocr-unverified': 0}
    records = {}
    for name, (pages, kind) in EXPECTED.items():
        item = by_name[name + ' 2018(All India).pdf']
        assert item['pages'] == pages and item['kind'] == kind
        assert Path(item['output']).name == item['output']
        record = json.loads((OUT / item['output']).read_text())
        records[name] = record
        assert record['source'] == item['file'] and record['sha256'] == item['sha256']
        assert record['year'] == 2018 and record['kind'] == kind and record['yearBasis']
        assert record['status'] == 'extracted-not-question-verified'
        assert len(record['pages']) == pages
        md = (OUT / item['output'].replace('.json', '.md')).read_text()
        assert 'Year: 2018 (upload batch).' in md
        for n, page in enumerate(record['pages'], 1):
            assert page['page'] == n and page['requiresVisualReview'] is True
            method = 'english-ocr-unverified' if name == 'Maths Solution' else 'text-layer'
            assert page['method'] == method
            assert page['omittedHindiLines'] >= 0
            assert not re.search('[\u0900-\u097f\ue000-\uefff\x00-\x08\x0b\x0c\x0e-\x1f]', page['text'])
            assert page['unmappedSymbolGlyphs'] == sum('\uf000' <= c <= '\uf8ff' for c in page['text'])
            assert f'## PDF page {n} ({method})' in md and page['text'] in md
            if method == 'english-ocr-unverified':
                assert page['text']
            methods[method] += 1
        counts[kind] += pages
    assert counts == {'question-paper': 56, 'marking-scheme': 80}
    assert methods == {'text-layer': 124, 'english-ocr-unverified': 12}
    assert len(list(OUT.glob('*.json'))) == 12  # manifest + 10 documents + review samples
    assert len(list(OUT.glob('*.md'))) == 11
    assert 'Delhi - 1/1, 1/2, 1/3' in records['Communicative Solution']['pages'][0]['text']
    assert 'GLOBALIZATION' in records['Communicative Solution']['pages'][1]['text']
    assert 'Globalization' in records['Communicative Question Paper']['pages'][1]['text']
    assert 'Dal Lake' in records['Language & Literature Paper']['pages'][1]['text']
    assert 'Dal Lake' in records['Language & Literature Solution']['pages'][1]['text']
    science = records['Science Solution']['pages'][1]['text']
    assert 'Due to ambiguity in the question award 1 mark whether attempted or not.' in science
    samples = json.loads((OUT / 'review-samples.json').read_text())
    assert samples['year'] == 2018 and len(samples['maths']['examples']) == 6
    assert [x['answer'] for x in samples['maths']['examples']] == ['k = 1/2', '2', 'sqrt(x^2 + y^2)', '28', '0', '1/9']
    guide = (OUT / 'README.md').read_text()
    for warning in ['not fully verified', 'Delhi', 'ambiguity', 'unverified OCR', 'Live question banks']:
        assert warning in guide
    if args.pdf_dir:
        for item in manifest:
            assert hashlib.sha256((args.pdf_dir / item['file']).read_bytes()).hexdigest() == item['sha256'], item['file']
        print('PASS: all 16 SHA-256 fingerprints match original uploads.')
    if args.unit:
        unit_checks()
    print('PASS: 2018-only inventory, 6 exclusions, 10 distinct documents, 136 pages, methods, review flags and source warnings. Not semantic certification.')


if __name__ == '__main__':
    main()
