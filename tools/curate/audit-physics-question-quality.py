#!/usr/bin/env python3
"""Conservative Physics import screening. Not official text/key verification.
Original rows are preserved in the audit ledger; damaged rows are not published.
"""
import collections, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'assets/notes/physics-question-quality.json'
previous = json.loads(REPORT.read_text()) if REPORT.exists() else {}
originals = previous.get('originalRows', {})
report = []

def broken(text):
    if re.search(r'[\ue000-\uf8ff\x00-\x08\x0b\x0c\x0e-\x1f]', text): return 'embedded PDF glyph/control codes'
    if re.search(r'H\$|\{H\$|\{Z|g§|H\$|osQ|dhft|fdlh|\{~|Ho\$|h¡|h¢', text): return 'legacy-font Hindi, not Unicode'
    if re.search('[\u0900-\u097f]', text): return 'Hindi/mixed OCR stored in English field; needs source transcription'
    if not re.match(r'\s*(?:\([a-zivx]+\)\s*)?(?:[A-Z]|[0-9])', text): return 'fragment or unrecognised question start'
    if re.search(r'\b(?:of|in|to|for|with|by|from|is|are|and|or)\s*$',text,re.I): return 'truncated sentence'
    return None

def options(text, codes=False):
    hits=list(re.finditer(r'\(([ABCD])\)\s*(?=(?:Both\s+)?Assertion\b)' if codes else r'\(([ABCD])\)\s*', text, re.I))
    if [h[1].upper() for h in hits] != list('ABCD'): return None
    vals=[text[h.end():hits[i+1].start() if i<3 else len(text)].strip() for i,h in enumerate(hits)]
    if codes:
        vals[-1]=re.split(r'(?<=\.)\s', vals[-1], maxsplit=1)[0]
    if any(len(v)<2 or len(v)>450 for v in vals) or len(set(vals))!=4:return None
    return [{'en':v,'hi':''} for v in vals]

for name in ('physics12.js','pyq-physics-2025.js'):
    path=ROOT/'assets/js/data'/name;s=path.read_text();start=s.index('const qs = ')+11;end=s.index(';\n',start)
    rows=json.loads(s[start:end]);raws=[originals.get(q['id'],q) for q in rows]
    # Codes are paper-specific: D may mean both false OR A false/R true.
    papercodes={}
    for q in raws:
        t=q.get('en','');mark=re.search(r'Questions?\s+number\s+\d+.*?codes',t,re.I)
        if mark:
            op=options(t[mark.start():], codes=True)
            if op and all('Assertion' in x['en'] or 'assertion' in x['en'] for x in op):
                key=(q.get('series'),q.get('set'));papercodes.setdefault(key,[]).append(op)
    out=[]
    for orig in raws:
        originals[orig['id']]=orig
        q=dict(orig);t=q.get('en','').strip();changes=[];reasons=[]
        ncert=name=='physics12.js'
        # Remove only named print boilerplate. Never delete arbitrary numbers.
        t=re.sub(r'\bReprint\s+20\d\d[–-]\d\d(?:\s+(?:Physics|Notes))?(?:\s+\d{3})?', '',t)
        ar=bool(re.match(r'Assertion\s*\(A\)\s*:',t,re.I) and re.search(r'Reason\s*\(R\)\s*:',t,re.I))
        ar_shape=bool(re.match(r'[\u0900-\u097f]',t) and re.search(r'\(A\)\s*:',t) and re.search(r'\(R\)\s*:',t))
        if ar_shape: q['kind']=2
        if ncert: q['m']=None  # textbook exercises do not supply board marks
        if ar:
            # A page footer is the end of this extracted stem, not another question.
            t=re.split(r'\s+(?:~?55\s*[/–-]|Questions?\s+number)',t,maxsplit=1,flags=re.I)[0].strip()
            q['kind']=2
            codes=papercodes.get((q.get('series'),q.get('set')),[])
            unique={json.dumps(x,sort_keys=True) for x in codes}
            if len(unique)==1:
                q['opts']=codes[0];q['optionReview']='same-paper-instructions';changes.append('AR options recovered from same-paper instructions')
            else:
                reasons.append('Assertion–Reason answer-code variant needs source review')
            changes.append('classified Assertion–Reason')
        reason=broken(t)
        if reason: reasons.append(reason)
        if re.search(r'Questions?\s+number|SECTION\s+[A-E]|P\.?\s*T\.?\s*O\.?|Page\s+\d+\s+of|\b55[/–-]\d[/–-]\d',t,re.I):reasons.append('paper instructions/footer or merged page in stem')
        if re.search(r'\s\d{1,2}\.\s+(?:[A-Z]|\{H|[\u0900-\u097f])',t):reasons.append('possible next numbered question merged into stem')
        if re.search(r'(?:following|given|shown|above|below|in the)\s+(?:figure|graph|diagram|circuit)|(?:figure|graph|diagram|circuit)\s+(?:shown|given|below|above|shows)|shown\s+in\s+(?:the\s+)?(?:figure|diagram|graph|circuit)|\bFig(?:ure)?\.?\s*\d+\.\d+|Exercise\s+\d+\.\d+',t,re.I) and not q.get('fig'):reasons.append('required figure or referenced exercise missing')
        # No interpretation of fractions or exponent piles from the extraction.
        if re.search(r'\b\d{1,2}\s+\d{1,2}\s+\d{1,2}\b',t):reasons.append('ambiguous flattened mathematical layout')
        if not ar and (q.get('kind')==1 or re.search(r'\([Aa]\).*\([Bb]\).*\([Cc]\).*\([Dd]\)',t)):
            op=options(t)
            if op and not reasons:
                t=t[:re.search(r'\(A\)',t,re.I).start()].strip();q['opts']=op;q['kind']=1;q['optionReview']='inline-text-recovered';changes.append('separated inline options')
            elif q.get('kind')==1:reasons.append('MCQ options missing or not safely recoverable')
        if q.get('hi'):
            # Existing imported Physics translations are legacy-font or damaged
            # OCR. Use the intact English instead; do not pretend it is Hindi.
            q['hi']='';q['hindiReview']='withheld-pending-unicode-source';changes.append('withheld unreviewed Hindi extraction')
        if t!=q.get('en'):changes.append('removed named boilerplate/instructions from displayed stem')
        q['en']=' '.join(t.split());q['cleanText']=True
        # These source imports have no independently verified, aligned key.
        q['ans']='';q['keyVerified']=False
        q['qualityStatus']='withheld' if reasons else 'structurally-screened'
        q['qualityReasons']=reasons
        q['textReview']='awaiting-source-review'
        out.append(q);report.append({'id':q['id'],'status':q['qualityStatus'],'reasons':reasons,'changes':changes})
    tail=s[end:].replace("if(!seen.has(q.id)) UP.pyq.push(q)","if(q.qualityStatus !== 'withheld' && !seen.has(q.id)) UP.pyq.push(q)")
    path.write_text(s[:start]+json.dumps(out,ensure_ascii=False)+tail)
counts=collections.Counter(x['status'] for x in report)
REPORT.write_text(json.dumps({'method':'Structural screening only; not official source or answer verification. Original rows retained for source repair. Withheld rows are excluded at pack registration, not merely hidden in one view.','counts':dict(counts),'questions':report,'originalRows':originals},ensure_ascii=False,indent=1)+'\n')
print(dict(counts));print(collections.Counter(r for x in report for r in x['reasons']))
