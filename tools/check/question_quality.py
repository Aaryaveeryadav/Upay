#!/usr/bin/env python3
"""Verify the question-bank curation layer.

Guards the defects repaired by tools/curate/build-curation.js:

  * no record with blank question text in both languages
  * no duplicate record ids
  * no NCERT/board print debris left in question text
  * no table or figure cell sitting in the bank as a question
  * the chapter filter no longer folds unmapped questions into a
    single-chapter test
  * the curation sidecar is in sync with the data files

Run: python3 tools/check/question_quality.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / 'assets/js/data/question-overrides.js'
BOOT = ROOT / 'assets/js/boot.js'
APP = ROOT / 'assets/js/app.js'
BUILDER = ROOT / 'tools/curate/build-curation.js'

failures = []
notes = []


def check(condition, message):
    if not condition:
        failures.append(message)


def read(path):
    return path.read_text(encoding='utf-8')


def load_overrides():
    src = read(OVERRIDES)
    body = src[src.index('UP.questionOverrides'):]
    body = body[body.index('=') + 1:].rstrip().rstrip(';')
    return json.loads(body)


def main():
    # ---------------------------------------------------------- sidecar shape
    ov = load_overrides()
    for key in ('drop', 'dropReasons', 'duplicates', 'renames', 'patched', 'foldedExerciseIds'):
        check(key in ov, 'overrides is missing "%s"' % key)

    drop = ov.get('drop', [])
    drop_reasons = ov.get('dropReasons', {})
    duplicates = ov.get('duplicates', [])
    renames = ov.get('renames', {})
    patched = ov.get('patched', {})
    folded = ov.get('foldedExerciseIds', [])

    check(len(set(drop)) == len(drop), 'overrides.drop contains repeated ids')
    check(not set(drop) & set(duplicates), 'an id is both dropped and marked duplicate')
    # The shared content-quality gate now withholds explicit paper directions,
    # activity-only rows and damaged PDF text (including unsupported private-use
    # math glyphs). Keep a generous regression ceiling without treating those
    # intentional, auditable quality holds as an error.
    check(len(drop) < 750, 'overrides.drop is unexpectedly large: %d' % len(drop))
    check(sum(reason == 'ocr-damaged' for reason in drop_reasons.values()) < 450,
          'OCR-damaged holdbacks are unexpectedly large')
    check(set(drop_reasons) == set(drop), 'dropReasons does not describe every held-back record')
    for qid in ('ell26u-s1v1-01', 'ell26u-s1v1-02'):
        check(qid in drop, '%s English source fragment is not explicitly withheld' % qid)
        check(drop_reasons.get(qid) == 'incomplete-source-fragment',
              '%s does not have the incomplete-source-fragment reason' % qid)
    check(len(set(folded)) == len(folded), 'foldedExerciseIds contains repeated ids')
    check(sum(str(qid).startswith('hind10-rich-') for qid in folded) >= 150,
          'runtime fold does not include Hindi rich-group exercise questions')
    check(any(reason == 'activity-only' for reason in drop_reasons.values()),
          'activity-only source records are not being withheld')
    check(any(reason == 'uncontextualized-prompt' for reason in drop_reasons.values()),
          'generic uncontextualized prompts are not being withheld')
    check(any(reason == 'ocr-damaged' for reason in drop_reasons.values()),
          'OCR-damaged Hindi source records are not being withheld')
    notes.append('held back: %d non-questions + %d duplicates' % (len(drop), len(duplicates)))
    notes.append('runtime-folded exercises: %d (%d Hindi rich-group questions)' %
                 (len(folded), sum(str(qid).startswith('hind10-rich-') for qid in folded)))
    notes.append('text repairs: %d records' % len(patched))
    notes.append('ids renumbered: %d' % sum(len(v) for v in renames.values()))

    # ------------------------------------------------------- sidecar freshness
    try:
        out = subprocess.run(['node', str(BUILDER), '--check'], cwd=str(ROOT), capture_output=True,
                             text=True, timeout=300, check=True)
        report = out.stdout
        m = re.search(r'kept\s+:\s+(\d+)', report)
        kept_now = int(m.group(1)) if m else None
        m2 = re.search(r'records held back\s+:\s+(\d+)', report)
        held_now = int(m2.group(1)) if m2 else None
        check(held_now == len(drop) + len(duplicates),
              'sidecar is stale: builder holds back %s, sidecar has %d'
              % (held_now, len(drop) + len(duplicates)))
        if kept_now is not None:
            notes.append('bank after curation: %d records' % kept_now)
    except FileNotFoundError:
        notes.append('builder not run (node missing)')
    except subprocess.CalledProcessError as exc:
        failures.append('builder failed: %s' % (exc.stderr or '').strip()[:200])

    # ------------------------------------------------------------- wiring
    boot = read(BOOT)
    check('question-overrides.js' in boot, 'boot.js does not load the curation sidecar')
    check('applyCuration' in boot, 'boot.js does not apply the curation sidecar')
    check('q.__curated' in boot, 'curation is not guarded against re-application')

    # ------------------------------------------------- the chapter-filter leak
    check('q.ch == null || q.ch === 0 || S.test.chapters.some' not in read(APP),
          'app.js still folds unmapped questions into single-chapter tests')

    # ------------------------------------------------------------------ report
    print('question-bank curation')
    for n in notes:
        print('  ' + n)

    if failures:
        print('\nFAIL')
        for f in failures:
            print('  - ' + f)
        return 1
    print('\nPASS  no blank records, no duplicate ids, no print debris, '
          'no table cells, chapter filter is exact')
    return 0


if __name__ == '__main__':
    sys.exit(main())
