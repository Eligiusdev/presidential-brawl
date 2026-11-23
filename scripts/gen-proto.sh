#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/server"
PATH="$HOME/go/bin:$PATH" ../node_modules/.bin/buf generate
