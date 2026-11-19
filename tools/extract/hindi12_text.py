"""Extract searchable review copies from the four Class XII Hindi readers.
Requires PyMuPDF and the IIT Delhi Walkman converter (commit ad0117f6f5):
https://github.com/assistech-iitdelhi/ePubFontConverter-WalkmanChanakya
Put its directory on PYTHONPATH after changing Python 2 <> to != in convert.py.
Pass the original upload directory as argv[1]. Never feed output into answer keys.
"""
import json
import re
import sys
from pathlib import Path
import pymupdf
from convert import convertToUni

# Known failure signatures from comparison with the printed pages. Flag rather
# than replace a conjunct/name. Unflagged words are still NOT verified text.
uncertain = re.compile(r"प्रवृफ़ति|पैफ़ल|वेंफ़द्र|वंफ़घ|अंा|[\u0900-\u097f]\s+‘\s+[\u0900-\u097f]")
review = []
for course, prefixes in [('core', ('lhar','lhvt')), ('elective', ('lhan','lhat'))]:
    pages = {}
    for path in sorted(Path(sys.argv[1]).glob('*.pdf')):
        if path.stem[:4] not in prefixes:
            continue
        with pymupdf.open(path) as doc:
            pages[path.stem] = []
            for page in doc:
                lines = []
                for block in page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']:
                    for line in block.get('lines', []):
                        spans = []
                        for span in line['spans']:
                            if 'chanakya' not in span['font'].lower():
                                continue  # decorative headings and non-text glyphs: see facsimile
                            raw = span['text'].strip()
                            if raw:
                                text = convertToUni(raw, 1).replace('??','?')
                                # Unmapped font bytes are not a trustworthy transcription.
                                spans.append('〔मूल पृष्ठ देखें〕' if re.search('[A-Za-zαβγ�]', text) else text)
                        if spans:
                            lines.append(' '.join(spans))
                layer = '\n'.join(lines)
                reason = 'no supported text layer' if not layer else 'suspect glyph sequence' if uncertain.search(layer) or '〔' in layer else ''
                if reason:
                    review.append({'source':path.name,'pdfPage':page.number+1,'reason':reason})
                    if layer:
                        layer = '〔इस पृष्ठ की प्रतिलिपि में संदिग्ध अक्षर हैं; मूल पृष्ठ देखें।〕\n' + layer
                pages[path.stem].append(layer)
    out = Path(f'assets/js/data/hindi12-{course}-text.js')
    out.write_text('UP.hindi12Text = Object.assign(UP.hindi12Text || {},'+json.dumps(pages, ensure_ascii=False,separators=(',',':'))+');\n')

Path("docs/hindi12-review.json").write_text(json.dumps(review, ensure_ascii=False, indent=2)+"\n")
