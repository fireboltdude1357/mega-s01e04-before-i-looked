#!/usr/bin/env bash
# Runs rig and saves one page as a single HTML file (plan § 3, ADR 0003).
# Usage: scripts/preview.sh [night] [out]. The banner shows LANE_MARKER from the environment or .env.
# Run with LANE_MARKER= (set but empty) to save the clean copy for § 4.
set -euo pipefail
night=${1:-2026-10-28}
out=${2:-var/preview/index.html}
port=${PREVIEW_PORT:-8799}

PORT=$port setsid ./node_modules/.bin/tsx --env-file-if-exists=.env src/server.ts >/dev/null 2>&1 &
pid=$!
trap 'kill -- -"$pid" 2>/dev/null || true' EXIT

for _ in $(seq 60); do curl -sf "http://localhost:$port/health" >/dev/null && break; sleep 0.25; done
mkdir -p "$(dirname "$out")"
curl -sf "http://localhost:$port/digest/$night" -o "$out"
echo "saved /digest/$night -> $out"
