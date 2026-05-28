#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== 小程序 typecheck =="
(cd "$ROOT/apps/mp-client" && npm run typecheck)

echo
echo "== API typecheck =="
(cd "$ROOT/apps/api" && npm run typecheck)

echo
echo "== API tests =="
(cd "$ROOT/apps/api" && npm test -- --runInBand)

echo
echo "== 管理后台 build =="
(cd "$ROOT/apps/admin-web" && npm run build)

echo
echo "Local checks passed."
