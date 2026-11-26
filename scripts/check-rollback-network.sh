#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../engine"
runner="$(go env GOROOT)/lib/wasm/go_js_wasm_exec"
GOOS=js GOARCH=wasm go test -exec "$runner" -count=1 -v \
  -run '^Test(Rollback(WithSimulatedNetwork|PerformanceFixture|EarlierConfirmationPreservesLaterConfirmedInputs)|NetworkCheckpointRoundTripAndResimulation)$' .
