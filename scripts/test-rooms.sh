#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$ROOT/scripts/build-server.sh"
cd "$ROOT"
SERVER_BIN="$ROOT/server-bin" npm run test:rooms --prefix frontend
