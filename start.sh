#!/usr/bin/env bash
# Safe launcher: the Node server restricts access to private data/ and keys.
set -e
cd "$(dirname "$0")"
PORT="${PORT:-8004}"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required: https://nodejs.org/"
  echo "Do not serve this project root with a generic static server; it contains private data."
  exit 1
fi
MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
if [ "$MAJOR" -lt 18 ]; then
  echo "Node.js 18 or newer is required."
  exit 1
fi
echo "Starting Upay at http://localhost:$PORT. Press Ctrl+C to stop."
exec env PORT="$PORT" node server.js
