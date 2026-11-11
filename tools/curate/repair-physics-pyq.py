#!/usr/bin/env python3
"""Conservative structural repair; never invent missing options or keys.

Only complete A–D options also present verbatim (whitespace-normalised) in the
stem are made interactive. Unrecoverable imports stay visible but ungraded.
"""
import json, re
from pathlib import Path
root = Path(__file__).resolve().parents[2]
p = root / 'assets/js/data/pyq-physics-2025.js'
s = p.read_text(); start = s.index('const qs = ') + len('const qs = ')
end = s.index(';\n  const seen', start)
rows = json.loads(s[start:end])
kinds = {'mcq':1, 'ar':2, 'assertion-reason':2, 'vsa':3, 'sa':4, 'la':5, 'case':6}
def normal(t): return re.sub(r'\s+', ' ', t).strip()
audit = []
for q in rows:
    q['kind'] = kinds.get(q['kind'], q['kind'])
    opts = q.get('opts')
    if isinstance(opts, dict):
        values = [opts.get(k, '') for k in 'ABCD']
    elif isinstance(opts, list):
        values = [o.get('en','') for o in opts]
    else: values = []
    text = q.get('en','')
    clean = not re.search(r'[\ue000-\uf8ff]|H\$|\{Z|P\.T\.O\.|Page \d+ of', text)
    safe = len(values)==4 and all(isinstance(v,str) and len(v.strip())>1 and
        not re.search(r'[\ue000-\uf8ff]',v) and normal(v) in normal(text) for v in values)
    safe = safe and len(set(values))==4 and clean
    q['opts'] = [{'en':v,'hi':''} for v in values] if safe else None
    q['textReview'] = 'awaiting-source-review'
    q['keyVerified'] = False
    q['optionReview'] = 'inline-match-only' if safe else 'awaiting-source-review'
    if clean: q['cleanText'] = True
    if safe and re.fullmatch('[A-D]',str(q.get('ans',''))):
        q['ans'] = values[ord(q['ans'])-65]
    audit.append({'id':q['id'], 'options':q['optionReview'], 'answerKey':'not supplied' if not q.get('ans') else 'awaiting review'})
p.write_text(s[:start]+json.dumps(rows,ensure_ascii=False)+s[end:])
report = {'method':'Structural safety check, not a source review. Text unchanged; no invented answers.',
          'rows':len(rows),'interactiveOptions':sum(bool(q['opts']) for q in rows),
          'questions':audit}
(root/'assets/notes/physics-pyq-review.json').write_text(json.dumps(report,indent=1)+'\n')
print('Physics rows:',len(rows),'inline matched option sets:',report['interactiveOptions'])
