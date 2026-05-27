#!/usr/bin/env bash
# Load nvm Node for Ringo dev/build (system node is not required).
set -euo pipefail
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
else
  echo "nvm not found. Install: https://github.com/nvm-sh/nvm" >&2
  exit 1
fi
nvm use default >/dev/null 2>&1 || nvm use --lts
exec "$@"
