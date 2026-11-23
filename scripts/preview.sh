#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() { kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

(cd "$ROOT/backend/server" && PATH="$HOME/go/bin:$PATH" go run ./cmd/server) &
(cd "$ROOT/frontend" && npm run preview -- --host 0.0.0.0 --port 4173) &

wait -n || true
cleanup
