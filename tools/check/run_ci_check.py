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
        title = annotation('Failed: ' + ' '.join(command)).replace(',', '%2C').replace(':', '%3A')
        print(f'::error title={title}::{annotation(result.stdout[-6000:])}', flush=True)
    return result.returncode if result.returncode >= 0 else 1


if __name__ == '__main__':
    sys.exit(main())
