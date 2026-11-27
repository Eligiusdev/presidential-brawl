#!/usr/bin/env bash
set -euo pipefail

site="${1%/}"
manifest="$2"
version=$(jq -er '.version' "$manifest")
sha=$(jq -er '.sha256' "$manifest")
bytes=$(jq -er '.bytes' "$manifest")
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

for attempt in {1..8}; do
  if curl -fsSL --max-time 15 "$site/sim/manifest.json?v=$version" -o "$tmp/manifest.json" &&
    jq -e --arg version "$version" --arg sha "$sha" --argjson bytes "$bytes" \
      '.version == $version and .sha256 == $sha and .bytes == $bytes' "$tmp/manifest.json" >/dev/null &&
    mime=$(curl -fsSL --max-time 30 -o "$tmp/sim.wasm" -w '%{content_type}' "$site/sim/sim.wasm?v=$version") &&
    [[ "${mime%%;*}" == application/wasm ]] &&
    [[ $(wc -c < "$tmp/sim.wasm") -eq $bytes ]] &&
    [[ $(sha256sum "$tmp/sim.wasm" | cut -d ' ' -f1) == "$sha" ]]; then
    printf 'Verified %s: %s bytes, SHA-256 %s, %s\n' "$version" "$bytes" "$sha" "$mime"
    exit 0
  fi
  sleep 5
done
printf 'Published Wasm did not match the expected manifest or MIME type.\n' >&2
exit 1
