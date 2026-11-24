#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for command in go node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Error: se requiere '$command' en PATH para compilar el monorepo." >&2
    exit 127
  fi
done

npm ci --prefix "$ROOT" --include=dev
npm ci --prefix "$ROOT/frontend" --include=dev

# El motor Go consume los mismos datos que el motor TS (generados desde TS).
(cd "$ROOT" && npx tsx scripts/gen-sim-data.ts)

(cd "$ROOT/backend" && go build -o "$ROOT/server-bin" ./cmd/server)
(cd "$ROOT/engine" && GOOS=js GOARCH=wasm go build -o "$ROOT/frontend/public/sim/sim.wasm" ./cmd/sim-wasm)
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" "$ROOT/frontend/public/sim/wasm_exec.js"
(cd "$ROOT/frontend" && npm run build)

