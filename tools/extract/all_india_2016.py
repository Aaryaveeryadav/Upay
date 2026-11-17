#!/usr/bin/env python3
"""Extract only the 2016 upload batch; never write to the live question banks.
Requires pymupdf and English Tesseract traineddata for corrupted paper fonts.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
import pymupdf

HINDI_FONT = re.compile(r'CHANAKYA|SHREE|DEVANAGARI|KRUTI|MANGAL', re.I)
CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')


def is_hindi(span):
    return bool(HINDI_FONT.search(span['font']) or re.search('[\u0900-\u097f]', span['text']))


def text_layer(page):
    lines, omitted = [], 0
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            if any(is_hindi(s) for s in line['spans'] if s['text'].strip()):
                omitted += 1
                continue
            text = ''.join(s['text'] for s in line['spans']).strip()
            if text:
                lines.append(text)
    return '\n'.join(lines), omitted


def paper_ocr(doc, index, tessdata):
    # OCRing a bilingual page as English without masking Hindi produces gibberish.
    # Work on a temporary one-page copy; the original PDF stays untouched.
    with pymupdf.open() as copy:
        copy.insert_pdf(doc, from_page=index, to_page=index)
        page = copy[0]
        masked = 0
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                if any(s['text'].strip() and is_hindi(s) for s in line['spans']):
                    # Mask the full Hindi line, including its Latin digits/formulas.
                    page.add_redact_annot(line['bbox'], fill=(1, 1, 1))
                    masked += 1
        if masked:
            page.apply_redactions(images=0, graphics=0)
        tp = page.get_textpage_ocr(language='eng', dpi=220, full=True, tessdata=str(tessdata))
        return page.get_text(textpage=tp).strip(), masked


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pdf-dir', required=True, type=Path)
    ap.add_argument('--tessdata', required=True, type=Path)
    ap.add_argument('--output', type=Path, default=Path('extracted/2016-all-india'))
    args = ap.parse_args()
    sources = sorted(args.pdf_dir.glob('*2016*.pdf'))
    if not sources:
        ap.error('No 2016 PDFs found')
    args.output.mkdir(parents=True, exist_ok=True)
    manifest, seen = [], {}
    for source in sources:
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        entry = {'file': source.name, 'year': 2016, 'sha256': digest}
        manifest.append(entry)
        if source.name.startswith(('Hindi', 'Sanskrit')):
            entry['status'] = 'excluded-subject'
            continue
        if digest in seen:
            entry.update(status='duplicate-not-extracted', duplicateOf=seen[digest])
            continue
        seen[digest] = source.name
        is_paper = 'Solution' not in source.name
        pages = []
        with pymupdf.open(source) as doc:
            for i, page in enumerate(doc):
                if is_paper:
                    text, masked = paper_ocr(doc, i, args.tessdata)
                    metadata = {'method': 'english-ocr-unverified', 'maskedHindiLines': masked}
                else:
                    text, omitted = text_layer(page)
                    if CONTROL.search(text):
                        raise ValueError(f'Corrupted solution text in {source.name} page {i + 1}')
                    metadata = {'method': 'text-layer', 'omittedHindiLines': omitted}
                pages.append({'page': i + 1, **metadata, 'text': text, 'requiresVisualReview': True})
        slug = re.sub('[^a-z0-9]+', '-', source.stem.lower()).strip('-')
        record = {'source': source.name, 'year': 2016, 'sha256': digest,
                  'kind': 'question-paper' if is_paper else 'marking-scheme',
                  'status': 'extracted-not-question-verified',
                  'warning': 'OCR, formulas, tables, figures and maps require original-PDF review. No automatic answer pairing.',
                  'pages': pages}
        (args.output / (slug + '.json')).write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        md = f'# {source.stem}\n\nYear: 2016. Unverified extraction; page numbers refer to PDF pages. Figures/maps are not transcribed.\n'
        for p in pages:
            md += f"\n## PDF page {p['page']} ({p['method']})\n\n{p['text']}\n"
        (args.output / (slug + '.md')).write_text(md, encoding='utf-8')
        entry.update(status=record['status'], kind=record['kind'], pages=len(pages), output=slug + '.json')
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
