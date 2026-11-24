#!/usr/bin/env bash
set -euo pipefail
set -m
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pids=()
cleanup() {
  trap - EXIT INT TERM
  for pid in "${pids[@]:-}"; do
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 0.2
  for pid in "${pids[@]:-}"; do
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$ROOT/backend" && PATH="$HOME/go/bin:$PATH" go run ./cmd/server) &
pids+=($!)
(cd "$ROOT/frontend" && npm run preview -- --host 0.0.0.0 --port 4173) &
pids+=($!)

wait -n || true
cleanup
