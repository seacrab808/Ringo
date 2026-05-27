#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

# shellcheck source=/dev/null
source .venv/bin/activate
exec uvicorn app.main:app --reload --host 0.0.0.0 --port "${RINGO_PORT:-8000}"
