#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../engine"
runner="$(go env GOROOT)/lib/wasm/go_js_wasm_exec"
if ! native_log=$(go test -run '^Test(RollbackParityFixture|TechniqueCheckpointParity|TagCoreParity)$' -count=1 -v .); then
  printf '%s\n' "$native_log" >&2
  exit 1
fi
printf '%s\n' "$native_log"
if ! wasm_log=$(GOOS=js GOARCH=wasm go test -exec "$runner" -run '^Test(RollbackParityFixture|TechniqueCheckpointParity|TagCoreParity)$' -count=1 -v .); then
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

for size in 2 8; do
  native_technique_hash=$(sed -n "s/.*technique-hash-$size=//p" <<<"$native_log")
  wasm_technique_hash=$(sed -n "s/.*technique-hash-$size=//p" <<<"$wasm_log")
  if [[ -z "$native_technique_hash" || "$native_technique_hash" != "$wasm_technique_hash" ]]; then
    printf 'Technique parity mismatch (%s players): native=%s wasm=%s\n' "$size" "$native_technique_hash" "$wasm_technique_hash" >&2
    exit 1
  fi
  printf 'Technique parity verified (%s players): %s\n' "$size" "$native_technique_hash"
done

native_tag_hash=$(sed -n 's/.*tag-hash=//p' <<<"$native_log")
wasm_tag_hash=$(sed -n 's/.*tag-hash=//p' <<<"$wasm_log")
if [[ -z "$native_tag_hash" || "$native_tag_hash" != "$wasm_tag_hash" ]]; then
  printf 'Tag parity mismatch: native=%s wasm=%s\n' "$native_tag_hash" "$wasm_tag_hash" >&2
  exit 1
fi
printf 'Tag parity verified: %s\n' "$native_tag_hash"
