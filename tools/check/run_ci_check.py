#!/usr/bin/env python3
"""Run an unchanged check and expose failures in GitHub check annotations.

Useful where the Actions log download host cannot be reached. Only run test
commands here, not commands that print production credentials.
"""
import os
import signal
import subprocess
import sys


def annotation(value):
    return value.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: run_ci_check.py <command> [arguments...]')
    command = sys.argv[1:]
    print('CHECK ' + ' '.join(command), flush=True)
    # Every browser check has its own internal timeouts, but a hang that never
    # reaches one (a route that never settles, a browser that will not close)
    # used to burn the job's whole six-hour budget and report only that. A
    # ceiling here turns that into a named failure with the partial output.
    limit = int(os.environ.get('UPAY_CHECK_TIMEOUT', '900'))
    env = dict(os.environ, UPAY_CHECK_TIMEOUT=str(limit), UPAY_LABEL=' '.join(command))
    # Own process group, so a timeout takes the browser down with the check
    # instead of leaving it holding the display and the port.
    proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, start_new_session=True, env=env)
    try:
        output, _ = proc.communicate(timeout=limit)
        code = proc.returncode
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except OSError:
            proc.kill()
        output, _ = proc.communicate()
        output = (output or '') + f'\nTimed out after {limit}s: this check did not finish.\n'
        code = 124
    print(output, end='', flush=True)
    result = subprocess.CompletedProcess(command, code, output, '')
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
