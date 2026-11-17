#!/usr/bin/env python3
"""Extract this upload batch without changing the live question/answer banks.
Requires pymupdf; OCR requires English tessdata. See output README for caveats.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
import pymupdf

LEGACY = re.compile(r'SHREE|DEVANAGARI|KRUTI|MANGAL', re.I)

def english_text(page):
    lines = []
    rejected = 0
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = line['spans']
            # Reject whole Hindi lines, including embedded Latin digits/formulas.
            if any(LEGACY.search(s['font']) or re.search('[\u0900-\u097f]', s['text']) for s in spans if s['text'].strip()):
                rejected += 1
                continue
            text = ''.join(s['text'] for s in spans).strip()
            if text:
                lines.append(text)
    return '\n'.join(lines), rejected

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pdf-dir', type=Path, required=True)
    ap.add_argument('--output', type=Path, default=Path('extracted/2015-all-india'))
    ap.add_argument('--tessdata', required=True)
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = []
    seen = {}
    for source in sorted(args.pdf_dir.glob('*.pdf')):
        name = source.name
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        entry = {'file': name, 'sha256': digest}
        manifest.append(entry)
        if name.startswith(('Hindi', 'Sanskrit')):
            entry['status'] = 'excluded-subject'
            continue
        if name.startswith('Science Solution') and '(2)' not in name:
            entry['status'] = 'excluded-hindi-scan'
            if digest in seen:
                entry['duplicateOf'] = seen[digest]
            seen[digest] = name
            continue
        if digest in seen:
            entry.update(status='duplicate-not-extracted', duplicateOf=seen[digest])
            continue
        seen[digest] = name
        doc = pymupdf.open(source)
        pages = []
        for number, page in enumerate(doc, 1):
            text, rejected = english_text(page)
            method = 'text-layer'
            if name.startswith('Language & Literature Paper'):
                tp = page.get_textpage_ocr(language='eng', dpi=220, full=True, tessdata=args.tessdata)
                text = page.get_text(textpage=tp).strip()
                method = 'english-ocr-unverified'
            pages.append({'page': number, 'method': method, 'omittedHindiLines': rejected,
                          'text': text, 'requiresVisualReview': True})
        slug = re.sub('[^a-z0-9]+', '-', source.stem.lower()).strip('-')
        record = {'source': name, 'sha256': digest, 'pages': pages,
                  'status': 'extracted-not-question-verified',
                  'warning': 'Text order, mathematical glyphs, tables and figures require original-PDF review. No answer pairing inferred.'}
        (args.output / (slug + '.json')).write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        md = '# ' + source.stem + '\n\nUnverified extraction; page numbers refer to PDF pages. Figures are not transcribed.\n'
        for p in pages:
            md += f"\n## PDF page {p['page']} ({p['method']})\n\n{p['text']}\n"
        (args.output / (slug + '.md')).write_text(md)
        entry.update(status=record['status'], pages=len(pages), output=slug + '.json')
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
