#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../engine"
runner="$(go env GOROOT)/lib/wasm/go_js_wasm_exec"
if ! native_log=$(go test -run '^TestRollbackParityFixture$' -count=1 -v .); then
  printf '%s\n' "$native_log" >&2
  exit 1
fi
printf '%s\n' "$native_log"
if ! wasm_log=$(GOOS=js GOARCH=wasm go test -exec "$runner" -run '^TestRollbackParityFixture$' -count=1 -v .); then
  printf '%s\n' "$wasm_log" >&2
  exit 1
fi
printf '%s\n' "$wasm_log"
native_hash=$(sed -n 's/.*rollback-hash=//p' <<<"$native_log")
wasm_hash=$(sed -n 's/.*rollback-hash=//p' <<<"$wasm_log")
if [[ -z "$native_hash" || "$native_hash" != "$wasm_hash" ]]; then
  printf 'Rollback hash mismatch: native=%s wasm=%s\n' "$native_hash" "$wasm_hash" >&2
  exit 1
fi
printf 'Rollback parity verified: %s\n' "$native_hash"
