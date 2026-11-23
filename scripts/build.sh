#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

(cd "$ROOT/backend/server" && PATH="$HOME/go/bin:$PATH" go build -o "$ROOT/server-bin" ./cmd/server) &
(cd "$ROOT/sim" && PATH="$HOME/go/bin:$PATH" GOOS=js GOARCH=wasm go build -o "$ROOT/frontend/public/sim/sim.wasm" ./cmd/sim-wasm && cp "$(PATH="$HOME/go/bin:$PATH" go env GOROOT)/lib/wasm/wasm_exec.js" "$ROOT/frontend/public/sim/wasm_exec.js") &
wait
(cd "$ROOT/frontend" && npm run build)

