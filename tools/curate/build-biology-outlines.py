#!/usr/bin/env python3
"""Attach CBSE 2026-27 outline views and source-crop figures to Class 12 Biology.

Generated file: assets/js/data/biology-outlines.js

Two things are joined here:

* assets/notes/outlines.json['biology'] — the reviewed, English-only outline for
  each of the 13 NCERT chapters (summary, sections, objectives, key terms).
* assets/img/notes/manifest.json — the crops that came out of the supplied
  reprints, grouped by the chapter number in the figure id (3.4a -> chapter 3).
  Chapters 1, 2, 4, 6 and 8 were supplied as image-only scans, so they carry no
  crops and the chapter page says so instead of showing a gap.

Unit marks are the published CBSE 2026-27 Class XII Biology (044) theory marks
per unit (sum 70), not a per-chapter weight inferred from anything: one unit can
hold two or three chapters, so the chapter page labels the figure as a unit mark.
Nothing here is CBSE certification.
"""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
bio = json.loads((root / 'assets/notes/outlines.json').read_text())['biology']
manifest = json.loads((root / 'assets/img/notes/manifest.json').read_text())

UNIT_MARKS = {6: 16, 7: 20, 8: 12, 9: 12, 10: 10}


def fig_key(figure):
    m = re.match(r'(\d+)\.(\d+)([a-z]?)', figure)
    return (int(m.group(1)), int(m.group(2)), m.group(3))


figures = {}
for item in manifest['images']:
    if not item['source_file'].startswith('lebo'):
        continue
    chapter = fig_key(item['figure'])[0]
    figures.setdefault(str(chapter), []).append({
        'fig': item['figure'],
        'path': item['path'],
        'caption': item['caption'],
        'page': item['pdf_page'],
        'sha256': item['sha256'],
    })
for chapter in figures:
    figures[chapter].sort(key=lambda f: fig_key(f['fig']))

outlines = {}
for entry in sorted(bio, key=lambda c: c['chapter']):
    record = dict(entry)
    record['figures'] = figures.get(str(entry['chapter']), [])
    outlines[str(entry['chapter'])] = record

assert sorted(int(k) for k in outlines) == list(range(1, 14))
assert sum(UNIT_MARKS.values()) == 70
assert sum(len(v) for v in figures.values()) == 59, figures
for record in outlines.values():
    assert record['marks'] == UNIT_MARKS[record['unit']]
    assert 150 <= len(record['summary']) <= 320, record['id']

payload = {
    'order': [str(k) for k in sorted(int(k) for k in outlines)],
    'outlines': outlines,
}

js = (
    "/* Generated from assets/notes/outlines.json and assets/img/notes/manifest.json;\n"
    "   English outlines only. Attaches the CBSE 2026-27 outline view and the verified\n"
    "   source-crop figures to each Class 12 Biology chapter.\n"
    "   Rebuild with: python3 tools/curate/build-biology-outlines.py */\n"
    "window.UP = window.UP || {};\n"
    "(function () {\n"
    "  var data = " + json.dumps(payload['outlines'], ensure_ascii=False, indent=2) + ";\n"
    "  var rows = (UP.sci12 && UP.sci12.biology) || [];\n"
    "  UP.biologyOutlines = data;\n"
    "  UP.biology12 = rows.map(function (row, i) {\n"
    "    var id = i + 1;\n"
    "    var o = data[String(id)] || null;\n"
    "    var ch = {\n"
    "      id: id, subject: 'biology',\n"
    "      en: row[0], hi: row[1], enDesc: row[2], hiDesc: row[2],\n"
    "      weight: (o && o.marks) || 4, demand: 'outline',\n"
    "      concepts: [{ t: { en: 'What this chapter covers', hi: 'यह अध्याय क्या समेटता है' },\n"
    "                  b: { en: row[2], hi: row[2] } }],\n"
    "      formulas: [], pyqs: [], plan: [],\n"
    "      keywords: { en: (o && o.terms) || [row[0]], hi: [row[1]] },\n"
    "      displayNo: id, n: id, chapterNo: id\n"
    "    };\n"
    "    if (o) { ch.outline = o; }\n"
    "    return ch;\n"
    "  });\n"
    "})();\n"
)

target = root / 'assets/js/data/biology-outlines.js'
target.write_text(js)
print('wrote assets/js/data/biology-outlines.js')
for k in payload['order']:
    o = outlines[k]
    print('  %-9s ch%2d unit %-2d  %2d figures  %s' % (o['id'], o['chapter'], o['unit'], len(o['figures']), o['title']))
