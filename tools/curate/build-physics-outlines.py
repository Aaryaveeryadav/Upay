#!/usr/bin/env python3
"""Attach CBSE 2026-27 outline views to the Class 12 Physics chapters.

Generated file: assets/js/data/physics-outlines.js

Source of truth: assets/notes/outlines.json['physics'] — one reviewed,
English-only outline per NCERT chapter (summary, sections, objectives, key
terms). The chapter objects themselves already exist in
assets/js/data/physics12.js (ids 601-614, built there); this script does not
recreate them, it attaches the outline to each one by id.

No unit marks are published here. The CBSE 042 unit rows in the copies of the
curriculum that were available do not add up to the stated theory total of 70,
so the page shows the unit name and the paper code and makes no claim about a
unit's marks. Biology and Chemistry keep their published unit marks.

Nothing here is CBSE certification.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
physics = json.loads((root / 'assets/notes/outlines.json').read_text())['physics']

assert len(physics) == 14, len(physics)
assert [c['chapter'] for c in physics] == list(range(1, 15))
for c in physics:
    assert c['id'] == 'lephy12%02d' % c['chapter'], c['id']
    assert 150 <= len(c['summary']) <= 320, c['id']
    assert 6 <= len(c['sections']) <= 10, c['id']
    assert len(c['objectives']) == 3, c['id']
    assert 8 <= len(c['terms']) <= 16, c['id']
    assert 'marks' not in c, 'physics carries no unit marks; see the module docstring'

payload = {str(c['chapter']): c for c in physics}

js = (
    "/* Generated from assets/notes/outlines.json; English outlines only.\n"
    "   Attaches the CBSE 2026-27 outline view to each Class 12 Physics chapter\n"
    "   (ids 601-614). No unit marks are claimed for Physics.\n"
    "   Rebuild with: python3 tools/curate/build-physics-outlines.py */\n"
    "window.UP = window.UP || {};\n"
    "(function () {\n"
    "  var data = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    "  UP.physicsOutlines = data;\n"
    "  (UP.physics12 || []).forEach(function (ch) {\n"
    "    var o = data[String((+ch.id) - 600)];\n"
    "    if (!o) return;\n"
    "    ch.outline = o;\n"
    "    ch.displayNo = o.chapter;\n"
    "    ch.n = o.chapter;\n"
    "    ch.chapterNo = o.chapter;\n"
    "    ch.demand = 'outline';\n"
    "    if (o.marks) ch.weight = o.marks;\n"
    "  });\n"
    "})();\n"
)

target = root / 'assets/js/data/physics-outlines.js'
target.write_text(js)
print('wrote assets/js/data/physics-outlines.js')
for c in physics:
    print('  %-11s ch%2d unit %d  %-56s %d sections' % (c['id'], c['chapter'], c['unit'], c['title'][:56], len(c['sections'])))
