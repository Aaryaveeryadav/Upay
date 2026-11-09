#!/usr/bin/env python3
"""Build app navigation data from the reviewed public outline source."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[2]
notes=json.loads((root/'assets/notes/outlines.json').read_text())['business_studies']
units=list(range(1,13))
assert len(notes)==len(units)
chapters=[]
for c, unit in zip(notes,units):
    chapters.append({'id':2100+unit,'displayNo':unit,'n':unit,'subject':'business-studies','className':12,
                     'en':c['title'],'hi':c['title'],'enDesc':c['summary'],'hiDesc':c['summary'],
                     'demand':'outline','keywords':{'en':c['terms'],'hi':[]},'outline':c})
(root/'assets/js/data/business-studies12.js').write_text(
    '/* Generated from assets/notes/outlines.json; English outlines only. */\nwindow.UP = window.UP || {};\nUP.course12business = '+json.dumps(chapters,ensure_ascii=False,indent=2)+';\n')
