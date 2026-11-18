#!/usr/bin/env python3
"""Read the audited 2018 uploads; stage English extractions without touching live banks.
Requires pymupdf; scanned Maths scheme requires English Tesseract traineddata.
"""
import argparse
import hashlib
import json
import re
import tempfile
from pathlib import Path

import pymupdf

# CID font identifiers are document-specific, NOT a global language detector.
HINDI_FONTS = {
    'Maths Question Paper': {'CIDFont+F4'},
    'Science Question Paper': {'CIDFont+F3', 'CIDFont+F6'},
    'Social Science Question Paper': {'CIDFont+F3', 'CIDFont+F4'},
}
NAMES = [
    'Communicative Question Paper', 'Communicative Solution',
    'Language & Literature Paper', 'Language & Literature Solution',
    'Maths Question Paper', 'Maths Solution', 'Science Question Paper', 'Science Solution',
    'Social Science Question Paper', 'Social Science Solution',
    'Hindi-A Question Paper', 'Hindi-A Solution', 'Hindi-B Question Paper', 'Hindi-B Solution',
    'Sanskrit Question Paper', 'Sanskrit Solution',
]
CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')


def english_text(page, excluded_fonts):
    lines, omitted = [], 0
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = line['spans']
            if any(s['font'] in excluded_fonts or re.search('[\u0900-\u097f]', s['text'])
                   for s in spans if s['text'].strip()):
                omitted += 1
                continue
            text = ''.join(s['text'] for s in spans).strip()
            if text:
                lines.append(text)
    text = '\n'.join(lines)
    if CONTROL.search(text) or re.search('[\ue000-\uefff]', text):
        raise ValueError('Unexpected corrupt/Hindi glyphs remain; inspect the source before publishing')
    return text, omitted


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pdf-dir', required=True, type=Path)
    ap.add_argument('--tessdata', required=True, type=Path)
    ap.add_argument('--output', type=Path, default=Path('extracted/2018-all-india'))
    args = ap.parse_args()
    sources = [args.pdf_dir / (name + ' 2018(All India).pdf') for name in NAMES]
    missing = [p.name for p in sources if not p.is_file()]
    if missing:
        ap.error('Missing audited sources: ' + ', '.join(missing))
    # Prevent accidental regeneration over an earlier year's deliverables.
    if (args.output / 'manifest.json').exists():
        previous = json.loads((args.output / 'manifest.json').read_text())
        if any(x.get('year') != 2018 for x in previous):
            ap.error('Refusing to overwrite a different year')
    manifest, seen = [], {}
    # Do not publish partial output if PDF reading/OCR/filtering fails.
    with tempfile.TemporaryDirectory(prefix='upay-2018-') as tmp:
        stage = Path(tmp)
        for name, source in zip(NAMES, sources):
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            entry = {'file': source.name, 'year': 2018, 'sha256': digest}
            manifest.append(entry)
            if name.startswith(('Hindi', 'Sanskrit')):
                entry['status'] = 'excluded-subject'
                continue
            if digest in seen:
                entry.update(status='duplicate-not-extracted', duplicateOf=seen[digest])
                continue
            seen[digest] = source.name
            kind = 'marking-scheme' if name.endswith('Solution') else 'question-paper'
            pages = []
            with pymupdf.open(source) as doc:
                for i, page in enumerate(doc, 1):
                    if name == 'Maths Solution':
                        tp = page.get_textpage_ocr(language='eng', dpi=250, full=True, tessdata=str(args.tessdata))
                        text = page.get_text(textpage=tp).strip()
                        if not text:
                            raise ValueError(f'Empty OCR page {i}')
                        metadata = {'method': 'english-ocr-unverified', 'omittedHindiLines': 0}
                    else:
                        text, omitted = english_text(page, HINDI_FONTS.get(name, set()))
                        metadata = {'method': 'text-layer', 'omittedHindiLines': omitted}
                    # Preserve unmapped Adobe Symbol glyphs rather than guessing meaning.
                    pua = sum('\uf000' <= c <= '\uf8ff' for c in text)
                    pages.append({'page': i, **metadata, 'unmappedSymbolGlyphs': pua,
                                  'text': text, 'requiresVisualReview': True})
            slug = re.sub('[^a-z0-9]+', '-', source.stem.lower()).strip('-')
            record = {'source': source.name, 'year': 2018, 'yearBasis': 'upload label and accompanying dated marking scheme; not every paper prints a year',
                      'sha256': digest, 'kind': kind, 'status': 'extracted-not-question-verified',
                      'warning': 'Review original PDFs for formulas, Symbol glyphs, OCR, figures, maps and ordering. No automatic answer pairing.',
                      'pages': pages}
            (stage / (slug + '.json')).write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            md = f'# {source.stem}\n\nYear: 2018 (upload batch). Unverified extraction; PDF page numbers. Figures/maps are not transcribed. See README for source and pairing warnings.\n'
            for p in pages:
                md += f"\n## PDF page {p['page']} ({p['method']})\n\n{p['text']}\n"
            (stage / (slug + '.md')).write_text(md, encoding='utf-8')
            entry.update(status=record['status'], kind=kind, pages=len(pages), output=slug + '.json')
        manifest.sort(key=lambda x: x['file'])
        (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        args.output.mkdir(parents=True, exist_ok=True)
        for p in stage.iterdir():
            (args.output / p.name).write_bytes(p.read_bytes())


if __name__ == '__main__':
    main()
