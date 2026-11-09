#!/usr/bin/env python3
"""Remove the Class 12 chapter PDFs that have been replaced by extracted text.

This touches ONLY the chapter/book PDFs listed in
assets/js/data/english12-sources.js and assets/js/data/economics-sources.js.
It never touches assets/papers/ (test papers) and never touches question data.

Each removed file must have a usable extracted summary, otherwise the script
refuses to delete it.

Usage:
  python3 tools/extract/remove-chapter-pdfs.py --dry-run
  python3 tools/extract/remove-chapter-pdfs.py --apply
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GUARD = 'assets/papers/'


def source_records():
    out = []
    for path in ('assets/js/data/english12-sources.js',
                 'assets/js/data/economics-sources.js'):
        with open(os.path.join(ROOT, path), encoding='utf-8') as fh:
            src = fh.read()
        for m in re.finditer(r'\{\s*"id".*?\}', src, re.S):
            try:
                out.append(json.loads(m.group(0)))
            except json.JSONDecodeError:
                pass
    return out


def summaries():
    path = os.path.join(ROOT, 'assets/js/data/chapter-summary.js')
    with open(path, encoding='utf-8') as fh:
        src = fh.read()
    payload = src[src.index('UP.chapterSummary'):]
    payload = payload[payload.index('=') + 1:].rstrip().rstrip(';')
    return json.loads(payload)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    if not args.apply and not args.dry_run:
        sys.exit('pass --dry-run or --apply')

    sums = summaries()
    recs = source_records()
    removed, kept, skipped = [], [], []

    for rec in recs:
        rel = rec.get('file', '').lstrip('/')
        if not rel:
            continue
        if rel.startswith(GUARD):
            skipped.append((rel, 'refused: under assets/papers/'))
            continue
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            kept.append((rel, 'already absent'))
            continue
        s = sums.get(rec['id'])
        if not s or s.get('available') is False:
            skipped.append((rel, 'no usable extracted text'))
            continue
        size = os.path.getsize(path)
        if args.apply:
            os.remove(path)
        removed.append((rel, size))
        print(('REMOVED ' if args.apply else 'WOULD REMOVE ') + rel +
              f'  ({size / 1024 / 1024:.1f} MB)')

    total = sum(sz for _, sz in removed)
    print()
    for rel, why in kept:
        print(f'  keep (already absent): {rel}')
    for rel, why in skipped:
        print(f'  SKIP {why}: {rel}')
    print(f'\n{len(removed)} files, {total / 1024 / 1024:.1f} MB '
          f'{"removed" if args.apply else "to remove"}; '
          f'{len(kept)} already absent; {len(skipped)} skipped.')
    if args.apply:
        print('\nNow prune the empty directories, then re-run --dry-run to confirm.')


if __name__ == '__main__':
    main()
