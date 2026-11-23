#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$ROOT/server" && PATH="$HOME/go/bin:$PATH" go build -o "$ROOT/server-bin" ./cmd/server) &
(cd "$ROOT/frontend" && npm run build) &

wait
