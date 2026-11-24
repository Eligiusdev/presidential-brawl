#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# El motor Go consume los mismos datos que el motor TS (generados desde TS).
(cd "$ROOT" && npx tsx scripts/gen-sim-data.ts)

(cd "$ROOT/backend" && PATH="$HOME/go/bin:$PATH" go build -o "$ROOT/server-bin" ./cmd/server) &
(cd "$ROOT/engine" && PATH="$HOME/go/bin:$PATH" GOOS=js GOARCH=wasm go build -o "$ROOT/frontend/public/sim/sim.wasm" ./cmd/sim-wasm && cp "$(PATH="$HOME/go/bin:$PATH" go env GOROOT)/lib/wasm/wasm_exec.js" "$ROOT/frontend/public/sim/wasm_exec.js") &
wait
(cd "$ROOT/frontend" && npm run build)

