#!/usr/bin/env python3
"""Crop the numbered NCERT figures out of the supplied Class 12 Biology chapter PDFs.

Adapted from tools/extract/extract-chemistry-figures.py. Two things differ from the
Chemistry extractor:

1. Captions are panel-suffixed far more often here ("Figure 3.1(a)", "Figure 5.4b",
   "Figure 12.4 (c)"), so the caption parser keeps the panel letter inside the
   figure id: 3.1a, 5.4b, 9.7a, 12.4d. Where one caption covers two printed panels
   (3.4, 5.4, 9.7, 12.4) the figure is cropped twice, once per panel.
2. Automatic clustering could not be used. These reprints place figures in Form
   XObjects, glyph art, clip-path masks and full-page background images, so
   get_drawings() returns tens of thousands of rectangles and "nearest cluster above
   the caption" landed on body text, table rules and heading glyphs. Every crop in
   MANUAL_CROPS was measured by hand against the rendered page, rendered at 200 dpi,
   inspected on a contact sheet, and corrected until the crop held the whole figure
   and nothing else - no body text, no neighbouring captions, no page furniture.

MANUAL_CROPS is therefore the audit trail for the biology entries in
assets/img/notes/manifest.json: it holds the exact rectangles that produced the
committed images. A figure with no entry here is never exported, so the tool cannot
invent anything that was not visually verified.

Usage:
  python3 tools/extract/extract-biology-figures.py <pdf-dir> <out-dir> [--only 3.1a,5.4b]
  python3 tools/extract/extract-biology-figures.py <pdf-dir> <out-dir> --check-manifest

--check-manifest hashes each fresh crop against the manifest and reports any entry
whose committed image no longer matches the recorded rectangle.

Writes <pdf-stem>_fig<figure>.png and prints a JSON report with the crop points, the
printed caption taken from the PDF text layer and the output size in pixels.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import fitz

DPI = 200
ROOT = Path(__file__).resolve().parents[2]
CAPTION_RE = re.compile(
    r'^Figure\s*(\d+)\.(\d+)\s*(?:\(\s*([a-h])\s*\)|(?-i:([a-h]))(?![A-Za-z]))?', re.I)

# Verified crop rectangles in PDF points (x0, y0, x1, y1), keyed "<pdf>:<figure>".
MANUAL_CROPS = {
    'lebo103.pdf:3.1a':      [53.4, 162.2, 219.9, 203.9],
    'lebo103.pdf:3.1b':      [53.7, 238.0, 228.9, 330.4],
    'lebo103.pdf:3.2':       [53.4, 376.5, 228.6, 582.0],
    'lebo103.pdf:3.3':       [339.4, 80.4, 515.3, 210.2],
    'lebo103.pdf:3.4a':      [30.0, 466.0, 275.0, 684.0],
    'lebo103.pdf:3.4b':      [256.0, 467.0, 471.0, 690.9],
    'lebo105.pdf:5.1':       [114.1, 577.4, 532.1, 680.7],
    'lebo105.pdf:5.10':      [57.5, 456.3, 383.3, 671.7],
    'lebo105.pdf:5.11':      [143.4, 404.5, 534.4, 672.7],
    'lebo105.pdf:5.12':      [109.8, 298.3, 429.4, 441.4],
    'lebo105.pdf:5.13':      [238.0, 81.7, 516.8, 265.3],
    'lebo105.pdf:5.14':      [75.2, 84.7, 464.7, 352.5],
    'lebo105.pdf:5.15':      [277.0, 460.0, 476.0, 675.1],
    'lebo105.pdf:5.16':      [56.3, 81.1, 494.4, 502.7],
    'lebo105.pdf:5.2':       [103.7, 87.0, 517.9, 278.4],
    'lebo105.pdf:5.3':       [47.4, 317.3, 312.2, 579.8],
    'lebo105.pdf:5.4a':      [304.3, 119.9, 513.4, 314.7],
    'lebo105.pdf:5.4b':      [300.9, 339.0, 515.9, 488.4],
    'lebo105.pdf:5.5':       [131.3, 243.8, 531.5, 577.2],
    'lebo105.pdf:5.6':       [66.9, 271.5, 248.3, 562.0],
    'lebo105.pdf:5.7':       [53.6, 405.8, 497.5, 601.8],
    'lebo105.pdf:5.8':       [301.8, 81.4, 515.3, 312.4],
    'lebo105.pdf:5.9':       [82.6, 319.3, 492.6, 408.8],
    'lebo107.pdf:7.1':       [52.6, 83.7, 534.5, 608.2],
    'lebo107.pdf:7.10':      [342.2, 206.7, 470.6, 364.1],
    'lebo107.pdf:7.11':      [327.6, 392.9, 513.1, 583.1],
    'lebo107.pdf:7.2':       [320.4, 79.9, 515.4, 402.9],
    'lebo107.pdf:7.3':       [266.9, 414.9, 516.4, 561.9],
    'lebo107.pdf:7.4':       [213.1, 289.0, 523.7, 522.9],
    'lebo107.pdf:7.5':       [26.2, 82.5, 204.7, 289.0],
    'lebo107.pdf:7.6':       [122.9, 111.9, 423.6, 527.6],
    'lebo107.pdf:7.7':       [122.7, 546.5, 296.3, 694.1],
    'lebo107.pdf:7.8':       [362.6, 538.0, 503.6, 695.2],
    'lebo107.pdf:7.9':       [51.0, 215.6, 263.8, 360.2],
    'lebo109.pdf:9.1':       [141.0, 286.9, 472.4, 566.3],
    'lebo109.pdf:9.2':       [63.1, 357.2, 379.5, 688.7],
    'lebo109.pdf:9.3':       [77.3, 305.0, 287.5, 415.7],
    'lebo109.pdf:9.4':       [306.9, 331.4, 498.2, 499.1],
    'lebo109.pdf:9.5':       [369.0, 293.0, 519.0, 573.0],
    'lebo109.pdf:9.6':       [92.0, 305.0, 533.0, 661.0],
    'lebo109.pdf:9.7a':      [69.8, 289.0, 250.6, 452.3],
    'lebo109.pdf:9.7b':      [279.3, 291.5, 514.4, 454.8],
    'lebo110.pdf:10.1':      [187.0, 187.0, 508.0, 403.0],
    'lebo110.pdf:10.2':      [92.0, 75.0, 458.0, 266.0],
    'lebo110.pdf:10.3':      [54.4, 81.0, 240.4, 232.0],
    'lebo111.pdf:11.1':      [97.2, 82.3, 532.1, 176.7],
    'lebo111.pdf:11.2':      [37.0, 255.0, 528.0, 563.0],
    'lebo111.pdf:11.3':      [52.0, 359.0, 273.0, 612.0],
    'lebo111.pdf:11.4':      [33.0, 368.0, 481.0, 546.0],
    'lebo111.pdf:11.5':      [50.0, 330.0, 253.0, 546.0],
    'lebo112.pdf:12.1':      [37.0, 81.0, 555.0, 473.0],
    'lebo112.pdf:12.2':      [117.0, 399.0, 548.0, 675.0],
    'lebo112.pdf:12.3':      [19.0, 334.0, 518.0, 600.9],
    'lebo112.pdf:12.4a':     [92.0, 179.0, 503.0, 347.4],
    'lebo112.pdf:12.4b':     [102.0, 377.0, 508.0, 556.9],
    'lebo112.pdf:12.4c':     [197.0, 589.0, 433.0, 675.0],
    'lebo112.pdf:12.4d':     [107.0, 87.0, 388.0, 248.0],
    'lebo113.pdf:13.1':      [157.0, 243.0, 525.0, 575.0],
    'lebo113.pdf:13.2':      [54.0, 239.0, 329.0, 505.0],
}


def norm(text):
    return ' '.join(text.split())


def captions_on(page):
    """figure id -> printed caption line, read from the PDF text layer only."""
    found = {}
    for block in page.get_text('dict')['blocks']:
        if block['type'] != 0:
            continue
        for line in block['lines']:
            text = norm(''.join(span['text'] for span in line['spans']))
            match = CAPTION_RE.match(text) if text else None
            if not match:
                continue
            fig = '{}.{}'.format(match.group(1), match.group(2))
            panel = match.group(3) or match.group(4)
            if panel:
                fig += panel.lower()
            found.setdefault(fig, text)
    return found


def page_for(doc, fig):
    """(page, caption text) for a figure id; panels fall back to their base figure."""
    base = fig.rstrip('abcdefgh')
    # exact id first, then the unsuffixed figure, then a sibling panel - each
    # searched across the whole document so a later panel cannot be stolen by an
    # earlier page that happens to carry the first panel of the same figure.
    for wanted in ([fig], [base], [base + letter for letter in 'abcdefgh']):
        for page in doc:
            found = captions_on(page)
            for key in wanted:
                if key in found:
                    return page, found[key]
    return None, None


def crop(src, out_dir, only=None):
    report = []
    for pdf_path in sorted(Path(src).glob('*.pdf')):
        jobs = sorted((k.split(':', 1)[1], v) for k, v in MANUAL_CROPS.items()
                      if k.startswith(pdf_path.name + ':'))
        if not jobs:
            continue
        doc = fitz.open(pdf_path)
        for fig, rect in jobs:
            if only and fig not in only:
                continue
            page, caption = page_for(doc, fig)
            if page is None:
                raise SystemExit('no caption line for figure %s in %s' % (fig, pdf_path.name))
            clip = fitz.Rect(*rect)
            pix = page.get_pixmap(dpi=DPI, clip=clip)
            name = '{}_fig{}.png'.format(pdf_path.stem, fig)
            pix.save(out_dir / name)
            report.append({
                'source_file': pdf_path.name,
                'figure': fig,
                'pdf_page': page.number + 1,
                'crop_points': [round(v, 1) for v in rect],
                'size_px': [pix.width, pix.height],
                'caption': caption,
                'file': name,
                'sha256': hashlib.sha256((out_dir / name).read_bytes()).hexdigest(),
            })
        doc.close()
    return report


def check_manifest(report):
    manifest = json.loads((ROOT / 'assets/img/notes/manifest.json').read_text())
    by_key = {(x['source_file'], x['figure']): x for x in manifest['images']}
    bad = []
    for entry in report:
        item = by_key.get((entry['source_file'], entry['figure']))
        if item is None:
            bad.append((entry['figure'], 'missing from manifest'))
        elif item['sha256'] != entry['sha256']:
            bad.append((entry['figure'], 'crop does not match committed image'))
    for figure, why in bad:
        print('MISMATCH {:<6} {}'.format(figure, why))
    if bad:
        raise SystemExit('{} biology crop(s) differ from the manifest'.format(len(bad)))
    print('PASS: {} biology crops reproduce the committed manifest images'.format(len(report)))


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    out.mkdir(parents=True, exist_ok=True)
    report = crop(src, out, only)
    if '--check-manifest' in sys.argv:
        check_manifest(report)
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
