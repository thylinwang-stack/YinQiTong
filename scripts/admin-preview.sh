#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/admin-web"

npm run build
npm run preview -- --host 127.0.0.1 --port 4173
