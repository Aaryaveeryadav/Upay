#!/usr/bin/env python3
"""Extract English Section-A MCQs (Q1-20) from CBSE 2025 Social Science
question papers (code 32) supplied by the site owner.

The papers are bilingual prints: Hindi pages extract as legacy-font garbage,
English pages extract cleanly. We keep only pages whose text is predominantly
Latin script, then parse `N.` question starts and (A)-(D) options.

Output: JSON { "32/1/1": [ {q, stem, opts:[..]}, ... ], ... }
These are QUESTION texts only -- the papers contain no answers, so nothing
here can produce a verified key.
"""
import pymupdf, glob, json, re, sys, os

UPLOAD_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/arena-coding-uploads'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/social2025_mcqs.json'

def latin_ratio(s):
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if ord(c) < 0x250) / len(letters)

def clean(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = s.replace(' \u2013 ', ' \u2013 ')
    return s

def parse_mcqs(text):
    # Cut at SECTION B if present in this chunk stream
    text = text.split('SECTION B')[0]
    # Question starts: line beginning with "N." where N in 1..20
    parts = re.split(r'(?m)^\s*(\d{1,2})\.\s+', text)
    qs = {}
    # parts: [pre, num, body, num, body, ...]
    for i in range(1, len(parts) - 1, 2):
        try:
            n = int(parts[i])
        except ValueError:
            continue
        if not (1 <= n <= 20):
            continue
        body = parts[i + 1]
        # Options split
        opt_split = re.split(r'\(([A-D])\)\s*', body)
        if len(opt_split) < 9:  # stem + 4*(label, text)
            continue
        stem = clean(opt_split[0])
        # Drop trailing marks token "1" and instruction debris
        stem = re.sub(r'\s+1\s*$', '', stem)
        opts = []
        ok = True
        for j in range(1, 9, 2):
            if opt_split[j] != 'ABCD'[(j - 1) // 2]:
                ok = False
                break
            opts.append(clean(opt_split[j + 1]))
        if not ok or len(opts) != 4:
            continue
        if len(stem) < 12 or any(len(o) < 1 for o in opts):
            continue
        # Keep the longest version if a question appears twice (Hindi/English pass)
        if n not in qs or len(stem) + sum(len(o) for o in opts) > len(qs[n]['stem']) + sum(len(o) for o in qs[n]['opts']):
            qs[n] = {'q': n, 'stem': stem, 'opts': opts}
    return [qs[k] for k in sorted(qs)]

result = {}
for f in sorted(glob.glob(os.path.join(UPLOAD_DIR, '32-*_Social*.pdf'))):
    m = re.search(r'32-(\d+)-(\d+)_', os.path.basename(f))
    code = f"32/{m.group(1)}/{m.group(2)}"
    doc = pymupdf.open(f)
    english_text = []
    for page in doc:
        t = page.get_text()
        # Skip cover/instruction-only pages without Section A content later;
        # keep Latin-dominant pages.
        if latin_ratio(t) > 0.92 and len(t) > 200:
            english_text.append(t)
    blob = '\n'.join(english_text)
    mcqs = parse_mcqs(blob)
    result[code] = mcqs
    print(f"{code}: {len(mcqs)}/20 MCQs extracted", file=sys.stderr)

json.dump(result, open(OUT, 'w'), ensure_ascii=False, indent=1)
print(f"wrote {OUT}: {sum(len(v) for v in result.values())} MCQs from {len(result)} papers", file=sys.stderr)
