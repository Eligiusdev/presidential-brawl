#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
npm run lint --prefix frontend
cd "$ROOT/server"
PATH="$HOME/go/bin:$PATH" go vet ./...
