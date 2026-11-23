#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/frontend/public/sim"
mkdir -p "$OUT"
cd "$ROOT/server"
PATH="$HOME/go/bin:$PATH" GOOS=js GOARCH=wasm go build -o "$OUT/sim.wasm" ./cmd/sim-wasm
GOROOT="$(go env GOROOT)"
cp "$GOROOT/lib/wasm/wasm_exec.js" "$OUT/wasm_exec.js"
echo "WASM built: $OUT/sim.wasm"
