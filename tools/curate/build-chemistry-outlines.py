#!/usr/bin/env python3
"""Attach CBSE 2026-27 outline views to the Class 12 Chemistry chapter objects.

Generated file: assets/js/data/chemistry-outlines.js

The outline data lives in assets/notes/outlines.json (reviewed, English-only).
This script maps the unit outline ids (lech101–lech105 -> units 1–5,
lech201–lech205 -> units 6–10) onto the UP.chemistry12 chapter objects loaded
by the app (ids 701–710) so the syllabus and chapter views can show the same
summary, sections, objectives, key terms and source-crop figures inline.

Unit marks are the published CBSE 2026-27 Class XII theory marks (subject 043),
not a weight inferred from the source PDFs. Nothing here is CBSE certification.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
chem = json.loads((root / 'assets/notes/outlines.json').read_text())['chemistry']

# CBSE 2026-27 Class XII Chemistry theory marks per unit (sum 70).
UNIT_MARKS = {1: 7, 2: 9, 3: 7, 4: 7, 5: 7, 6: 6, 7: 6, 8: 8, 9: 6, 10: 7}

def unit_of(outline_id):
    # lech101..lech105 -> 1..5 ; lech201..lech205 -> 6..10
    tail = int(outline_id[4:])
    return tail - 100 if tail < 200 else tail - 200 + 5

outlines = {}
for c in chem:
    unit = unit_of(c['id'])
    chapter_id = 700 + unit
    record = dict(c)
    record['unit'] = unit
    record['marks'] = UNIT_MARKS[unit]
    outlines[str(chapter_id)] = record

assert sorted(int(k) for k in outlines) == list(range(701, 711))
assert sum(UNIT_MARKS.values()) == 70

print(json.dumps({k: v['id'] for k, v in outlines.items()}, indent=0))

payload = {
    'order': [str(k) for k in sorted(int(k) for k in outlines)],
    'outlines': outlines,
}
js = (
    "/* Generated from assets/notes/outlines.json; English outlines only.\n"
    "   Attaches the CBSE 2026-27 outline view to each Class 12 Chemistry chapter.\n"
    "   Rebuild with: python3 tools/curate/build-chemistry-outlines.py */\n"
    "window.UP = window.UP || {};\n"
    "(function () {\n"
    "  var data = " + json.dumps(payload['outlines'], ensure_ascii=False, indent=2) + ";\n"
    "  var marks = " + json.dumps(UNIT_MARKS, ensure_ascii=False) + ";\n"
    "  UP.chemistryOutlines = data;\n"
    "  (UP.chemistry12 || []).forEach(function (ch) {\n"
    "    var n = (+ch.id) - 700;\n"
    "    var outline = data[String(ch.id)];\n"
    "    if (!outline) return;\n"
    "    ch.outline = outline;\n"
    "    ch.displayNo = n;\n"
    "    ch.n = n;\n"
    "    ch.demand = 'outline';\n"
    "    ch.weight = marks[n];\n"
    "  });\n"
    "})();\n"
)
(root / 'assets/js/data/chemistry-outlines.js').write_text(js)
print('wrote assets/js/data/chemistry-outlines.js')
