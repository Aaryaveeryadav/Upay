#!/usr/bin/env python3
"""Run an unchanged check and expose failures in GitHub check annotations.

Useful where the Actions log download host cannot be reached. Only run test
commands here, not commands that print production credentials.
"""
import subprocess
import sys


def annotation(value):
    return value.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: run_ci_check.py <command> [arguments...]')
    command = sys.argv[1:]
    print('CHECK ' + ' '.join(command), flush=True)
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(result.stdout, end='', flush=True)
    if result.returncode:
        # GitHub drops annotations that are too long, so summarise: the failure
        # line, not the whole transcript. This is the only channel readable when
        # the log host is unreachable.
        lines = [ln.strip() for ln in result.stdout.splitlines() if ln.strip()]
        key = [ln for ln in lines if 'AssertionError' in ln or 'Error:' in ln or 'error:' in ln][:2]
        if not key:
            key = [ln for ln in lines if not ln.startswith('at ')][-3:]
        summary = ' | '.join(key)
        # Node prints the assertion message on the lines *after* the header for
        # `assert(cond)` without a message, and on the header itself when there
        # is one. Without it the annotation says only "evaluated to a falsy
        # value", which is true of every failed assertion. Include the source
        # frame and the code excerpt that node prints between them.
        if any('AssertionError' in ln for ln in lines):
            at = next((i for i, ln in enumerate(lines) if 'AssertionError' in ln), None)
            if at is not None:
                tail = lines[at + 1:at + 9]
                tail = [ln for ln in tail if not ln.startswith('at ')][:3]
                summary = ' | '.join([summary] + tail)
        title = annotation('Failed: ' + ' '.join(command)).replace(',', '%2C').replace(':', '%3A')
        summary = annotation(summary[:900])
        print(f'::error title={title}::{summary}', flush=True)
    return result.returncode if result.returncode >= 0 else 1


if __name__ == '__main__':
    sys.exit(main())
